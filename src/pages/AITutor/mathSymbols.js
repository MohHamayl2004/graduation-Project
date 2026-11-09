// Palette templates become editable MathLive fields; MathML supplies button previews.
export const mathSymbols = [
  { id: "sum", name: "المجموع", latex: String.raw`\sum_{i=1}^{n} a_i`, math: ["mo", "∑"] },
  { id: "integral", name: "التكامل", latex: String.raw`\int f(x)\,dx`, math: ["mo", "∫"] },
  { id: "fraction", name: "الكسر", latex: String.raw`\frac{a}{b}`, math: ["mfrac", ["mi", "a"], ["mi", "b"]] },
  { id: "root", name: "الجذر", latex: String.raw`\sqrt{x}`, math: ["msqrt", ["mi", "x"]] },
  { id: "limit", name: "النهاية", latex: String.raw`\lim_{x\to 0}`, math: ["mi", "lim"] },
  { id: "power", name: "الأس", latex: "x^{n}", math: ["msup", ["mi", "x"], ["mi", "n"]] },
  { id: "infinity", name: "الرمز اللانهائي", latex: String.raw`\infty`, math: ["mo", "∞"] },
  { id: "pi", name: "باي", latex: String.raw`\pi`, math: ["mi", "π"] },
  { id: "alpha", name: "ألفا", latex: String.raw`\alpha`, math: ["mi", "α"] },
  { id: "theta", name: "ثيتا", latex: String.raw`\theta`, math: ["mi", "θ"] },
  { id: "vector", name: "المتجه", latex: String.raw`\vec{v}`, math: ["mover", ["mi", "v"], ["mo", "→"]] },
  { id: "definite", name: "التكامل المحدد", latex: String.raw`\int_{a}^{b} f(x)\,dx`, math: ["msubsup", ["mo", "∫"], ["mi", "a"], ["mi", "b"]] }
];

export function insertMathSymbol(text, symbol, start = text.length, end = start, maxLength = 2000) {
  const from = Math.max(0, Math.min(start, text.length));
  const to = Math.max(from, Math.min(end, text.length));
  const before = text.slice(0, from), after = text.slice(to);
  const insertion = `${before && !/\s$/.test(before) ? " " : ""}\\(${symbol.latex}\\)${after && !/^\s/.test(after) ? " " : ""}`;
  const next = before + insertion + after;
  return next.length > maxLength ? null : { text: next, caret: from + insertion.length };
}
