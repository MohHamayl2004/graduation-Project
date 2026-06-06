import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true
    },
    options: [
      {
        label: String,
        text: String
      }
    ],
    correctOption: String,
    explanation: String,
    topic: String,
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    }
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material"
    },
    lecture: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture"
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      trim: true
    },
    questions: [quizQuestionSchema],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft"
    }
  },
  { timestamps: true }
);

const Quiz = mongoose.model("Quiz", quizSchema);

export default Quiz;
