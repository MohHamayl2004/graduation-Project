import bcrypt from "bcryptjs";
import User from "../models/User.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { signToken } from "../services/tokenService.js";

const toAuthResponse = (user) => ({
  user: user.toJSON(),
  token: signToken(user._id)
});

export const register = asyncHandler(async (req, res) => {
  const { fullName, name, email, password, grade, academicStream } = req.body;
  const resolvedFullName = (fullName || name || "").trim();

  if (!resolvedFullName || !email || !password) {
    return res.status(400).json({ message: "Full name, email, and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return res.status(409).json({ message: "Email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    fullName: resolvedFullName,
    email: normalizedEmail,
    passwordHash,
    grade,
    academicStream
  });

  res.status(201).json(toAuthResponse(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  res.json(toAuthResponse(user));
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
