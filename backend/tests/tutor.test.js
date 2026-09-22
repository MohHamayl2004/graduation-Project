import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { readFile } from "node:fs/promises";
import request from "supertest";
import { createApp } from "../app.js";
import { openTutorStream } from "../services/aiTutorClient.js";
import { relayTutorStream } from "../services/tutorRelay.js";
import { readNdjson } from "../utils/ndjson.js";
import { validateMessageInput } from "../validation/tutorValidation.js";
import { historyFor } from "../services/tutorChatService.js";

// Contract v1 fixtures, shared with the client tests and the AI service.
const fixture = (name) => readFile(new URL(`../../docs/contracts/fixtures/${name}.ndjson`, import.meta.url), "utf8");
const parseLines = (text) => text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

async function* fromArray(items) { for (const item of items) yield item; }

// A byte stream cut into pieces of `size` bytes - through the middle of
// Arabic characters and lines, which is what a real network does.
async function* chunked(text, size) {
  const bytes = Buffer.from(text, "utf8");
  for (let i = 0; i < bytes.length; i += size) yield bytes.subarray(i, i + size);
}

async function collect(iterable) { const out = []; for await (const item of iterable) out.push(item); return out; }

// A fake AI service: replays a fixture, optionally checking the key.
function fakeAiService({ body, status = 200, key = "k", chunkSize = 7, breakAfter } = {}) {
  const server = http.createServer(async (req, res) => {
    if (req.headers["x-nipras-service-key"] !== key) { res.writeHead(401).end(); return; }
    res.writeHead(status, { "Content-Type": "application/x-ndjson" });
    const bytes = Buffer.from(body, "utf8");
    const end = breakAfter ?? bytes.length;
    for (let i = 0; i < end; i += chunkSize) { res.write(bytes.subarray(i, Math.min(i + chunkSize, end))); await new Promise((r) => setImmediate(r)); }
    if (breakAfter !== undefined) res.destroy(); else res.end();
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` })));
}

test("ndjson reader survives lines and Arabic characters split across chunks", async () => {
  const text = await fixture("answer");
  for (const size of [1, 3, 7, 64]) {
    assert.deepEqual(await collect(readNdjson(chunked(text, size))), parseLines(text), `chunk size ${size}`);
  }
});

test("relay: a full answer is saved exactly as streamed, with ids added to meta", async () => {
  const events = parseLines(await fixture("answer"));
  const sent = [];
  const result = await relayTutorStream({ events: fromArray(events), send: (e) => sent.push(e), ids: { chatId: "c1", messageId: "m1" } });
  assert.equal(result.status, "complete");
  assert.equal(result.content, events.at(-1).answer);
  assert.equal(result.calculation.answer, "٨");
  assert.equal(result.calculation.facts.length, 4, "the verified steps are saved, not just the answer");
  assert.deepEqual(result.sources[0], { lesson: "1-2", lessonTitle: "قواعد الاشتقاق", document: "math", pages: [16, 17], label: "الدرس 1-2 — صفحة 16", via: "method" });
  assert.equal(sent[0].chatId, "c1");
  assert.equal(sent[0].messageId, "m1");
  assert.equal(sent.length, events.length);
});

test("relay: a refusal is stored as refused, not as an error", async () => {
  const result = await relayTutorStream({ events: fromArray(parseLines(await fixture("refusal"))), send: () => {} });
  assert.equal(result.status, "refused");
  assert.match(result.content, /لا تغطيه/);
});

test("relay: an error event is a failed answer with its code", async () => {
  const sent = [];
  const result = await relayTutorStream({ events: fromArray(parseLines(await fixture("error"))), send: (e) => sent.push(e) });
  assert.equal(result.status, "failed");
  assert.equal(result.meta.errorCode, "AI_UNAVAILABLE");
  assert.equal(sent.at(-1).type, "error");
});

test("relay: a stream that breaks mid-answer keeps the partial text and tells the student", async () => {
  async function* breaks() {
    yield { type: "meta", model: "m" };
    yield { type: "delta", text: "نستخدم قاعدة " };
    throw new Error("socket hang up");
  }
  const sent = [];
  const result = await relayTutorStream({ events: breaks(), send: (e) => sent.push(e) });
  assert.equal(result.status, "interrupted");
  assert.equal(result.content, "نستخدم قاعدة ");
  assert.deepEqual([sent.at(-1).type, sent.at(-1).code], ["error", "AI_INTERRUPTED"]);
});

test("relay: a stream that ends without done is interrupted, and names a timeout", async () => {
  const sent = [];
  const result = await relayTutorStream({
    events: fromArray([{ type: "meta" }, { type: "delta", text: "x" }]),
    send: (e) => sent.push(e),
    interruption: () => ({ code: "AI_TIMEOUT", message: "..." })
  });
  assert.equal(result.status, "interrupted");
  assert.equal(sent.at(-1).code, "AI_TIMEOUT");
});

test("relay: unknown event types are ignored (v1 tolerates optional additions)", async () => {
  const events = parseLines(await fixture("answer"));
  events.splice(2, 0, { type: "future-thing", x: 1 });
  const sent = [];
  const result = await relayTutorStream({ events: fromArray(events), send: (e) => sent.push(e) });
  assert.equal(result.status, "complete");
  assert.equal(sent.some((e) => e.type === "future-thing"), false);
});

test("AI client reads the fake service's stream, chunked", async () => {
  const body = await fixture("answer");
  const { server, url } = await fakeAiService({ body });
  try {
    const events = await collect(await openTutorStream({ question: "س", config: { url, key: "k", timeoutMs: 5000 } }));
    assert.deepEqual(events, parseLines(body));
  } finally { server.close(); }
});

test("AI client: wrong key, service down, or no key configured are safe 503s", async () => {
  const { server, url } = await fakeAiService({ body: "" });
  try {
    await assert.rejects(() => openTutorStream({ question: "س", config: { url, key: "wrong", timeoutMs: 5000 } }), { status: 503, code: "AI_UNAVAILABLE" });
  } finally { server.close(); }
  await assert.rejects(() => openTutorStream({ question: "س", config: { url: "http://127.0.0.1:1", key: "k", timeoutMs: 5000 } }), { status: 503, code: "AI_UNAVAILABLE" });
  await assert.rejects(() => openTutorStream({ question: "س", config: { url: "http://127.0.0.1:1", key: "", timeoutMs: 5000 } }), { status: 503, code: "AI_MISCONFIGURED" });
});

test("AI client + relay: the service dying mid-stream becomes an interrupted answer", async () => {
  const body = await fixture("answer");
  const { server, url } = await fakeAiService({ body, breakAfter: Buffer.byteLength(body) - 200 });
  try {
    const sent = [];
    const events = await openTutorStream({ question: "س", config: { url, key: "k", timeoutMs: 5000 } });
    const result = await relayTutorStream({ events, send: (e) => sent.push(e) });
    assert.equal(result.status, "interrupted");
    assert.ok(result.content.length > 0);
    assert.equal(sent.at(-1).type, "error");
  } finally { server.close(); }
});

test("tutor routes require a login", async () => {
  const app = createApp();
  for (const [method, path] of [["get", "/api/tutor/chats"], ["post", "/api/tutor/chats"], ["post", "/api/tutor/chats/abc/messages"]]) {
    const response = await request(app)[method](path).send({ content: "س" });
    assert.equal(response.status, 401, `${method} ${path}`);
    assert.equal(response.body.code, "AUTH_INVALID");
  }
});

test("message validation trims, rejects empty and over-long questions", () => {
  assert.deepEqual(validateMessageInput({ content: "  شو مشتقة جتا س؟ " }), { content: "شو مشتقة جتا س؟" });
  assert.throws(() => validateMessageInput({ content: "   " }), { code: "VALIDATION_ERROR" });
  assert.throws(() => validateMessageInput({ content: "س".repeat(2001) }), { code: "VALIDATION_ERROR" });
});

test("history for a follow-up: last four, answered turns only", () => {
  const chat = { messages: [
    { role: "user", content: "1" }, { role: "assistant", content: "a1", status: "complete" },
    { role: "user", content: "2" }, { role: "assistant", content: "", status: "failed" },
    { role: "user", content: "3" }, { role: "assistant", content: "a3", status: "complete" },
    { role: "user", content: "4" }, { role: "assistant", content: "a4", status: "interrupted" }
  ] };
  assert.deepEqual(historyFor(chat), [
    { role: "user", content: "2" }, { role: "user", content: "3" }, { role: "assistant", content: "a3" }, { role: "user", content: "4" }
  ]);
});
