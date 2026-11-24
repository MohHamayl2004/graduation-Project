import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { ApiError } from "../errors/ApiError.js";
import LessonBookProgress from "../models/LessonBookProgress.js";
import {
  unitLessons,
  publicUnitLesson,
  gradeUnitAnswer,
} from "../services/mathUnitCurriculum.js";

const invalid = () =>
  new ApiError(400, "VALIDATION_ERROR", "الدرس أو الإجابة غير صالحين.");
const scope = (owner, code) => ({ owner, lessonId: `unit-1:${code}` });
export function createMathUnitRouter({
  model = LessonBookProgress,
  guard = protect,
} = {}) {
  const router = Router();
  router.use(guard);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  router.get(
    "/lessons",
    asyncHandler(async (req, res) => {
      const progress = await model
        .find({
          owner: req.user._id,
          lessonId: { $in: unitLessons.map((l) => `unit-1:${l.code}`) },
        })
        .lean();
      res.json({
        lessons: unitLessons.map((l) => ({
          code: l.code,
          title: l.title,
          source: l.source,
          activityCount: l.activities.length,
          completedActivities:
            progress.find((p) => p.lessonId === `unit-1:${l.code}`)
              ?.completedActivities || [],
        })),
      });
    }),
  );
  router.use("/lessons/:code", (req, _res, next) =>
    unitLessons.some((l) => l.code === req.params.code)
      ? next()
      : next(new ApiError(404, "LESSON_NOT_FOUND", "الدرس غير موجود.")),
  );
  router.get("/lessons/:code", (req, res) =>
    res.json({ lesson: publicUnitLesson(req.params.code) }),
  );
  router.get(
    "/lessons/:code/progress",
    asyncHandler(async (req, res) =>
      res.json({
        progress: await model
          .findOne(scope(req.user._id, req.params.code))
          .lean(),
      }),
    ),
  );
  router.put(
    "/lessons/:code/progress",
    asyncHandler(async (req, res) => {
      const lesson = unitLessons.find((l) => l.code === req.params.code),
        page = req.body?.page;
      if (
        !Number.isInteger(page) ||
        page < 0 ||
        page > lesson.examples.length + 2
      )
        throw invalid();
      const progress = await model
        .findOneAndUpdate(
          scope(req.user._id, lesson.code),
          { $set: { lastPage: page } },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .lean();
      res.json({ progress });
    }),
  );
  router.post(
    "/lessons/:code/attempts",
    asyncHandler(async (req, res) => {
      const { activityId, answer } = req.body || {},
        result = gradeUnitAnswer(req.params.code, activityId, answer);
      if (!result) throw invalid();
      const update = {
        $push: {
          attempts: {
            $each: [
              {
                activityId,
                answer: answer.trim(),
                correct: result.correct,
                at: new Date(),
              },
            ],
            $slice: -100,
          },
        },
        ...(result.correct
          ? { $addToSet: { completedActivities: activityId } }
          : {}),
      };
      const progress = await model
        .findOneAndUpdate(scope(req.user._id, req.params.code), update, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        })
        .lean();
      res.json({ ...result, progress });
    }),
  );
  router.post(
    "/assessment",
    asyncHandler(async (req, res) => {
      const answers = req.body?.answers;
      if (!Array.isArray(answers) || answers.length !== unitLessons.length)
        throw invalid();
      const results = unitLessons.map((lesson) => {
        const selected = lesson.activities.find(
          (a) =>
            a.id ===
            {
              "1-1": "rate",
              "1-2": "product",
              "1-3": "trig-product",
              "1-4": "cos-limit",
              "1-5": "normal",
              "1-6": "chain-tangent",
              "1-7": "implicit-slope",
            }[lesson.code],
        );
        const entries = answers.filter(
          (a) => a?.lessonId === lesson.code && a.activityId === selected.id,
        );
        if (entries.length !== 1) throw invalid();
        const graded = gradeUnitAnswer(
          lesson.code,
          selected.id,
          entries[0].answer,
        );
        if (!graded) throw invalid();
        return {
          lessonId: lesson.code,
          activityId: selected.id,
          answer: entries[0].answer.trim(),
          ...graded,
        };
      });
      const score = results.filter((r) => r.correct).length,
        total = results.length;
      const progress = await model
        .findOneAndUpdate(
          scope(req.user._id, "assessment"),
          {
            $set: { lastPage: score },
            $push: {
              attempts: {
                $each: results.map((r) => ({
                  activityId: r.lessonId + ":" + r.activityId,
                  answer: r.answer,
                  correct: r.correct,
                  at: new Date(),
                })),
                $slice: -100,
              },
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        )
        .lean();
      res.json({
        score,
        total,
        percentage: Math.round((score / total) * 100),
        results,
        submittedAt: progress.updatedAt,
      });
    }),
  );
  router.get(
    "/assessment",
    asyncHandler(async (req, res) => {
      const saved = await model
        .findOne(scope(req.user._id, "assessment"))
        .lean();
      const attempts = saved?.attempts?.slice(-7) || [];
      const result =
        attempts.length === 7
          ? {
              score: attempts.filter((a) => a.correct).length,
              total: 7,
              percentage: Math.round(
                (attempts.filter((a) => a.correct).length / 7) * 100,
              ),
              results: attempts.map((a) => {
                const [lessonId, activityId] = a.activityId.split(":");
                return {
                  lessonId,
                  activityId,
                  answer: a.answer,
                  correct: a.correct,
                  explanation:
                    gradeUnitAnswer(lessonId, activityId, a.answer)
                      ?.explanation || "",
                };
              }),
            }
          : null;
      res.json({
        result,
        items: unitLessons.map((l) => {
          const ids = {
            "1-1": "rate",
            "1-2": "product",
            "1-3": "trig-product",
            "1-4": "cos-limit",
            "1-5": "normal",
            "1-6": "chain-tangent",
            "1-7": "implicit-slope",
          };
          return {
            lessonId: l.code,
            title: l.title,
            ...publicUnitLesson(l.code).activities.find(
              (a) => a.id === ids[l.code],
            ),
          };
        }),
      });
    }),
  );
  return router;
}
export default createMathUnitRouter();
