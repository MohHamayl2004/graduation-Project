import { randomUUID } from "node:crypto";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import SchoolCoupon from "../models/SchoolCoupon.js";
import AdminEvent from "../models/AdminEvent.js";
import { ApiError } from "../errors/ApiError.js";
import { activation, effectiveSubscription, nextSubscriptionPeriod, subscriptionPlans, palestinianCities } from "../../shared/subscriptions.js";
import { deleteStudent } from "./deleteStudent.js";

export const demoPaymentsEnabled = () => process.env.NODE_ENV !== "production" && process.env.DEMO_PAYMENTS_ENABLED !== "false";
export const userDto = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  delete data.passwordHash; delete data.__v;
  return { ...data, role: data.role || "student", city: data.city || null, subscription: effectiveSubscription(user) };
};
export async function quoteFor(user, tier, code) {
  const plan = subscriptionPlans.find((p) => p.id === tier);
  if (!plan) throw new ApiError(400, "INVALID_PLAN", "اختر باقة اشتراك صحيحة");
  const couponCode = String(code ?? user.schoolBenefit?.code ?? "").trim().toUpperCase();
  let discountPercent = 0;
  if (couponCode) {
    if (!/^[\p{L}\p{N}_-]{3,64}$/u.test(couponCode)) throw new ApiError(400, "INVALID_SCHOOL_CODE", "رمز المدرسة غير صالح");
    const coupon = await SchoolCoupon.findOne({ code: couponCode, active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).lean();
    if (!coupon) throw new ApiError(400, "INVALID_SCHOOL_CODE", "رمز المدرسة غير صحيح أو منتهي؛ امسحه للمتابعة بدون خصم");
    discountPercent = coupon.discountPercent;
  }
  const period = nextSubscriptionPeriod(user, tier);
  return { tier, days: plan.days, baseCents: plan.cents, discountPercent, amountCents: Math.round(plan.cents * (100 - discountPercent) / 100), couponCode, currency: "USD", demo: true,
    subscriptionStartsAt: period.startsAt, subscriptionExpiresAt: period.expiresAt, scheduled: period.startsAt > new Date() };
}

// The user update is atomic even on standalone MongoDB. Remembering every applied
// payment ID allows a retry after a crash between activation and receipt completion.
export async function applyPayment(payment) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const user = await User.findById(payment.owner);
    if (!user || user.status !== "ACTIVE") throw new ApiError(403, "ACCOUNT_INACTIVE", "الحساب محظور إداريًا");
    if (user.subscription?.appliedPaymentIds?.some((id) => String(id) === String(payment._id))) break;
    const next = nextSubscriptionPeriod(user, payment.tier);
    const source = payment.demo ? "demo_payment" : "payment";
    const period = { paymentId: payment._id, tier: next.tier, startsAt: next.startsAt, expiresAt: next.expiresAt, activationSource: source };
    const revision = user.subscription?.revision || 0;
    const filter = { _id: user._id, status: "ACTIVE", "subscription.appliedPaymentIds": { $ne: payment._id },
      ...(revision ? { "subscription.revision": revision } : { $or: [{ "subscription.revision": 0 }, { "subscription.revision": { $exists: false } }] }) };
    const currentUpdate = next.startsAt <= new Date() ? Object.fromEntries(Object.entries({ ...next, activationSource: source }).map(([k, v]) => [`subscription.${k}`, v])) : {};
    const updated = await User.findOneAndUpdate(filter, { ...(Object.keys(currentUpdate).length ? { $set: currentUpdate } : {}),
      $push: { "subscription.periods": period }, $inc: { "subscription.revision": 1 }, $addToSet: { "subscription.appliedPaymentIds": payment._id } }, { new: true });
    if (updated) break;
    if (attempt === 7) throw new ApiError(409, "BILLING_BUSY", "هناك تحديث آخر للحساب؛ أعد المحاولة بنفس العملية");
  }
  const owner = await User.findById(payment.owner);
  const period = owner?.subscription?.periods?.find((p) => String(p.paymentId) === String(payment._id));
  await Payment.updateOne({ _id: payment._id, status: "pending" }, { $set: { status: "completed", paidAt: payment.createdAt || new Date(),
    ...(period ? { subscriptionStartsAt: period.startsAt, subscriptionExpiresAt: period.expiresAt } : {}) } });
  return Payment.findById(payment._id).lean();
}
export async function simulatePayment(user, input = {}) {
  if (!demoPaymentsEnabled()) throw new ApiError(403, "DEMO_DISABLED", "الدفع التجريبي غير متاح في هذه البيئة");
  if (user.role === "admin") throw new ApiError(403, "STUDENT_REQUIRED", "الدفع مخصص لحسابات الطلاب");
  if (!palestinianCities.includes(user.city)) throw new ApiError(400, "CITY_REQUIRED", "حدد مدينتك قبل الاشتراك");
  if (typeof input.key !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(input.key)) throw new ApiError(400, "INVALID_PAYMENT_KEY", "معرف العملية غير صالح");
  let payment = await Payment.findOne({ owner: user._id, key: input.key });
  if (payment && payment.tier !== input.tier) throw new ApiError(409, "PAYMENT_KEY_REUSED", "استخدم عملية جديدة للباقة الجديدة");
  if (!payment) {
    const quote = await quoteFor(user, input.tier, input.couponCode);
    const renewal = Boolean(await Payment.exists({ owner: user._id, status: "completed" })) || effectiveSubscription(user).status === "ACTIVE";
    const data = { owner: user._id, key: input.key, reference: `DEMO-${randomUUID()}`, ...quote, renewal, city: user.city, status: "pending" };
    try { payment = await Payment.findOneAndUpdate({ owner: user._id, key: input.key }, { $setOnInsert: data }, { upsert: true, new: true }); }
    catch (error) { if (error.code !== 11000) throw error; payment = await Payment.findOne({ owner: user._id, key: input.key }); }
    if (payment.tier !== input.tier) throw new ApiError(409, "PAYMENT_KEY_REUSED", "استخدم عملية جديدة للباقة الجديدة");
  }
  return payment.status === "completed" ? payment.toObject() : applyPayment(payment);
}

