import test from "node:test";
import assert from "node:assert/strict";
import { mathTemplates } from "../src/pages/AITutor/mathTemplates.js";
import { renderEquation } from "../src/pages/AITutor/mathContent.js";
import { mathSegments } from "../src/pages/AITutor/mathContent.js";
import { streamMessage } from "../src/services/tutorService.js";

const insert = (id) => mathTemplates.find((item) => item.id === id).insert;

test("every template has a unique id and a name", () => {
  assert.equal(new Set(mathTemplates.map((item) => item.id)).size, mathTemplates.length);
  for (const item of mathTemplates) assert.ok(item.name && item.insert);
});
test("every menu label typesets without a KaTeX error", () => {
  for (const item of mathTemplates) assert.doesNotMatch(renderEquation(item.label), /katex-error/, item.id);
});
test("the menu fills whole rows of six", () => {
  assert.equal(mathTemplates.length % 6, 0);
});
test("templates use the textbook's notation", () => {
  assert.equal(insert("جا"), String.raw`\text{جا}#?`);
  assert.equal(insert("prime"), String.raw`\text{قَ}(س)`);
  assert.equal(insert("derivative"), String.raw`\frac{\text{د ص}}{\text{د س}}`);
  assert.match(insert("definite"), /^\\int\\limits.*\\text\{دس\}$/);
  for (const item of mathTemplates) assert.doesNotMatch(item.insert, /dx|\\sin|\\lim\b/, item.id);
});
test("a limit is written under نهـــا and has slots for the value and the expression", () => {
  assert.match(insert("limit"), /\\limits_\{س\\leftarrow #\?\}/);
  assert.equal(insert("limit").match(/#\?/g).length, 2);
});

test("Arabic questions retain their equation when sent to the tutor", async () => {
  const originalFetch = globalThis.fetch;
  let submitted;
  globalThis.fetch = async (_url, options) => {
    submitted = JSON.parse(options.body);
    return new Response('{"type":"done"}\n', { status: 200 });
  };
  try {
    const question = String.raw`احسب \(\frac{س}{٢}+س^{٣}\)`;
    await streamMessage("token", "chat", question, { onEvent() {} });
    assert.equal(submitted.content, question);
    assert.equal(mathSegments(submitted.content)[1].latex, String.raw`\frac{س}{٢}+س^{٣}`);
  } finally { globalThis.fetch = originalFetch; }
});
