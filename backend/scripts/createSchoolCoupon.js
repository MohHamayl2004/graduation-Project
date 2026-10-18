import "../config/env.js";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import SchoolCoupon from "../models/SchoolCoupon.js";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const index = arg.indexOf("=");
  return [arg.slice(2, index), arg.slice(index + 1)];
}));
const code = args.code?.trim().toUpperCase();
const discountPercent = Number(args.discount);
const expiresAt = args.expires ? new Date(args.expires) : null;
if (!/^[\p{L}\p{N}_-]{3,64}$/u.test(code || "") || !args.school?.trim() || !Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100 || (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()))) {
  throw new Error('Use --code=SCHOOL-2026 --school="School name" --discount=20 [--expires=2027-01-01] [--active=false]');
}
try {
  await connectDB();
  await SchoolCoupon.init();
  await SchoolCoupon.findOneAndUpdate({ code }, { $set: { schoolName: args.school.trim(), discountPercent, expiresAt, active: args.active !== "false" } }, { upsert: true, runValidators: true });
  console.log(`Saved school coupon ${code} (${discountPercent}%).`);
} finally { await mongoose.disconnect(); }
