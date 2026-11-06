import test from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import catalog from "../shared/mathInputCatalog.json" with { type: "json" };
import { mathItems, formatMathItem, expressionToLatex, insertDraftMath, updateDraftText, removeDraftMath, trimMathMessage, validateMathSpans } from "../shared/mathEditor.js";
import { splitMathDelimiters } from "../shared/mathSegments.js";
import { chatReducer, initialChatState } from "../src/pages/AITutor/chatState.js";

const format = (id, values = {}) => { const result = formatMathItem(id, values); assert.equal(result.valid, true, JSON.stringify(result.errors)); return result; };
const fieldValues = { expression: "س² + ١", x: "س", variable: "س", function: "جا", degree: "3", order: "2", index: "1", denominator: "س − ٢", firstCondition: "س ≤ ١", secondCondition: "س > ١" };

test("every original catalog item is available, completable and renderable; extensions do not replace it", () => {
  assert.equal(catalog.categories.flatMap(c => c.items).length, 105);
  assert.equal(mathItems.length, 110);
  for (const original of catalog.categories.flatMap(c => c.items)) assert.ok(mathItems.some(i => i.id === original.id));
  for (const item of mathItems) {
    const result = format(item.id, Object.fromEntries(item.fields.map(f => [f, fieldValues[f] || "٢"])));
    const markup = katex.renderToString(result.latex, { output: "mathml", throwOnError: true, strict: "ignore", trust: false });
    assert.match(markup, /<math/);
    assert.doesNotMatch(result.text, /\{[a-zA-Z]/);
  }
});
test("templates require all fields, reject zero denominators, invalid ranks and unsafe commands", () => {
  assert.equal(formatMathItem("fraction", { numerator: "س" }).valid, false);
  assert.equal(formatMathItem("fraction", { numerator: "س", denominator: "٠" }).valid, false);
  assert.equal(formatMathItem("nth-root", { expression: "س", degree: "0" }).valid, false);
  assert.equal(formatMathItem("integral", { expression: "س²", variable: "س + ١" }).valid, false);
  assert.equal(formatMathItem("sqrt", { expression: "\\href{https://x}{x}" }).valid, false);
  assert.equal(formatMathItem("sqrt", { expression: "س + (١" }).valid, false);
  assert.throws(() => expressionToLatex("<img src=x>"));
});
test("fractions, exponents and negative numbers retain their grouping", () => {
  assert.match(format("fraction", { numerator: "س + ١", denominator: "س − ٢" }).latex, /\\frac/);
  assert.match(expressionToLatex("س^(٢/٣)"), /\\frac/);
  const outer = expressionToLatex("جا(س)^٢"), inner = expressionToLatex("جا(س^٢)");
  assert.notEqual(outer, inner);
  assert.match(outer, /^\{\\operatorname/);
  assert.match(expressionToLatex("−س²"), /^-/);
});
test("inserting at the cursor preserves both sides and supports multiple equations, replacement, edit and delete", () => {
  let draft = { text: "كيف أحسب هذا؟", equations: [] };
  const frac = format("fraction", { numerator: "س + ١", denominator: "س − ٢" });
  const inserted = insertDraftMath(draft, { start: 9, end: 9 }, frac, "one");
  draft = inserted.draft;
  assert.equal(draft.text, "كيف أحسب " + frac.text + "هذا؟");
  draft = insertDraftMath(draft, { start: inserted.cursor, end: inserted.cursor }, format("x-square"), "two").draft;
  assert.equal(draft.equations.length, 2);
  const first = draft.equations[0];
  draft = insertDraftMath({ ...draft, equations: draft.equations.slice(1) }, first, format("sqrt", { expression: "ص" }), "edited").draft;
  assert.equal(draft.equations.length, 2);
  const untouched = draft.equations[1];
  draft = removeDraftMath(draft, "edited");
  assert.equal(draft.equations[0].key, untouched.key);
  assert.equal(validateMathSpans(draft.text, draft.equations).length, 1);
});
test("typing before equations shifts ranges; touching one makes only that equation editable as plain text", () => {
  let draft = insertDraftMath({ text: "سؤال: ", equations: [] }, { start: 6, end: 6 }, format("x-square"), "a").draft;
  draft = updateDraftText(draft, "مرحبًا " + draft.text);
  assert.equal(validateMathSpans(draft.text, draft.equations).length, 1);
  draft = updateDraftText(draft, draft.text.replace("س²", "ص²"));
  assert.equal(draft.equations.length, 0);
  assert.match(draft.text, /ص²/);
});
test("stable wire representation includes every integration/limit field and adjusts whitespace offsets", () => {
  const integral = format("definite-integral", { expression: "س²", variable: "س", lower: "٠", upper: "١" });
  assert.equal(integral.text, "تكامل (س²) بالنسبة إلى س من ٠ إلى ١");
  const limit = format("right-limit", { expression: "جا(س)/س", variable: "س", point: "٠" });
  assert.match(limit.text, /من اليمين/); assert.match(limit.latex, /\^\{\+\}/);
  const draft = insertDraftMath({ text: "  سؤال ", equations: [] }, { start: 7, end: 7 }, integral, "a").draft;
  const wire = trimMathMessage(draft);
  assert.equal(wire.content.slice(wire.equations[0].start, wire.equations[0].end), integral.text);
  assert.deepEqual(validateMathSpans(wire.content, JSON.parse(JSON.stringify(wire.equations))), wire.equations);
  assert.throws(() => validateMathSpans(wire.content, [{ ...wire.equations[0], values: { ...integral.values, upper: "٢" } }]));
});
test("equation metadata survives optimistic display and loading an old or new conversation", () => {
  const equation = { start: 0, end: 2, itemId: "x-square", values: {} };
  const state = chatReducer(initialChatState, { type: "questionSent", content: "س²", equations: [equation] });
  assert.deepEqual(state.messages[0].equations, [equation]);
  const reopened = chatReducer(initialChatState, { type: "chatOpened", chat: { id: "1", messages: [state.messages[0], { role: "user", content: "نص قديم" }] } });
  assert.deepEqual(reopened.messages[0].equations, [equation]); assert.deepEqual(reopened.messages[1].equations, []);
});
test("streaming math stays pending until the closing delimiter arrives, including multi-line displays", () => {
  assert.deepEqual(splitMathDelimiters("الجواب \\(\\frac{١}"), [{ type: "text", value: "الجواب " }, { type: "pending", value: "" }]);
  const result = splitMathDelimiters("الجواب \\(\\frac{1}{2}\\) ثم \\[س^2\n+1\\]");
  assert.equal(result.filter(p => p.type === "math").length, 2);
  assert.deepEqual(splitMathDelimiters("الاشتراك $39.99 بالشهر"), [{ type: "text", value: "الاشتراك $39.99 بالشهر" }]);
});
