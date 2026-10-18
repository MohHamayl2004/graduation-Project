import mongoose from "mongoose";

const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  schoolName: { type: String, required: true, trim: true, maxlength: 160 },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  active: { type: Boolean, default: true },
  durationDays: { type: Number, min: 1, max: 3650, default: null },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("SchoolCoupon", schema);
