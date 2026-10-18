import bcrypt from "bcryptjs";
import User from "../models/User.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { signToken } from "../services/tokenService.js";
import { authContext, registerStudent } from "../services/registrationService.js";
import { validateLoginInput, validateSignupInput } from "../validation/authValidation.js";
import { ApiError } from "../errors/ApiError.js";

const responseFor = async (user, includeToken = true) => ({ ...(await authContext(user)), ...(includeToken ? { token: await signToken(user._id, user.role || "student", user.niprasId) } : {}) });
export const signup = asyncHandler(async (req, res) => res.status(201).json(await responseFor(await registerStudent(validateSignupInput(req.body)))));
export const login = asyncHandler(async (req, res) => {
  const { email, password } = validateLoginInput(req.body);
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new ApiError(401, "AUTH_INVALID", "البريد الإلكتروني أو كلمة المرور غير صحيحة");
  if (user.status !== "ACTIVE") throw new ApiError(403, "ACCOUNT_INACTIVE", "الحساب غير نشط");
  res.json(await responseFor(user));
});
export const me = asyncHandler(async (req, res) => res.json(await responseFor(req.user, false)));
