import "../config/env.js";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import User from "../models/User.js";
import SchoolCoupon from "../models/SchoolCoupon.js";
import { createCoupon } from "../services/couponService.js";
import { quoteFor } from "../services/billingService.js";
const file = new URL("../../.local/demo-coupons.json", import.meta.url);
try {
  if (process.env.NODE_ENV === "production" || !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(process.env.MONGO_URI || "")) throw new Error("Only local demo databases are supported");
  await mongoose.connect(process.env.MONGO_URI); await SchoolCoupon.init();
  const admin = await User.findOne({ email: "admin@nipras.local", role: "admin" });
  if (!admin) throw new Error("Create the administrator first");
  let records;
  try { records = JSON.parse(await readFile(file, "utf8")); }
  catch (e) {
    if (e.code !== "ENOENT") throw e;
    records = [
      { schoolName: "مدرسة الأمل التجريبية", code: `AMAL-${randomBytes(3).toString("hex").toUpperCase()}`, discountPercent: 15, durationDays: 30 },
      { schoolName: "مدرسة النجاح التجريبية", code: `NAJAH-${randomBytes(3).toString("hex").toUpperCase()}`, discountPercent: 25, durationDays: 60 }
    ];
    await mkdir(new URL("../../.local/", import.meta.url), { recursive: true }); await writeFile(file, JSON.stringify(records, null, 2));
  }
  for (const record of records) {
    if (!await SchoolCoupon.exists({ code: record.code })) await createCoupon(admin, record);
    const quote = await quoteFor({}, "monthly", record.code);
    console.log(JSON.stringify({ ...record, verifiedMonthlyCents: quote.amountCents }));
  }
} finally { await mongoose.disconnect(); }
