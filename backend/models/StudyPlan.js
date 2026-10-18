import mongoose from "mongoose";
// Preserve the existing task-based plan fields for the later scheduling stage.
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, trim: true },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  durationMinutes: { type: Number, min: 0, default: 0 },
  dueAt: Date, completedAt: Date
});
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  tasks: [taskSchema],
  type: { type: String, enum: ["daily", "weekly"] },
  goal: { type: String, enum: ["regular", "exam"] },
  periodStart: String, periodEnd: String, examDate: Date,
  studyDays: [String],
  parentWeeklyId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyPlan", default: null },
  availability: [{ _id: false, date: String, start: String, end: String }],
  lessonIds: [String],
  selections: [{ _id: false, subjectId: String, subjectTitle: String, unitId: String, unitTitle: String, lessonId: String, lessonTitle: String, difficulty: { type: Number, min: 1, max: 5 }, difficultyProvisional: Boolean }],
  totalMinutes: Number,
  creationKey: String,
  generationRevision: { type: Number, default: 0 },
  generated: mongoose.Schema.Types.Mixed,
  generatedStale: { type: Boolean, default: false },
  assessment: { version: String, scores: { V: Number, A: Number, R: Number, K: Number } },
  status: { type: String, enum: ["active", "completed", "archived", "preferences_saved"], default: "active" }
}, { timestamps: true });
schema.index({ owner: 1, creationKey: 1 }, { unique: true, partialFilterExpression: { creationKey: { $type: "string" } } });
export default mongoose.model("StudyPlan", schema);
