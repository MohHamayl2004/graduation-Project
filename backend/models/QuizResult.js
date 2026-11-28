import mongoose from "mongoose";

// One finished attempt at a quiz that lives in the site's files
// (src/data/quizzes/*.js). The API grades it from the same file, so the score
// is the server's, not the browser's.
const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  choice: { type: String, required: true },
  correct: { type: Boolean, required: true }
}, { _id: false });

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  quizId: { type: String, required: true },
  studyLessonId: { type: String, default: null },
  answers: [answerSchema],
  correct: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 1 },
  score: { type: Number, required: true, min: 0, max: 100 }
}, { timestamps: true });
schema.index({ owner: 1, quizId: 1, createdAt: -1 });

export default mongoose.model("QuizResult", schema);
