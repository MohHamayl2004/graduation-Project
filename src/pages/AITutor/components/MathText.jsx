import { mathParts } from "../chatState";
import { expressionToLatex, formatMathItem } from "../../../../shared/mathEditor.js";
import { splitMathDelimiters } from "../../../../shared/mathSegments.js";
import MathFormula from "./MathFormula";

// Book notation as the book prints it: س^٢ becomes a superscript,
// everything else is plain text. Never HTML from the model.
export default function MathText({ text = "", equations = [], streaming = false, className = "" }) {
  const segments = [];
  let end = 0;
  for (const equation of equations) {
    const formatted = formatMathItem(equation.itemId, equation.values);
    if (!formatted.valid || equation.start < end || text.slice(equation.start, equation.end) !== formatted.text) continue;
    if (equation.start > end) segments.push({ type: "text", value: text.slice(end, equation.start) });
    segments.push({ type: "math", value: formatted.latex, label: formatted.text });
    end = equation.end;
  }
  if (end < text.length) segments.push({ type: "text", value: text.slice(end) });
  const renderPlain = (value, key) => {
    const labelled = value.match(/^(.*?[:：]\s*)([^\n]+)$/);
    if (labelled) return <span key={key}><span>{labelled[1]}</span>{renderPlain(labelled[2], `${key}-formula`)}</span>;
    // Book notation is supported alongside explicit model math delimiters.
    // Only a mathematical clause is typeset, never an arbitrary prose line.
    if (/^[سصقكهـعفنمت0-9٠-٩(√πΔ]/u.test(value.trim()) && /[=²³^√/]|[′″]/.test(value) && !/(?:^|\s)(?:عند|عندما|حيث|إذا|أو|ثم|من|إلى|جد|بدي|الجواب)(?:\s|$)/.test(value.trim()) && !/\s[\p{L}]{4,}/u.test(value)) {
      try { return <MathFormula key={key} latex={expressionToLatex(value)} label={value} />; } catch { /* Old prose remains readable. */ }
    }
    if (/\\(?:frac|int|sqrt|lim|begin|text)\b/.test(value)) return <span key={key} className="math-render-note">{streaming ? "جارٍ إكمال المعادلة…" : "تعذّر تنسيق هذا الجزء من المعادلة."}</span>;
    return <span key={key}>{mathParts(value).map((part, index) => part.type === "sup" ? <sup key={index} className="text-[0.75em]">{part.value}</sup> : <span key={index}>{part.value}</span>)}</span>;
  };
  return (
    <span className={`math-message-text ${className}`} dir="rtl">
      {segments.flatMap((segment, index) => segment.type === "math" ? [<MathFormula key={`equation-${index}`} latex={segment.value} label={segment.label} />] : splitMathDelimiters(segment.value).map((part, i) => part.type === "math" ? <MathFormula key={`${index}-${i}`} latex={part.value} pending={streaming} /> : part.type === "pending" ? <span key={`${index}-${i}`} className="math-render-note">{streaming ? "جارٍ إكمال المعادلة…" : "المعادلة غير مكتملة في الرد."}</span> : renderPlain(part.value, `${index}-${i}`)))}
    </span>
  );
}
