import { useEffect, useRef, useState } from "react";
import { Clock3, X } from "lucide-react";
import Button from "../../components/common/Button";

const pad = (value) => String(value).padStart(2, "0");
const describeTime = (hour, minute) => `${hour % 12 || 12}:${pad(minute)} ${hour >= 12 ? "مساءً" : "صباحًا"}`;

function Wheel({ label, count, value, onChange, format, isDisabled = () => false }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.scrollTop = value * 40; }, []);
  const select = (number) => {
    if (isDisabled(number)) return;
    onChange(number);
    ref.current.scrollTo({ top: number * 40, behavior: "smooth" });
  };
  return <div className="min-w-0 flex-1 text-center">
    <p className="mb-2 text-sm font-medium text-ink-muted">{label}</p>
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface-alt">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-20 h-10 border-y border-primary/25 bg-primary/10" />
      <div ref={ref} role="listbox" aria-label={label} tabIndex={0} aria-activedescendant={`${label}-${value}`} onKeyDown={(event) => {
        let next;
        if (event.key === "ArrowDown") next = (value + 1) % count;
        if (event.key === "ArrowUp") next = (value + count - 1) % count;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = count - 1;
        if (next !== undefined) {
          event.preventDefault();
          const direction = event.key === "ArrowUp" || event.key === "End" ? -1 : 1;
          for (let tries = 0; tries < count && isDisabled(next); tries++) next = (next + direction + count) % count;
          select(next);
        }
      }} onScroll={(event) => onChange(Math.max(0, Math.min(count - 1, Math.round(event.currentTarget.scrollTop / 40))))}
        className="relative h-[200px] overflow-y-auto overscroll-contain py-20" style={{ scrollSnapType: "y mandatory", scrollbarWidth: "none" }}>
        {Array.from({ length: count }, (_, number) => <div key={number} id={`${label}-${number}`} role="option" aria-disabled={isDisabled(number)} aria-selected={value === number} onClick={() => select(number)} className={`flex h-10 items-center justify-center text-lg ${isDisabled(number) ? "cursor-not-allowed text-ink-faint opacity-40" : value === number ? "cursor-pointer font-semibold text-primary" : "cursor-pointer text-ink-muted"}`} style={{ scrollSnapAlign: "center" }}>{format(number)}</div>)}
      </div>
    </div>
  </div>;
}

export default function TimeWheelPicker({ value, onChange, label, disabled, validate, suggestedValue }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(17);
  const [minute, setMinute] = useState(0);
  const trigger = useRef(null);
  const dialog = useRef(null);
  const chosen = `${pad(hour)}:${pad(minute)}`;
  const error = validate?.(chosen) || "";
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    dialog.current?.focus();
    const key = (event) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") {
        const targets = [...dialog.current.querySelectorAll('button:not(:disabled), [tabindex="0"]')];
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  return <div className="min-w-[110px] flex-1">
    <p className="text-sm text-ink-muted">{label}</p>
    <button ref={trigger} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${value ? describeTime(Number(value.slice(0, 2)), Number(value.slice(3))) : "اختر الوقت"}`} onClick={() => {
      const initial = value || suggestedValue || "17:00";
      setHour(Number(initial.slice(0, 2))); setMinute(Number(initial.slice(3))); setOpen(true);
    }} className="mt-2 flex h-11 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface-raised px-3 text-sm hover:border-primary"><span>{value ? describeTime(Number(value.slice(0, 2)), Number(value.slice(3))) : "اختر الوقت"}</span><Clock3 size={16} className="shrink-0 text-ink-muted" /></button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={`اختيار الوقت — ${label}`} tabIndex={-1} className="w-full max-w-sm rounded-2xl bg-surface-raised p-6 shadow-xl" dir="rtl">
        <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{label}</h3><button type="button" aria-label="إغلاق اختيار الوقت" onClick={close} className="rounded-md p-2 text-ink-muted"><X size={18} /></button></div>
        <p className="mt-1 text-sm text-ink-muted">مرّر الساعات والدقائق لاختيار الوقت.</p>
        <p role="status" className="my-4 rounded-lg bg-primary-tint py-3 text-center text-xl font-semibold text-primary">{describeTime(hour, minute)}</p>
        <div className="flex gap-5" dir="ltr"><Wheel label="الساعة" count={24} value={hour} onChange={setHour} isDisabled={(h) => Boolean(validate) && Array.from({ length: 60 }, (_, m) => `${pad(h)}:${pad(m)}`).every((time) => Boolean(validate(time)))} format={(h) => `${h % 12 || 12} ${h >= 12 ? "م" : "ص"}`} /><Wheel label="الدقائق" count={60} value={minute} onChange={setMinute} isDisabled={(m) => Boolean(validate?.(`${pad(hour)}:${pad(m)}`))} format={pad} /></div>
        <p className="mt-4 text-xs leading-6 text-ink-muted">الصباح والمساء بيتغيروا تلقائيًا عند المرور بالساعة ١٢.</p>
        <p role={error ? "alert" : undefined} className="mt-3 min-h-12 text-sm leading-6 text-error">{error || "\u00a0"}</p>
        <Button fullWidth className="mt-4" disabled={Boolean(error)} onClick={() => { if (!error) { onChange(chosen); close(); } }}>اعتماد الوقت</Button>
      </div>
    </div>}
  </div>;
}
