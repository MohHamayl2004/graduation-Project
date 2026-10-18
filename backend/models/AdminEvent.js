import mongoose from "mongoose";
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true }, reason: String,
  details: mongoose.Schema.Types.Mixed
}, { timestamps: true });
export default mongoose.model("AdminEvent", schema);
