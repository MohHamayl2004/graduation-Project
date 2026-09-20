import mongoose from "mongoose";

const aiChatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true
    },
    content: {
      type: String,
      required: true
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
      default: "محادثة مع معلّم نبراس"
    },
    messages: [aiChatMessageSchema]
  },
  { timestamps: true }
);

const AIChat = mongoose.model("AIChat", aiChatSchema);

export default AIChat;
