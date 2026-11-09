import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createProgressRouter } from "../routes/progressRoutes.js";
import { errorHandler } from "../middleware/errorMiddleware.js";

test("overview validates period, isolates plans by owner, and never invents activity", async () => {
  const plans = [{ _id: "p1", owner: "alice", type: "daily", periodStart: "2026-11-08", generated: { sessions: [{ id: "1" }, { id: "2" }] } }];
  const model = { findOne: (query) => ({ sort: () => ({ lean: async () => plans.find((p) => p.owner === query.owner) || null }) }) };
  const app = express();
  app.use(createProgressRouter({ planModel: model, guard: (req, res, next) => {
    if (!req.get("X-User")) return res.sendStatus(401);
    req.user = { _id: req.get("X-User") }; next();
  } }));
  app.use(errorHandler);
  assert.equal((await request(app).get("/overview")).status, 401);
  assert.equal((await request(app).get("/overview?days=14").set("X-User", "alice")).status, 400);
  const result = await request(app).get("/overview?days=30").set("X-User", "alice");
  assert.equal(result.status, 200);
  assert.equal(result.body.periodDays, 30);
  assert.equal(result.body.plan.scheduledSessions, 2);
  assert.equal(result.body.plan.completedSessions, null);
  assert.equal(result.body.metrics.completedLessons, null);
  assert.equal(result.body.metrics.studyMinutes, null);
  assert.equal(result.body.metrics.quizAverage, null);
  assert.equal((await request(app).get("/overview").set("X-User", "bob")).body.plan, null);
});

test("database failures return an error instead of an empty overview", async () => {
  const model = { findOne: () => ({ sort: () => ({ lean: async () => { throw new Error("database unavailable"); } }) }) };
  const app = express();
  app.use(createProgressRouter({ planModel: model, guard: (req, res, next) => { req.user = { _id: "alice" }; next(); } }));
  app.use(errorHandler);
  assert.equal((await request(app).get("/overview")).status, 500);
});
