import { mathParts } from "../chatState";

// Book notation as the book prints it: س^٢ becomes a superscript,
// everything else is plain text. Never HTML from the model.
export default function MathText({ text, className = "" }) {
  return (
    <span className={className} dir="auto">
      {mathParts(text).map((part, index) =>
        part.type === "sup" ? <sup key={index} className="text-[0.75em]">{part.value}</sup> : <span key={index}>{part.value}</span>
      )}
    </span>
  );
}
