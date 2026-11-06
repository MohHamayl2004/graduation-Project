// Complete delimiters render immediately; an incomplete streamed formula stays
// a single pending fragment, never raw TeX or a repeated renderer exception.
export function splitMathDelimiters(text) {
  const parts = [];
  const opening = /\\\(|\\\[|\$\$|(?<!\\)\$(?=[^\s$])/g;
  let cursor = 0, match;
  while ((match = opening.exec(text))) {
    if (match.index < cursor) continue;
    const endToken = ({ "\\(": "\\)", "\\[": "\\]", "$$": "$$", "$": "$" })[match[0]];
    const close = text.indexOf(endToken, match.index + match[0].length);
    if (match[0] === "$" && (close < 0 || /^\d+(?:\.\d+)?\s/.test(text.slice(match.index + 1)))) continue;
    if (match.index > cursor) parts.push({ type: "text", value: text.slice(cursor, match.index) });
    if (close < 0) { parts.push({ type: "pending", value: "" }); cursor = text.length; break; }
    parts.push({ type: "math", value: text.slice(match.index + match[0].length, close) });
    cursor = close + endToken.length; opening.lastIndex = cursor;
  }
  if (cursor < text.length) parts.push({ type: "text", value: text.slice(cursor) });
  return parts;
}
