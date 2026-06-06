import User from "../models/User.js";
import { verifyToken } from "../services/tokenService.js";
import asyncHandler from "./asyncHandler.js";

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.sub).select("-passwordHash");

  if (!user) {
    return res.status(401).json({ message: "Not authorized, user not found" });
  }

  req.user = user;
  next();
});
