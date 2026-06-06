import mongoose from "mongoose";

const lectureSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { _id: false }
);

const lectureSchema = new mongoose.Schema(
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
    analysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Analysis"
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
    sections: [lectureSectionSchema],
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft"
    }
  },
  { timestamps: true }
);

const Lecture = mongoose.model("Lecture", lectureSchema);

export default Lecture;
