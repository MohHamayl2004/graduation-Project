import "../config/env.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomInt, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import Membership from "../models/Membership.js";
import Payment from "../models/Payment.js";
import { allocateNiprasId } from "../services/niprasIdService.js";
import { DAY_MS, subscriptionPlans } from "../../shared/subscriptions.js";

// A saved manifest makes retries complete the same batch without adding duplicates.
const localDir = new URL("../../.local/", import.meta.url);
const manifestFile = new URL("demo-students.json", localDir);
const demoCities = ["القدس", "رام الله", "نابلس", "الخليل", "جنين", "غزة"];
const pick = (items) => items[randomInt(items.length)];
const weighted = (entries) => pick(entries.flatMap(([value, weight]) => Array(weight).fill(value)));
const varied = (entries) => shuffle([...entries.map(([value]) => value), ...Array.from({ length: 100 - entries.length }, () => weighted(entries))]);
const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = randomInt(i + 1); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
function generate() {
  const now = Date.now();
  const firstNames = ["أحمد", "محمد", "يوسف", "عمر", "آدم", "ليث", "كريم", "رامي", "سارة", "مريم", "نور", "لينا", "رغد", "جنى", "تالا", "هبة", "دانا", "ياسمين"];
  const lastNames = ["خليل", "حماد", "عوض", "منصور", "صالح", "حمدان", "نصار", "زيد", "شاهين", "سليمان", "حسن", "ناصر"];
  const tiers = varied([["free", 35], ["monthly", 35], ["quarterly", 20], ["yearly", 10]]);
  const cities = varied([["نابلس", 30], ["الخليل", 22], ["غزة", 18], ["رام الله", 15], ["القدس", 10], ["جنين", 5]]);
  const streams = varied([["scientific", 42], ["literary", 25], ["commercial", 13], ["industrial", 9], ["sharia", 7], ["hotel", 4]]);
  return Array.from({ length: 100 }, (_, index) => {
    const tier = tiers[index];
    const days = tier === "free" ? 7 : subscriptionPlans.find((p) => p.id === tier).days;
    const mode = pick(tier === "free" ? ["active", "active", "active", "expired"] : ["active", "active", "active", "active", "expired", "pending", "manual"]);
    const age = mode === "expired" ? days + randomInt(1, 61) : randomInt(days);
    const startsAt = new Date(now - age * DAY_MS - randomInt(3600000));
    const expiresAt = new Date(startsAt.getTime() + days * DAY_MS);
    const createdAt = tier === "free" ? startsAt : new Date(startsAt.getTime() - randomInt(1, 15) * DAY_MS);
    const subscription = { tier, status: mode === "active" ? (tier === "free" ? "FREE" : "ACTIVE") : "INACTIVE", revision: 0, appliedPaymentIds: [] };
    if (mode === "pending") subscription.reason = "awaiting_payment";
    else { subscription.startsAt = startsAt; subscription.expiresAt = expiresAt; if (mode !== "active") subscription.reason = mode === "expired" ? "expired" : "manual"; }
    const blocked = randomInt(100) < 8;
    const id = String(index + 1).padStart(3, "0");
    const record = {
      email: `demo-${id}@nipras-seed.example.invalid`, fullName: `تجربة - ${pick(firstNames)} ${pick(lastNames)}`,
      password: `Demo!${randomBytes(12).toString("base64url")}9`, city: cities[index], stream: streams[index],
      birthDate: new Date(Date.UTC(randomInt(2006, 2010), randomInt(12), randomInt(1, 29))),
      grade: "توجيهي", language: "ar", role: "student", status: blocked ? "INACTIVE" : "ACTIVE",
      ...(blocked ? { blockReason: "حظر تجريبي لفحص لوحة الإدارة" } : {}), createdAt, subscription
    };
    if (tier !== "free" && mode !== "pending") {
      const plan = subscriptionPlans.find((p) => p.id === tier);
      const discountPercent = pick([0, 0, 0, 10, 15, 20]);
      record.payment = { key: `seed-demo-${id}`, reference: `DEMO-SEED-${id}`, tier, city: record.city,
        baseCents: plan.cents, discountPercent, amountCents: Math.round(plan.cents * (100 - discountPercent) / 100),
        demo: true, renewal: false, currency: "USD", status: "completed", paidAt: startsAt, createdAt: startsAt };
    }
    return record;
  });
}
try {
  if (process.env.NODE_ENV === "production" || !/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(process.env.MONGO_URI || "")) throw new Error("Demo seeding only supports the local non-production MongoDB.");
  await mkdir(localDir, { recursive: true });
  let records;
  try { records = JSON.parse(await readFile(manifestFile, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; records = generate(); await writeFile(manifestFile, JSON.stringify(records, null, 2)); }
  const redistribute = process.argv.includes("--redistribute");
  if (redistribute) { records = generate(); await writeFile(manifestFile, JSON.stringify(records, null, 2)); }
  if (!Array.isArray(records) || records.length !== 100 || records.some((r, i) => r.email !== `demo-${String(i + 1).padStart(3, "0")}@nipras-seed.example.invalid`)) throw new Error("Unexpected demo manifest; refusing to modify accounts.");
  if (records.some((r) => !demoCities.includes(r.city))) {
    const cities = shuffle(Array.from({ length: 100 }, (_, i) => demoCities[i % demoCities.length]));
    records.forEach((record, i) => { record.city = cities[i]; if (record.payment) record.payment.city = cities[i]; });
    await writeFile(manifestFile, JSON.stringify(records, null, 2));
  }
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.init(), Payment.init(), Workspace.init(), Membership.init()]);
  let added = 0;
  for (const record of records) {
    let user = await User.findOne({ email: record.email });
    if (!user) {
      const { password, payment, ...profile } = record;
      user = await User.create({ ...profile, niprasId: await allocateNiprasId(), passwordHash: await bcrypt.hash(password, 12) });
      added++;
    } else if (redistribute) {
      const { password, payment, createdAt, ...profile } = record;
      await User.updateOne({ _id: user._id, email: record.email, role: "student" }, { $set: { ...profile, passwordHash: await bcrypt.hash(password, 12), createdAt: new Date(createdAt) }, ...(profile.blockReason ? {} : { $unset: { blockReason: 1 } }) }, { timestamps: false, overwriteImmutable: true });
      // Only synthetic receipts belonging to this exact demo account are replaced.
      await Payment.deleteMany({ owner: user._id, key: /^seed-demo-\d{3}$/, demo: true });
    }
    if (user.city !== record.city) await User.updateOne({ _id: user._id }, { $set: { city: record.city } });
    const workspace = await Workspace.findOneAndUpdate({ ownerId: user._id, type: "PERSONAL" }, { $setOnInsert: { name: `حساب ${user.fullName} الشخصي`, status: "ACTIVE" } }, { upsert: true, new: true });
    await Membership.updateOne({ userId: user._id, workspaceId: workspace._id }, { $setOnInsert: { role: "OWNER", status: "ACTIVE" } }, { upsert: true });
    if (record.payment) {
      const { city, ...payment } = record.payment;
      await Payment.updateOne({ owner: user._id, key: payment.key }, { $setOnInsert: payment, $set: { city } }, { upsert: true });
    }
  }
  const total = await User.countDocuments({ email: /@nipras-seed\.example\.invalid$/ });
  if (total !== 100) throw new Error(`Expected 100 demo accounts, found ${total}`);
  console.log(`Added ${added}; verified ${total} demo students. Existing accounts were preserved. Credentials: ${fileURLToPath(manifestFile)}`);
} finally { await mongoose.disconnect(); }
