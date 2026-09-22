import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ApiError } from "../errors/ApiError.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import { allocateNiprasId } from "./niprasIdService.js";
import { listWorkspaces } from "./workspaceService.js";

const transactionUnavailable = (error) => /Transaction numbers are only allowed|replica set|mongos/i.test(error?.message || "");

export async function registerStudent(input, { createPersonalWorkspace = (data, options) => Workspace.create(data, options) } = {}) {
  if (await User.exists({ email: input.email })) throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "البريد الإلكتروني مسجل مسبقاً");
  let school = null;
  if (input.schoolCode) {
    school = await Workspace.findOne({ type: "SCHOOL", status: "ACTIVE", joinCode: input.schoolCode });
    if (!school) throw new ApiError(400, "INVALID_SCHOOL_CODE", "رمز المدرسة غير صحيح");
  }
  const niprasId = await allocateNiprasId();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const createRecords = async (session) => {
    const options = session ? { session } : undefined;
    const [user] = await User.create([{ fullName: input.fullName, email: input.email, passwordHash, stream: input.stream, grade: input.grade, niprasId, status: "ACTIVE" }], options);
    const workspace = await createPersonalWorkspace({ name: `حساب ${input.fullName} الشخصي`, type: "PERSONAL", ownerId: user._id, status: "ACTIVE" }, options);
    await Membership.create([{ userId: user._id, workspaceId: workspace._id, role: "OWNER" }], options);
    if (school) await Membership.create([{ userId: user._id, workspaceId: school._id, role: "STUDENT" }], options);
    return user;
  };
  const session = await mongoose.startSession();
  try {
    let user;
    try {
      await session.withTransaction(async () => { user = await createRecords(session); });
      return user;
    } catch (error) {
      if (!transactionUnavailable(error)) throw error;
      return await createRecords();
    }
  } catch (error) {
    const createdUser = await User.findOne({ email: input.email, niprasId }).select("_id");
    if (createdUser) {
      await Membership.deleteMany({ userId: createdUser._id });
      await Workspace.deleteMany({ ownerId: createdUser._id, type: "PERSONAL" });
      await User.deleteOne({ _id: createdUser._id });
    }
    if (error?.code === 11000) throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "البريد الإلكتروني مسجل مسبقاً");
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "REGISTRATION_FAILED", "تعذر إنشاء الحساب. حاول مرة أخرى");
  } finally {
    await session.endSession();
  }
}

export async function authContext(user) {
  const workspaces = await listWorkspaces(user._id);
  const currentWorkspace = workspaces.find((workspace) => workspace.type === "PERSONAL") || null;
  return { user: user.toJSON(), workspaces, currentWorkspace };
}
