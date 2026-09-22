import mongoose from "mongoose";

export default mongoose.model("Counter", new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  sequence: { type: Number, required: true, default: 0, min: 0 }
}));
