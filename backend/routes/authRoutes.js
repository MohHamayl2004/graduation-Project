import { Router } from "express";
import { login, me, signup } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authRateLimit } from "../middleware/authRateLimit.js";
import {createAvatarHandler} from '../controllers/avatarController.js';

export default function createAuthRouter() {
  const router = Router();

  router.post("/signup", authRateLimit(10, 60 * 60 * 1000), signup);
  router.post("/login", authRateLimit(), login);
  router.get("/me", protect, me);
  router.patch('/me/avatar',protect,authRateLimit(30,60*60*1000),createAvatarHandler());

  return router;
}
