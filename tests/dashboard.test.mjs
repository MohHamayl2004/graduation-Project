import test from "node:test";
import assert from "node:assert/strict";
import { dashboardSchedule, localStudyTime, planUrl, chatUrl } from "../src/pages/Dashboard/dashboardModel.js";
import { fetchDashboardResource } from "../src/services/dashboardService.js";

const now = new Date("2026-11-03T08:30:00Z");
const session = (id, start, end) => ({ id, date: "2026-11-03", start, end, minutes: 30, lessonId: "math-1", lessonTitle: "متوسط التغير", subjectTitle: "الرياضيات" });
const daily = (overrides = {}) => ({ _id: "daily-1", title: "خطة يومية", type: "daily", periodStart: "2026-11-03", updatedAt: "2026-11-02T10:00:00Z", generated: { sessions: [session("s2", "11:00", "11:30"), session("s1", "10:00", "10:30")] }, ...overrides });

test("today uses Palestine time, including the date rollover and daylight saving", () => {
  assert.deepEqual(localStudyTime(now), { date: "2026-11-03", clock: "10:30" });
  assert.equal(localStudyTime(new Date("2026-11-02T22:30:00Z")).date, "2026-11-03");
  assert.equal(localStudyTime(new Date("2026-07-01T08:00:00Z")).clock, "11:00");
});

test("today's newest valid daily plan determines the agenda; planned minutes are not earned progress", () => {
  const view = dashboardSchedule([daily(), daily({ _id: "older", updatedAt: "2026-11-01T10:00:00Z" })], now);
  assert.equal(view.todayPlan._id, "daily-1");
  assert.deepEqual(view.sessions.map((s) => s.id), ["s1", "s2"]);
  assert.equal(view.nextSession.id, "s2");
  assert.equal(view.plannedMinutes, 60);
  assert.equal(view.lessonCount, 1);
  assert.equal("progress" in view, false);
  assert.equal("streak" in view, false);
});

test("stale, archived, completed, other-day and ungenerated plans never become today's agenda", () => {
  const view = dashboardSchedule([daily({ generatedStale: true }), daily({ _id: "archived", status: "archived" }), daily({ _id: "done", status: "completed" }), daily({ _id: "past", periodStart: "2026-11-02" }), daily({ _id: "draft", generated: null })], now);
  assert.equal(view.todayPlan, null);
  assert.equal(view.staleToday, true);
  assert.deepEqual(view.sessions, []);
  assert.equal(view.plannedMinutes, 0);
  assert.equal(view.nextSession, null);
});

test("weekly plans remain untimed choices; past appointments are never marked completed", () => {
  const weekly = { _id: "week", type: "weekly", generated: { days: [{ date: "2026-11-03", lessonIds: ["math-1"] }], sessions: [] } };
  assert.equal(dashboardSchedule([weekly], now).weeklyPlan._id, "week");
  assert.equal(dashboardSchedule([weekly], now).todayPlan, null);
  const after = dashboardSchedule([daily()], new Date("2026-11-03T15:00:00Z"));
  assert.equal(after.nextSession, null);
  assert.equal(after.sessions.length, 2);
  assert.equal("completed" in after.sessions[0], false);
});

test("malformed and other-date sessions are omitted; links encode saved resource IDs", () => {
  const view = dashboardSchedule([daily({ generated: { sessions: [null, session("ok", "11:00", "11:30"), session("reverse", "12:00", "11:30"), { ...session("other", "11:00", "11:30"), date: "2026-11-04" }] } })], now);
  assert.deepEqual(view.sessions.map((s) => s.id), ["ok"]);
  assert.equal(planUrl("a&b"), "/study-plan?plan=a%26b");
  assert.equal(chatUrl("a&b"), "/ai-tutor?chat=a%26b");
});

test("dashboard resources use existing authenticated APIs and keep failures separate from empty data", async () => {
  const original = globalThis.fetch;
  const signal = new AbortController().signal;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, "Bearer session");
      assert.equal(options.signal, signal);
      if (url.endsWith("/study-plan/plans")) return Response.json({ plans: [daily()] });
      if (url.endsWith("/materials")) return Response.json({ materials: [] });
      if (url.endsWith("/tutor/chats")) return Response.json({ code: "FAILED", message: "تعذّر تحميل المحادثات" }, { status: 503 });
      throw new Error("Unexpected API path");
    };
    assert.equal((await fetchDashboardResource("plans", "session", { signal }))[0]._id, "daily-1");
    assert.deepEqual(await fetchDashboardResource("materials", "session", { signal }), []);
    await assert.rejects(fetchDashboardResource("chats", "session", { signal }), { status: 503 });
    globalThis.fetch = async () => Response.json({ plans: [null] });
    await assert.rejects(fetchDashboardResource("plans", "session", { signal }), /تعذّر قراءة/);
    globalThis.fetch = async () => { throw Object.assign(new Error("cancelled"), { name: "AbortError" }); };
    await assert.rejects(fetchDashboardResource("plans", "session", { signal }), { name: "AbortError" });
  } finally { globalThis.fetch = original; }
});
