import { useEffect, useRef, useState } from "react";
import { CalendarDays, CalendarCheck, ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle2, Clock3 } from "lucide-react";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import SubjectPicker from "./SubjectPicker";
import TimeWheelPicker from "./TimeWheelPicker";
import MiniCalendar from "./MiniCalendar";
import { apiRequest } from "../../services/api";
import { studyLessons, studySubjects } from "../../../shared/studyPlanCatalog";
import { addDays, validDate, normalizeStudyPlan, formatDuration, timeMinutes, studySlotError } from "../../../shared/studyPlanRules";

const baseSteps = ["نوع الخطة", "هدف الدراسة", "الأيام والأوقات", "المواد والدروس", "مراجعة وحفظ الاختيارات"];

const dateLabel = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("ar-PS", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" });
const today = () => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jerusalem" }).format(new Date());

export function PlanSummary({ plan }) {
  return (
    <div className="space-y-5">
      <dl className="grid gap-4 rounded-lg bg-surface-alt p-4 text-sm sm:grid-cols-2">
        <div><dt className="text-ink-muted">المدة</dt><dd className="mt-1 font-semibold">{plan.type === "daily" ? "خطة يومية" : "خطة أسبوعية"} · <span dir="ltr">{plan.periodStart}{plan.type === "weekly" ? ` — ${plan.periodEnd}` : ""}</span></dd></div>
        <div><dt className="text-ink-muted">الهدف</dt><dd className="mt-1 font-semibold">{plan.goal === "exam" ? `تحضير لامتحان · ${plan.examDate}` : "دراسة اعتيادية"}</dd></div>
        {plan.type === "daily" && <div><dt className="text-ink-muted">الوقت المتاح</dt><dd className="mt-1 font-semibold">{formatDuration(plan.totalMinutes)}</dd></div>}
        <div><dt className="text-ink-muted">الدروس المختارة</dt><dd className="mt-1 font-semibold">{plan.selections.length} درسًا</dd></div>
      </dl>
      <div><h4 className="mb-2 font-semibold">{plan.type === "weekly" ? "أيام الدراسة — بدون أوقات محددة" : "يوم وأوقات الدراسة"}</h4><ul className="space-y-2 text-sm">{plan.type === "weekly" ? plan.studyDays.map((date) => <li key={date} className="rounded-md border border-border px-3 py-2">{dateLabel(date)}</li>) : plan.availability.map((slot, i) => <li key={i} className="flex flex-wrap justify-between gap-2 rounded-md border border-border px-3 py-2"><span>{dateLabel(slot.date)}</span><span dir="ltr">{slot.start} – {slot.end}</span></li>)}</ul></div>
      <div><h4 className="mb-2 font-semibold">المواد والدروس</h4><div className="space-y-3">{studySubjects.map((subject) => {
        const selections = plan.selections.filter((s) => s.subjectId === subject.id);
        return selections.length ? <div key={subject.id} className="rounded-md border border-border p-3"><p className="font-semibold text-primary">{subject.title}</p><ul className="mt-2 space-y-2 text-sm">{selections.map((s) => <li key={s.lessonId}><span className="text-ink-muted">{s.unitTitle} / </span>{s.lessonTitle}</li>)}</ul></div> : null;
      })}</div></div>
    </div>
  );
}

export default function PlanBuilder({ token, onSaved, onCancel, weeklyContext, existingPlan }) {
  const [step, setStep] = useState(weeklyContext ? 2 : 0);
  const [form, setForm] = useState(existingPlan ? { ...existingPlan, examDate: existingPlan.examDate || "", parentWeeklyId: existingPlan.parentWeeklyId || null } : { type: "daily", goal: weeklyContext?.plan.goal || "regular", periodStart: weeklyContext?.date || today(), examDate: weeklyContext?.plan.examDate || "", availability: [], studyDays: [], lessonIds: weeklyContext?.lessonIds || [], parentWeeklyId: weeklyContext?.plan._id || null });
  const creationKey = useRef(crypto.randomUUID());
  const steps = baseSteps.map((label, i) => i === 2 && form.type === "weekly" ? "أيام الدراسة" : label);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState(null);
  const [discard, setDiscard] = useState(false);
  const hasSelections = form.availability.length > 0 || form.studyDays.length > 0 || form.lessonIds.length > 0;
  const stepHeading = useRef(null);
  const [showSlotErrors, setShowSlotErrors] = useState(false);
  const slotRefs = useRef([]);
  useEffect(() => {
    stepHeading.current?.focus({ preventScroll: true });
    stepHeading.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [step]);
  const set = (key, value) => { setError(""); setForm((old) => ({ ...old, [key]: value })); };
  const dates = validDate(form.periodStart) ? Array.from({ length: form.type === "weekly" ? 7 : 1 }, (_, i) => addDays(form.periodStart, i)) : [];
  const totalMinutes = form.availability.reduce((sum, slot) => {
    const duration = timeMinutes(slot.end) - timeMinutes(slot.start);
    return sum + (Number.isFinite(duration) && duration > 0 ? duration : 0);
  }, 0);
  const slotCandidateError = (index, key, value) => studySlotError(form.availability.map((slot, i) => i === index ? { ...slot, [key]: value } : slot), index, { requireComplete: false });
  const updateSlot = (index, key, value) => { if (!slotCandidateError(index, key, value)) set("availability", form.availability.map((slot, i) => i === index ? { ...slot, [key]: value } : slot)); };
  const toggleDate = (date) => set("availability", form.availability.some((s) => s.date === date) ? form.availability.filter((s) => s.date !== date) : [...form.availability, { date, start: "", end: "" }]);
  const changeType = (type) => { setForm((old) => ({ ...old, type, availability: [], studyDays: [] })); setError(""); };

  async function advance(event) {
    event.preventDefault();
    if (saving) return;
    setError("");
    try {
      if (step === 1 && form.goal === "exam" && !validDate(form.examDate)) throw new Error("حدد تاريخ الامتحان");
      if (step === 2) {
        setShowSlotErrors(true);
        const invalid = form.type === "daily" ? form.availability.findIndex((_, i) => studySlotError(form.availability, i)) : -1;
        if (invalid !== -1) {
          slotRefs.current[invalid]?.scrollIntoView({ behavior: "smooth", block: "center" });
          slotRefs.current[invalid]?.focus({ preventScroll: true });
          return;
        }
        normalizeStudyPlan({ ...form, lessonIds: [studyLessons[0].lessonId] });
      }
      if (step === 3) setReview(normalizeStudyPlan(form));
      if (step < 4) { setStep(step + 1); return; }
      setSaving(true);
      const { plan } = await apiRequest(existingPlan ? `/study-plan/plans/${existingPlan._id}` : "/study-plan/plans", { method: existingPlan ? "PUT" : "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...form, creationKey: creationKey.current, expectedRevision: existingPlan?.generationRevision || 0 }) });
      onSaved(plan);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Card padding="lg" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-semibold">تجهيز اختيارات الدراسة</h2><Button variant="ghost" size="sm" disabled={saving} onClick={onCancel}>العودة لاختياراتي</Button></div>
      <ol aria-label="خطوات تجهيز اختيارات الدراسة" className="my-6 flex flex-wrap gap-2 text-xs sm:text-sm">{steps.map((title, i) => <li key={title} aria-current={step === i ? "step" : undefined} className={`rounded-full px-3 py-2 ${i === step ? "bg-primary text-white" : i < step ? "bg-accent-tint text-accent" : "bg-surface-alt text-ink-muted"}`}>{i + 1}. {title}</li>)}</ol>
      {weeklyContext && <p className="mb-4 rounded-md bg-primary-tint p-3 text-sm text-primary">يومية تابعة للأسبوع الذي يبدأ في {weeklyContext.plan.periodStart}. اختَر الوقت المناسب ودروس اليوم من مواضيع الأسبوع.</p>}
      {hasSelections && <div className="mb-4 flex justify-end"><Button variant="danger" size="sm" onClick={() => setDiscard(true)} disabled={saving}><Trash2 size={16} />إلغاء وحذف الاختيارات</Button></div>}
      {discard && <div data-dialog-layer className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"><section role="dialog" aria-modal="true" aria-label="حذف الاختيارات الحالية" className="w-full max-w-md rounded-xl bg-surface-raised p-6 shadow-xl"><h3 className="text-xl font-semibold">حذف الاختيارات الحالية؟</h3><p className="mt-4 leading-7">سيتم مسح الاختيارات التي تجهّزها الآن. اختياراتك المحفوظة ونتيجة فارك تبقى كما هي.</p><div className="mt-5 flex gap-3"><Button variant="danger" onClick={onCancel}>حذف الاختيارات</Button><Button variant="outline" autoFocus onClick={() => setDiscard(false)}>رجوع</Button></div></section></div>}
      <form onSubmit={advance} noValidate>
        <fieldset disabled={saving} className="min-w-0">
          <legend ref={stepHeading} tabIndex={-1} className="mb-4 scroll-mt-5 text-xl font-semibold">{steps[step]}</legend>
          {step === 0 && <div className="grid gap-4 sm:grid-cols-2">{[
            ["daily", "خطة يومية", "اختَر مواد ودروسًا ليوم واحد، وحدد أوقاتك فيه.", CalendarCheck],
            ["weekly", "خطة أسبوعية", "اختَر أيام ومواضيع الأسبوع بدون تحديد ساعات. وقت كل يوم بتختاره لاحقًا.", CalendarDays]
          ].map(([value, label, desc, Icon]) => <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-5 ${form.type === value ? "border-primary bg-primary-tint" : "border-border"}`}><input type="radio" name="plan-type" disabled={Boolean(existingPlan)} value={value} checked={form.type === value} onChange={() => changeType(value)} className="mt-1 accent-primary" /><span><Icon size={26} className="mb-3 text-primary" /><span className="block text-lg font-semibold">{label}</span><span className="mt-2 block text-sm leading-7 text-ink-muted">{desc}</span></span></label>)}</div>}
          {step === 1 && <div className="space-y-3">{[["regular", "دراسة اعتيادية", "متابعة الدروس والمراجعة بشكل منتظم."], ["exam", "تحضير لامتحان", "حدد موعد الامتحان والمواد والدروس المطلوبة."]].map(([value, title, desc]) => <label key={value} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${form.goal === value ? "border-primary bg-primary-tint" : "border-border"}`}><input type="radio" name="plan-goal" checked={form.goal === value} onChange={() => set("goal", value)} className="mt-1 accent-primary" /><span><span className="block font-semibold">{title}</span><span className="text-sm text-ink-muted">{desc}</span></span></label>)}{form.goal === "exam" && <div className="pt-3"><MiniCalendar min={form.periodStart} label="تاريخ الامتحان" value={form.examDate} onChange={(date) => set("examDate", date)} /></div>}</div>}
          {step === 2 && <div className="space-y-5">
            <MiniCalendar max={form.goal === "exam" ? form.examDate : undefined} label={form.type === "daily" ? "يوم الدراسة" : "أول يوم في أسبوع الدراسة"} weekly={form.type === "weekly"} disabled={Boolean(weeklyContext)} value={form.periodStart} onChange={(date) => { setForm((old) => ({ ...old, periodStart: date, availability: old.type === "daily" ? [{ date, start: "", end: "" }] : [], studyDays: [] })); setError(""); }} />
            {form.type === "weekly" && dates.length > 0 && <p className="text-sm text-ink-muted">الأسبوع من {dateLabel(dates[0])} إلى {dateLabel(dates[6])}.</p>}
            <p className="text-sm text-ink-muted">{form.type === "weekly" ? "حدد أيام الدراسة فقط. رح تختار الوقت المناسب داخل اليومية التابعة للأسبوع لما تجهّز يومك." : "حدد وقت البداية والنهاية. ممكن تضيف أكثر من فترة في اليوم."}</p>
            <div className={form.type === "weekly" ? "grid grid-cols-4 gap-2 sm:grid-cols-7" : "space-y-3"}>{dates.map((date) => {
              const enabled = form.type === "weekly" ? form.studyDays.includes(date) : form.availability.some((s) => s.date === date);
              const afterExam = form.goal === "exam" && validDate(form.examDate) && date > form.examDate;
              return <div key={date} className={`rounded-xl border transition-colors ${form.type === "weekly" ? "p-2" : "p-2 sm:p-4"} ${enabled ? "border-primary/40 bg-primary-tint/30" : "border-border"}`}>
                <label className={`flex gap-3 font-medium ${form.type === "weekly" ? "flex-col items-center py-2 text-center text-xs" : "items-center"} ${afterExam ? "text-ink-faint" : "cursor-pointer"}`}><input type="checkbox" aria-label={dateLabel(date)} checked={enabled} disabled={afterExam} onChange={() => form.type === "weekly" ? set("studyDays", enabled ? form.studyDays.filter((d) => d !== date) : [...form.studyDays, date]) : toggleDate(date)} className="h-4 w-4 accent-primary" />{form.type === "weekly" ? <><span>{new Date(`${date}T12:00:00Z`).toLocaleDateString("ar-PS", { weekday: "long", timeZone: "UTC" })}</span><span className="text-xl">{Number(date.slice(8))}</span></> : dateLabel(date)}{afterExam && <span className="text-xs">بعد الامتحان</span>}</label>
                {form.type === "daily" && form.availability.map((slot, index) => slot.date !== date ? null : <div key={index} ref={(node) => { slotRefs.current[index] = node; }} tabIndex={-1} className="mt-4 flex flex-wrap items-end gap-3 rounded-lg focus:outline-primary">
                  <p role={showSlotErrors && studySlotError(form.availability, index) ? "alert" : undefined} className="min-h-6 w-full text-sm text-error">{showSlotErrors ? studySlotError(form.availability, index) || "\u00a0" : "\u00a0"}</p>
                  <TimeWheelPicker label={`وقت البداية للفترة ${index + 1}`} value={slot.start} validate={(value) => slotCandidateError(index, "start", value)} onChange={(value) => updateSlot(index, "start", value)} disabled={saving} />
                  <TimeWheelPicker label={`وقت النهاية للفترة ${index + 1}`} value={slot.end} validate={(value) => slotCandidateError(index, "end", value)} suggestedValue={Number.isFinite(timeMinutes(slot.start)) ? `${String(Math.floor(Math.min(1439, timeMinutes(slot.start) + 60) / 60)).padStart(2, "0")}:${String(Math.min(1439, timeMinutes(slot.start) + 60) % 60).padStart(2, "0")}` : undefined} onChange={(value) => updateSlot(index, "end", value)} disabled={saving || !slot.start} />
                  <Button variant="ghost" size="sm" aria-label={`حذف الفترة ${index + 1}`} onClick={() => set("availability", form.availability.filter((_, i) => i !== index))}><Trash2 size={17} /></Button>
                </div>)}
                {enabled && form.type === "daily" && <Button size="sm" variant="ghost" className="mt-3" disabled={form.availability.length >= 28} onClick={() => set("availability", [...form.availability, { date, start: "", end: "" }])}><Plus size={16} />إضافة فترة</Button>}
              </div>;
            })}</div>
            {form.type === "daily" && <p className="flex items-center gap-2 rounded-lg bg-primary-tint p-4 font-semibold text-primary"><Clock3 size={18} />مجموع الوقت المتاح: {formatDuration(totalMinutes)}</p>}
          </div>}
          {step === 3 && <div><p className="mb-4 text-sm leading-7 text-ink-muted">افتح المادة بالسهم لعرض وحداتها ودروسها. المربع بجانب المادة أو الوحدة بيختار كل دروسها؛ أو اختَر دروسًا محددة. اخترت {form.lessonIds.length} درسًا.</p><SubjectPicker allowedIds={weeklyContext?.plan.lessonIds} selected={form.lessonIds} onChange={(ids) => set("lessonIds", ids)} /></div>}
          {step === 4 && review && <><PlanSummary plan={review} /><p className="mt-5 rounded-lg bg-primary-tint p-4 text-sm leading-7 text-primary">{form.type === "weekly" ? "رح نحفظ أيام ومواضيع الأسبوع بدون أوقات. بعد الحفظ، اضغط توليد الخطة لتوزيع الدروس مبدئيًا على الأيام." : "رح نحفظ اختياراتك وأوقاتك؛ بعدها بتقدر تولّد الجلسات حسب وقتك وفارك."}</p></>}
          {error && <p role="alert" className="mt-5 rounded-md bg-error-tint p-3 text-sm text-error">{error}</p>}
          <div className="mt-7 flex justify-between gap-3"><Button variant="outline" disabled={step === 0 || saving || (Boolean(weeklyContext) && step === 2)} onClick={() => { setStep(step - 1); setError(""); }}><ArrowRight size={16} />السابق</Button><Button type="submit" disabled={saving}>{saving ? "جاري الحفظ…" : step === 4 ? "حفظ الاختيارات" : "التالي"}{step === 4 ? <CheckCircle2 size={16} /> : <ArrowLeft size={16} />}</Button></div>
        </fieldset>
      </form>
    </Card>
  );
}
