import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import request from "supertest";
import { effectiveSubscription, activation, DAY_MS } from "../../shared/subscriptions.js";
import { analyticsFilters, buildAnalytics, studentsCsv } from "../services/adminAnalytics.js";
import { createApp } from "../app.js";
import { connectTestDatabase, clearTestCollections, disconnectTestDatabase } from "./helpers/testDatabase.js";
import { maintainSubscriptions } from "../services/subscriptionMaintenance.js";
import { signToken, verifyToken } from "../services/tokenService.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import SchoolCoupon from "../models/SchoolCoupon.js";
import AdminEvent from "../models/AdminEvent.js";
import Workspace from "../models/Workspace.js";
import Membership from "../models/Membership.js";
import StudyPlan from "../models/StudyPlan.js";
import LearningAssessment from "../models/LearningAssessment.js";

test("trial lasts exactly seven days; expiry blocks access at the boundary", () => {
  const createdAt = new Date("2026-10-01T12:00:00Z");
  assert.equal(effectiveSubscription({ createdAt }, new Date("2026-10-08T11:59:59Z")).status, "FREE");
  assert.equal(effectiveSubscription({ createdAt }, new Date("2026-10-08T12:00:00Z")).status, "INACTIVE");
  assert.equal(effectiveSubscription({ createdAt, role: "admin" }, new Date("2027-01-01")).canAccess, true);
  const pending = effectiveSubscription({ createdAt, subscription: { tier: "monthly", status: "INACTIVE", reason: "awaiting_payment" } });
  assert.equal(pending.startsAt, null); assert.equal(pending.canAccess, false);
});
test("30/120/365-day paid durations start on activation and early renewal preserves remaining time", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  for (const [tier, days] of [["monthly", 30], ["quarterly", 120], ["yearly", 365]]) {
    const activated = activation(tier, now);
    assert.equal(activated.expiresAt - now, days * DAY_MS);
    const renewed = activation(tier, now, activated.expiresAt, true);
    assert.equal(renewed.expiresAt - now, 2 * days * DAY_MS);
  }
});
test("analytics and CSV share combined city/tier filters; empty data stays empty; demo money is separate", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const users = [
    { _id: "a", fullName: "=FORMULA", email: "a@example.com", city: "نابلس", createdAt: now, subscription: activation("monthly", now) },
    { _id: "b", fullName: "B", email: "b@example.com", city: "غزة", createdAt: now, subscription: activation("yearly", now) },
    { _id: "c", fullName: "C", email: "c@example.com", city: "نابلس", createdAt: now }
  ];
  const payments = [{ owner: "a", status: "completed", tier: "monthly", amountCents: 3999, demo: true, paidAt: now }, { owner: "b", status: "completed", tier: "yearly", amountCents: 39999, demo: false, paidAt: now }];
  const filters = analyticsFilters({ city: "نابلس", tier: "monthly" }, now);
  const report = buildAnalytics(users, payments, filters, now);
  assert.equal(report.stats.total, 1); assert.equal(report.stats.demoCents, 3999); assert.equal(report.stats.realCents, 0);
  assert.equal(report.students[0].email, "a@example.com"); assert.equal(report.tierCounts[0].count, 1);
  assert.deepEqual(report.payments[0].student, { id: "a", fullName: "=FORMULA", email: "a@example.com" });
  const ordered = buildAnalytics(users, [{ ...payments[0], _id: "older", paidAt: new Date("2026-10-16T12:00:00Z") }, { ...payments[0], _id: "newer" }], filters, now);
  assert.deepEqual(ordered.payments.map((p) => p._id), ["newer", "older"]);
  const csv = studentsCsv(report); assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes("'=FORMULA")); assert.ok(!csv.includes("b@example.com"));
  const empty = buildAnalytics([], [], analyticsFilters({}, now), now);
  assert.equal(empty.stats.total, 0); assert.equal(empty.stats.demoCents, 0); assert.deepEqual(empty.cityCounts, []);
  assert.throws(() => analyticsFilters({ city: "forged" }, now), { code: "INVALID_FILTER" });
  assert.throws(() => analyticsFilters({ from: "2026-10-18", to: "2026-10-17" }, now), { code: "INVALID_FILTER" });
});

