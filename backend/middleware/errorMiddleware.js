import { ApiError } from "../errors/ApiError.js";

export const notFound = (req, _res, next) => next(new ApiError(404, "NOT_FOUND", `المسار غير موجود: ${req.originalUrl}`));

export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) return res.status(error.status).json({ code: error.code, message: error.message });
  if (error.name === "MulterError") return res.status(400).json({ code: "VALIDATION_ERROR", message: "تعذر رفع الملف" });
  if (error?.code === 11000) return res.status(409).json({ code: "CONFLICT", message: "البيانات مسجلة مسبقاً" });
  if (error?.name === "CastError") return res.status(400).json({ code: "VALIDATION_ERROR", message: "المعرف غير صالح" });
  return res.status(res.statusCode === 200 ? 500 : res.statusCode).json({ code: "INTERNAL_ERROR", message: "صار خطأ، حاول مرة ثانية" });
};
