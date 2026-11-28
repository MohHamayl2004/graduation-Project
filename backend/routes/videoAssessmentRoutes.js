import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { ApiError } from '../errors/ApiError.js';
import { VideoAttempt } from '../models/VideoAssessment.js';
import { readdirSync, readFileSync } from 'node:fs';
import { gradeVideoAnswer } from '../services/videoAssessment.js';

const directory = new URL('../data/video-assessments/', import.meta.url);
const catalog = readdirSync(directory).filter(name => name.endsWith('.json'))
  .map(name => JSON.parse(readFileSync(new URL(name, directory), 'utf8')));

export function createVideoRouter({ plans = catalog, attempts = VideoAttempt, guard = protect, grade = gradeVideoAnswer } = {}) {
  const router = Router();
  router.use(guard, (_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
  router.get('/', asyncHandler(async (_req,res) => {
    res.json({ videos: plans.map(({ _id, title, lessonId }) => ({ _id, title, lessonId })) });
  }));
  router.use('/:video', asyncHandler(async (req,res,next) => {
    const plan = plans.find(item => item._id === req.params.video);
    if (!plan) throw new ApiError(404,'VIDEO_NOT_FOUND','الفيديو غير متاح.');
    res.locals.plan = plan;
    res.locals.scope = { owner: req.user._id, video: plan._id, revision: plan.revision };
    next();
  }));
  router.get('/:video', asyncHandler(async (_req,res) => {
    const { plan, scope } = res.locals;
    const results = await attempts.find(scope, 'questionId status correct feedback answer updatedAt -_id').lean();
    const questions = plan.questions.map(({ id, at, kind, prompt, options }) => ({ id, at, kind, prompt, options }));
    res.json({ ...plan, questions, results });
  }));
  router.put('/:video/questions/:id', asyncHandler(async (req,res) => {
    const { plan, scope } = res.locals;
    if (req.body?.revision !== plan.revision) throw new ApiError(409,'VIDEO_CHANGED','أعد فتح الفيديو لتحديث الأسئلة.');
    const q = plan.questions.find(item => item.id === req.params.id);
    if (!q) throw new ApiError(404,'QUESTION_NOT_FOUND','السؤال غير موجود.');
    const filter = { ...scope, questionId: q.id };
    const existing = await attempts.findOne(filter).lean();
    const retry = existing && typeof req.body.retryOf === 'string' &&
      new Date(req.body.retryOf).getTime() === new Date(existing.updatedAt).getTime();
    if (existing && !retry) return res.json({ result: existing });
    if (retry && (existing.history?.length || 0) >= 20) throw new ApiError(429,'RETRY_LIMIT','وصلت إلى الحد الأقصى للمحاولات.');
    const result = req.body.skip === true ? { status:'skipped' } :
      { status:'answered', answer:req.body.answer, ...await grade(q, req.body.answer) };
    // The first submitted answer wins, including concurrent requests and retries.
    let saved;
    try {
      if (retry) {
        saved = await attempts.findOneAndUpdate({ ...filter, updatedAt:existing.updatedAt }, {
          $set: { ...result, answer:result.answer || '', correct:result.correct ?? false, feedback:result.feedback || '' },
          $push: { history: { answer:existing.answer, correct:existing.correct, feedback:existing.feedback, status:existing.status, at:existing.updatedAt } },
        }, { new:true }).lean();
        if (!saved) saved = await attempts.findOne(filter).lean();
      } else {
        saved = await attempts.findOneAndUpdate(filter, { $setOnInsert: result }, { upsert:true, new:true }).lean();
      }
    } catch (error) {
      if (error.code !== 11000) throw error;
      saved = await attempts.findOne(filter).lean();
    }
    res.json({ result: saved });
  }));
  return router;
}
export default createVideoRouter();
