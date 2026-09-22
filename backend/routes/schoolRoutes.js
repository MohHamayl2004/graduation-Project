import { Router } from "express";
import { join } from "../controllers/schoolController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = Router();
router.post("/join", protect, join);
export default router;
