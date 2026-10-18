import "../config/env.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import User from "../models/User.js";

const email = "admin@nipras.local";
const output = resolve("../.local/admin-account.json");
try {
  await mongoose.connect(process.env.MONGO_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "admin") throw new Error("This email belongs to a student; refusing to promote it.");
    await readFile(output, "utf8");
    console.log(`Admin already exists. Credentials: ${output}`);
  } else {
    const password = `Nip!${randomBytes(15).toString("base64url")}9a`;
    await User.create({ fullName: "إدارة نبراس", email, role: "admin", status: "ACTIVE", passwordHash: await bcrypt.hash(password, 12) });
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify({ email, password, loginUrl: "http://localhost:5173/login", adminUrl: "http://localhost:5173/admin" }, null, 2));
    console.log(`Admin created. Credentials saved locally: ${output}`);
  }
} finally { await mongoose.disconnect(); }
