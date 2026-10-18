import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addDays, validDate } from "../../../shared/studyPlanRules";
import "./calendar.css";

const weekdays = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const iso = (year, month, day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export default function MiniCalendar({ value, onChange, label, weekly = false, disabled = false, min, max }) {
  const initial = validDate(value) ? new Date(`${value}T12:00:00Z`) : new Date();
  const [view, setView] = useState({ year: initial.getUTCFullYear(), month: initial.getUTCMonth() });
  const first = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const count = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
  const title = new Date(Date.UTC(view.year, view.month, 15)).toLocaleDateString("ar-PS", { month: "long", year: "numeric", timeZone: "UTC" });
  const last = validDate(value) && weekly ? addDays(value, 6) : value;
  const changeMonth = (delta) => {
    const date = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: date.getUTCFullYear(), month: date.getUTCMonth() });
  };
  return <section aria-label={label} className="w-full max-w-md rounded-2xl border border-border bg-surface-raised p-2 sm:p-5">
    <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary"><CalendarDays size={17} />{label}</p>
    <div className="mb-4 flex items-center justify-between gap-2">
      <button type="button" disabled={disabled || view.year <= 1900} aria-label={`الشهر السابق — ${label}`} onClick={() => changeMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-border text-primary transition-colors hover:bg-primary-tint"><ChevronRight size={18} /></button>
      <p aria-live="polite" className="font-semibold">{title}</p>
      <button type="button" disabled={disabled || view.year >= 2200} aria-label={`الشهر التالي — ${label}`} onClick={() => changeMonth(1)} className="grid h-9 w-9 place-items-center rounded-full border border-border text-primary transition-colors hover:bg-primary-tint"><ChevronLeft size={18} /></button>
    </div>
    <div className="grid grid-cols-7 text-center">{weekdays.map((day) => <span key={day} className="py-2 text-[10px] font-medium text-ink-muted sm:text-xs">{day}</span>)}</div>
    <div key={`${view.year}-${view.month}`} className="nipras-calendar-month grid grid-cols-7 gap-y-1 text-center">
      {Array.from({ length: first }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
      {Array.from({ length: count }, (_, i) => {
        const date = iso(view.year, view.month, i + 1);
        const selected = date === value; const unavailable = disabled || (min && date < min) || (max && date > max);
        const inWeek = weekly && date > value && date <= last;
        return <button type="button" key={date} disabled={Boolean(unavailable)} aria-label={`${weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()]} ${i + 1} ${title}`} aria-pressed={selected} onClick={() => onChange(date)} className={`mx-auto grid h-11 w-full place-items-center rounded-xl text-sm transition-all duration-150 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:w-10 ${selected ? "bg-primary font-semibold text-white shadow-md" : inWeek ? "bg-primary-tint text-primary" : "text-ink hover:bg-surface-alt"}`}>{i + 1}</button>;
      })}
    </div>
    <label className="mt-3 block text-sm sm:hidden">أو اختَر التاريخ من الجهاز<input type="date" value={validDate(value) ? value : ""} min={min} max={max} disabled={disabled} onChange={(e) => { if (validDate(e.target.value)) onChange(e.target.value); }} className="mt-2 min-h-11 w-full rounded-lg border border-border bg-surface-raised px-3" /></label>
    <p className="mt-4 border-t border-border pt-3 text-xs text-ink-muted">{weekly ? "اختَر أول يوم للأسبوع؛ الأيام السبعة بتظهر بلون خفيف." : "اضغط على رقم اليوم لاختياره."}</p>
  </section>;
}
