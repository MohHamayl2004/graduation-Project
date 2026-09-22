import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    niprasId: { type: String, trim: true, uppercase: true, immutable: true, sparse: true, unique: true, match: [/^NIP-\d{7}$/, "Invalid NIPRAS ID"] },
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
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
