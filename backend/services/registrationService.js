import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ApiError } from "../errors/ApiError.js";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import Workspace from "../models/Workspace.js";
import SchoolCoupon from "../models/SchoolCoupon.js";
import { allocateNiprasId } from "./niprasIdService.js";
import { listWorkspaces } from "./workspaceService.js";
import { DAY_MS, effectiveSubscription } from "../../shared/subscriptions.js";

const transactionUnavailable = (error) => /Transaction numbers are only allowed|replica set|mongos/i.test(error?.message || "");

// Mongoose only honours a session when the first argument is an ARRAY:
// Workspace.create(data, { session }) treats the options object as a second
// document, returns two documents, and the workspace the caller gets back has
// no _id - so the membership below fails and the whole registration is rolled
// back as REGISTRATION_FAILED. It only happens where transactions exist (any
// replica set, so every Atlas cluster), which is why a standalone database
// never showed it.
export async function registerStudent(input, { createPersonalWorkspace = async (data, options) => (await Workspace.create([data], options))[0] } = {}) {
  if (await User.exists({ email: input.email })) throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "البريد الإلكتروني مسجل مسبقاً");
  let schoolBenefit;
  if (input.schoolCode) {
    const coupon = await SchoolCoupon.findOne({ code: input.schoolCode, active: true, $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] });
    if (!coupon) throw new ApiError(400, "INVALID_SCHOOL_CODE", "رمز خصم المدرسة غير صحيح أو منتهي الصلاحية");
    schoolBenefit = { couponId: coupon._id, code: coupon.code, schoolName: coupon.schoolName, discountPercent: coupon.discountPercent, appliedAt: new Date() };
  }
  const niprasId = await allocateNiprasId();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const startsAt = new Date();
  const tier = input.subscriptionTier || "free";
  const subscription = tier === "free" ? { tier, status: "FREE", startsAt, expiresAt: new Date(startsAt.getTime() + 7 * DAY_MS) } : { tier, status: "INACTIVE", reason: "awaiting_payment" };
  const createRecords = async (session) => {
    const options = session ? { session } : undefined;
    const [user] = await User.create([{ fullName: input.fullName, email: input.email, city: input.city, birthDate: input.birthDate, passwordHash, stream: input.stream, grade: input.grade, schoolBenefit, niprasId, status: "ACTIVE", role: "student", subscription }], options);
    const workspace = await createPersonalWorkspace({ name: `حساب ${input.fullName} الشخصي`, type: "PERSONAL", ownerId: user._id, status: "ACTIVE" }, options);
    await Membership.create([{ userId: user._id, workspaceId: workspace._id, role: "OWNER" }], options);
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
  const safe = user.toJSON();
  delete safe.subscription?.appliedPaymentIds;
  return { user: { ...safe, subscription: effectiveSubscription(user) }, workspaces, currentWorkspace };
}
