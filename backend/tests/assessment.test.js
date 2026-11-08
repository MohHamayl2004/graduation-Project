import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { validateAssessment } from "../validation/assessmentValidation.js";
import { emptyVarkAnswers, scoreVark, varkQuestions, VARK_VERSION } from "../../shared/varkQuestionnaire.js";
import { createStudyPlanRouter, assessmentChanged } from "../routes/studyPlanRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

const payload = () => ({ version: VARK_VERSION, answers: emptyVarkAnswers(), cursor: 0, complete: false });

test("generated schedules become stale only when their assessment snapshot differs", () => {
  const assessment = { version: "v1", scores: { V: 1, A: 2, R: 3, K: 4 } };
  const plan = { generated: { assessment } };
  assert.equal(assessmentChanged(plan, assessment), false);
  assert.equal(assessmentChanged(plan, { ...assessment, scores: { ...assessment.scores, K: 5 } }), true);
  assert.equal(assessmentChanged(plan, { ...assessment, version: "v2" }), true);
  assert.equal(assessmentChanged({}, assessment), false);
});

test("changed assessment flags stored plans and requires confirmation before replacement", async () => {
  const owner = "alice", id = "000000000000000000000001";
  const assessment = { completedAt: new Date(), version: "v1", scores: { V: 2, A: 0, R: 0, K: 0 } };
  const plan = { _id: id, owner, type: "daily", generated: { assessment: { version: "v1", scores: { V: 1, A: 0, R: 0, K: 0 } } } };
  const model = { findOne: () => ({ lean: async () => assessment }) };
  const planModel = {
    find: () => ({ sort: () => ({ limit: () => ({ lean: async () => [plan] }) }) }),
    findOne: () => ({ lean: async () => plan })
  };
  const app = express(); app.use(express.json());
  app.use(createStudyPlanRouter({ model, planModel, guard: (req, res, next) => { req.user = { _id: owner }; next(); } }));
  app.use(errorHandler);
  const list = await request(app).get("/plans");
  assert.equal(list.body.plans[0].generatedStale, true);
  const result = await request(app).post(`/plans/${id}/generate`).send({});
  assert.equal(result.status, 409);
  assert.equal(result.body.code, "REPLACE_REQUIRED");
  assert.equal(plan.generated.assessment.scores.V, 1);
});

test("PDF scoring chart: each row maps all four options once; known multi-select example", () => {
  assert.equal(varkQuestions.length, 16);
  assert.deepEqual(varkQuestions.map((q) => q.options.map((o) => o.category).join("")), ["KARV", "VARK", "KVRA", "KAVR", "AVKR", "KRVA", "KAVR", "RKAV", "RAKV", "KVRA", "VRAK", "ARVK", "KARV", "KRAV", "KARV", "VARK"]);
  const answers = emptyVarkAnswers();
  answers[2] = ["b", "c"];
  assert.deepEqual(scoreVark(answers), { V: 1, A: 0, R: 1, K: 0 });
  assert.deepEqual(scoreVark(varkQuestions.map(() => ["a", "b", "c", "d"])), { V: 16, A: 16, R: 16, K: 16 });
});

test("drafts may skip; completion requires some answers; server calculates scores", () => {
  assert.equal(validateAssessment(payload()).completedAt, null);
  assert.throws(() => validateAssessment({ ...payload(), complete: true }), { code: "EMPTY_ASSESSMENT" });
  const input = payload(); input.answers[0] = ["a", "d"];
  const saved = validateAssessment({ ...input, complete: true, scores: { V: 999 } });
  assert.deepEqual(saved.scores, { V: 1, A: 0, R: 0, K: 1 });
  assert.ok(saved.completedAt instanceof Date);
});

test("reject malformed choices, duplicates, cursor and version", () => {
  for (const change of [{ answers: [] }, { answers: null }, { cursor: 16 }, { cursor: -1 }, { complete: "true" }, { version: "other" }]) {
    assert.throws(() => validateAssessment({ ...payload(), ...change }), { code: "VALIDATION_ERROR" });
  }
  for (const choices of [["a", "a"], ["e"], [null], "a"]) {
    const input = payload(); input.answers[0] = choices;
    assert.throws(() => validateAssessment(input), { code: "VALIDATION_ERROR" });
  }
});

test("routes require login, isolate owners, and resume saved answers", async () => {
  const records = new Map();
  const model = {
    findOne: ({ owner }) => ({ lean: async () => records.get(owner) || null }),
    findOneAndUpdate: async ({ owner }, { $set }) => { records.set(owner, { ...records.get(owner), ...$set, owner }); return records.get(owner); }
  };
  const app = express(); app.use(express.json());
  app.use("/assessment", createStudyPlanRouter({ model, guard: (req, res, next) => {
    const owner = req.get("X-Test-User");
    if (!owner) return res.sendStatus(401);
    req.user = { _id: owner }; next();
  } }));
  app.use(errorHandler);
  assert.equal((await request(app).get("/assessment/assessment")).status, 401);
  const input = payload(); input.answers[0] = ["a"]; input.cursor = 1;
  const saved = await request(app).put("/assessment/assessment").set("X-Test-User", "alice").send({ ...input, owner: "bob" });
  assert.equal(saved.status, 200); assert.equal(saved.body.assessment.owner, "alice");
  assert.equal((await request(app).get("/assessment/assessment").set("X-Test-User", "bob")).body.assessment, null);
  const resumed = await request(app).get("/assessment/assessment").set("X-Test-User", "alice");
  assert.deepEqual(resumed.body.assessment.answers, input.answers);
  assert.equal(resumed.body.assessment.cursor, 1);
  const completed = await request(app).put("/assessment/assessment").set("X-Test-User", "alice").send({ ...input, complete: true });
  assert.ok(completed.body.assessment.completedAt);
  input.answers[0] = ["d"];
  const edited = await request(app).put("/assessment/assessment").set("X-Test-User", "alice").send(input);
  assert.ok(edited.body.assessment.completedAt);
  assert.deepEqual(edited.body.assessment.scores, scoreVark(input.answers));
  const reloaded = await request(app).get("/assessment/assessment").set("X-Test-User", "alice");
  assert.ok(reloaded.body.assessment.completedAt);
  assert.deepEqual(reloaded.body.assessment.answers, input.answers);
});