export async function adminStudentAction(actor, studentId, input = {}) {
  const defaultReasons = { grant: "منح اشتراك مجاني بواسطة الإدارة", activate: "تفعيل اشتراك بواسطة الإدارة", block: "حظر الحساب بواسطة الإدارة", unblock: "رفع الحظر بواسطة الإدارة", deactivate: "تعطيل الاشتراك بواسطة الإدارة", delete: "حذف الحساب بواسطة الإدارة" };
  const reason = String(input.reason || "").trim() || defaultReasons[input.action] || "إجراء إداري";
  if (reason.length > 500) throw new ApiError(400, "REASON_REQUIRED", "سبب العملية لا يتجاوز 500 حرف");
  const student = await User.findOne({ _id: studentId, role: { $ne: "admin" } });
  if (!student) throw new ApiError(404, "STUDENT_NOT_FOUND", "الطالب غير موجود");
  let update;
  if (input.action === "delete") return deleteStudent(actor, student, input, reason);
  if (input.action === "activate" || input.action === "grant") {
    if (!subscriptionPlans.some((p) => p.id === input.tier)) throw new ApiError(400, "INVALID_PLAN", "اختر باقة اشتراك صحيحة");
    const next = activation(input.tier);
    update = { $set: Object.fromEntries(Object.entries(next).map(([k, v]) => [`subscription.${k}`, v])), $inc: { "subscription.revision": 1 } };
    update.$set["subscription.activationSource"] = "admin_gift";
    let cursor = next.expiresAt;
    update.$set["subscription.periods"] = (student.subscription.periods || []).map((p) => p.toObject ? p.toObject() : p).sort((a, b) => a.startsAt - b.startsAt).map((p) => {
      if (p.startsAt <= new Date()) return p;
      const duration = p.expiresAt - p.startsAt;
      const scheduled = { ...p, startsAt: cursor, expiresAt: new Date(cursor.getTime() + duration) };
      cursor = scheduled.expiresAt; return scheduled;
    });
    if (input.action === "grant") { update.$set.status = "ACTIVE"; update.$set.blockReason = null; }
  } else if (input.action === "deactivate") {
    const current = effectiveSubscription(student);
    update = { $set: { "subscription.tier": current.tier, "subscription.startsAt": current.startsAt,
      "subscription.expiresAt": current.expiresAt, "subscription.status": "INACTIVE", "subscription.reason": "manual_deactivation" }, $inc: { "subscription.revision": 1 } };
  } else if (["block", "unblock"].includes(input.action)) {
    update = { $set: { status: input.action === "block" ? "INACTIVE" : "ACTIVE", blockReason: input.action === "block" ? reason : null } };
  } else throw new ApiError(400, "INVALID_ACTION", "العملية غير صالحة");
  const changed = await User.findByIdAndUpdate(student._id, update, { new: true, runValidators: true });
  await AdminEvent.create({ actor: actor._id, student: student._id, action: input.action, reason, details: { tier: input.tier || null, before: effectiveSubscription(student), after: effectiveSubscription(changed) } });
  return userDto(changed);
}
