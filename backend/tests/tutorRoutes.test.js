import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { readFile } from "node:fs/promises";
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { createTutorHandlers } from "../controllers/tutorController.js";
import { ApiError } from "../errors/ApiError.js";
import { errorHandler } from "../middleware/errorMiddleware.js";
import { createTutorRouter } from "../routes/tutorRoutes.js";
import { historyFor } from "../services/tutorChatService.js";

// The whole tutor request - validation, ownership, streaming, what is saved -
// against an in-memory chat store and a fake AI stream. No MongoDB, no model.

const fixture = (name) => readFile(new URL(`../../docs/contracts/fixtures/${name}.ndjson`, import.meta.url), "utf8");
const parseLines = (text) => text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
const ALICE = "64b000000000000000000001";
const BOB = "64b000000000000000000002";

function memoryChats() {
  const store = new Map();
  const notFound = () => new ApiError(404, "TUTOR_CHAT_NOT_FOUND", "المحادثة غير موجودة");
  return {
    store,
    async createChat(owner, { title } = {}) {
      const chat = { _id: new mongoose.Types.ObjectId(), owner: String(owner), title: title || "محادثة جديدة", messages: [], createdAt: new Date(), updatedAt: new Date() };
      store.set(String(chat._id), chat);
      return chat;
    },
    async listChats(owner) { return [...store.values()].filter((c) => c.owner === String(owner)); },
    async findOwnChat(owner, id) { const chat = store.get(String(id)); if (!chat || chat.owner !== String(owner)) throw notFound(); return chat; },
    async deleteChat(owner, id) { await this.findOwnChat(owner, id); store.delete(String(id)); },
    historyFor,
    async addUserMessage(chat, content) {
      const message = { _id: new mongoose.Types.ObjectId(), role: "user", content, status: "complete" };
      if (!chat.messages.some((m) => m.role === "user")) chat.title = content.slice(0, 60);
      chat.messages.push(message);
      return message;
    },
    async saveAssistantMessage(owner, chatId, messageId, result) {
      const chat = store.get(String(chatId));
      chat.messages.push({ _id: messageId, role: "assistant", content: result.content || "", status: result.status, sources: result.sources || [], calculation: result.calculation, meta: result.meta });
    }
  };
}

async function* fromArray(items) { for (const item of items) { yield item; await new Promise((r) => setImmediate(r)); } }

function appWith({ chats = memoryChats(), openStream, timeoutMs = 5000 } = {}) {
  const app = express();
  app.use(express.json());
  const protect = (req, _res, next) => {
    const id = req.headers["x-test-user"];
    if (!id) return next(new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح"));
    req.user = { _id: id };
    next();
  };
  const handlers = createTutorHandlers({ chats, openStream, config: () => ({ timeoutMs }) });
  app.use("/api/tutor", createTutorRouter({ protect, handlers }));
  app.use(errorHandler);
  return { app, chats };
}

const as = (user) => ({ "x-test-user": user });

test("a chat belongs to its owner: another student gets 404, never the chat", async () => {
  const { app } = appWith({ openStream: async () => fromArray([]) });
  const created = await request(app).post("/api/tutor/chats").set(as(ALICE)).send({});
  assert.equal(created.status, 201);
  const id = created.body.chat.id;
  assert.equal((await request(app).get(`/api/tutor/chats/${id}`).set(as(ALICE))).status, 200);
  const stranger = await request(app).get(`/api/tutor/chats/${id}`).set(as(BOB));
  assert.equal(stranger.status, 404);
  assert.equal(stranger.body.code, "TUTOR_CHAT_NOT_FOUND");
  assert.equal((await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(BOB)).send({ content: "س" })).status, 404);
  assert.deepEqual((await request(app).get("/api/tutor/chats").set(as(BOB))).body.chats, []);
});

test("a question streams contract-v1 events and the answer is saved as streamed", async () => {
  const events = parseLines(await fixture("answer"));
  let seen;
  const { app, chats } = appWith({ openStream: async (args) => { seen = args; return fromArray(events); } });
  const id = (await request(app).post("/api/tutor/chats").set(as(ALICE)).send({})).body.chat.id;

  const response = await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "  بدي مشتقة ق(س) = (س^٢ + ١)(٣س − ٢) عند س = ١ " });
  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /application\/x-ndjson/);

  const streamed = parseLines(response.text);
  assert.deepEqual(streamed.map((e) => e.type), events.map((e) => e.type));
  assert.equal(streamed[0].chatId, id);
  assert.ok(streamed[0].messageId);
  assert.equal(seen.question, "بدي مشتقة ق(س) = (س^٢ + ١)(٣س − ٢) عند س = ١");

  const chat = chats.store.get(id);
  assert.equal(chat.title, "بدي مشتقة ق(س) = (س^٢ + ١)(٣س − ٢) عند س = ١");
  const [question, answer] = chat.messages;
  assert.equal(question.role, "user");
  assert.equal(answer.status, "complete");
  assert.equal(answer.content, events.at(-1).answer);
  assert.equal(String(answer._id), streamed[0].messageId);
  assert.equal(answer.calculation.answer, "٨");
});

