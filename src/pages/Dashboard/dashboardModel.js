export const STUDY_TIME_ZONE = "Asia/Hebron";

export function localStudyTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { date: `${values.year}-${values.month}-${values.day}`, clock: `${values.hour}:${values.minute}` };
}

export const planUrl = (id) => `/study-plan?plan=${encodeURIComponent(id)}`;
export const chatUrl = (id) => `/ai-tutor?chat=${encodeURIComponent(id)}`;
const revisionTime = (plan) => Date.parse(plan.updatedAt || plan.createdAt || plan.generated?.generatedAt) || 0;
const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function dashboardSchedule(plans, now = new Date()) {
  const { date, clock } = localStudyTime(now);
  const active = [...plans].filter((plan) => !["archived", "completed"].includes(plan.status)).sort((a, b) => revisionTime(b) - revisionTime(a));
  const daily = active.filter((plan) => plan.type === "daily" && plan.periodStart === date);
  const todayPlan = daily.find((plan) => !plan.generatedStale && Array.isArray(plan.generated?.sessions)) || null;
  const sessions = (todayPlan?.generated.sessions || []).filter((session) => session && session.date === date && clockPattern.test(session.start) && clockPattern.test(session.end) && session.start < session.end && Number.isFinite(session.minutes) && session.minutes > 0 && typeof session.lessonTitle === "string")
    .sort((a, b) => a.start.localeCompare(b.start));
  const weeklyPlan = active.find((plan) => plan.type === "weekly" && !plan.generatedStale && Array.isArray(plan.generated?.days) && plan.generated.days.some((day) => day?.date === date)) || null;
  return {
    date, clock, todayPlan, sessions, weeklyPlan,
    nextSession: sessions.find((session) => session.end > clock) || null,
    plannedMinutes: sessions.reduce((sum, session) => sum + session.minutes, 0),
    lessonCount: new Set(sessions.map((session) => session.lessonId)).size,
    staleToday: daily.some((plan) => plan.generatedStale),
    latestPlan: active[0] || null
  };
}