test("stream filters combine with city and plan for students, payments, chart and CSV", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const users = ["scientific", "literary", "scientific"].map((stream, i) => ({ _id: String(i), email: `${i}@example.invalid`, fullName: `Student ${i}`, city: i === 2 ? "غزة" : "نابلس", stream, createdAt: now, subscription: activation("monthly", now) }));
  const payments = users.map((u) => ({ owner: u._id, status: "completed", tier: "monthly", demo: true, amountCents: 3999, paidAt: now }));
  const report = buildAnalytics(users, payments, analyticsFilters({ city: "نابلس", tier: "monthly", stream: "scientific" }, now), now);
  assert.equal(report.stats.total, 1); assert.equal(report.stats.paymentCount, 1); assert.equal(report.stats.demoCents, 3999);
  assert.deepEqual(report.streamCounts, [{ label: "علمي", count: 1 }]);
  assert.ok(report.notes.some((s) => s.includes("أكثر فرع دراسي") && s.includes("علمي")));
  assert.ok(studentsCsv(report).includes('"الفرع الدراسي"')); assert.ok(studentsCsv(report).includes('"علمي"')); assert.ok(!studentsCsv(report).includes("1@example.invalid"));
  assert.throws(() => analyticsFilters({ stream: "invalid" }, now), { code: "INVALID_FILTER" });
  const legacy = buildAnalytics([{ ...users[0], stream: undefined }], payments, analyticsFilters({ stream: "unspecified" }, now), now);
  assert.equal(legacy.stats.total, 1); assert.equal(legacy.streamCounts[0].label, "المسار غير محدد");
});

