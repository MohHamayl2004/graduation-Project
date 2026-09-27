import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readNdjson } from "../src/utils/ndjson.js";
import { applyStreamEvent, chatReducer, initialChatState, layoutAnswer, mathParts, sourceLabel, toArabicDigits } from "../src/pages/AITutor/chatState.js";

// Contract v1 fixtures, shared with the API tests and the AI service.
const fixture = (name) => readFile(new URL(`../docs/contracts/fixtures/${name}.ndjson`, import.meta.url), "utf8");
const parseLines = (text) => text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

// A fetch()-style body whose chunks cut through lines and Arabic characters.
function body(text, size) {
  const bytes = new TextEncoder().encode(text);
  let offset = 0;
  return { getReader: () => ({
    read: async () => (offset >= bytes.length ? { done: true } : { done: false, value: bytes.slice(offset, (offset += size)) }),
    releaseLock() {}
  }) };
}

async function collect(iterable) { const out = []; for await (const item of iterable) out.push(item); return out; }

const replay = (events, state = { ...initialChatState, chatId: "c1" }) => {
  let next = chatReducer(state, { type: "questionSent", content: "سؤال", userId: "u", assistantId: "a" });
  for (const event of events) next = chatReducer(next, { type: "streamEvent", event });
  return next;
};

test("stream reader: any chunking gives the same events", async () => {
  const text = await fixture("answer");
  for (const size of [1, 2, 5, 13, 1024]) assert.deepEqual(await collect(readNdjson(body(text, size))), parseLines(text), `chunk ${size}`);
});

test("an answer stream builds the message the student sees, in order", async () => {
  const events = parseLines(await fixture("answer"));
  const state = replay(events);
  const answer = state.messages.at(-1);
  assert.equal(state.phase, "idle");
  assert.equal(answer.status, "complete");
  assert.equal(answer.content, events.at(-1).answer);
  assert.equal(answer.calculation.answer, "٨");
  assert.equal(answer.sources.length, 2);
});

test("while streaming: sources and the verified result come before the text", async () => {
  const events = parseLines(await fixture("answer"));
  const upToCalculation = events.slice(0, 3);
  const state = replay(upToCalculation);
  const answer = state.messages.at(-1);
  assert.equal(state.phase, "streaming");
  assert.equal(answer.status, "streaming");
  assert.equal(answer.content, "");
  assert.equal(answer.sources[0].lesson, "1-2");
  assert.equal(answer.calculation.answer, "٨");
});

test("a refusal is a calm answer, not an error", async () => {
  const state = replay(parseLines(await fixture("refusal")));
  assert.equal(state.messages.at(-1).status, "refused");
  assert.equal(state.messages.at(-1).errorMessage, null);
});

test("an error event shows its Arabic message; partial text is kept", async () => {
  const failed = replay(parseLines(await fixture("error"))).messages.at(-1);
  assert.equal(failed.status, "failed");
  assert.match(failed.errorMessage, /غير متاح/);

  const partial = replay([{ type: "meta" }, { type: "delta", text: "نستخدم" }, { type: "error", code: "AI_TIMEOUT", message: "استغرق…" }]).messages.at(-1);
  assert.deepEqual([partial.status, partial.content], ["interrupted", "نستخدم"]);
});

test("stop and request failures end the stream without losing text", () => {
  let state = replay([{ type: "meta" }, { type: "delta", text: "جزء" }]);
  const stopped = chatReducer(state, { type: "stopped" });
  assert.deepEqual([stopped.phase, stopped.messages.at(-1).status, stopped.messages.at(-1).content], ["idle", "interrupted", "جزء"]);

  state = chatReducer({ ...initialChatState, chatId: "c1" }, { type: "questionSent", content: "س", userId: "u", assistantId: "a" });
  const busy = chatReducer(state, { type: "streamFailed", message: "انتظر حتى يكتمل الجواب السابق" });
  assert.deepEqual([busy.messages.at(-1).status, busy.messages.at(-1).errorMessage], ["failed", "انتظر حتى يكتمل الجواب السابق"]);
});

