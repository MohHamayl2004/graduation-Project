import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Search, X } from "lucide-react";
import { fieldLabels, formatMathItem, mathCategories, mathItem, quickMathIds } from "../../../../shared/mathEditor.js";
import MathFormula from "./MathFormula";

export default function MathSymbolsPanel({ initialEquation, onInsert, onClose }) {
  const [category, setCategory] = useState("powers-roots");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(initialEquation ? mathItem(initialEquation.itemId) : null);
  const [values, setValues] = useState(initialEquation?.values || {});
  const [attempted, setAttempted] = useState(false);
  const form = useRef(null), focusedField = useRef(null);
  const result = useMemo(() => selected ? formatMathItem(selected.id, values) : null, [selected, values]);
  const choose = item => {
    if (!item.fields.length) { onInsert(formatMathItem(item.id)); return; }
    setSelected(item); setValues({ variable: "س" }); setAttempted(false);
  };
  const submit = event => {
    event.preventDefault(); setAttempted(true);
    if (result.valid) onInsert(result);
    else requestAnimationFrame(() => form.current?.querySelector('[aria-invalid="true"]')?.focus());
  };
  const append = symbol => {
    const field = focusedField.current;
    if (!field) return;
    const { name, selectionStart: start, selectionEnd: end, value } = field;
    setValues(old => ({ ...old, [name]: value.slice(0, start) + symbol + value.slice(end) }));
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + symbol.length, start + symbol.length); });
  };
  const list = query.trim() ? mathCategories.flatMap(c => c.items).filter(i => i.labelAr.includes(query.trim()) || i.insertText.includes(query.trim())) : mathCategories.find(c => c.id === category).items;
  return createPortal(<div className="math-panel-layer fixed inset-0 z-[100] flex items-center justify-center bg-ink/45 p-3" data-dialog-layer>
    <section role="dialog" aria-modal="true" aria-labelledby="math-panel-heading" className="math-panel w-full max-w-3xl rounded-2xl border border-border bg-surface-raised shadow-xl" dir="rtl">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="math-panel-heading" className="text-lg font-semibold">{initialEquation ? "تعديل المعادلة" : "رموز الرياضيات"}</h2>
        <button type="button" onClick={onClose} data-dialog-close aria-label="إغلاق لوحة رموز الرياضيات" className="grid h-11 w-11 place-items-center rounded-lg border border-border"><X size={21} /></button>
      </header>
      {selected ? <form ref={form} onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="math-panel-body space-y-4 p-4">
          {!initialEquation && <button type="button" onClick={() => { setSelected(null); setAttempted(false); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3"><ArrowRight size={17} />كل الرموز والقوالب</button>}
          <h3 className="font-semibold text-primary">{selected.labelAr}</h3>
          {selected.id.includes("integral") && <p className="text-sm text-ink-muted">القالب متاح للكتابة؛ المعلّم الحالي يغطي التفاضل وقد يرفض أسئلة التكامل.</p>}
          <p className="text-sm text-ink-muted">اكتب بالعربي، مثل س² أو س + ١. استخدم الأقواس لتجميع التعبير.</p>
          <div className="flex flex-wrap gap-2" aria-label="رموز مساعدة للحقول">
            {["س", "ص", "ع", "²", "³", "√", "π", "∞", "+", "−", "(", ")", "/"].map(symbol => <button key={symbol} type="button" onPointerDown={e => e.preventDefault()} onClick={() => append(symbol)} className="min-h-11 min-w-11 rounded-lg border border-border bg-surface-alt px-2">{symbol}</button>)}
          </div>
          <div className="grid gap-x-4 sm:grid-cols-2">
            {selected.fields.map(field => <div key={field} className="min-w-0">
              <label htmlFor={`math-field-${field}`} className="mb-1 block text-sm font-medium">{fieldLabels[field] || field}</label>
              <input id={`math-field-${field}`} name={field} value={values[field] || ""} onFocus={e => { focusedField.current = e.currentTarget; }} onChange={e => setValues(old => ({ ...old, [field]: e.target.value }))} aria-invalid={Boolean(attempted && result.errors[field])} aria-describedby={`math-error-${field}`} maxLength={180} autoComplete="off" dir="rtl" inputMode={["index", "order", "degree"].includes(field) ? "numeric" : "text"} className={`w-full min-w-0 rounded-lg border bg-surface px-3 py-2 text-base ${attempted && result.errors[field] ? "border-error" : "border-border"}`} />
              <p id={`math-error-${field}`} className="min-h-7 py-1 text-xs text-error">{attempted && result.errors[field]}</p>
            </div>)}
          </div>
          <div className="rounded-xl border border-border bg-surface-alt p-3" aria-live="polite">
            <p className="mb-2 text-sm font-medium">معاينة المعادلة — من اليمين</p>
            {result.valid ? <><MathFormula latex={result.latex} label={result.text} /><p className="mt-2 text-sm text-ink-muted">{result.text}</p></> : <p className="text-sm text-ink-muted">أكمل الحقول لتظهر المعاينة.</p>}
          </div>
        </div>
        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-surface-raised p-3">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-border px-5">إلغاء</button>
          <button type="submit" className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white">{initialEquation ? "حفظ تعديل المعادلة" : "إدراج المعادلة"}</button>
        </footer>
      </form> : <div className="math-panel-body space-y-4 p-4">
        <div className="relative"><Search className="pointer-events-none absolute end-3 top-3 text-ink-muted" size={19} /><input aria-label="البحث عن رمز أو قالب" placeholder="ابحث: مشتقة، كسر، نهاية…" value={query} onChange={e => setQuery(e.target.value)} className="w-full rounded-lg border border-border px-3 py-2 pe-10 text-base" /></div>
        {!query && <><p className="text-sm font-semibold">الأكثر استخدامًا</p><div className="flex flex-wrap gap-2">{quickMathIds.map(id => <button key={id} type="button" onClick={() => choose(mathItem(id))} className="min-h-11 rounded-lg border border-primary/20 bg-primary-tint px-3 text-sm text-primary">{mathItem(id).labelAr}</button>)}</div></>}
        <div className="flex flex-wrap gap-2" aria-label="أقسام رموز الرياضيات">{mathCategories.map(c => <button key={c.id} type="button" aria-pressed={c.id === category && !query} onClick={() => { setCategory(c.id); setQuery(""); }} className={`min-h-11 rounded-lg border px-3 text-sm ${c.id === category && !query ? "border-primary bg-primary text-white" : "border-border"}`}>{c.labelAr}</button>)}</div>
        <p className="text-sm text-ink-muted">اضغط الرمز لإدراجه، أو القالب لملء حقوله. الإدراج لا يرسل السؤال.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{list.map(item => <button key={item.id} type="button" onClick={() => choose(item)} className="min-h-12 rounded-xl border border-border bg-surface-alt p-3 text-start text-sm font-medium">{item.labelAr}<span className="mt-1 block text-xs text-ink-muted">{item.fields.length ? "قالب قابل للتعبئة" : "إدراج مباشر"}</span></button>)}</div>
        {!list.length && <p role="status" className="p-3 text-ink-muted">ما لقينا رمزًا بهذا الاسم.</p>}
      </div>}
    </section>
  </div>, document.body);
}
