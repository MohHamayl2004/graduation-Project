// Quiz math markup: {num|den} is a fraction (nesting allowed), _{x} a subscript.
export function parseMath(text) {
  const nodes = [];
  let buffer = "";
  const flush = () => { if (buffer) nodes.push(buffer); buffer = ""; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const sub = ch === "_" && text[i + 1] === "{";
    if (ch !== "{" && !sub) { buffer += ch; continue; }
    const start = sub ? i + 2 : i + 1;
    let depth = 1, j = start, bar = -1;
    for (; j < text.length && depth; j++) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
      else if (text[j] === "|" && depth === 1 && bar < 0) bar = j;
    }
    if (depth) { buffer += ch; continue; } // unbalanced: show as written
    const end = j - 1;
    flush();
    if (sub) nodes.push({ sub: parseMath(text.slice(start, end)) });
    else if (bar > 0) nodes.push({ num: parseMath(text.slice(start, bar)), den: parseMath(text.slice(bar + 1, end)) });
    else nodes.push(...parseMath(text.slice(start, end)));
    i = end;
  }
  flush();
  return nodes;
}
