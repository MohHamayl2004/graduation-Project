import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { ApiError } from "../errors/ApiError.js";
import StudyPlan from "../models/StudyPlan.js";
import LessonResult from "../models/LessonResult.js";
import QuizResult from "../models/QuizResult.js";
import { gradeQuiz, loadQuizBank } from "../services/quizBank.js";
import { gradeAnswer, loadInteractiveLessons } from "../services/interactiveLessons.js";
import { lessonMastery } from "../../shared/lessonMastery.js";
import { studyLessons } from "../../shared/studyPlanCatalog.js";

const titles = new Map(studyLessons.map((l) => [l.lessonId, { lessonTitle: l.lessonTitle, subjectTitle: l.subjectTitle }]));
const masteryList = (results) => results
  .map((r) => ({ lessonId: r.lessonId, ...titles.get(r.lessonId), ...lessonMastery(r.answers) }))
  .filter((m) => m.answered);
const id = (value) => typeof value === "string" && /^[\w-]{1,60}$/.test(value);

// Per quiz: how many times it was finished, the best and the latest score.
function quizSummary(results, bank) {
  const byQuiz = new Map();
  for (const r of [...results].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
    const q = byQuiz.get(r.quizId) || { quizId: r.quizId, title: bank.get(r.quizId)?.title || r.quizId, subject: bank.get(r.quizId)?.subject || null, attempts: 0, best: 0 };
    q.attempts += 1; q.best = Math.max(q.best, r.score); q.last = r.score; q.lastCorrect = r.correct; q.total = r.total; q.lastAt = r.createdAt;
    byQuiz.set(r.quizId, q);
  }
  return [...byQuiz.values()];
}

export function createProgressRouter({ guard = protect, planModel = StudyPlan, resultModel = LessonResult, quizModel = QuizResult, lessons = loadInteractiveLessons(), quizBank = loadQuizBank() } = {}) {
  const router = Router();
  router.use(guard);
  router.get("/overview", asyncHandler(async (req, res) => {
    const raw = req.query.days ?? "7";
    if (typeof raw !== "string" || !["7", "30", "90"].includes(raw)) throw new ApiError(400, "VALIDATION_ERROR", "اختر آخر ٧ أو ٣٠ أو ٩٠ يومًا");
    const plan = await planModel.findOne({ owner: req.user._id, type: { $in: ["daily", "weekly"] }, status: { $nin: ["archived", "completed"] } }).sort({ updatedAt: -1 }).lean();
    const results = await resultModel.find({ owner: req.user._id }).lean();
    const quizResults = await quizModel.find({ owner: req.user._id }).lean();
    const videoAnswers = results.flatMap((r) => r.answers || []);
    res.json({ periodDays: Number(raw),
      metrics: { completedLessons: null, studyMinutes: null, activeDays: null,
        quizAttempts: quizResults.length,
        quizAverage: quizResults.length ? Math.round(quizResults.reduce((n, r) => n + r.score, 0) / quizResults.length) : null,
        videoAnswered: videoAnswers.length, videoCorrect: videoAnswers.filter((a) => a.correct).length },
      quizzes: quizSummary(quizResults, quizBank),
      activity: null, subjects: null, achievements: null, recommendations: null,
      mastery: masteryList(results),
      plan: plan ? { id: String(plan._id), type: plan.type, periodStart: plan.periodStart,
        scheduledSessions: plan.type === "daily" && Array.isArray(plan.generated?.sessions) ? plan.generated.sessions.length : null,
        completedSessions: null } : null
    });
  }));

  // One answer to an in-video question. The API grades it from the lesson file
  // and keeps only the first answer to each question.
  router.post("/checkpoints", asyncHandler(async (req, res) => {
    const { interactiveId, checkpointId, choiceId, atSeconds } = req.body || {};
    if (!id(interactiveId) || !id(checkpointId) || !id(choiceId)) throw new ApiError(400, "VALIDATION_ERROR", "بيانات الإجابة غير صالحة");
    const graded = gradeAnswer(lessons, { interactiveId, checkpointId, choiceId });
    if (!graded) throw new ApiError(404, "CHECKPOINT_NOT_FOUND", "السؤال غير موجود في هذا الدرس");
    const answer = { interactiveId, checkpointId, skill: graded.skill, choiceId, correct: graded.correct,
      atSeconds: Number.isFinite(atSeconds) && atSeconds >= 0 ? atSeconds : null, answeredAt: new Date() };
    let recorded = true;
    try {
      await resultModel.findOneAndUpdate(
        { owner: req.user._id, lessonId: graded.studyLessonId, "answers.checkpointId": { $ne: checkpointId } },
        { $push: { answers: answer } },
        { upsert: true, new: true, runValidators: true }
      );
    } catch (error) {
      // The lesson exists and already has this question: the first answer stands.
      if (error.code !== 11000) throw error;
      recorded = false;
    }
    const result = await resultModel.findOne({ owner: req.user._id, lessonId: graded.studyLessonId }).lean();
    res.status(recorded ? 201 : 200).json({ recorded, correct: graded.correct, lessonId: graded.studyLessonId, mastery: lessonMastery(result?.answers) });
  }));

  // A finished quiz: the API grades every answer from the quiz file and keeps the attempt.
  router.post("/quiz-results", asyncHandler(async (req, res) => {
    const { quizId, answers } = req.body || {};
    if (!id(quizId)) throw new ApiError(400, "VALIDATION_ERROR", "الاختبار غير صالح");
    const graded = gradeQuiz(quizBank, quizId, answers);
    if (!graded) throw new ApiError(400, "VALIDATION_ERROR", "أجب عن كل الأسئلة بخيارات صحيحة");
    const saved = await quizModel.create({ owner: req.user._id, quizId, studyLessonId: graded.quiz.studyLessonId, answers: graded.answers, correct: graded.correct, total: graded.total, score: graded.score });
    res.status(201).json({ id: String(saved._id), correct: graded.correct, total: graded.total, score: graded.score });
  }));

  router.get("/mastery", asyncHandler(async (req, res) => {
    res.json({ mastery: masteryList(await resultModel.find({ owner: req.user._id }).lean()) });
  }));
  return router;
}

export default createProgressRouter();
