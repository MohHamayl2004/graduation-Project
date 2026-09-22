import { Router } from "express";
import { getWorkspaces } from "../controllers/workspaceController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = Router();
router.get("/", protect, getWorkspaces);
export default router;
