import test from "node:test";
import assert from "node:assert/strict";
import { mathSegments, renderEquation } from "../src/pages/AITutor/mathContent.js";

test("Arabic text and all supported math delimiters retain their order", () => {
  const parts = mathSegments(String.raw`اشرح \(\frac{a}{b}\) ثم $\sqrt{x}$ و \[\int_0^1 x dx\]`);
  assert.deepEqual(parts.filter(p => p.type === "math").map(p => p.latex), [String.raw`\frac{a}{b}`, String.raw`\sqrt{x}`, String.raw`\int_0^1 x dx`]);
  assert.equal(parts[0].text, "اشرح ");
  assert.equal(parts.at(-1).display, true);
  assert.deepEqual(mathSegments(String.raw`نص \(غير مكتمل`), [{ type: "text", text: String.raw`نص \(غير مكتمل` }]);
});

test("fractions, roots, sums, and integrals produce safe typeset math", () => {
  for (const latex of [String.raw`\frac{a}{b}`, String.raw`\sqrt{x}`, String.raw`\sum_{i=1}^{n} a_i`, String.raw`\int_0^1 x dx`]) assert.match(renderEquation(latex), /class="katex"/);
  assert.doesNotMatch(renderEquation(String.raw`\href{javascript:alert(1)}{x}`), /href="javascript:/);
  assert.doesNotThrow(() => renderEquation(String.raw`\frac{`));
});
