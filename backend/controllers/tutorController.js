import mongoose from "mongoose";
import { aiServiceConfig } from "../config/aiService.js";
import { ApiError } from "../errors/ApiError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { openTutorStream } from "../services/aiTutorClient.js";
import * as chatStore from "../services/tutorChatService.js";
import { chatDto, chatSummaryDto } from "../services/tutorChatService.js";
import { relayTutorStream } from "../services/tutorRelay.js";
import { validateChatInput, validateMessageInput } from "../validation/tutorValidation.js";

const TIMEOUT = { code: "AI_TIMEOUT", message: "استغرق الجواب وقتاً أطول من المسموح. حاول مرة ثانية." };
const INTERRUPTED = { code: "AI_INTERRUPTED", message: "انقطع الجواب قبل أن يكتمل. حاول مرة ثانية." };

// Built from its dependencies so the whole request - validation, ownership,
// streaming, what gets saved - is testable without MongoDB or a model.
export function createTutorHandlers({ chats = chatStore, openStream = openTutorStream, config = aiServiceConfig } = {}) {
  // One answer in flight per student. The model answers one question at a
  // time anyway; a second tab or a double click should not queue another.
  // In-process on purpose: one API process today. Move to a shared store if
  // the API is ever scaled out.
  const inFlight = new Set();

  const createChat = asyncHandler(async (req, res) => res.status(201).json({ chat: chatDto(await chats.createChat(req.user._id, validateChatInput(req.body))) }));

  const listChats = asyncHandler(async (req, res) => res.json({ chats: (await chats.listChats(req.user._id)).map(chatSummaryDto) }));

  const getChat = asyncHandler(async (req, res) => res.json({ chat: chatDto(await chats.findOwnChat(req.user._id, req.params.chatId)) }));

  const deleteChat = asyncHandler(async (req, res) => {
    await chats.deleteChat(req.user._id, req.params.chatId);
    res.status(204).end();
  });

  const streamMessage = asyncHandler(async (req, res) => {
    const { content } = validateMessageInput(req.body);
    const ownerId = req.user._id;
    const chat = await chats.findOwnChat(ownerId, req.params.chatId);
    const busyKey = String(ownerId);
    if (inFlight.has(busyKey)) throw new ApiError(409, "TUTOR_BUSY", "انتظر حتى يكتمل الجواب السابق");
    inFlight.add(busyKey);

    const upstream = new AbortController();
    const timer = setTimeout(() => upstream.abort(new Error(TIMEOUT.code)), config().timeoutMs);

    try {
      const history = chats.historyFor(chat);
      const userMessage = await chats.addUserMessage(chat, content);

      // Opened before any byte is written: if the AI service is down the
      // student gets a normal JSON 503. The question stays saved, with a
      // failed answer beside it, so the chat never shows an unanswered gap.
      let events;
      try {
        events = await openStream({ question: content, history, signal: upstream.signal });
      } catch (error) {
        await chats.saveAssistantMessage(ownerId, chat._id, new mongoose.Types.ObjectId(), { status: "failed", content: "", meta: { errorCode: error.code || "AI_UNAVAILABLE" } });
        throw error;
      }

      res.status(200);
      res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      // The student closed the page or pressed stop: stop the model too.
      res.on("close", () => { if (!res.writableEnded) upstream.abort(new Error("client closed")); });

      const send = (event) => { if (!res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(event)}\n`); };
      const messageId = new mongoose.Types.ObjectId();
      const result = await relayTutorStream({
        events,
        send,
        interruption: () => (upstream.signal.reason?.message === TIMEOUT.code ? TIMEOUT : INTERRUPTED),
        ids: { chatId: String(chat._id), messageId: String(messageId), userMessageId: String(userMessage._id) }
      });

      await chats.saveAssistantMessage(ownerId, chat._id, messageId, result);
      if (!res.writableEnded) res.end();
    } finally {
      clearTimeout(timer);
      inFlight.delete(busyKey);
    }
  });

  return { createChat, listChats, getChat, deleteChat, streamMessage };
}
