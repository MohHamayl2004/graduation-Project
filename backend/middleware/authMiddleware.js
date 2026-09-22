import User from "../models/User.js";
import { ApiError } from "../errors/ApiError.js";
import { verifyToken } from "../services/tokenService.js";
import asyncHandler from "./asyncHandler.js";

export const protect = asyncHandler(async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) throw new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح");
  let decoded;
  try { decoded = verifyToken(token); } catch { throw new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح"); }
  const user = await User.findById(decoded.sub).select("-passwordHash");
  if (!user) throw new ApiError(401, "AUTH_INVALID", "رمز الدخول مفقود أو غير صالح");
  req.user = user;
  next();
});
