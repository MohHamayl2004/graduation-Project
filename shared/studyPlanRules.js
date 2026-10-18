import { studyLessons } from "./studyPlanCatalog.js";
export const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
export const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const timeMinutes = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
export const formatDuration = (minutes) => `${Math.floor(minutes / 60)} س${minutes % 60 ? ` و${minutes % 60} د` : ""}`;

// Used while editing as well as on the server, so invalid intervals never become saved preferences.
export function studySlotError(slots, index, { requireComplete = true } = {}) {
  const slot = slots[index];
  const start = timeMinutes(slot?.start), end = timeMinutes(slot?.end);
  if ((slot?.start && !Number.isFinite(start)) || (slot?.end && !Number.isFinite(end))) return "اختر وقتًا صحيحًا";
  if (start === 1439) return "وقت البداية لازم يترك مجالًا للنهاية في نفس اليوم";
  if (Number.isFinite(start) && slots.some((other, i) => i !== index && other?.date === slot.date && start >= timeMinutes(other.start) && start < timeMinutes(other.end))) return "وقت البداية داخل فترة دراسة ثانية؛ اختر وقتًا مختلفًا";
  if (!Number.isFinite(start) || !Number.isFinite(end)) return requireComplete ? "حدد وقت البداية والنهاية للفترة" : "";
  if (end <= start) return "وقت النهاية لازم يكون بعد البداية في نفس اليوم";
  if (slots.some((other, i) => i !== index && other?.date === slot.date && timeMinutes(other.start) < end && timeMinutes(other.end) > start)) return "هذه الفترة بتتداخل مع فترة دراسة ثانية؛ اختر وقتًا مختلفًا";
  return "";
}

// Shared with the review screen; the API always validates again and computes totals itself.
export function normalizeStudyPlan(input) {
  const fail = (message) => { throw new Error(message); };
  if (!input || !["daily", "weekly"].includes(input.type)) fail("اختر خطة يومية أو أسبوعية");
  if (!["regular", "exam"].includes(input.goal)) fail("اختر هدف الدراسة");
  if (!validDate(input.periodStart)) fail("اختر تاريخًا صحيحًا لبداية الخطة");
  const periodEnd = addDays(input.periodStart, input.type === "weekly" ? 6 : 0);
  const examDate = input.goal === "exam" ? input.examDate : null;
  if (input.goal === "exam" && (!validDate(examDate) || examDate < input.periodStart)) fail("تاريخ الامتحان لازم يكون في يوم بداية الخطة أو بعده");
  let studyDays = [];
  if (input.type === "weekly") {
    if (!Array.isArray(input.studyDays) || !input.studyDays.length || input.studyDays.length > 7 || new Set(input.studyDays).size !== input.studyDays.length) fail("اختر يوم دراسة واحدًا على الأقل للأسبوع بدون تكرار");
    studyDays = [...input.studyDays].sort();
    for (const date of studyDays) {
      if (!validDate(date) || date < input.periodStart || date > periodEnd) fail("أيام الدراسة لازم تكون ضمن الأسبوع المختار");
      if (examDate && date > examDate) fail("لا يمكن اختيار يوم دراسة بعد الامتحان");
    }
  } else if (!Array.isArray(input.availability) || !input.availability.length || input.availability.length > 28) fail("حدد فترة دراسة واحدة على الأقل، وبحد أقصى ٢٨ فترة");
  const availability = (input.type === "weekly" ? [] : input.availability).map((slot) => {
    if (!slot || !validDate(slot.date) || slot.date < input.periodStart || slot.date > periodEnd) fail("أيام الدراسة لازم تكون ضمن مدة الخطة");
    if (examDate && slot.date > examDate) fail("لا يمكن اختيار يوم دراسة بعد الامتحان");
    const slotError = studySlotError(input.availability, input.availability.indexOf(slot));
    if (slotError) fail(slotError);
    return { date: slot.date, start: slot.start, end: slot.end };
  }).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  for (let i = 1; i < availability.length; i++) {
    const current = availability[i], previous = availability[i - 1];
    if (current.date === previous.date && current.start < previous.end) fail("في أوقات دراسة متداخلة في نفس اليوم؛ عدّلها قبل المتابعة");
  }
  if (input.type === "daily") studyDays = [...new Set(availability.map((s) => s.date))];
  const parentWeeklyId = input.parentWeeklyId || null;
  if (parentWeeklyId && (input.type !== "daily" || typeof parentWeeklyId !== "string" || !/^[a-f\d]{24}$/i.test(parentWeeklyId))) fail("مرجع الخطة الأسبوعية غير صالح");
  if (!Array.isArray(input.lessonIds) || !input.lessonIds.length || input.lessonIds.length > studyLessons.length || new Set(input.lessonIds).size !== input.lessonIds.length) fail("اختر درسًا واحدًا على الأقل بدون تكرار");
  const byId = new Map(studyLessons.map((l) => [l.lessonId, l]));
  const selections = input.lessonIds.map((id) => {
    if (!byId.has(id)) fail("أحد الدروس المختارة غير موجود؛ راجع اختيارك");
    return byId.get(id);
  });
  return { type: input.type, goal: input.goal, periodStart: input.periodStart, periodEnd, examDate, availability, studyDays, parentWeeklyId,
    lessonIds: [...input.lessonIds], selections,
    totalMinutes: input.type === "weekly" ? null : availability.reduce((total, s) => total + timeMinutes(s.end) - timeMinutes(s.start), 0) };
}
