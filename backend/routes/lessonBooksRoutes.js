import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { ApiError } from '../errors/ApiError.js';
import LessonBookProgress from '../models/LessonBookProgress.js';
import { lessonBooks, lessonPage, evaluateBookAnswer } from '../../shared/lessonBook.js';
import { lesson11Leaves } from '../../shared/lessonFlipbook.js';

const badRequest = () => new ApiError(400, 'VALIDATION_ERROR', 'الصفحة أو الإجابة غير صالحة');
export function createLessonBooksRouter({ model = LessonBookProgress, guard = protect } = {}) {
  const router = Router();
  router.use(guard);
  router.use('/:lessonId', (req, _res, next) => lessonBooks.some(book => book.id === req.params.lessonId) ? next() : next(badRequest()));
  router.get('/:lessonId/progress', asyncHandler(async (req, res) => {
    const progress = await model.findOne({ owner: req.user._id, lessonId: req.params.lessonId }).lean();
    res.json({ progress });
  }));
  router.put('/:lessonId/progress', asyncHandler(async (req, res) => {
    const bookLeaf = req.body?.bookLeaf;
    const leaf = req.params.lessonId === '1-1' && lesson11Leaves.find(item => item.id === bookLeaf);
    if (bookLeaf !== undefined && !leaf) throw badRequest();
    const page = leaf ? leaf.pdfPage : req.body?.page;
    if (!lessonPage(req.params.lessonId, page)) throw badRequest();
    const progress = await model.findOneAndUpdate({ owner: req.user._id, lessonId: req.params.lessonId }, { $set: { lastPage: page, ...(leaf ? { bookLeaf } : {}) } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    res.json({ progress });
  }));
  router.post('/:lessonId/attempts', asyncHandler(async (req, res) => {
    const { activityId, answer } = req.body || {};
    const correct = evaluateBookAnswer(req.params.lessonId, activityId, answer);
    if (correct === null) throw badRequest();
    const update = { $push: { attempts: { $each: [{ activityId, answer: answer.trim(), correct, at: new Date() }], $slice: -100 } }, ...(correct ? { $addToSet: { completedActivities: activityId } } : {}) };
    const progress = await model.findOneAndUpdate({ owner: req.user._id, lessonId: req.params.lessonId }, update, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    res.json({ correct, progress });
  }));
  return router;
}
export default createLessonBooksRouter();
