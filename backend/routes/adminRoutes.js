import { Router } from "express";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import AdminEvent from "../models/AdminEvent.js";
import { protect } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/subscriptionMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { analyticsFilters, buildAnalytics, studentsCsv } from "../services/adminAnalytics.js";
import { adminStudentAction } from "../services/billingService.js";
import SchoolCoupon from "../models/SchoolCoupon.js";
import { couponDto, createCoupon, setCouponActive, deleteCoupon } from "../services/couponService.js";
const router = Router(); router.use(protect, requireAdmin);
async function reportFor(query) {
  const filters = analyticsFilters(query);
  const [students, payments] = await Promise.all([User.find({ role: { $ne: "admin" } }).select("-passwordHash").lean(), Payment.find({ status: "completed" }).lean()]);
  const report = buildAnalytics(students, payments, filters);
  // Never expose internal payment de-duplication history or secrets to the client.
  return report;
}
router.get("/report", asyncHandler(async (req, res) => res.json(await reportFor(req.query))));
router.get("/coupons", asyncHandler(async (_req, res) => res.json({ coupons: (await SchoolCoupon.find().sort({ createdAt: -1 }).lean()).map((coupon) => couponDto(coupon)) })));
router.post("/coupons", asyncHandler(async (req, res) => res.status(201).json({ coupon: await createCoupon(req.user, req.body) })));
router.patch("/coupons/:id", asyncHandler(async (req, res) => res.json({ coupon: await setCouponActive(req.user, req.params.id, req.body.active) })));
router.delete("/coupons/:id", asyncHandler(async (req, res) => res.json(await deleteCoupon(req.user, req.params.id))));
router.get("/students.csv", asyncHandler(async (req, res) => {
  const report = await reportFor(req.query);
  res.type("text/csv; charset=utf-8").set("Content-Disposition", 'attachment; filename="nipras-subscribers.csv"').send(studentsCsv(report));
}));
router.post("/students/:id/action", asyncHandler(async (req, res) => { const result = await adminStudentAction(req.user, req.params.id, req.body); res.json(result.deleted ? result : { user: result }); }));
router.get("/events", asyncHandler(async (_req, res) => res.json({ events: await AdminEvent.find().populate("actor", "fullName email").populate("student", "fullName email").sort({ createdAt: -1 }).limit(200).lean() })));
export default router;
