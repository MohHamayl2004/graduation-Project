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
    type: {
      type: String,
      trim: true
    },
    fileUrl: {
      type: String,
      required: true
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
