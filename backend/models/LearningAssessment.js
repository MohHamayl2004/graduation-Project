import mongoose from "mongoose";
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  version: { type: String, required: true },
  answers: [[String]],
  cursor: { type: Number, default: 0 },
  scores: { V: Number, A: Number, R: Number, K: Number },
  completedAt: { type: Date, default: null }
}, { timestamps: true });
export default mongoose.model("LearningAssessment", schema);
