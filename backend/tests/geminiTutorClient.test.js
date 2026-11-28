// The tutor on Gemini, tested against a fake Gemini stream (no key, no network).
import test from "node:test";
import assert from "node:assert/strict";
import { openGeminiTutorStream, contentsFor, GEMINI_RULES } from "../services/geminiTutorClient.js";
import { openTutorStream } from "../services/aiTutorClient.js";
import { aiServiceConfig } from "../config/aiService.js";

const sse = (chunks) => new Response(new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(new TextEncoder().encode(ch)); c.close(); } }), { status: 200, headers: { "content-type": "text/event-stream" } });
const event = (text, finishReason) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, ...(finishReason ? { finishReason } : {}) }] })}\n\n`;
const collect = async (iter) => { const out = []; for await (const e of iter) out.push(e); return out; };
const config = { geminiKey: "test-key", geminiModel: "gemini-test" };

test("only the answer text streams to the chat; gesture and emotion reach the 3D teacher", async () => {
  let sent;
  const fetchImpl = async (url, options) => { sent = { url, options }; return sse([event('{"text":"١) Δس = ٧ − '), event('٣ = ٤\\nالجواب: ٤","gesture":"EXP'), event('LAINING","emotion":"happy"}', "STOP")]); };
  const events = await collect(await openGeminiTutorStream({ question: "كم Δس؟", history: [{ role: "assistant", content: "أهلًا" }], config, fetchImpl }));
  const text = events.filter((e) => e.type === "delta").map((e) => e.text).join("");
  assert.equal(text, "١) Δس = ٧ − ٣ = ٤\nالجواب: ٤");
  const done = events.at(-1);
  assert.equal(done.type, "done"); assert.equal(done.gesture, "EXPLAINING"); assert.equal(done.emotion, "happy");
  assert.ok(done.warnings.includes("NO_BOOK_RETRIEVAL"), "never presented as a book-grounded answer");
  // The key goes in a header, never in the URL; the rules are the system instruction.
  assert.equal(sent.options.headers["x-goog-api-key"], "test-key");
  assert.ok(!sent.url.includes("test-key"));
  const body = JSON.parse(sent.options.body);
  assert.equal(body.systemInstruction.parts[0].text, GEMINI_RULES);
  assert.deepEqual(body.contents.map((c) => c.role), ["model", "user"]);
});

test("the rules are the main tutor's: curriculum notation, numbered steps, no claimed book pages", () => {
  for (const rule of ["ق(س)", "لا تستعمل f(x)", "مرقّمة", "«الجواب:»", "لا تدّعِ الرجوع إلى صفحة"]) assert.ok(GEMINI_RULES.includes(rule), rule);
  assert.equal(contentsFor("س", [{ role: "user", content: "a" }, { role: "system", content: "x" }]).length, 2, "only student and tutor turns are sent");
});

test("no key, a failed request or a blocked answer never breaks the chat", async () => {
  await assert.rejects(openGeminiTutorStream({ question: "x", config: {}, fetchImpl: async () => sse([]) }), (e) => e.code === "AI_MISCONFIGURED");
  await assert.rejects(openGeminiTutorStream({ question: "x", config, fetchImpl: async () => new Response("{}", { status: 403 }) }), (e) => e.code === "AI_UNAVAILABLE");
  const blocked = await collect(await openGeminiTutorStream({ question: "x", config, fetchImpl: async () => sse([`data: ${JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })}\n\n`]) }));
  assert.equal(blocked.at(-1).refused, true);
  assert.ok(blocked.some((e) => e.type === "delta" && e.text.length > 0), "the student reads why");
});

test("AI_SERVICE_PROVIDER=gemini routes the tutor to Gemini with the key from the environment", async () => {
  const cfg = aiServiceConfig({ AI_SERVICE_PROVIDER: "gemini", GEMINI_API_KEY: "env-key" });
  assert.equal(cfg.provider, "gemini"); assert.equal(cfg.geminiKey, "env-key"); assert.equal(cfg.geminiModel, "gemini-flash-lite-latest");
  await assert.rejects(openTutorStream({ question: "x", config: aiServiceConfig({ AI_SERVICE_PROVIDER: "gemini" }) }), (e) => e.code === "AI_MISCONFIGURED");
});
