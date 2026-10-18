import { ApiError } from "../errors/ApiError.js";
import { academicStreams } from "../../shared/academicStreams.js";
import { palestinianCities, subscriptionPlans } from "../../shared/subscriptions.js";

const emailOf = (value) => String(value || "").trim().toLowerCase();
const schoolCodeOf = (value) => String(value || "").trim().toUpperCase();
export const emailOfInput = (value) => {
  const email = emailOf(value);
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(400, "VALIDATION_ERROR", "أدخل بريدًا إلكترونيًا صالحًا");
  return email;
};
export const validatePassword = (value) => {
  const password = typeof value === "string" ? value : "";
  if (password && !/^[\x21-\x7E]+$/.test(password)) throw new ApiError(400, "INVALID_PASSWORD_FORMAT", "استخدم أحرفًا إنجليزية وأرقامًا ورموزًا فقط، بدون مسافات أو حروف عربية");
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) throw new ApiError(400, "VALIDATION_ERROR", "كلمة المرور يجب أن تكون 8 أحرف على الأقل، ولا تتجاوز 72 بايت");
  return password;
};

export function validateSignupInput(payload = {}) {
  const fullName = String(payload.fullName || "").trim();
  const email = emailOfInput(payload.email);
  const password = validatePassword(payload.password);
  const stream = payload.stream;
  const city = payload.city;
  const subscriptionTier = payload.subscriptionTier || "free";
  if (!palestinianCities.includes(city)) throw new ApiError(400, "VALIDATION_ERROR", "اختر المدينة من القائمة");
  if (!["free", ...subscriptionPlans.map((p) => p.id)].includes(subscriptionTier)) throw new ApiError(400, "VALIDATION_ERROR", "اختر نوع الاشتراك");
  const birthDate = typeof payload.birthDate === "string" ? payload.birthDate : "";
  const parsedDate = new Date(`${birthDate}T00:00:00.000Z`);
  if (fullName.length < 2 || fullName.length > 120 || !academicStreams.some((item) => item.value === stream)
      || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !Number.isFinite(parsedDate.getTime())
      || parsedDate.toISOString().slice(0, 10) !== birthDate || parsedDate >= new Date() || parsedDate.getUTCFullYear() < 1900) {
    throw new ApiError(400, "VALIDATION_ERROR", "بيانات التسجيل غير صحيحة");
  }
  const schoolCode = payload.schoolCode ? schoolCodeOf(payload.schoolCode) : undefined;
  if (schoolCode && !/^[\p{L}\p{N}_-]{3,64}$/u.test(schoolCode)) throw new ApiError(400, "INVALID_SCHOOL_CODE", "رمز خصم المدرسة غير صالح");
  return { fullName, email, password, birthDate, stream, grade: "12", schoolCode, city, subscriptionTier };
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
