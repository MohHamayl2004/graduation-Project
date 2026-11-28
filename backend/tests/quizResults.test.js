import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createProgressRouter } from "../routes/progressRoutes.js";
import { loadQuizBank, gradeQuiz } from "../services/quizBank.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

const bank = loadQuizBank();
const quiz = bank.get("rate-of-change");
const rightAnswers = Object.fromEntries([...quiz.questions].map(([id, q]) => [id, q.answer]));
const wrongOf = (q) => [...q.choices].find((c) => c !== q.answer);

function fakeQuizResults() {
  const docs = [];
  return { docs,
    create: async (d) => { const doc = { ...d, _id: `r${docs.length + 1}`, createdAt: new Date(Date.now() + docs.length) }; docs.push(doc); return doc; },
    find: ({ owner }) => ({ lean: async () => docs.filter((d) => d.owner === owner) }) };
}
const as = (req, res, next) => { if (!req.get("X-User")) return res.sendStatus(401); req.user = { _id: req.get("X-User") }; next(); };
const app = (quizModel) => {
  const a = express(); a.use(express.json());
  a.use(createProgressRouter({ guard: as, planModel: { findOne: () => ({ sort: () => ({ lean: async () => null }) }) }, resultModel: { find: () => ({ lean: async () => [] }) }, quizModel, quizBank: bank }));
  a.use(errorHandler); return a;
};

test("the API grades a quiz from the quiz file, not from the browser", () => {
  assert.equal(gradeQuiz(bank, "rate-of-change", rightAnswers).score, 100);
  const half = { ...rightAnswers }; [...quiz.questions].slice(0, 5).forEach(([id, q]) => { half[id] = wrongOf(q); });
  const r = gradeQuiz(bank, "rate-of-change", half);
  assert.equal(r.correct, 5); assert.equal(r.score, 50);
  assert.equal(gradeQuiz(bank, "rate-of-change", { q1: "أ" }), null, "every question needs an answer");
  assert.equal(gradeQuiz(bank, "rate-of-change", { ...rightAnswers, q1: "ه" }), null, "unknown choice");
  assert.equal(gradeQuiz(bank, "nope", rightAnswers), null);
});

test("a finished quiz is saved per student and shows in the progress overview", async () => {
  const model = fakeQuizResults(), a = app(model);
  assert.equal((await request(a).post("/quiz-results").send({ quizId: "rate-of-change", answers: rightAnswers })).status, 401);
  assert.equal((await request(a).post("/quiz-results").set("X-User", "alice").send({ quizId: "rate-of-change", answers: { q1: "أ" } })).status, 400);
  const first = await request(a).post("/quiz-results").set("X-User", "alice").send({ quizId: "rate-of-change", answers: { ...rightAnswers, q1: wrongOf(quiz.questions.get("q1")) }, score: 100 });
  assert.equal(first.status, 201); assert.equal(first.body.score, 90, "the browser's own score is ignored");
  await request(a).post("/quiz-results").set("X-User", "alice").send({ quizId: "rate-of-change", answers: rightAnswers });
  await request(a).post("/quiz-results").set("X-User", "bob").send({ quizId: "rate-of-change", answers: rightAnswers });
  const o = (await request(a).get("/overview").set("X-User", "alice")).body;
  assert.equal(o.metrics.quizAttempts, 2);
  assert.equal(o.metrics.quizAverage, 95);
  assert.equal(o.quizzes.length, 1);
  assert.deepEqual([o.quizzes[0].attempts, o.quizzes[0].best, o.quizzes[0].last, o.quizzes[0].title], [2, 100, 100, "متوسط التغير"]);
  assert.equal((await request(a).get("/overview").set("X-User", "carol")).body.metrics.quizAverage, null, "no quizzes yet: no average");
});
