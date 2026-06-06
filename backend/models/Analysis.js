import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending"
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    extractedTopics: [String],
    summary: String,
    errorMessage: String
  },
  { timestamps: true }
);

const Analysis = mongoose.model("Analysis", analysisSchema);

export default Analysis;
