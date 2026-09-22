import mongoose from "mongoose";
import { ApiError } from "../errors/ApiError.js";
import AIChat from "../models/AIChat.js";

// How much of the conversation the AI service sees for a follow-up question.
// The service itself keeps only the last two exchanges; four messages is that.
export const HISTORY_MESSAGES = 4;
const TITLE_LENGTH = 60;

const notFound = () => new ApiError(404, "TUTOR_CHAT_NOT_FOUND", "المحادثة غير موجودة");

export const messageDto = (message) => ({
  id: String(message._id),
  role: message.role,
  content: message.content,
  status: message.status,
  sources: message.sources || [],
  calculation: message.calculation?.answer ? { answer: message.calculation.answer, facts: message.calculation.facts || [] } : null,
  createdAt: message.createdAt
});

export const chatSummaryDto = (chat) => ({ id: String(chat._id), title: chat.title, createdAt: chat.createdAt, updatedAt: chat.updatedAt });

export const chatDto = (chat) => ({ ...chatSummaryDto(chat), messages: (chat.messages || []).map(messageDto) });

// Every lookup is by owner AND id: a chat id alone never grants access.
export async function findOwnChat(ownerId, chatId) {
  if (!mongoose.isValidObjectId(chatId)) throw notFound();
  const chat = await AIChat.findOne({ _id: chatId, owner: ownerId });
  if (!chat) throw notFound();
  return chat;
}

export const createChat = (ownerId, { title } = {}) => AIChat.create({ owner: ownerId, ...(title ? { title } : {}) });

export const listChats = (ownerId) => AIChat.find({ owner: ownerId }).select("title createdAt updatedAt").sort({ updatedAt: -1 }).limit(100).lean();

export async function deleteChat(ownerId, chatId) {
  const chat = await findOwnChat(ownerId, chatId);
  await chat.deleteOne();
}

// The turns the AI service reads as context: answered exchanges only.
// A failed or interrupted answer is not something to build on.
export function historyFor(chat) {
  return (chat.messages || [])
    .filter((m) => m.role === "user" || (m.role === "assistant" && m.status === "complete"))
    .slice(-HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }));
}

export async function addUserMessage(chat, content) {
  const isFirst = !chat.messages.some((m) => m.role === "user");
  chat.messages.push({ role: "user", content });
  if (isFirst) chat.title = content.length > TITLE_LENGTH ? `${content.slice(0, TITLE_LENGTH).trim()}…` : content;
  await chat.save();
  return chat.messages[chat.messages.length - 1];
}

// Written once, after the stream ends, with exactly what the student saw.
export async function saveAssistantMessage(ownerId, chatId, messageId, result) {
  const message = {
    _id: messageId,
    role: "assistant",
    content: result.content || "",
    status: result.status,
    sources: result.sources || [],
    ...(result.calculation ? { calculation: result.calculation } : {}),
    meta: result.meta || {}
  };
  await AIChat.updateOne({ _id: chatId, owner: ownerId }, { $push: { messages: message }, $set: { updatedAt: new Date() } });
  return message;
}
