import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { lessonMastery, masteryByLesson, masteryChanged, masterySnapshot, adaptActivities, masteryRules } from "../../shared/lessonMastery.js";
import { generateStudySchedule, varkProfile, lessonActivities } from "../../shared/studySchedule.js";
import { studyLessons } from "../../shared/studyPlanCatalog.js";
import { loadInteractiveLessons, gradeAnswer } from "../services/interactiveLessons.js";
import { createProgressRouter } from "../routes/progressRoutes.js";
import { createStudyPlanRouter, resultsChanged } from "../routes/studyPlanRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

const answers = (pattern) => [...pattern].map((c, i) => ({ checkpointId: `cp${i}`, skill: `مهارة ${i % 2}`, correct: c === "1" }));
const lessonId = "math-u1-l1";

test("mastery levels follow the rules, and too few answers decide nothing", () => {
  assert.equal(lessonMastery([]).level, null);
  assert.equal(lessonMastery(answers("00")).level, null); // below minAnswers
  assert.equal(lessonMastery(answers("1000")).level, "weak");
  assert.equal(lessonMastery(answers("1100")).level, "steady"); // exactly half is not weak
  assert.equal(lessonMastery(answers("1111110")).level, "strong"); // 6/7 ≈ 0.857
  assert.equal(lessonMastery(answers("1111100")).level, "steady"); // 5/7 ≈ 0.714
  assert.deepEqual(lessonMastery(answers("0101")).weakSkills, ["مهارة 0"]);
  assert.equal(masteryRules.minAnswers, 3);
});

test("weak lessons get more practice and named skills, strong ones a quick review, steady ones nothing", () => {
  const base = lessonActivities(studyLessons[0], varkProfile({ V: 2, A: 1, R: 1, K: 1 }));
  const weak = adaptActivities(base, lessonMastery(answers("1000")));
  const strong = adaptActivities(base, lessonMastery(answers("1111")));
  assert.deepEqual(adaptActivities(base, lessonMastery(answers("1100"))), base);
  assert.deepEqual(adaptActivities(base, lessonMastery(answers("0"))), base);
  for (const id of ["practice", "quiz"]) {
    const before = base.find((a) => a.id === id), after = weak.find((a) => a.id === id);
    assert.ok(after.minutes > before.minutes); assert.equal(after.adapted, "weak"); assert.match(after.guidance, /مهارة/);
  }
  for (const id of ["explanation", "example"]) {
    const before = base.find((a) => a.id === id), after = strong.find((a) => a.id === id);
    assert.ok(after.minutes < before.minutes && after.minutes >= 2); assert.equal(after.adapted, "strong");
  }
  assert.deepEqual(weak.map((a) => a.id), base.map((a) => a.id)); // order kept
});

test("the generated schedule uses mastery, records a snapshot and still adds up", () => {
  const input = { type: "daily", goal: "regular", periodStart: "2026-10-18", availability: [{ date: "2026-10-18", start: "09:00", end: "13:00" }], lessonIds: [lessonId, studyLessons[1].lessonId] };
  const score = { version: "t", scores: { V: 2, A: 1, R: 1, K: 1 } };
  const plain = generateStudySchedule(input, score, new Date("2026-10-17"));
  const weak = generateStudySchedule(input, score, new Date("2026-10-17"), { [lessonId]: lessonMastery(answers("1000")) });
  const strong = generateStudySchedule(input, score, new Date("2026-10-17"), { [lessonId]: lessonMastery(answers("1111")) });
  const minutes = (g) => g.lessons.find((l) => l.lessonId === lessonId).minutes;
  assert.ok(minutes(weak) > minutes(plain)); assert.ok(minutes(strong) < minutes(plain));
  assert.deepEqual(weak.lessons.map((l) => l.lessonId), plain.lessons.map((l) => l.lessonId));
  assert.equal(weak.lessons[0].mastery.level, "weak");
  assert.deepEqual(weak.mastery.snapshot, { [lessonId]: { answered: 4, correct: 1 } });
  assert.deepEqual(plain.mastery.snapshot, {});
  for (const g of [weak, strong]) {
    for (const s of g.sessions) assert.equal(s.activities.reduce((n, a) => n + a.minutes, 0), s.minutes);
    assert.equal(g.scheduledStudyMinutes + g.remainingStudyMinutes, g.requiredStudyMinutes);
  }
});

test("a plan is stale only when answers for its own lessons changed", () => {
  const byLesson = masteryByLesson([{ lessonId, answers: answers("101") }, { lessonId: "other", answers: answers("1") }]);
  const snap = masterySnapshot(byLesson, [lessonId]);
  assert.equal(masteryChanged(snap, byLesson, [lessonId]), false);
  assert.equal(masteryChanged(snap, masteryByLesson([{ lessonId, answers: answers("1011") }]), [lessonId]), true);
  assert.equal(masteryChanged({}, byLesson, ["unrelated"]), false);
  assert.equal(resultsChanged({ lessonIds: [lessonId] }, byLesson), false); // never generated
  assert.equal(resultsChanged({ lessonIds: [lessonId], generated: { mastery: { snapshot: {} } } }, byLesson), true);
});

test("the answer key comes from the lesson file", () => {
  const lessons = loadInteractiveLessons();
  assert.ok(!lessons.has("demo")); // no study lesson, not tracked
  assert.deepEqual(gradeAnswer(lessons, { interactiveId: "1-1-stickman", checkpointId: "cp2", choiceId: "a" }), { studyLessonId: lessonId, skill: "حساب Δس", correct: true });
  assert.equal(gradeAnswer(lessons, { interactiveId: "1-1-stickman", checkpointId: "cp2", choiceId: "b" }).correct, false);
  assert.equal(gradeAnswer(lessons, { interactiveId: "1-1-stickman", checkpointId: "nope", choiceId: "a" }), null);
  assert.equal(gradeAnswer(lessons, { interactiveId: "1-1-stickman", checkpointId: "cp2", choiceId: "z" }), null);
});

