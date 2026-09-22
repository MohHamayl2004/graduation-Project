import "../config/env.js";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import { createSchool } from "../services/workspaceService.js";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => arg.replace(/^--/, "").split("=")));
if (!args.ownerEmail || !args.name || !args.joinCode) throw new Error("Use --ownerEmail= --name= --joinCode=");
await connectDB();
const owner = await User.findOne({ email: args.ownerEmail.trim().toLowerCase() });
if (!owner) throw new Error("Owner user was not found");
const workspace = await createSchool({ ownerId: owner._id, name: args.name.trim(), joinCode: args.joinCode.trim().toUpperCase() });
console.log(`Created school ${workspace._id}`);
process.exit(0);
