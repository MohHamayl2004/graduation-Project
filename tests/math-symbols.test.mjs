import test from "node:test";
import assert from "node:assert/strict";
import { mathSymbols, insertMathSymbol } from "../src/pages/AITutor/mathSymbols.js";

test("palette contains the twelve requested, unique LaTeX tools", () => {
  assert.equal(mathSymbols.length, 12);
  assert.equal(new Set(mathSymbols.map((item) => item.id)).size, 12);
  assert.equal(mathSymbols.find((item) => item.id === "sum").latex, String.raw`\sum_{i=1}^{n} a_i`);
  for (const symbol of mathSymbols) assert.ok(symbol.name && symbol.latex && symbol.math);
});
test("insertion retains an Arabic question and positions the caret after the template", () => {
  const question = "اشرح لي كيفية حساب ";
  const symbol = mathSymbols[0];
  const result = insertMathSymbol(question, symbol);
  assert.equal(result.text, `${question}\\(${symbol.latex}\\)`);
  assert.equal(result.caret, result.text.length);
});
test("insertion replaces only the selection and keeps text on both sides", () => {
  const result = insertMathSymbol("قبل استبدل بعد", mathSymbols[2], 4, 10);
  assert.equal(result.text, String.raw`قبل \(\frac{a}{b}\) بعد`);
  assert.equal(result.text.slice(result.caret), " بعد");
});
test("oversized insertions are rejected without truncating the question", () => {
  const question = "س".repeat(1999);
  assert.equal(insertMathSymbol(question, mathSymbols[0]), null);
  assert.equal(question.length, 1999);
  assert.equal(insertMathSymbol("", mathSymbols[7]).text, String.raw`\(\pi\)`);
});
