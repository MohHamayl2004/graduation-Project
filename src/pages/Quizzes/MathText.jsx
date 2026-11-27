// Renders the quiz math markup (see mathMarkup.js): stacked fractions and subscripts.
import { parseMath } from "./mathMarkup.js";

function render(nodes) {
  return nodes.map((n, i) => {
    // A negative number keeps its minus sign before the digits inside Arabic text.
    if (typeof n === "string") return <span key={i}>{n.split(/(−[٠-٩0-9.]+)/).map((part, j) => /^−/.test(part) ? <bdi key={j} dir="ltr">{part}</bdi> : part)}</span>;
    if (n.sub) return <sub key={i} className="qz-sub">{render(n.sub)}</sub>;
    return <span key={i} className="qz-frac" role="math"><span className="qz-num">{render(n.num)}</span><span className="qz-den">{render(n.den)}</span></span>;
  });
}

export default function MathText({ children, className = "" }) {
  return <span className={`qz-math ${className}`}>{render(parseMath(String(children)))}</span>;
}
