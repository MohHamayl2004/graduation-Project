import { useState } from "react";
import { Calculator, Atom, FlaskConical, Dna, BookOpen, Languages, MoonStar, Church, ChevronDown } from "lucide-react";
import { studySubjects } from "../../../shared/studyPlanCatalog";

const icons = { math: Calculator, physics: Atom, chemistry: FlaskConical, biology: Dna, arabic: BookOpen, english: Languages, islamic: MoonStar, christian: Church };
const tones = { math: "bg-primary-tint text-primary", physics: "bg-sky-50 text-sky-700", chemistry: "bg-violet-50 text-violet-700", biology: "bg-emerald-50 text-emerald-700", arabic: "bg-amber-50 text-amber-700", english: "bg-rose-50 text-rose-700", islamic: "bg-teal-50 text-teal-700", christian: "bg-indigo-50 text-indigo-700" };

export default function SubjectPicker({ selected, onChange, allowedIds }) {
  const [opened, setOpened] = useState({});
  const toggleMany = (ids) => {
    const all = ids.every((id) => selected.includes(id));
    onChange(all ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])]);
  };
  return (
    <div className="space-y-3">
      {studySubjects.map((original) => {
        const subject = allowedIds ? { ...original, units: original.units.map((u) => ({ ...u, lessons: u.lessons.filter((l) => allowedIds.includes(l.id)) })).filter((u) => u.lessons.length) } : original;
        if (allowedIds && !subject.units.length) return null;
        const Icon = icons[subject.id];
        const ids = subject.units.flatMap((u) => u.lessons.map((l) => l.id));
        const count = ids.filter((id) => selected.includes(id)).length;
        const open = Boolean(opened[subject.id]);
        return (
          <section key={subject.id} className={`overflow-hidden rounded-xl border ${count ? "border-primary/40" : "border-border"}`}>
            <div className="flex items-center gap-3 bg-surface-raised p-4">
              <input type="checkbox" aria-label={`اختيار جميع دروس ${subject.title}`} disabled={!ids.length} checked={Boolean(ids.length) && count === ids.length}
                ref={(node) => { if (node) node.indeterminate = count > 0 && count < ids.length; }}
                className="h-4 w-4 shrink-0 accent-primary" onChange={() => { toggleMany(ids); setOpened((old) => ({ ...old, [subject.id]: true })); }} />
              <button type="button" aria-expanded={open} aria-controls={`units-${subject.id}`} onClick={() => setOpened((old) => ({ ...old, [subject.id]: !open }))} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tones[subject.id]}`}><Icon size={23} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block font-semibold">{subject.title}</span><span className="text-xs text-ink-muted">{ids.length ? `${subject.units.length} وحدات · ${count} من ${ids.length} دروس محددة` : "بدون دروس حاليًا"}</span></span>
                <ChevronDown size={20} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
            </div>
            <div id={`units-${subject.id}`} hidden={!open} className="border-t border-border bg-surface-alt px-4 py-2 sm:px-6">
              {!ids.length && <p className="py-4 text-sm text-ink-muted">رح نضيف دروس اللغة الإنجليزية لاحقًا. اختَر من المواد الأخرى حاليًا.</p>}
              {subject.units.map((unit, i) => {
                const unitIds = unit.lessons.map((l) => l.id);
                const unitCount = unitIds.filter((id) => selected.includes(id)).length;
                return (
                  <div key={unit.id} className="border-b border-border py-4 last:border-0">
                    <label className="flex cursor-pointer items-start gap-3 font-semibold">
                      <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={unitCount === unitIds.length}
                        ref={(node) => { if (node) node.indeterminate = unitCount > 0 && unitCount < unitIds.length; }} onChange={() => toggleMany(unitIds)} />
                      <span>{i + 1}. {unit.title}</span>
                    </label>
                    <div className="ms-2 mt-3 space-y-1 border-s border-border ps-5">
                      {unit.lessons.map((lesson) => (
                        <label key={lesson.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-sm leading-6 hover:bg-surface-raised">
                          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" checked={selected.includes(lesson.id)} onChange={() => toggleMany([lesson.id])} />{lesson.title}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
