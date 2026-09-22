import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
  role: { type: String, required: true, enum: ["OWNER", "SCHOOL_ADMIN", "TEACHER", "STUDENT"] },
  memberNumber: { type: String, trim: true },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  joinedAt: { type: Date, default: Date.now }
});
membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });
export default mongoose.model("Membership", membershipSchema);
