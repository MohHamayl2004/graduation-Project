import mongoose from "mongoose";
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  key: { type: String, required: true }, reference: { type: String, required: true },
  tier: String, city: String, baseCents: Number, discountPercent: Number, amountCents: Number,
  couponCode: String, currency: { type: String, default: "USD" },
  demo: { type: Boolean, default: true },
  renewal: { type: Boolean, default: false },
  status: { type: String, enum: ["pending", "completed"], default: "pending" },
  paidAt: Date,
  subscriptionStartsAt: Date, subscriptionExpiresAt: Date
}, { timestamps: true });
schema.index({ owner: 1, key: 1 }, { unique: true });
export default mongoose.model("Payment", schema);
