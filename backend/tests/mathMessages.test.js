import test from "node:test";
import assert from "node:assert/strict";
import AIChat from "../models/AIChat.js";
import { messageDto, historyFor } from "../services/tutorChatService.js";
import { validateMessageInput } from "../validation/tutorValidation.js";
import { formatMathItem } from "../../shared/mathEditor.js";

test("math message validation preserves complete human-readable limits and stored template fields", () => {
  const formatted = formatMathItem("right-limit", { expression: "جا(س)/س", variable: "س", point: "٠" });
  const content = "أوجد " + formatted.text;
  const eq = { start: 5, end: content.length, itemId: formatted.itemId, values: formatted.values };
  const valid = validateMessageInput({ content, equations: [eq] });
  assert.deepEqual(valid, { content, equations: [eq] });
  assert.match(valid.content, /جا\(س\)\/س/); assert.match(valid.content, /من اليمين/);
  assert.throws(() => validateMessageInput({ content, equations: [{ ...eq, values: { ...eq.values, point: "١" } }] }), { code: "VALIDATION_ERROR" });
  assert.throws(() => validateMessageInput({ content, equations: [{ ...eq, start: 0 }] }), { code: "VALIDATION_ERROR" });
  assert.throws(() => validateMessageInput({ content, equations: "not-an-array" }), { code: "VALIDATION_ERROR" });
  assert.throws(() => validateMessageInput({ content, equations: [eq, eq] }), { code: "VALIDATION_ERROR" });
});
test("Mongoose casting and database JSON round trip preserve math spans, Arabic symbols, bounds and old messages", () => {
  const formatted = formatMathItem("definite-integral", { expression: "س²", variable: "س", lower: "٠", upper: "١" });
  const equation = { start: 0, end: formatted.text.length, itemId: formatted.itemId, values: formatted.values };
  const chat = new AIChat({ owner: "64b000000000000000000001", messages: [{ role: "user", content: formatted.text, equations: [equation] }, { role: "assistant", content: "نص قديم" }] });
  assert.equal(chat.validateSync(), undefined);
  const saved = new AIChat(JSON.parse(JSON.stringify(chat)));
  const dto = JSON.parse(JSON.stringify(messageDto(saved.messages[0])));
  assert.deepEqual(dto.equations, [equation]);
  assert.equal(dto.content, formatted.text);
  assert.deepEqual(messageDto(saved.messages[1]).equations, []);
  assert.equal(historyFor(saved)[0].content, formatted.text);
});
