import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createMathUnitRouter } from "../routes/mathUnitRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

test("unit API authenticates, grades on the server, and isolates saved progress", async () => {
  const records = new Map();
  const key = (q) => q.owner + ":" + q.lessonId;
  const model = {
    findOne: (q) => ({ lean: async () => records.get(key(q)) || null }),
    find: (q) => ({
      lean: async () =>
        [...records.values()].filter((x) => x.owner === q.owner),
    }),
    findOneAndUpdate: (q, u) => ({
      lean: async () => {
        const r = records.get(key(q)) || {
          ...q,
          completedActivities: [],
          attempts: [],
        };
        if (u.$set) Object.assign(r, u.$set);
        if (u.$push) r.attempts.push(...u.$push.attempts.$each);
        if (
          u.$addToSet &&
          !r.completedActivities.includes(u.$addToSet.completedActivities)
        )
          r.completedActivities.push(u.$addToSet.completedActivities);
        records.set(key(q), r);
        return r;
      },
    }),
  };
  const app = express();
  app.use(express.json());
  app.use(
    createMathUnitRouter({
      model,
      guard: (req, res, next) => {
        if (!req.get("X-User")) return res.sendStatus(401);
        req.user = { _id: req.get("X-User") };
        next();
      },
    }),
  );
  app.use(errorHandler);
  assert.equal((await request(app).get("/lessons")).status, 401);
  const catalog = await request(app).get("/lessons").set("X-User", "a");
  assert.equal(catalog.body.lessons.length, 7);
  const lesson = await request(app).get("/lessons/1-7").set("X-User", "a");
  assert.ok(
    lesson.body.lesson.activities.every(
      (a) => !("answer" in a) && !("correct" in a),
    ),
  );
  const post = (answer) =>
    request(app)
      .post("/lessons/1-7/attempts")
      .set("X-User", "a")
      .send({ activityId: "implicit-slope", answer, correct: true });
  assert.equal((await post("1")).body.correct, false);
  assert.equal((await post("٢/٣")).body.correct, true);
  assert.equal((await post("1/0")).status, 400);
  assert.equal(
    (await request(app).get("/lessons/1-7/progress").set("X-User", "b")).body
      .progress,
    null,
  );
  const saved = await request(app)
    .get("/lessons/1-7/progress")
    .set("X-User", "a");
  assert.equal(saved.body.progress.attempts.length, 2);
  assert.deepEqual(saved.body.progress.completedActivities, ["implicit-slope"]);
  assert.equal(
    (
      await request(app)
        .put("/lessons/1-7/progress")
        .set("X-User", "a")
        .send({ page: 999 })
    ).status,
    400,
  );
  const answers = [
    ["1-1", "rate", "-2"],
    ["1-2", "product", "0"],
    ["1-3", "trig-product", "1"],
    ["1-4", "cos-limit", "1/2"],
    ["1-5", "normal", "-1/8"],
    ["1-6", "chain-tangent", "23"],
    ["1-7", "implicit-slope", "2/3"],
  ].map(([lessonId, activityId, answer]) => ({ lessonId, activityId, answer }));
  assert.equal(
    (
      await request(app)
        .post("/assessment")
        .set("X-User", "a")
        .send({ answers, score: 0 })
    ).body.score,
    7,
  );
  assert.equal(
    (await request(app).get("/assessment").set("X-User", "a")).body.result
      .score,
    7,
  );
  assert.equal(
    (await request(app).get("/assessment").set("X-User", "b")).body.result,
    null,
  );
  assert.equal(
    (
      await request(app)
        .post("/assessment")
        .set("X-User", "a")
        .send({ answers: answers.slice(1) })
    ).status,
    400,
  );
});
