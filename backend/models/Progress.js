import mongoose from "mongoose";

const subjectProgressSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true
    },
    mastery: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    studyMinutes: {
      type: Number,
      min: 0,
      default: 0
    },
    lecturesCompleted: {
      type: Number,
      min: 0,
      default: 0
    },
    quizzesCompleted: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  { _id: false }
);

const progressSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    totalStudyMinutes: {
      type: Number,
      min: 0,
      default: 0
    },
    streakDays: {
      type: Number,
      min: 0,
      default: 0
    },
    averageQuizScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    subjects: [subjectProgressSchema],
    lastActivityAt: Date
  },
  { timestamps: true }
);

const Progress = mongoose.model("Progress", progressSchema);

export default Progress;
