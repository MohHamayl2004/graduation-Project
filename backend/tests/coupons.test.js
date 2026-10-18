import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import { createApp } from "../app.js";
import { signToken } from "../services/tokenService.js";
import { validateCoupon, couponDto } from "../services/couponService.js";
import { quoteFor } from "../services/billingService.js";
import User from "../models/User.js";
import SchoolCoupon from "../models/SchoolCoupon.js";
import AdminEvent from "../models/AdminEvent.js";
import { connectTestDatabase, clearTestCollections, disconnectTestDatabase } from "./helpers/testDatabase.js";

const input = { code: "school-15", schoolName: "مدرسة الاختبار", discountPercent: 15, durationDays: 30 };
test("coupon validation and exact expiry states", () => {
  assert.equal(validateCoupon(input).code, "SCHOOL-15");
  for (const change of [{ discountPercent: 0 }, { discountPercent: 101 }, { durationDays: 0 }, { durationDays: 1.5 }, { durationDays: 3651 }, { code: "bad code" }, { schoolName: "" }]) assert.throws(() => validateCoupon({ ...input, ...change }));
  const now = new Date("2026-10-18T00:00:00Z");
  assert.equal(couponDto({ active: true, expiresAt: now }, now).state, "expired");
  assert.equal(couponDto({ active: false, expiresAt: now }, now).state, "disabled");
  assert.equal(couponDto({ active: true, expiresAt: new Date(+now + 86400000) }, now).remainingDays, 1);
});
test("real database coupons: admin creation, duplicate, discount, disable, expiry and authorization", { skip: !process.env.MONGO_URI_TEST, timeout: 60000 }, async () => {
  process.env.JWT_SECRET ||= randomBytes(48).toString("hex");
  try {
    await connectTestDatabase(); await Promise.all([User.init(), SchoolCoupon.init()]); await clearTestCollections();
    const admin = await User.create({ fullName: "أدمن كوبونات", email: "coupon-admin@example.invalid", role: "admin", passwordHash: "unused" });
    const student = await User.create({ fullName: "طالب كوبونات", email: "coupon-student@example.invalid", passwordHash: "unused" });
    const adminToken = await signToken(admin._id, "admin"), studentToken = await signToken(student._id);
    const app = createApp();
    const asAdmin = (req) => req.auth(adminToken, { type: "bearer" });
    assert.equal((await request(app).get("/api/admin/coupons")).status, 401);
    assert.equal((await request(app).post("/api/admin/coupons").auth(studentToken, { type: "bearer" }).send(input)).status, 403);
    const created = await asAdmin(request(app).post("/api/admin/coupons")).send(input);
    assert.equal(created.status, 201); assert.equal(created.body.coupon.state, "active");
    assert.ok(Math.abs(new Date(created.body.coupon.expiresAt) - new Date(created.body.coupon.createdAt) - 30 * 86400000) < 1000);
    const id = created.body.coupon._id;
    assert.equal((await asAdmin(request(app).post("/api/admin/coupons")).send(input)).status, 409);
    assert.equal((await quoteFor(student, "monthly", "school-15")).amountCents, 3399);
    assert.equal((await asAdmin(request(app).get("/api/admin/coupons"))).body.coupons.length, 1);
    assert.equal((await asAdmin(request(app).patch(`/api/admin/coupons/${id}`)).send({ active: false })).body.coupon.state, "disabled");
    await assert.rejects(quoteFor(student, "monthly", "school-15"), { code: "INVALID_SCHOOL_CODE" });
    assert.equal((await asAdmin(request(app).patch(`/api/admin/coupons/${id}`)).send({ active: true })).body.coupon.state, "active");
    await SchoolCoupon.updateOne({ _id: id }, { $set: { expiresAt: new Date(0) } });
    await assert.rejects(quoteFor(student, "monthly", "school-15"), { code: "INVALID_SCHOOL_CODE" });
    assert.equal((await asAdmin(request(app).patch(`/api/admin/coupons/${id}`)).send({ active: true })).status, 400);
    assert.equal((await asAdmin(request(app).post("/api/admin/coupons")).send({ ...input, code: "OTHER", discountPercent: 101 })).status, 400);
    assert.equal(await AdminEvent.countDocuments({ action: /^coupon_/ }), 3);
    assert.equal((await request(app).delete(`/api/admin/coupons/${id}`)).status, 401);
    assert.equal((await request(app).delete(`/api/admin/coupons/${id}`).auth(studentToken, { type: "bearer" })).status, 403);
    // Delete an active coupon too: it must disappear and stop discounting immediately.
    await SchoolCoupon.updateOne({ _id: id }, { $set: { expiresAt: new Date(Date.now() + 86400000) } });
    assert.equal((await asAdmin(request(app).delete("/api/admin/coupons/not-an-id"))).status, 400);
    assert.equal((await asAdmin(request(app).delete(`/api/admin/coupons/${id}`))).status, 200);
    assert.equal(await SchoolCoupon.findById(id), null);
    assert.equal((await asAdmin(request(app).get("/api/admin/coupons"))).body.coupons.length, 0);
    await assert.rejects(quoteFor(student, "monthly", "school-15"), { code: "INVALID_SCHOOL_CODE" });
    assert.equal((await asAdmin(request(app).delete(`/api/admin/coupons/${id}`))).status, 404);
    assert.equal(await AdminEvent.countDocuments({ action: "coupon_delete", "details.couponCode": "SCHOOL-15" }), 1);
  } finally { if (User.db.readyState === 1) await clearTestCollections(); await disconnectTestDatabase(); }
});