test("the second question sends the first exchange as history", async () => {
  const answer = parseLines(await fixture("answer"));
  const histories = [];
  const { app } = appWith({ openStream: async ({ history }) => { histories.push(history); return fromArray(answer); } });
  const id = (await request(app).post("/api/tutor/chats").set(as(ALICE)).send({})).body.chat.id;
  await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "شو مشتقة جتا س؟" });
  await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "طب ليش؟" });
  assert.deepEqual(histories[0], []);
  assert.deepEqual(histories[1].map((t) => t.role), ["user", "assistant"]);
  assert.equal(histories[1][0].content, "شو مشتقة جتا س؟");
});

test("AI service down: a JSON 503 before any streaming, and a failed answer is recorded", async () => {
  const { app, chats } = appWith({ openStream: async () => { throw new ApiError(503, "AI_UNAVAILABLE", "المدرّس الذكي غير متاح الآن. حاول بعد قليل."); } });
  const id = (await request(app).post("/api/tutor/chats").set(as(ALICE)).send({})).body.chat.id;
  const response = await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "س" });
  assert.equal(response.status, 503);
  assert.equal(response.body.code, "AI_UNAVAILABLE");
  assert.deepEqual(chats.store.get(id).messages.map((m) => [m.role, m.status]), [["user", "complete"], ["assistant", "failed"]]);
});

test("one answer at a time per student: a second question while streaming is 409", async () => {
  let release;
  const gate = new Promise((r) => { release = r; });
  async function* slow() { yield { type: "meta", model: "m" }; await gate; yield { type: "done", answer: "x", found: true, refused: false, warnings: [], checks: null, seconds: 1 }; }
  const { app } = appWith({ openStream: async () => slow() });
  const id = (await request(app).post("/api/tutor/chats").set(as(ALICE)).send({})).body.chat.id;
  const first = request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "١" }).then((r) => r);
  await new Promise((r) => setTimeout(r, 50));
  const second = await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "٢" });
  assert.equal(second.status, 409);
  assert.equal(second.body.code, "TUTOR_BUSY");
  release();
  assert.equal((await first).status, 200);
  const third = await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "٣" });
  assert.equal(third.status, 200, "the lock is released after the answer");
});

test("too slow: the upstream is aborted, the student reads AI_TIMEOUT, the partial answer is kept", async () => {
  async function* hangs({ signal }) {
    yield { type: "meta", model: "m" };
    yield { type: "delta", text: "نستخدم " };
    await new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
  }
  const { app, chats } = appWith({ openStream: async (args) => hangs(args), timeoutMs: 100 });
  const id = (await request(app).post("/api/tutor/chats").set(as(ALICE)).send({})).body.chat.id;
  const response = await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "س" });
  const events = parseLines(response.text);
  assert.deepEqual([events.at(-1).type, events.at(-1).code], ["error", "AI_TIMEOUT"]);
  const saved = chats.store.get(id).messages.at(-1);
  assert.deepEqual([saved.status, saved.content], ["interrupted", "نستخدم "]);
});

test("the student leaves mid-answer: the model is stopped and the partial answer kept", async () => {
  let aborted = false;
  async function* forever({ signal }) {
    yield { type: "meta", model: "m" };
    yield { type: "delta", text: "جزء" };
    await new Promise((_, reject) => signal.addEventListener("abort", () => { aborted = true; reject(signal.reason); }));
  }
  const { app, chats } = appWith({ openStream: async (args) => forever(args) });
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    const id = (await request(server).post("/api/tutor/chats").set(as(ALICE)).send({})).body.chat.id;
    await new Promise((resolve) => {
      const req = http.request({ host: "127.0.0.1", port: server.address().port, path: `/api/tutor/chats/${id}/messages`, method: "POST", headers: { "Content-Type": "application/json", ...as(ALICE) } }, (res) => {
        res.on("data", (chunk) => { if (String(chunk).includes("جزء")) { req.destroy(); resolve(); } });
      });
      req.on("error", () => {});
      req.end(JSON.stringify({ content: "س" }));
    });
    for (let i = 0; i < 50 && chats.store.get(id).messages.length < 2; i++) await new Promise((r) => setTimeout(r, 20));
    assert.equal(aborted, true);
    const saved = chats.store.get(id).messages.at(-1);
    assert.deepEqual([saved.status, saved.content], ["interrupted", "جزء"]);
  } finally { server.close(); }
});

test("a refusal is saved as refused", async () => {
  const { app, chats } = appWith({ openStream: async () => fromArray(parseLines(await fixture("refusal"))) });
  const id = (await request(app).post("/api/tutor/chats").set(as(ALICE)).send({})).body.chat.id;
  await request(app).post(`/api/tutor/chats/${id}/messages`).set(as(ALICE)).send({ content: "كيف أحسب التكامل؟" });
  assert.equal(chats.store.get(id).messages.at(-1).status, "refused");
});
