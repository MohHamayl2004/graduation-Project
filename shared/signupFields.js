import { academicStreams } from "./academicStreams.js";
import { palestinianCities } from "./subscriptions.js";

export function signupFieldErrors(values, now = new Date()) {
  const errors = {};
  const name = values.fullName.trim();
  if (!name) errors.fullName = "اكتب اسمك الكامل";
  else if (name.length < 2 || name.length > 120) errors.fullName = "الاسم لازم يكون بين حرفين و120 حرف";
  const email = values.email.trim();
  if (!email) errors.email = "اكتب بريدك الإلكتروني";
  else if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) errors.email = "أدخل بريدًا إلكترونيًا صحيحًا";
  if (!values.password) errors.password = "اكتب كلمة المرور";
  else if (!/^[\x21-\x7E]+$/.test(values.password)) errors.password = "استخدم أحرفًا إنجليزية وأرقامًا ورموزًا فقط، بدون مسافات أو حروف عربية";
  else if (values.password.length < 8) errors.password = "كلمة المرور لازم تكون 8 أحرف على الأقل";
  else if (new TextEncoder().encode(values.password).length > 72) errors.password = "كلمة المرور طويلة جدًا؛ اختَر كلمة أقصر";
  if (!values.confirmPassword) errors.confirmPassword = "أعد كتابة كلمة المرور";
  else if (values.confirmPassword !== values.password) errors.confirmPassword = "كلمتا المرور غير متطابقتين";
  const birth = new Date(`${values.birthDate}T00:00:00.000Z`);
  if (!values.birthDate) errors.birthDate = "اختَر تاريخ ميلادك";
  else if (!Number.isFinite(birth.getTime()) || birth.toISOString().slice(0, 10) !== values.birthDate || birth >= now || birth.getUTCFullYear() < 1900) errors.birthDate = "اختَر تاريخ ميلاد صحيحًا";
  if (!academicStreams.some((s) => s.value === values.stream)) errors.stream = "اختَر مسارك الدراسي";
  if (values.schoolCode.trim() && !/^[\p{L}\p{N}_-]{3,64}$/u.test(values.schoolCode.trim())) errors.schoolCode = "راجع رمز المدرسة؛ لازم يكون بين 3 و64 حرفًا أو رقمًا";
  if (!palestinianCities.includes(values.city)) errors.city = "اختَر مدينتك";
  if (!values.agreed) errors.agreed = "وافق على شروط الاستخدام وسياسة الخصوصية للمتابعة";
  return errors;
}
