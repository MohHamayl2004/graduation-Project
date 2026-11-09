import { mathParts } from "../chatState";
import { createElement } from "react";
import { mathSegments, renderEquation } from "../mathContent";
import "katex/dist/katex.min.css";

// Curated palette previews use MathML. Message formulas use trusted KaTeX output.
const mathNode = (node, key = 0) => typeof node === "string" ? node : createElement(node[0], { key }, ...node.slice(1).map((child, index) => mathNode(child, index)));
export function MathFormula({ equation }) {
  return <math xmlns="http://www.w3.org/1998/Math/MathML" display="block" dir="ltr" aria-label={equation.latex}>
    <semantics>{mathNode(equation.math)}<annotation encoding="application/x-tex">{equation.latex}</annotation></semantics>
  </math>;
}

// Book notation as the book prints it: س^٢ becomes a superscript,
// everything else is plain text. Never HTML from the model.
export default function MathText({ text, className = "" }) {
  return (
    <span className={className} dir="auto">
      {mathSegments(text).map((segment, index) => segment.type === "math"
        ? <span key={index} dir="ltr" className={`tutor-rendered-math${segment.display ? " tutor-display-math" : ""}`} dangerouslySetInnerHTML={{ __html: renderEquation(segment.latex, segment.display) }} />
        : <span key={index}>{mathParts(segment.text).map((part, i) => part.type === "sup" ? <sup key={i} className="text-[0.75em]">{part.value}</sup> : part.value)}</span>)}
    </span>
  );
}
