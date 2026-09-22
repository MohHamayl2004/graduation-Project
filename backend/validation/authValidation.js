import { ApiError } from "../errors/ApiError.js";

const emailOf = (value) => String(value || "").trim().toLowerCase();
const schoolCodeOf = (value) => String(value || "").trim().toUpperCase();

export function validateSignupInput(payload = {}) {
  const fullName = String(payload.fullName || "").trim();
  const email = emailOf(payload.email);
  const password = String(payload.password || "");
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    throw new ApiError(400, "VALIDATION_ERROR", "بيانات التسجيل غير صحيحة");
  }
  return { fullName, email, password, stream: payload.stream?.trim() || undefined, grade: payload.grade?.trim() || undefined, schoolCode: payload.schoolCode ? schoolCodeOf(payload.schoolCode) : undefined };
}

export function validateLoginInput(payload = {}) {
  const email = emailOf(payload.email);
  const password = String(payload.password || "");
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) throw new ApiError(400, "VALIDATION_ERROR", "البريد الإلكتروني وكلمة المرور مطلوبان");
  return { email, password };
}

export function validateSchoolJoinInput(payload = {}) {
  const schoolCode = schoolCodeOf(payload.schoolCode);
  if (!schoolCode) throw new ApiError(400, "VALIDATION_ERROR", "رمز المدرسة مطلوب");
  return { schoolCode };
}
