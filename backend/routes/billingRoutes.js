import { Router } from "express";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import { protect } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { authRateLimit } from "../middleware/authRateLimit.js";
import { ApiError } from "../errors/ApiError.js";
import { palestinianCities, subscriptionPlans } from "../../shared/subscriptions.js";
import { demoPaymentsEnabled, quoteFor, simulatePayment, userDto } from "../services/billingService.js";
const router = Router();
router.use(protect);
router.get("/", asyncHandler(async (req, res) => {
  const payments = await Payment.find({ owner: req.user._id, status: "completed" }).sort({ paidAt: -1 }).limit(100).lean();
  res.json({ user: userDto(req.user), plans: subscriptionPlans, payments, demoEnabled: demoPaymentsEnabled() });
}));
router.patch("/city", asyncHandler(async (req, res) => {
  if (!palestinianCities.includes(req.body?.city)) throw new ApiError(400, "INVALID_CITY", "اختر المدينة من القائمة");
  if (req.user.city === req.body.city) return res.json({ user: userDto(req.user) });
  const user = await User.findOneAndUpdate({ _id: req.user._id, city: { $nin: palestinianCities } }, { $set: { city: req.body.city } }, { new: true });
  if (!user) throw new ApiError(409, "CITY_ALREADY_SET", "المدينة محفوظة مسبقًا ولا تحتاج اختيارها مرة ثانية");
  res.json({ user: userDto(user) });
}));
router.post("/quote", asyncHandler(async (req, res) => res.json(await quoteFor(req.user, req.body?.tier, req.body?.couponCode))));
router.post("/demo-payment", authRateLimit(30, 15 * 60 * 1000), asyncHandler(async (req, res) => {
  const payment = await simulatePayment(req.user, req.body);
  res.json({ payment, user: userDto(await User.findById(req.user._id)) });
}));
export default router;
