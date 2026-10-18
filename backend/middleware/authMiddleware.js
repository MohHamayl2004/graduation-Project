import User from "../models/User.js";
import { ApiError } from "../errors/ApiError.js";
import { verifyToken } from "../services/tokenService.js";
import asyncHandler from "./asyncHandler.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح");
  let decoded;
  try { decoded = await verifyToken(token); } catch { throw new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح"); }
  const user = await User.findById(decoded.sub).select("-passwordHash");
  if (!user || user.status !== "ACTIVE") throw new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح");
  if (decoded.role !== (user.role || "student")) throw new ApiError(401, "AUTH_INVALID", "صلاحيات الجلسة تغيّرت. سجّل الدخول من جديد");
  if (decoded.niprasId && decoded.niprasId !== user.niprasId) throw new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح");
  req.auth = { userId: decoded.sub, role: decoded.role };
  req.user = user;
  next();
});
