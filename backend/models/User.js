import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
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
    academicStream: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student"
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