test("real database billing: activation, retries, renewal, expiry, admin roles, filters and audit", { skip: !process.env.MONGO_URI_TEST, timeout: 120000 }, async (t) => {
  process.env.JWT_SECRET ||= crypto.randomBytes(32).toString("hex");
  try {
    await connectTestDatabase(); await Promise.all([User.init(), Payment.init(), SchoolCoupon.init(), AdminEvent.init()]); await clearTestCollections();
    const app = createApp();
    const studentData = { fullName: "طالب الاشتراك", email: "billing@example.invalid", password: "Subscription-test-1", birthDate: "2008-04-10", stream: "scientific", city: "نابلس" };
    const registered = await request(app).post("/api/auth/signup").send({ ...studentData, role: "admin" });
    assert.equal(registered.status, 201); assert.equal(registered.body.user.role, "student"); assert.equal(registered.body.user.subscription.status, "FREE");
    const token = registered.body.token; const studentId = registered.body.user._id;
    assert.equal((await verifyToken(token)).role, "student");
    assert.equal((await request(app).get("/api/admin/report").auth(token, { type: "bearer" })).status, 403);
    assert.equal((await request(app).get("/api/study-plan/plans").auth(token, { type: "bearer" })).status, 200);
    await SchoolCoupon.create({ code: "SCHOOL-20", schoolName: "مدرسة اختبار", discountPercent: 20 });
    await User.updateOne({ _id: studentId }, { $set: { "subscription.expiresAt": new Date(0) } });
    const payload = { tier: "monthly", couponCode: "SCHOOL-20", key: crypto.randomUUID(), amountCents: 1 };
    const first = await request(app).post("/api/billing/demo-payment").auth(token, { type: "bearer" }).send(payload);
    assert.equal(first.status, 200); assert.equal(first.body.payment.amountCents, 3199); assert.equal(first.body.user.subscription.status, "ACTIVE");
    const expiry = first.body.user.subscription.expiresAt;
    const retried = await request(app).post("/api/billing/demo-payment").auth(token, { type: "bearer" }).send(payload);
    assert.equal(retried.body.user.subscription.expiresAt, expiry); assert.equal(await Payment.countDocuments(), 1);
    const parallel = await Promise.all([1, 2].map(() => request(app).post("/api/billing/demo-payment").auth(token, { type: "bearer" }).send({ tier: "monthly", couponCode: "", key: "same-concurrent-payment-key" })));
    assert.ok(parallel.every((r) => r.status === 200)); assert.equal(await Payment.countDocuments(), 2);
    let student = await User.findById(studentId);
    assert.equal(new Date(student.subscription.expiresAt).toISOString(), expiry);
    assert.equal(student.subscription.periods.length, 2);
    assert.equal(student.subscription.periods[1].startsAt.toISOString(), expiry);
    assert.equal(student.subscription.periods[1].expiresAt - student.subscription.periods[1].startsAt, 30 * DAY_MS);
    assert.equal(student.subscription.appliedPaymentIds.length, 2);
    const admin = await User.create({ fullName: "مدير اختبار", email: "admin@example.invalid", role: "admin", passwordHash: await bcrypt.hash("Admin-test-password", 4) });
    const adminToken = await signToken(admin._id, "admin");
    assert.equal((await verifyToken(adminToken)).role, "admin");
    const tokenParts = token.split(".");
    tokenParts[3] = (tokenParts[3][0] === "a" ? "b" : "a") + tokenParts[3].slice(1);
    const tampered = tokenParts.join(".");
    const wrongKey = jwt.sign({ sub: studentId, role: "admin" }, "untrusted-secret", { algorithm: "HS256" });
    const legacy = jwt.sign({ sub: studentId }, process.env.JWT_SECRET, { algorithm: "HS256" });
    for (const invalid of [tampered, wrongKey, legacy, await signToken(studentId, "admin")]) {
      assert.equal((await request(app).get("/api/admin/report").auth(invalid, { type: "bearer" })).status, 401);
    }
    for (const path of ["/api/admin/report", "/api/admin/students.csv", "/api/admin/events"]) {
      assert.equal((await request(app).get(path)).status, 401);
      assert.equal((await request(app).get(path).auth(token, { type: "bearer" })).status, 403);
    }
    await User.updateOne({ _id: admin._id }, { $set: { role: "student" } });
    assert.equal((await request(app).get("/api/admin/report").auth(adminToken, { type: "bearer" })).status, 401);
    await User.updateOne({ _id: admin._id }, { $set: { role: "admin" } });
    const authAdmin = (req) => req.auth(adminToken, { type: "bearer" });
    const action = (input) => authAdmin(request(app).post(`/api/admin/students/${studentId}/action`)).send({ reason: "تجربة التحكم الإداري", ...input });
    assert.equal((await action({ action: "deactivate" })).status, 200);
    assert.equal((await request(app).get("/api/study-plan/plans").auth(token, { type: "bearer" })).status, 403);
    assert.equal((await request(app).get("/api/billing").auth(token, { type: "bearer" })).status, 200);
    const manual = await action({ action: "activate", tier: "quarterly" }); assert.equal(manual.status, 200);
    assert.equal(new Date(manual.body.user.subscription.expiresAt) - new Date(manual.body.user.subscription.startsAt), 120 * DAY_MS);
    assert.equal(await Payment.countDocuments(), 2);
    await action({ action: "block" });
    assert.equal((await request(app).post("/api/auth/login").send(studentData)).status, 403);
    await action({ action: "unblock" });
    await User.updateOne({ _id: studentId }, { $set: { "subscription.expiresAt": new Date(0) } });
    assert.equal((await request(app).get("/api/study-plan/plans").auth(token, { type: "bearer" })).status, 403);
    assert.equal((await request(app).post("/api/auth/login").send(studentData)).status, 200);
    await maintainSubscriptions(); student = await User.findById(studentId); assert.equal(student.subscription.status, "INACTIVE");
    const report = await authAdmin(request(app).get("/api/admin/report?city=" + encodeURIComponent("نابلس") + "&tier=quarterly"));
    assert.equal(report.status, 200); assert.equal(report.body.stats.total, 1); assert.equal(report.body.stats.demoCents, 0);
    const csv = await authAdmin(request(app).get("/api/admin/students.csv?city=" + encodeURIComponent("نابلس") + "&tier=quarterly"));
    assert.equal(csv.status, 200); assert.ok(csv.text.includes(studentData.email));
    const events = await authAdmin(request(app).get("/api/admin/events")); assert.equal(events.body.events.length, 4);
    await action({ action: "block" });
    const gift = await action({ action: "grant", tier: "yearly", reason: "" });
    assert.equal(gift.status, 200); assert.equal(gift.body.user.status, "ACTIVE"); assert.equal(gift.body.user.subscription.status, "ACTIVE");
    assert.equal(gift.body.user.subscription.activationSource, "admin_gift");
    assert.equal(new Date(gift.body.user.subscription.expiresAt) - new Date(gift.body.user.subscription.startsAt), 365 * DAY_MS);
    assert.equal(await Payment.countDocuments(), 2);
    assert.equal((await request(app).post("/api/auth/login").send(studentData)).status, 200);
    const removable = await request(app).post("/api/auth/signup").send({ ...studentData, email: "delete-me@example.invalid" });
    const removableId = removable.body.user._id;
    await StudyPlan.create({ owner: removableId, title: "خطة اختبار الحذف" });
    await LearningAssessment.create({ owner: removableId, version: "test", answers: [] });
    const removal = (payload) => authAdmin(request(app).post(`/api/admin/students/${removableId}/action`)).send({ action: "delete", ...payload });
    assert.equal((await removal({ confirmEmail: "wrong@example.invalid" })).status, 400);
    assert.ok(await User.exists({ _id: removableId }));
    assert.equal((await request(app).post(`/api/admin/students/${removableId}/action`).auth(token, { type: "bearer" }).send({ action: "delete", confirmEmail: "delete-me@example.invalid" })).status, 403);
    assert.equal((await removal({ confirmEmail: "delete-me@example.invalid" })).body.deleted, true);
    for (const [model, query] of [[User, { _id: removableId }], [StudyPlan, { owner: removableId }], [LearningAssessment, { owner: removableId }], [Workspace, { ownerId: removableId }], [Membership, { userId: removableId }]]) assert.equal(await model.exists(query), null);
    assert.equal((await request(app).get("/api/auth/me").auth(removable.body.token, { type: "bearer" })).status, 401);
    assert.equal((await authAdmin(request(app).post(`/api/admin/students/${admin._id}/action`)).send({ action: "delete", confirmEmail: admin.email })).status, 404);
    assert.equal(await AdminEvent.countDocuments({ action: "delete", "details.deletedEmail": "delete-me@example.invalid" }), 1);
    const pending = await request(app).post("/api/auth/signup").send({ ...studentData, email: "pending@example.invalid", subscriptionTier: "yearly" });
    assert.equal(pending.body.user.subscription.canAccess, false); assert.equal(pending.body.user.subscription.startsAt, null);
    assert.equal((await request(app).get("/api/study-plan/plans").auth(pending.body.token, { type: "bearer" })).status, 403);
    const trial = await request(app).post("/api/auth/signup").send({ ...studentData, email: "queued-trial@example.invalid" });
    const trialExpiry = trial.body.user.subscription.expiresAt;
    const queued = await request(app).post("/api/billing/demo-payment").auth(trial.body.token, { type: "bearer" }).send({ tier: "yearly", key: crypto.randomUUID() });
    assert.equal(queued.status, 200); assert.equal(queued.body.user.subscription.status, "FREE");
    assert.equal(queued.body.user.subscription.expiresAt, trialExpiry);
    assert.equal(queued.body.user.subscription.queuedPlans[0].tier, "yearly");
    assert.equal(queued.body.payment.subscriptionStartsAt, trialExpiry);
    assert.equal((await request(app).patch("/api/billing/city").auth(trial.body.token, { type: "bearer" }).send({ city: "غزة" })).status, 409);
    await User.updateOne({ _id: trial.body.user._id }, { $unset: { city: 1 } });
    assert.equal((await request(app).patch("/api/billing/city").auth(trial.body.token, { type: "bearer" }).send({ city: "غزة" })).status, 200);
    assert.equal((await request(app).patch("/api/billing/city").auth(trial.body.token, { type: "bearer" }).send({ city: "نابلس" })).status, 409);
    await maintainSubscriptions(new Date(trialExpiry));
    const transitioned = await User.findById(trial.body.user._id);
    assert.equal(transitioned.subscription.tier, "yearly");
    assert.equal(effectiveSubscription(transitioned, new Date(trialExpiry)).status, "ACTIVE");
  } finally {
    if (User.db.readyState === 1) await clearTestCollections();
    await disconnectTestDatabase();
  }
});
