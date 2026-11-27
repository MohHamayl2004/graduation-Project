import mongoose from "mongoose";

// A student's first answer to each in-video question of one study lesson
// (docs/contracts/interactive-lesson-v1.md, rule 4). Later attempts at the
// same question are not stored: mastery counts first answers only.
const answerSchema = new mongoose.Schema({
  interactiveId: { type: String, required: true },
  checkpointId: { type: String, required: true },
  skill: { type: String, default: null },
  choiceId: { type: String, required: true },
  correct: { type: Boolean, required: true },
  atSeconds: { type: Number, min: 0, default: null },
  answeredAt: { type: Date, default: Date.now }
}, { _id: false });

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  lessonId: { type: String, required: true },
  answers: [answerSchema]
}, { timestamps: true });
schema.index({ owner: 1, lessonId: 1 }, { unique: true });

export default mongoose.model("LessonResult", schema);
