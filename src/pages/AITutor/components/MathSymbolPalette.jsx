import { useEffect, useState } from "react";
import { mathSymbols } from "../mathSymbols";
import { MathFormula } from "./MathText";

export default function MathSymbolPalette({ onInsert }) {
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(false), 4000);
    return () => clearTimeout(timer);
  }, [error]);
  return <>
    <div className="math-symbol-grid">{mathSymbols.map((symbol) => <button key={symbol.id} type="button" className="math-symbol-button" title={symbol.name} aria-label={`إضافة ${symbol.name} إلى السؤال`} onClick={() => setError(onInsert(symbol) === false)}>
      <span className="math-symbol-preview" aria-hidden="true"><MathFormula equation={symbol} /></span>
      <span className="math-symbol-label">{symbol.name}</span>
    </button>)}</div>
    {error && <p role="alert" className="math-symbol-error">السؤال طويل؛ اختصره قليلًا قبل إضافة الرمز.</p>}
  </>;
}
