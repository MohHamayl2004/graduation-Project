import { mathParts } from "../chatState";
import { mathSegments, renderEquation } from "../mathContent";
import "katex/dist/katex.min.css";

// Equations in the textbook's Arabic notation read right to left.
const ARABIC_MATH = /[\u0600-\u06ff]/;

// Book notation as the book prints it: س^٢ becomes a superscript,
// everything else is plain text. Never HTML from the model.
export default function MathText({ text, className = "" }) {
  return (
    <span className={className} dir={ARABIC_MATH.test(text) ? "rtl" : "auto"}>
      {mathSegments(text).map((segment, index) => segment.type === "math"
        ? <span key={index} dir={ARABIC_MATH.test(segment.latex) ? "rtl" : "ltr"} className={`tutor-rendered-math${ARABIC_MATH.test(segment.latex) ? " tutor-rtl-math" : ""}${segment.display ? " tutor-display-math" : ""}`} dangerouslySetInnerHTML={{ __html: renderEquation(segment.latex, segment.display) }} />
        : <span key={index}>{mathParts(segment.text).map((part, i) => part.type === "sup" ? <sup key={i} className="text-[0.75em]">{part.value}</sup> : part.value)}</span>)}
    </span>
  );
}
