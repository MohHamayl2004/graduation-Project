import mongoose from "mongoose";
import "../config/env.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { allocateNiprasId } from "../services/niprasIdService.js";

export async function backfillNiprasIds() {
  const users = await User.find({ $or: [{ niprasId: { $exists: false } }, { niprasId: null }] }).select("_id");
  let updated = 0;
  for (const user of users) {
    const niprasId = await allocateNiprasId();
    const result = await User.updateOne({ _id: user._id, $or: [{ niprasId: { $exists: false } }, { niprasId: null }] }, { $set: { niprasId } });
    updated += result.modifiedCount;
  }
  return { scanned: users.length, updated };
}

if (process.argv[1]?.endsWith("backfillNiprasIds.js")) {
  await connectDB();
  const result = await backfillNiprasIds();
  console.log(`Backfilled ${result.updated} users.`);
  await mongoose.disconnect();
}
