import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { normalizeStudyPlan, studySlotError } from "../../shared/studyPlanRules.js";
import { studyLessons, studySubjects } from "../../shared/studyPlanCatalog.js";
import { lessonDifficulty, difficultyLabels } from "../../shared/studyLessonDifficulty.js";
import { createStudyPlanRouter } from "../routes/studyPlanRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

const daily = () => ({ type: "daily", goal: "regular", periodStart: "2026-10-18", lessonIds: [studyLessons[0].lessonId], availability: [{ date: "2026-10-18", start: "17:00", end: "18:30" }] });
test("catalog has eight subjects, unique lesson IDs and empty English; excluded Arabic activities are absent", () => {
  assert.equal(studySubjects.length, 8);
  assert.equal(studySubjects.find((s) => s.id === "english").units.length, 0);
  assert.equal(new Set(studyLessons.map((l) => l.lessonId)).size, studyLessons.length);
  assert.ok(studyLessons.filter((s) => s.subjectId === "arabic").every((s) => !["المشروع", "أقيّم ذاتي"].includes(s.lessonTitle)));
});
test("daily plan derives time and lesson names; ignores forged totals and dates", () => {
  const plan = normalizeStudyPlan({ ...daily(), totalMinutes: 999, periodEnd: "2099-01-01", selections: [{ lessonTitle: "forged" }] });
  assert.equal(plan.totalMinutes, 90); assert.equal(plan.periodEnd, "2026-10-18");
  assert.equal(plan.selections[0].lessonTitle, "متوسط التغير");
  assert.equal(plan.selections[0].difficulty, lessonDifficulty[studyLessons[0].lessonId]);
  assert.equal(plan.selections[0].difficultyProvisional, true);
  assert.equal(plan.examDate, null);
});
test("every catalog lesson has a fixed provisional difficulty from 1 to 5 with no orphan IDs", () => {
  assert.deepEqual(Object.keys(lessonDifficulty).sort(), studyLessons.map((l) => l.lessonId).sort());
  for (const lesson of studyLessons) {
    assert.ok(Number.isInteger(lesson.difficulty) && lesson.difficulty >= 1 && lesson.difficulty <= 5);
    assert.equal(lesson.difficulty, lessonDifficulty[lesson.lessonId]);
    assert.equal(lesson.difficultyProvisional, true);
    assert.ok(difficultyLabels[lesson.difficulty]);
  }
  for (const subject of studySubjects) for (const unit of subject.units) for (const lesson of unit.lessons) assert.equal(lesson.difficulty, lessonDifficulty[lesson.id]);
});
test("weekly selections have dates only, discard supplied hours and derive seven-day range", () => {
  const plan = normalizeStudyPlan({ ...daily(), type: "weekly", periodStart: "2026-10-29", studyDays: ["2026-11-04", "2026-10-29"] });
  assert.equal(plan.periodEnd, "2026-11-04"); assert.equal(plan.totalMinutes, null);
  assert.deepEqual(plan.availability, []);
  assert.deepEqual(plan.studyDays, ["2026-10-29", "2026-11-04"]);
  for (const days of [[], ["2026-10-29", "2026-10-29"], ["2026-11-05"], ["bad"]]) {
    assert.throws(() => normalizeStudyPlan({ ...daily(), type: "weekly", periodStart: "2026-10-29", studyDays: days }));
  }
});
test("rejects overlap, reversed/invalid times, unavailable dates, empty/unknown/duplicate lessons", () => {
  const changes = [
    { availability: [] }, { type: "monthly" }, { goal: "unknown" }, { periodStart: "2026-02-30" },
    { lessonIds: [] }, { lessonIds: ["unknown"] }, { lessonIds: [studyLessons[0].lessonId, studyLessons[0].lessonId] },
    { availability: [{ date: "2026-10-19", start: "17:00", end: "18:00" }] },
    { availability: [{ date: "2026-10-18", start: "19:00", end: "18:00" }] },
    { availability: [{ date: "2026-10-18", start: "25:00", end: "26:00" }] },
    { availability: [...daily().availability, { date: "2026-10-18", start: "18:00", end: "19:00" }] }
  ];
  for (const change of changes) assert.throws(() => normalizeStudyPlan({ ...daily(), ...change }));
});
test("exam plan requires valid exam date and forbids studying after it", () => {
  assert.throws(() => normalizeStudyPlan({ ...daily(), goal: "exam" }));
  assert.throws(() => normalizeStudyPlan({ ...daily(), goal: "exam", examDate: "2026-10-17" }));
  assert.throws(() => normalizeStudyPlan({ ...daily(), type: "weekly", goal: "exam", examDate: "2026-10-19", studyDays: ["2026-10-20"] }));
  assert.equal(normalizeStudyPlan({ ...daily(), goal: "exam", examDate: "2026-10-18" }).examDate, "2026-10-18");
});
test("time selection rejects equal, reversed, midnight and contained intervals; adjacent slots remain valid", () => {
  const slot = (start, end) => ({ date: "2026-10-18", start, end });
  for (const [start, end] of [["17:00", "16:59"], ["17:00", "17:00"], ["23:00", "00:30"], ["23:59", ""], ["12:00", "11:59"]]) {
    assert.ok(studySlotError([slot(start, end)], 0, { requireComplete: false }));
  }
  assert.equal(studySlotError([slot("17:00", "")], 0, { requireComplete: false }), "");
  assert.ok(studySlotError([slot("17:00", "")], 0));
  assert.ok(studySlotError([slot("17:00", "19:00"), slot("18:00", "")], 1, { requireComplete: false }));
  assert.equal(studySlotError([slot("17:00", "19:00"), slot("19:00", "")], 1, { requireComplete: false }), "");
  for (const conflicting of [slot("17:30", "18:30"), slot("16:00", "20:00"), slot("17:00", "19:00")]) {
    const slots = [slot("17:00", "19:00"), conflicting];
    assert.ok(studySlotError(slots, 1));
    assert.throws(() => normalizeStudyPlan({ ...daily(), availability: slots }));
  }
  const valid = [slot("19:00", "20:00"), slot("17:00", "19:00")];
  assert.equal(studySlotError(valid, 1), "");
  assert.equal(normalizeStudyPlan({ ...daily(), availability: valid }).totalMinutes, 180);
  assert.equal(studySlotError([slot("00:00", "00:01")], 0), "");
  assert.equal(studySlotError([slot("23:58", "23:59")], 0), "");
});
test("plan routes require completed assessment, save only for logged-in owner, and isolate saved plans", async () => {
  const records = [], completed = new Set(["alice", "bob"]);
  const model = { findOne: ({ owner }) => ({ lean: async () => completed.has(owner) ? { version: "v1", completedAt: new Date(), scores: { V: 2, A: 1, R: 0, K: 2 } } : null }) };
  const planModel = {
    findOneAndDelete: async ({ _id, owner }) => { const i = records.findIndex((r) => r._id === _id && r.owner === owner); return i < 0 ? null : records.splice(i, 1)[0]; },
    updateMany: async ({ owner, parentWeeklyId }) => { records.filter((r) => r.owner === owner && r.parentWeeklyId === parentWeeklyId).forEach((r) => { r.parentWeeklyId = null; }); },
    findOne: ({ _id, owner, type }) => ({ lean: async () => records.find((r) => r._id === _id && r.owner === owner && r.type === type) || null }),
    create: async (data) => { const plan = { ...data, _id: String(records.length + 1).padStart(24, "0") }; records.push(plan); return plan; },
    find: ({ owner }) => ({ sort: () => ({ limit: () => ({ lean: async () => records.filter((r) => r.owner === owner) }) }) })
  };
  const app = express(); app.use(express.json());
  app.use(createStudyPlanRouter({ model, planModel, guard: (req, res, next) => {
    const owner = req.get("X-Test-User"); if (!owner) return res.sendStatus(401); req.user = { _id: owner }; next();
  } })); app.use(errorHandler);
  assert.equal((await request(app).post("/plans").send(daily())).status, 401);
  assert.equal((await request(app).post("/plans").set("X-Test-User", "new").send(daily())).status, 409);
  const saved = await request(app).post("/plans").set("X-Test-User", "alice").send({ ...daily(), owner: "bob", assessment: { scores: { V: 999 } } });
  assert.equal(saved.status, 201); assert.equal(saved.body.plan.owner, "alice");
  assert.equal(saved.body.plan.assessment.scores.V, 2);
  assert.equal((await request(app).get("/plans").set("X-Test-User", "bob")).body.plans.length, 0);
  const loaded = await request(app).get("/plans").set("X-Test-User", "alice");
  assert.equal(loaded.body.plans.length, 1); assert.equal(loaded.body.plans[0].totalMinutes, 90);
  assert.equal((await request(app).post("/plans").set("X-Test-User", "alice").send({ ...daily(), lessonIds: [] })).status, 400);
  const week = await request(app).post("/plans").set("X-Test-User", "alice").send({ ...daily(), type: "weekly", studyDays: ["2026-10-18"] });
  assert.equal(week.status, 201); assert.deepEqual(week.body.plan.availability, []); assert.equal(week.body.plan.totalMinutes, null);
  const linked = { ...daily(), parentWeeklyId: week.body.plan._id };
  assert.equal((await request(app).post("/plans").set("X-Test-User", "alice").send(linked)).status, 201);
  assert.equal((await request(app).post("/plans").set("X-Test-User", "bob").send(linked)).status, 404);
  assert.equal((await request(app).post("/plans").set("X-Test-User", "alice").send({ ...linked, lessonIds: [studyLessons[1].lessonId] })).status, 400);
  assert.equal((await request(app).post("/plans").set("X-Test-User", "alice").send({ ...linked, goal: "exam", examDate: "2026-10-19" })).status, 400);
  assert.equal((await request(app).delete(`/plans/${week.body.plan._id}`)).status, 401);
  assert.equal((await request(app).delete(`/plans/${week.body.plan._id}`).set("X-Test-User", "bob")).status, 404);
  assert.equal((await request(app).delete("/plans/bad-id").set("X-Test-User", "alice")).status, 400);
  assert.equal((await request(app).delete(`/plans/${week.body.plan._id}`).set("X-Test-User", "alice")).status, 200);
  const remaining = (await request(app).get("/plans").set("X-Test-User", "alice")).body.plans;
  assert.equal(remaining.length, 2); assert.ok(remaining.every((p) => !p.parentWeeklyId));
  assert.equal((await request(app).delete(`/plans/${week.body.plan._id}`).set("X-Test-User", "alice")).status, 404);
});
