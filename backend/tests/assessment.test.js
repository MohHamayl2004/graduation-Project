import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { validateAssessment } from "../validation/assessmentValidation.js";
import { emptyVarkAnswers, scoreVark, varkQuestions, VARK_VERSION } from "../../shared/varkQuestionnaire.js";
import { createStudyPlanRouter } from "../routes/studyPlanRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

const payload = () => ({ version: VARK_VERSION, answers: emptyVarkAnswers(), cursor: 0, complete: false });

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
    findOneAndUpdate: async ({ owner }, { $set }) => { records.set(owner, { ...$set, owner }); return records.get(owner); }
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
});
