import mongoose from "mongoose";

// Where an answer came from, as the student saw it. Book coordinates only:
// chunk ids and scores change whenever the index is rebuilt.
const sourceSchema = new mongoose.Schema(
  {
    lesson: String,
    lessonTitle: String,
    document: { type: String, enum: ["math", "solutions"], default: "math" },
    pages: [Number],
    label: String,
    via: String
  },
  { _id: false }
);

const aiChatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true
    },
    content: {
      type: String,
      default: ""
    },
    // complete: answered; refused: out of scope / not in the book;
    // interrupted: the stream broke after some text; failed: no answer.
    status: {
      type: String,
      enum: ["complete", "refused", "interrupted", "failed"],
      default: "complete"
    },
    sources: [sourceSchema],
    calculation: {
      answer: String,
      // The verified steps shown beside the answer; kept so reopening
      // an old chat shows what the student saw the first time.
      facts: [String]
    },
    meta: {
      model: String,
      seconds: Number,
      warnings: [String],
      errorCode: String
    },
    citations: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material"
        },
        label: String
      }
    ],
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const aiChatSchema = new mongoose.Schema(
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
    title: {
      type: String,
      trim: true,
      default: "محادثة جديدة"
    },
    messages: [aiChatMessageSchema]
  },
  { timestamps: true }
);

aiChatSchema.index({ owner: 1, updatedAt: -1 });

const AIChat = mongoose.model("AIChat", aiChatSchema);

export default AIChat;
