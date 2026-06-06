import mongoose from "mongoose";

const studyPlanTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subject: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    durationMinutes: {
      type: Number,
      min: 0,
      default: 0
    },
    dueAt: Date,
    completedAt: Date
  },
  { _id: true }
);

const studyPlanSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    examDate: Date,
    tasks: [studyPlanTaskSchema],
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active"
    }
  },
  { timestamps: true }
);

const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);

export default StudyPlan;