// An in-memory LessonResult with the unique (owner, lessonId) index.
function fakeResults() {
  const docs = [];
  const match = (d, q) => d.owner === q.owner && d.lessonId === q.lessonId;
  return { docs,
    find: ({ owner }) => ({ lean: async () => docs.filter((d) => d.owner === owner).map((d) => structuredClone(d)) }),
    findOne: (q) => ({ lean: async () => structuredClone(docs.find((d) => match(d, q)) || null) }),
    findOneAndUpdate: async (q, update) => {
      const skip = q["answers.checkpointId"].$ne;
      const doc = docs.find((d) => match(d, q) && !d.answers.some((a) => a.checkpointId === skip));
      if (doc) { doc.answers.push(update.$push.answers); return doc; }
      if (docs.some((d) => match(d, q))) throw Object.assign(new Error("duplicate"), { code: 11000 });
      const created = { owner: q.owner, lessonId: q.lessonId, answers: [update.$push.answers] }; docs.push(created); return created;
    } };
}
const as = (req, res, next) => { if (!req.get("X-User")) return res.sendStatus(401); req.user = { _id: req.get("X-User") }; next(); };

test("checkpoint answers are graded by the API, first attempts only, per student", async () => {
  const resultModel = fakeResults();
  const planModel = { findOne: () => ({ sort: () => ({ lean: async () => null }) }) };
  const app = express(); app.use(express.json());
  app.use(createProgressRouter({ guard: as, planModel, resultModel, quizModel: { find: () => ({ lean: async () => [] }) } })); app.use(errorHandler);
  const send = (user, body) => request(app).post("/checkpoints").set("X-User", user).send({ interactiveId: "1-1-stickman", atSeconds: 10, ...body });
  assert.equal((await request(app).post("/checkpoints").send({})).status, 401);
  assert.equal((await send("alice", { checkpointId: "cp1" })).status, 400);
  assert.equal((await send("alice", { checkpointId: "nope", choiceId: "a" })).status, 404);
  assert.equal((await send("alice", { checkpointId: "cp1", choiceId: "a", correct: false })).body.correct, true); // client cannot set correctness
  const first = await send("alice", { checkpointId: "cp2", choiceId: "b" });
  assert.equal(first.status, 201); assert.equal(first.body.correct, false);
  const retry = await send("alice", { checkpointId: "cp2", choiceId: "a" });
  assert.equal(retry.status, 200); assert.equal(retry.body.recorded, false); assert.equal(retry.body.mastery.correct, 1);
  await send("alice", { checkpointId: "cp3", choiceId: "b" });
  await send("bob", { checkpointId: "cp1", choiceId: "a" });
  const mine = (await request(app).get("/mastery").set("X-User", "alice")).body.mastery;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].lessonId, lessonId); assert.ok(mine[0].lessonTitle);
  assert.equal(mine[0].answered, 3); assert.equal(mine[0].correct, 1); assert.equal(mine[0].level, "weak");
  assert.deepEqual(mine[0].weakSkills, ["حساب Δس", "التعويض في الاقتران"]);
  assert.equal((await request(app).get("/mastery").set("X-User", "bob")).body.mastery[0].answered, 1);
  assert.equal((await request(app).get("/overview").set("X-User", "alice")).body.mastery[0].level, "weak");
});

test("new answers mark a generated plan stale and the regenerated plan adapts", async () => {
  const owner = "alice", id = "000000000000000000000001";
  const plan = { _id: id, owner, type: "daily", goal: "regular", periodStart: "2026-10-18", generationRevision: 0,
    availability: [{ date: "2026-10-18", start: "09:00", end: "13:00" }], lessonIds: [lessonId], studyDays: ["2026-10-18"] };
  const assessment = { completedAt: new Date(), version: "v1", scores: { V: 2, A: 1, R: 1, K: 1 } };
  const model = { findOne: () => ({ lean: async () => assessment }) };
  const planModel = {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [plan] }) }) }),
    findOne: () => ({ lean: async () => plan }),
    findOneAndUpdate: async (q, u) => { Object.assign(plan, u.$set); plan.generationRevision += u.$inc.generationRevision; return plan; }
  };
  const results = [];
  const resultModel = { find: () => ({ lean: async () => results }) };
  const app = express(); app.use(express.json());
  app.use(createStudyPlanRouter({ model, planModel, resultModel, guard: (req, res, next) => { req.user = { _id: owner }; next(); } }));
  app.use(errorHandler);
  assert.equal((await request(app).post(`/plans/${id}/generate`).send({})).status, 200);
  assert.equal((await request(app).get("/plans")).body.plans[0].generatedStale, false);
  results.push({ lessonId, answers: answers("1000") });
  const listed = (await request(app).get("/plans")).body.plans[0];
  assert.equal(listed.generatedStale, true); assert.equal(listed.resultsChanged, true);
  assert.equal((await request(app).post(`/plans/${id}/generate`).send({})).body.code, "REPLACE_REQUIRED");
  const again = await request(app).post(`/plans/${id}/generate`).send({ replace: true, expectedRevision: 1 });
  assert.equal(again.status, 200);
  assert.equal(again.body.plan.generated.lessons[0].mastery.level, "weak");
  assert.equal(again.body.plan.generatedStale, false);
});
