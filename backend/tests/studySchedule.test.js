import test from "node:test";
import assert from "node:assert/strict";
import { generateStudySchedule, varkProfile, lessonActivities, scheduleRules } from "../../shared/studySchedule.js";
import { studyLessons } from "../../shared/studyPlanCatalog.js";
import { timeMinutes } from "../../shared/studyPlanRules.js";
const base = (changes = {}) => ({ type: "daily", goal: "regular", periodStart: "2026-10-18", availability: [{ date: "2026-10-18", start: "09:00", end: "12:00" }], lessonIds: studyLessons.slice(0, 3).map((l) => l.lessonId), ...changes });
const assessment = (scores) => ({ version: "test", scores });
test("VARK uses all scores, affects real activity minutes, supports ties, mixed and zero scores", () => {
  const v = varkProfile({ V: 10 }), k = varkProfile({ K: 10 }), r = varkProfile({ R: 10 }), a = varkProfile({ A: 10 });
  const activities = (p) => lessonActivities(studyLessons[0], p);
  assert.ok(activities(k)[2].minutes > activities(v)[2].minutes);
  assert.ok(activities(r)[4].minutes > activities(a)[4].minutes);
  assert.notEqual(activities(a)[0].guidance, activities(v)[0].guidance);
  const mixed = varkProfile({ V: 3, K: 1 });
  assert.equal(mixed.weights[0], .75 * v.weights[0] + .25 * k.weights[0]);
  assert.deepEqual(varkProfile({ V: 4, A: 4 }).preferred, ["V", "A"]);
  assert.deepEqual(varkProfile({}).weights, varkProfile({ V: 2, A: 2, R: 2, K: 2 }).weights);
  for (const profile of [v, k, r, a, mixed, varkProfile({})]) {
    const list = activities(profile);
    assert.equal(list.length, 5); assert.ok(list.every((x) => x.minutes > 0));
    assert.equal(list.reduce((n, x) => n + x.minutes, 0), 20 + studyLessons[0].difficulty * 10);
  }
});
function verify(g, slots) {
  const all = [...g.sessions, ...g.breaks].sort((a, b) => a.start.localeCompare(b.start));
  for (const item of all) {
    assert.equal(timeMinutes(item.end) - timeMinutes(item.start), item.minutes);
    assert.ok(slots.some((slot) => slot.start <= item.start && slot.end >= item.end));
  }
  for (let i = 1; i < all.length; i++) assert.ok(all[i].start >= all[i - 1].end);
  for (const s of g.sessions) assert.equal(s.activities.reduce((n, a) => n + a.minutes, 0), s.minutes);
  assert.equal(g.scheduledStudyMinutes + g.remainingStudyMinutes, g.requiredStudyMinutes);
  assert.equal(g.scheduledStudyMinutes + g.breakMinutes + g.unusedMinutes, g.availableMinutes);
  for (const lesson of g.lessons) for (const activity of lesson.activities) {
    const fragments = g.sessions.filter((s) => s.lessonId === lesson.lessonId).flatMap((s) => s.activities.filter((a) => a.id === activity.id));
    let offset = 0;
    for (const part of fragments) { assert.equal(part.offsetMinutes, offset); offset += part.minutes; }
    const remaining = g.remaining.find((l) => l.lessonId === lesson.lessonId)?.activities.find((a) => a.id === activity.id)?.minutes || 0;
    assert.equal(offset + remaining, activity.minutes);
  }
}
test("daily schedule conserves minutes across split lessons, breaks, multiple windows and insufficient time", () => {
  const availability = [{ date: "2026-10-18", start: "09:00", end: "09:47" }, { date: "2026-10-18", start: "14:00", end: "14:13" }];
  const g = generateStudySchedule(base({ availability }), assessment({ K: 8 }));
  verify(g, availability); assert.ok(g.remainingStudyMinutes > 0); assert.ok(g.breaks.length > 0);
  assert.ok(g.sessions.some((s) => s.part > 1));
  assert.ok(g.sessions.every((s) => s.minutes <= scheduleRules.maxContinuousMinutes));
  const complete = generateStudySchedule(base(), assessment({})); verify(complete, base().availability); assert.equal(complete.remainingStudyMinutes, 0);
  const minute = generateStudySchedule(base({ availability: [{ date: "2026-10-18", start: "23:58", end: "23:59" }] }), assessment({}));
  assert.equal(minute.scheduledStudyMinutes, 1); assert.equal(minute.sessions[0].activities.length, 1);
});
test("adjacent windows do not reset the continuous study break clock", () => {
  const g = generateStudySchedule(base({ availability: [{ date: "2026-10-18", start: "09:00", end: "09:20" }, { date: "2026-10-18", start: "09:20", end: "10:00" }] }), assessment({}));
  assert.equal(g.breaks[0].start, "09:40");
});
test("weekly generation needs no hours, assigns every lesson once in catalog sequence and balances load", () => {
  const ids = studyLessons.slice(0, 10).map((l) => l.lessonId);
  const g = generateStudySchedule(base({ type: "weekly", studyDays: ["2026-10-20", "2026-10-18", "2026-10-19"], lessonIds: [...ids].reverse(), availability: [] }), assessment({ V: 2, R: 2 }));
  assert.deepEqual(g.days.flatMap((d) => d.lessonIds), ids);
  assert.equal(g.availableMinutes, null); assert.deepEqual(g.sessions, []);
  assert.equal(g.days.reduce((n, d) => n + d.estimatedMinutes, 0), g.requiredStudyMinutes);
  assert.ok(Math.max(...g.days.map((d) => d.estimatedMinutes)) - Math.min(...g.days.map((d) => d.estimatedMinutes)) <= 70);
  assert.throws(() => generateStudySchedule(base({ goal: "exam", examDate: "2026-10-17" }), assessment({})));
  assert.throws(() => generateStudySchedule(base({ availability: [{ date: "2026-10-18", start: "11:00", end: "10:00" }] }), assessment({})));
});
