import { normalizeStudyPlan, timeMinutes } from "./studyPlanRules.js";
import { studyLessons } from "./studyPlanCatalog.js";

// Project heuristics, not official VARK prescriptions. All values are minutes.
export const scheduleRules = {
  version: "nipras-schedule-1", baseLessonMinutes: 20, minutesPerDifficulty: 10,
  maxContinuousMinutes: 40, breakMinutes: 5,
  activityIds: ["explanation", "example", "practice", "quiz", "summary"],
  weights: { V: [40, 25, 15, 10, 10], A: [40, 15, 20, 15, 10], R: [25, 15, 20, 15, 25], K: [15, 25, 35, 15, 10] }
};
export const activityLabels = { explanation: "شرح الدرس", example: "مثال محلول", practice: "تدريب وحل تمارين", quiz: "اختبار قصير ومراجعة الأخطاء", summary: "ملخص ومراجعة" };
const modes = { V: "بصري", A: "سمعي", R: "قراءة وكتابة", K: "تطبيقي" };
const guidance = {
  V: ["تابع العرض المرئي وارسم مخططًا للفكرة.", "لاحظ خطوات المثال والرسومات المرافقة.", "مثّل المعطيات برسم ثم جرّب الحل.", "راجع الأخطاء باستخدام مخطط للخطوات.", "رتّب الأفكار بخريطة ذهنية."],
  A: ["استمع للشرح ثم أعد الفكرة بصوتك.", "اشرح خطوات المثال شفهيًا.", "تحدث عن سبب اختيار كل خطوة أثناء الحل.", "فسّر الخطأ بصوتك وأعد المحاولة.", "لخّص أهم الأفكار شفهيًا."],
  R: ["اقرأ الشرح ودوّن الكلمات الأساسية.", "اكتب خطوات المثال بترتيبها.", "حل التمارين مع تدوين خطواتك.", "دوّن سبب الخطأ والتصحيح.", "اكتب ملخصًا قصيرًا لأهم الأفكار."],
  K: ["اربط الفكرة بموقف عملي.", "تتبّع المثال ثم أعد تطبيقه بنفسك.", "جرّب الحل بنفسك وطبّق الفكرة على حالات مختلفة.", "أعد تطبيق الخطوات التي أخطأت فيها.", "راجع الفكرة بتطبيق صغير من اختيارك."]
};
export function varkProfile(input = {}) {
  const scores = Object.fromEntries(Object.keys(modes).map((key) => [key, Number.isFinite(input[key]) && input[key] > 0 ? input[key] : 0]));
  const sum = Object.values(scores).reduce((a, b) => a + b, 0);
  const shares = Object.fromEntries(Object.keys(modes).map((key) => [key, sum ? scores[key] / sum : .25]));
  const max = Math.max(...Object.values(scores));
  const preferred = Object.keys(modes).filter((key) => scores[key] === max);
  const weights = scheduleRules.activityIds.map((_, i) => Object.keys(modes).reduce((total, key) => total + shares[key] * scheduleRules.weights[key][i], 0));
  return { scores, shares, preferred, weights, explanation: sum ? `وزّعنا الأنشطة باستخدام جميع درجاتك، مع إبراز تفضيلاتك: ${preferred.map((key) => modes[key]).join("، ")}. هذه تفضيلات قابلة للتغيير وليست حكمًا على قدراتك.` : "درجاتك صفرية؛ استخدمنا توزيعًا متوازنًا يجمع جميع التفضيلات." };
}
function allocate(total, weights) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => total * w / sum), result = raw.map(Math.floor);
  const order = raw.map((v, i) => ({ i, fraction: v - result[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let left = total - result.reduce((a, b) => a + b, 0), i = 0; i < left; i++) result[order[i].i]++;
  return result;
}
export function lessonActivities(lesson, profile) {
  const duration = scheduleRules.baseLessonMinutes + lesson.difficulty * scheduleRules.minutesPerDifficulty;
  const minutes = allocate(duration, profile.weights);
  return scheduleRules.activityIds.map((id, i) => ({ id, title: activityLabels[id], minutes: minutes[i], guidance: profile.preferred.map((key) => guidance[key][i]).join(" "), highlighted: profile.weights[i] >= 25 }));
}
const clock = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
export function generateStudySchedule(input, assessment, now = new Date()) {
  const preferences = normalizeStudyPlan(input);
  const profile = varkProfile(assessment?.scores);
  // Canonical catalog order preserves prerequisites even if the student clicked in reverse order.
  const lessons = studyLessons.filter((l) => preferences.lessonIds.includes(l.lessonId)).map((lesson) => {
    const activities = lessonActivities(lesson, profile);
    return { ...lesson, activities, minutes: activities.reduce((n, a) => n + a.minutes, 0) };
  });
  const requiredStudyMinutes = lessons.reduce((n, l) => n + l.minutes, 0);
  const base = { version: scheduleRules.version, generatedAt: new Date(now).toISOString(), assessment: { version: assessment?.version || null, ...profile }, rules: structuredClone(scheduleRules), requiredStudyMinutes, lessons, sessions: [], breaks: [], days: [], remaining: [] };
  if (preferences.type === "weekly") {
    let cursor = 0, remainingLoad = requiredStudyMinutes;
    base.days = preferences.studyDays.map((date, dayIndex, days) => {
      const selected = [], target = remainingLoad / (days.length - dayIndex);
      let estimatedMinutes = 0;
      while (cursor < lessons.length && (dayIndex === days.length - 1 || !selected.length || estimatedMinutes + lessons[cursor].minutes / 2 <= target)) {
        const lesson = lessons[cursor++]; selected.push(lesson.lessonId); estimatedMinutes += lesson.minutes;
      }
      remainingLoad -= estimatedMinutes;
      return { date, lessonIds: selected, estimatedMinutes };
    });
    return { ...base, provisional: true, availableMinutes: null, scheduledStudyMinutes: 0, breakMinutes: 0, requiredBreakMinutes: null, requiredTotalMinutes: requiredStudyMinutes, remainingStudyMinutes: 0 };
  }
  let lessonIndex = 0, activityIndex = 0, activityOffset = 0;
  const partCounts = new Map();
  const windows = [];
  for (const slot of preferences.availability) {
    const last = windows[windows.length - 1];
    if (last && last.date === slot.date && last.end === slot.start) last.end = slot.end;
    else windows.push({ ...slot });
  }
  for (const slot of windows) {
    let cursor = timeMinutes(slot.start), end = timeMinutes(slot.end), continuous = 0;
    while (cursor < end && lessonIndex < lessons.length) {
      if (continuous === scheduleRules.maxContinuousMinutes) {
        if (end - cursor <= scheduleRules.breakMinutes) break;
        base.breaks.push({ date: slot.date, start: clock(cursor), end: clock(cursor + scheduleRules.breakMinutes), minutes: scheduleRules.breakMinutes });
        cursor += scheduleRules.breakMinutes; continuous = 0;
      }
      const lesson = lessons[lessonIndex], start = cursor, activities = [];
      const capacity = Math.min(end - cursor, scheduleRules.maxContinuousMinutes - continuous);
      let used = 0;
      while (used < capacity && activityIndex < lesson.activities.length) {
        const activity = lesson.activities[activityIndex];
        const minutes = Math.min(capacity - used, activity.minutes - activityOffset);
        activities.push({ ...activity, minutes, offsetMinutes: activityOffset, totalMinutes: activity.minutes });
        used += minutes; activityOffset += minutes;
        if (activityOffset === activity.minutes) { activityOffset = 0; activityIndex++; }
      }
      cursor += used; continuous += used;
      const part = (partCounts.get(lesson.lessonId) || 0) + 1;
      partCounts.set(lesson.lessonId, part);
      base.sessions.push({ id: `session-${base.sessions.length + 1}`, date: slot.date, start: clock(start), end: clock(cursor), minutes: used, lessonId: lesson.lessonId, subjectTitle: lesson.subjectTitle, unitTitle: lesson.unitTitle, lessonTitle: lesson.lessonTitle, part, activities });
      if (activityIndex === lesson.activities.length) { lessonIndex++; activityIndex = 0; }
    }
  }
  for (let i = lessonIndex; i < lessons.length; i++) {
    const lesson = lessons[i];
    const activities = lesson.activities.slice(i === lessonIndex ? activityIndex : 0).map((a, j) => ({ ...a, minutes: a.minutes - (i === lessonIndex && j === 0 ? activityOffset : 0) }));
    base.remaining.push({ lessonId: lesson.lessonId, lessonTitle: lesson.lessonTitle, subjectTitle: lesson.subjectTitle, minutes: activities.reduce((n, a) => n + a.minutes, 0), activities });
  }
  const availableMinutes = preferences.totalMinutes;
  const scheduledStudyMinutes = base.sessions.reduce((n, s) => n + s.minutes, 0);
  const breakMinutes = base.breaks.reduce((n, b) => n + b.minutes, 0);
  const requiredBreakMinutes = Math.floor((requiredStudyMinutes - 1) / scheduleRules.maxContinuousMinutes) * scheduleRules.breakMinutes;
  return { ...base, availableMinutes, scheduledStudyMinutes, breakMinutes, requiredBreakMinutes, requiredTotalMinutes: requiredStudyMinutes + requiredBreakMinutes, remainingStudyMinutes: requiredStudyMinutes - scheduledStudyMinutes, unusedMinutes: availableMinutes - scheduledStudyMinutes - breakMinutes };
}
