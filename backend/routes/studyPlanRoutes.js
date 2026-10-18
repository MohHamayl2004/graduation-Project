import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import LearningAssessment from "../models/LearningAssessment.js";
import { validateAssessment } from "../validation/assessmentValidation.js";
import StudyPlan from "../models/StudyPlan.js";
import { normalizeStudyPlan } from "../../shared/studyPlanRules.js";
import { ApiError } from "../errors/ApiError.js";
import mongoose from "mongoose";
import { generateStudySchedule } from "../../shared/studySchedule.js";

const planDto = (document) => {
  const plan = document.toObject ? document.toObject() : document;
  const studyDays = plan.studyDays?.length ? plan.studyDays : [...new Set((plan.availability || []).map((s) => s.date))];
  return { ...plan, parentWeeklyId: plan.parentWeeklyId ? String(plan.parentWeeklyId) : null, studyDays, ...(plan.type === "weekly" ? { availability: [], totalMinutes: null } : {}), examDate: plan.examDate ? new Date(plan.examDate).toISOString().slice(0, 10) : null };
};

export function createStudyPlanRouter({ guard = protect, model = LearningAssessment, planModel = StudyPlan } = {}) {
  const router = Router();
  router.use(guard);
  const assessmentFor = async (owner) => {
    const assessment = await model.findOne({ owner }).lean();
    if (!assessment?.completedAt) throw new ApiError(409, "ASSESSMENT_REQUIRED", "أكمل استبيان التعلّم قبل توليد الخطة");
    return assessment;
  };
  const normalize = (input) => { try { return normalizeStudyPlan(input); } catch (e) { throw new ApiError(400, "VALIDATION_ERROR", e.message); } };
  const owned = async (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "VALIDATION_ERROR", "معرّف الاختيارات غير صالح");
    const plan = await planModel.findOne({ _id: req.params.id, owner: req.user._id }).lean();
    if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "الاختيارات غير موجودة");
    return plan;
  };
  const validateParent = async (data, owner) => {
    if (!data.parentWeeklyId) return;
    const parent = await planModel.findOne({ _id: data.parentWeeklyId, owner, type: "weekly" }).lean();
    if (!parent) throw new ApiError(404, "WEEKLY_PLAN_NOT_FOUND", "الاختيارات الأسبوعية غير موجودة");
    if (!planDto(parent).studyDays.includes(data.periodStart) || data.lessonIds.some((id) => !parent.lessonIds.includes(id)) || data.goal !== parent.goal || data.examDate !== planDto(parent).examDate) throw new ApiError(400, "VALIDATION_ERROR", "اختر يومًا ودروسًا وموعد امتحان مطابقًا لاختيارات الأسبوع");
  };
  const revisionFilter = (plan) => (plan.generationRevision || 0) === 0 ? { $or: [{ generationRevision: 0 }, { generationRevision: { $exists: false } }] } : { generationRevision: plan.generationRevision };
  router.post("/plans/:id/generate", asyncHandler(async (req, res) => {
    const plan = await owned(req);
    if (plan.generated && !plan.generatedStale && req.body.replace !== true) return res.json({ plan: planDto(plan), reused: true });
    if (plan.generated && req.body.replace !== true) throw new ApiError(409, "REPLACE_REQUIRED", "أكد استبدال الخطة المولّدة بعد تعديل الاختيارات");
    if (req.body.requestKey && plan.generated?.requestKey === req.body.requestKey) return res.json({ plan: planDto(plan), reused: true });
    if (plan.generated && req.body.expectedRevision !== (plan.generationRevision || 0)) throw new ApiError(409, "PLAN_CHANGED", "تغيّرت الخطة؛ حدّث الصفحة قبل إعادة التوليد");
    const assessment = await assessmentFor(req.user._id);
    const data = normalize(planDto(plan)); await validateParent(data, req.user._id);
    const generated = { ...generateStudySchedule(data, assessment), requestKey: typeof req.body.requestKey === "string" ? req.body.requestKey.slice(0, 80) : null };
    const updated = await planModel.findOneAndUpdate({ _id: plan._id, owner: req.user._id, ...revisionFilter(plan) }, { $set: { generated, generatedStale: false }, $inc: { generationRevision: 1 } }, { new: true, runValidators: true });
    if (!updated) throw new ApiError(409, "PLAN_CHANGED", "تغيّرت الخطة أثناء التوليد؛ حدّث القائمة وحاول مرة ثانية");
    res.json({ plan: planDto(updated) });
  }));
  router.put("/plans/:id", asyncHandler(async (req, res) => {
    const plan = await owned(req);
    if (req.body.expectedRevision !== (plan.generationRevision || 0)) throw new ApiError(409, "PLAN_CHANGED", "تغيّرت الخطة؛ حدّث القائمة قبل التعديل");
    const data = normalize(req.body);
    if (data.type !== plan.type || String(data.parentWeeklyId || "") !== String(plan.parentWeeklyId || "")) throw new ApiError(400, "VALIDATION_ERROR", "نوع الاختيارات وربط الأسبوع لا يتغيران أثناء التعديل");
    await validateParent(data, req.user._id);
    // Do not invalidate linked daily preferences silently when editing their weekly parent.
    if (plan.type === "weekly") {
      const children = await planModel.find({ owner: req.user._id, parentWeeklyId: plan._id }).lean();
      if (children.some((child) => !data.studyDays.includes(child.periodStart) || child.lessonIds.some((id) => !data.lessonIds.includes(id)) || child.goal !== data.goal || planDto(child).examDate !== data.examDate)) throw new ApiError(409, "LINKED_DAYS_CONFLICT", "التعديل يتعارض مع يوميات مرتبطة؛ عدّل اليوميات أو احذفها أولًا");
    }
    const updated = await planModel.findOneAndUpdate({ _id: plan._id, owner: req.user._id, ...revisionFilter(plan) }, { $set: { ...data, generatedStale: Boolean(plan.generated) }, $inc: { generationRevision: 1 } }, { new: true, runValidators: true });
    if (!updated) throw new ApiError(409, "PLAN_CHANGED", "تغيّرت الخطة؛ حدّث القائمة قبل التعديل");
    res.json({ plan: planDto(updated) });
  }));
  router.get("/assessment", asyncHandler(async (req, res) => {
    res.json({ assessment: await model.findOne({ owner: req.user._id }).lean() });
  }));
  router.put("/assessment", asyncHandler(async (req, res) => {
    const data = validateAssessment(req.body);
    const assessment = await model.findOneAndUpdate({ owner: req.user._id }, { $set: data }, { upsert: true, new: true, runValidators: true });
    res.json({ assessment });
  }));
  router.get("/plans", asyncHandler(async (req, res) => {
    const plans = await planModel.find({ owner: req.user._id, type: { $in: ["daily", "weekly"] } }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ plans: plans.map(planDto) });
  }));
  router.delete("/plans/:id", asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "VALIDATION_ERROR", "معرّف الاختيارات غير صالح");
    const removed = await planModel.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!removed) throw new ApiError(404, "PLAN_NOT_FOUND", "الاختيارات غير موجودة");
    // Daily preferences remain useful on their own after their weekly parent is removed.
    await planModel.updateMany({ owner: req.user._id, parentWeeklyId: removed._id }, { $set: { parentWeeklyId: null } });
    res.json({ deleted: true });
  }));
  router.post("/plans", asyncHandler(async (req, res) => {
    const key = req.body.creationKey;
    if (key !== undefined && (typeof key !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(key))) throw new ApiError(400, "VALIDATION_ERROR", "مفتاح حفظ الاختيارات غير صالح");
    if (key) { const existing = await planModel.findOne({ owner: req.user._id, creationKey: key }).lean(); if (existing) return res.json({ plan: planDto(existing) }); }
    const assessment = await model.findOne({ owner: req.user._id }).lean();
    if (!assessment?.completedAt) throw new ApiError(409, "ASSESSMENT_REQUIRED", "أكمل استبيان التعلّم قبل إنشاء الخطة");
    let data;
    try { data = normalizeStudyPlan(req.body); }
    catch (error) { throw new ApiError(400, "VALIDATION_ERROR", error.message); }
    if (data.parentWeeklyId) {
      const parent = await planModel.findOne({ _id: data.parentWeeklyId, owner: req.user._id, type: "weekly" }).lean();
      if (!parent) throw new ApiError(404, "WEEKLY_PLAN_NOT_FOUND", "الاختيارات الأسبوعية غير موجودة");
      const parentDays = planDto(parent).studyDays;
      if (!parentDays.includes(data.periodStart) || data.lessonIds.some((id) => !parent.lessonIds.includes(id))) throw new ApiError(400, "VALIDATION_ERROR", "اختر يومًا ودروسًا من اختياراتك الأسبوعية");
      if (data.goal !== parent.goal || data.examDate !== planDto(parent).examDate) throw new ApiError(400, "VALIDATION_ERROR", "هدف اليومية وموعد امتحانها لازم يطابقوا الأسبوعية");
    }
    let plan;
    try { plan = await planModel.create({ ...data, ...(key ? { creationKey: key } : {}), title: `${data.type === "daily" ? "خطة يومية" : "خطة أسبوعية"} · ${data.periodStart}`, status: "preferences_saved", owner: req.user._id, assessment: { version: assessment.version, scores: assessment.scores } }); }
    catch (e) { if (e.code !== 11000 || !key) throw e; plan = await planModel.findOne({ owner: req.user._id, creationKey: key }).lean(); if (!plan) throw e; }
    res.status(201).json({ plan: planDto(plan) });
  }));
  return router;
}
export default createStudyPlanRouter();