test("unknown event types are ignored", () => {
  const message = { id: "a", role: "assistant", content: "x", status: "streaming", sources: [], calculation: null };
  assert.deepEqual(applyStreamEvent(message, { type: "from-the-future" }), message);
});

test("the server's message id replaces the temporary one", () => {
  const state = replay([{ type: "meta", chatId: "c1", messageId: "m-123" }]);
  assert.equal(state.messages.at(-1).id, "m-123");
});

test("source labels are book coordinates in Arabic digits", () => {
  assert.equal(sourceLabel({ document: "math", lesson: "1-2", pages: [16, 17] }), "الدرس ١-٢ · صفحة ١٦–١٧");
  assert.equal(sourceLabel({ document: "math", lesson: "1-5", pages: [38] }), "الدرس ١-٥ · صفحة ٣٨");
  assert.equal(sourceLabel({ document: "solutions", lesson: "حل ١-٢", pages: [8] }), "دليل الحلول · صفحة ٨");
  assert.equal(toArabicDigits("ق′(4) = -7"), "ق′(٤) = -٧");
});

test("the first question titles a new chat", () => {
  const state = chatReducer({ ...initialChatState, chatId: "c1", chats: [{ id: "c1", title: "محادثة جديدة" }] }, { type: "questionSent", content: "شو يعني متوسط التغير؟", userId: "u", assistantId: "a" });
  assert.equal(state.chats[0].title, "شو يعني متوسط التغير؟");
});

test("the chat page never renders model text as HTML", async () => {
  const sources = await Promise.all(["src/pages/AITutor/MainChat.jsx", "src/pages/AITutor/components/AssistantMessage.jsx"].map((p) => readFile(new URL(`../${p}`, import.meta.url), "utf8")));
  for (const source of sources) assert.doesNotMatch(source, /dangerouslySetInnerHTML/);
});

test("an answer is laid out as steps, not as a paragraph", async () => {
  const blocks = layoutAnswer("١) بقاعدة الضرب\n٢) ق′(س) = ٩س^٢ − ٤س + ٣\n\nبالتعويض عند س = ١\nالجواب: ٨");
  assert.deepEqual(blocks.map((b) => b.kind), ["step", "step", "text", "final"]);
  assert.equal(blocks[0].text, "بقاعدة الضرب", "the number itself is not part of the step");
  assert.equal(blocks.at(-1).text, "الجواب: ٨");
});

test("a paragraph with no numbering is still readable", () => {
  const blocks = layoutAnswer("متوسط التغير هو التغير في ص مقسوماً على التغير في س.");
  assert.deepEqual(blocks.map((b) => b.kind), ["text"]);
});

test("powers are shown as superscripts, one-sided marks are not", () => {
  assert.deepEqual(mathParts("ق′(س) = ٩س^٢ − ٤س"), [
    { type: "text", value: "ق′(س) = ٩س" },
    { type: "sup", value: "٢" },
    { type: "text", value: " − ٤س" }
  ]);
  assert.deepEqual(mathParts("س^(٣/٤)"), [{ type: "text", value: "س" }, { type: "sup", value: "٣/٤" }]);
  assert.deepEqual(mathParts("ق′(س_١)^+"), [{ type: "text", value: "ق′(س_١)^+" }]);
});

test("the computed steps reach the message and survive a reload", async () => {
  const events = parseLines(await fixture("answer"));
  const state = replay(events);
  assert.equal(state.messages.at(-1).calculation.facts.length, 4);
  const reopened = chatReducer(initialChatState, { type: "chatOpened", chat: { id: "c1", messages: [
    { id: "m1", role: "assistant", content: "x", status: "complete", sources: [], calculation: { answer: "٨", facts: ["ق′(١) = ٨"] } }
  ] } });
  assert.deepEqual(reopened.messages[0].calculation, { answer: "٨", facts: ["ق′(١) = ٨"] });
});
