import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  tier: { type: String, enum: ["free", "monthly", "quarterly", "yearly"] },
  status: { type: String, enum: ["FREE", "ACTIVE", "INACTIVE"] },
  startsAt: Date, expiresAt: Date, reason: String,
  activationSource: { type: String, enum: ["admin_gift", "demo_payment", "payment"], default: undefined },
  revision: { type: Number, default: 0 },
  appliedPaymentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Payment" }],
  periods: [{ _id: false, paymentId: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" }, tier: String, startsAt: Date, expiresAt: Date, activationSource: String }]
}, { _id: false });

const userSchema = new mongoose.Schema(
  {
    niprasId: { type: String, trim: true, uppercase: true, immutable: true, sparse: true, unique: true, match: [/^NIP-\d{7}$/, "Invalid NIPRAS ID"] },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    role: { type: String, enum: ["student", "admin"], default: "student", index: true },
    city: { type: String, trim: true },
    blockReason: String,
    subscription: { type: subscriptionSchema, default: undefined },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"]
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    grade: {
      type: String,
      trim: true
    },
    birthDate: { type: Date },
    schoolBenefit: {
      couponId: { type: mongoose.Schema.Types.ObjectId, ref: "SchoolCoupon" },
      code: String,
      schoolName: String,
      discountPercent: Number,
      appliedAt: Date
    },
    stream: {
      type: String,
      trim: true
    },
    language: {
      type: String,
      enum: ["en", "ar"],
      default: "en"
    },
    avatarUrl: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);

export default User;
