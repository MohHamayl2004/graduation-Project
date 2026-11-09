import { useEffect, useId, useRef, useState } from "react";
import { mathTemplates } from "../mathTemplates";
import { renderEquation } from "../mathContent";
import "katex/dist/katex.min.css";

// Buttons must not take focus, or the caret would leave the question at every press.
export default function MathMenu({ onInsert, disabled }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const outside = (event) => { if (!root.current.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  return <div ref={root} className="math-menu" onMouseDown={(event) => event.preventDefault()}>
    <button type="button" className="math-menu-trigger" aria-expanded={open} aria-controls={menuId} disabled={disabled} onClick={() => setOpen((value) => !value)}>معادلة</button>
    {open && <div id={menuId} className="math-menu-panel" role="group" aria-label="نوع المعادلة">
      {mathTemplates.map((item) => <button key={item.id} type="button" className="math-menu-option" aria-label={`إضافة ${item.name}`} onClick={() => { onInsert(item); setOpen(false); }}>
        <span className="math-menu-preview tutor-rtl-math" aria-hidden="true" dir="rtl" dangerouslySetInnerHTML={{ __html: renderEquation(item.label) }} />
        <span className="math-menu-name">{item.name}</span>
      </button>)}
    </div>}
  </div>;
}
