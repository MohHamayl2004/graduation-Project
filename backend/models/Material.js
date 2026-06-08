import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    userId: {
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
    subject: {
      type: String,
      trim: true,
      default: "Other"
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      trim: true
    },
    originalName: {
      type: String,
      trim: true
    },
    fileName: {
      type: String,
      trim: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number
    },
    status: {
      type: String,
      enum: ["uploaded", "analyzing", "analyzed", "failed"],
      default: "uploaded"
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

const Material = mongoose.model("Material", materialSchema);

export default Material;
