import bcrypt from "bcryptjs";
import User from "../models/User.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { signToken } from "../services/tokenService.js";

const toAuthResponse = (user) => ({
  user: user.toJSON(),
  token: signToken(user._id)
});

export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, password, stream, grade } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ message: "الاسم الكامل والبريد الإلكتروني وكلمة المرور مطلوبة" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: "البريد الإلكتروني مسجّل من قبل" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    passwordHash,
    stream,
    grade
  });

  res.status(201).json(toAuthResponse(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "البريد الإلكتروني وكلمة المرور مطلوبان" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور مش صحيحة" });
  }

  res.json(toAuthResponse(user));
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
