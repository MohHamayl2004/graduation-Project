import SchoolCoupon from "../models/SchoolCoupon.js";
import mongoose from "mongoose";
import AdminEvent from "../models/AdminEvent.js";
import { ApiError } from "../errors/ApiError.js";
import { DAY_MS } from "../../shared/subscriptions.js";

export function validateCoupon(input = {}) {
  const code = String(input.code || "").trim().toUpperCase();
  const schoolName = String(input.schoolName || "").trim();
  const discountPercent = Number(input.discountPercent);
  const durationDays = Number(input.durationDays);
  if (!/^[\p{L}\p{N}_-]{3,64}$/u.test(code)) throw new ApiError(400, "COUPON_CODE_INVALID", "رمز الكوبون لازم يكون 3 إلى 64 حرفًا أو رقمًا، بدون مسافات");
  if (schoolName.length < 2 || schoolName.length > 160) throw new ApiError(400, "COUPON_SCHOOL_INVALID", "اكتب اسم المدرسة، بين حرفين و160 حرفًا");
  if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100) throw new ApiError(400, "COUPON_DISCOUNT_INVALID", "نسبة الخصم لازم تكون بين 1 و100");
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650) throw new ApiError(400, "COUPON_DURATION_INVALID", "مدة الكوبون لازم تكون عددًا صحيحًا بين يوم و3650 يومًا");
  return { code, schoolName, discountPercent, durationDays };
}
export function couponDto(coupon, now = new Date()) {
  const data = coupon.toObject ? coupon.toObject() : { ...coupon };
  const expired = Boolean(data.expiresAt && new Date(data.expiresAt) <= now);
  return { ...data, state: !data.active ? "disabled" : expired ? "expired" : "active", remainingDays: data.expiresAt ? Math.max(0, Math.ceil((new Date(data.expiresAt) - now) / DAY_MS)) : null };
}
export async function createCoupon(actor, input) {
  const values = validateCoupon(input);
  let coupon;
  try { coupon = await SchoolCoupon.create({ ...values, active: true, expiresAt: new Date(Date.now() + values.durationDays * DAY_MS) }); }
  catch (error) { if (error.code === 11000) throw new ApiError(409, "COUPON_EXISTS", "رمز الكوبون مستخدم مسبقًا، اختَر رمزًا آخر"); throw error; }
  await AdminEvent.create({ actor: actor._id, action: "coupon_create", reason: `إنشاء كوبون لمدرسة ${coupon.schoolName}`, details: { couponCode: coupon.code, discountPercent: coupon.discountPercent, expiresAt: coupon.expiresAt } });
  return couponDto(coupon);
}
export async function deleteCoupon(actor, id) {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "COUPON_ID_INVALID", "معرّف الكوبون غير صحيح");
  const coupon = await SchoolCoupon.findByIdAndDelete(id);
  if (!coupon) throw new ApiError(404, "COUPON_NOT_FOUND", "الكوبون غير موجود");
  await AdminEvent.create({ actor: actor._id, action: "coupon_delete", reason: `حذف كوبون مدرسة ${coupon.schoolName}`, details: { couponCode: coupon.code, schoolName: coupon.schoolName, discountPercent: coupon.discountPercent } });
  return { deleted: true, code: coupon.code };
}
export async function setCouponActive(actor, id, active) {
  if (typeof active !== "boolean") throw new ApiError(400, "COUPON_STATUS_INVALID", "اختر حالة صحيحة للكوبون");
  const coupon = await SchoolCoupon.findById(id);
  if (!coupon) throw new ApiError(404, "COUPON_NOT_FOUND", "الكوبون غير موجود");
  if (active && coupon.expiresAt && coupon.expiresAt <= new Date()) throw new ApiError(400, "COUPON_EXPIRED", "انتهت صلاحية الكوبون؛ أنشئ كوبونًا جديدًا بمدة جديدة");
  coupon.active = active; await coupon.save();
  await AdminEvent.create({ actor: actor._id, action: "coupon_status", reason: active ? "تفعيل كوبون" : "تعطيل كوبون", details: { couponCode: coupon.code, active } });
  return couponDto(coupon);
}
