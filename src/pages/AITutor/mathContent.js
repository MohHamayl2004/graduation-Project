import katex from "katex";

export function mathSegments(value) {
  const text = String(value || "");
  const pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^\n$]+?)\$/g;
  const parts = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > end) parts.push({ type: "text", text: text.slice(end, match.index) });
    parts.push({ type: "math", latex: match[1] ?? match[2] ?? match[3] ?? match[4], display: match[2] !== undefined || match[3] !== undefined });
    end = match.index + match[0].length;
  }
  if (end < text.length) parts.push({ type: "text", text: text.slice(end) });
  return parts;
}

export const renderEquation = (latex, displayMode = false) => katex.renderToString(latex, {
  displayMode, throwOnError: false, trust: false, strict: "ignore", maxExpand: 200, maxSize: 10
});
