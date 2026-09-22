import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 160 },
  type: { type: String, required: true, enum: ["PERSONAL", "SCHOOL"] },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  joinCode: { type: String, trim: true, uppercase: true, sparse: true, unique: true },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
}, { timestamps: true });

export default mongoose.model("Workspace", workspaceSchema);
