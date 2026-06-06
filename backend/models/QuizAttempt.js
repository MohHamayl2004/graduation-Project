import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOption: String,
    isCorrect: Boolean,
    answeredAt: Date
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true
    },
    answers: [answerSchema],
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  },
  { timestamps: true }
);

const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);

export default QuizAttempt;
