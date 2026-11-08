import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { ApiError } from "../errors/ApiError.js";
import StudyPlan from "../models/StudyPlan.js";

export function createProgressRouter({ guard = protect, planModel = StudyPlan } = {}) {
  const router = Router();
  router.use(guard);
  router.get("/overview", asyncHandler(async (req, res) => {
    const raw = req.query.days ?? "7";
    if (typeof raw !== "string" || !["7", "30", "90"].includes(raw)) throw new ApiError(400, "VALIDATION_ERROR", "اختر آخر ٧ أو ٣٠ أو ٩٠ يومًا");
    const plan = await planModel.findOne({ owner: req.user._id, type: { $in: ["daily", "weekly"] }, status: { $nin: ["archived", "completed"] } }).sort({ updatedAt: -1 }).lean();
    res.json({ periodDays: Number(raw),
      metrics: { completedLessons: null, quizAverage: null, quizAttempts: null, studyMinutes: null, activeDays: null },
      activity: null, subjects: null, achievements: null, recommendations: null,
      plan: plan ? { id: String(plan._id), type: plan.type, periodStart: plan.periodStart,
        scheduledSessions: plan.type === "daily" && Array.isArray(plan.generated?.sessions) ? plan.generated.sessions.length : null,
        completedSessions: null } : null
    });
  }));
  return router;
}

export default createProgressRouter();
