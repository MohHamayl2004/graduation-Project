import { ApiError } from "../errors/ApiError.js";
import Membership from "../models/Membership.js";
import Workspace from "../models/Workspace.js";

export const workspaceDto = (membership, workspace) => ({ id: String(workspace._id), name: workspace.name, type: workspace.type, role: membership.role, memberNumber: membership.memberNumber, status: workspace.status });

export async function listWorkspaces(userId) {
  const memberships = await Membership.find({ userId, status: "ACTIVE" }).populate("workspaceId").lean();
  return memberships.filter(({ workspaceId }) => workspaceId?.status === "ACTIVE").map(({ workspaceId, ...membership }) => workspaceDto(membership, workspaceId));
}

export async function joinSchool(userId, schoolCode) {
  const workspace = await Workspace.findOne({ type: "SCHOOL", status: "ACTIVE", joinCode: schoolCode });
  if (!workspace) throw new ApiError(400, "INVALID_SCHOOL_CODE", "رمز المدرسة غير صحيح");
  const exists = await Membership.findOne({ userId, workspaceId: workspace._id });
  if (exists) throw new ApiError(409, "ALREADY_MEMBER", "أنت مسجل في هذه المدرسة بالفعل");
  const membership = await Membership.create({ userId, workspaceId: workspace._id, role: "STUDENT" });
  return workspaceDto(membership, workspace);
}

export async function createSchool({ ownerId, name, joinCode }) {
  const workspace = await Workspace.create({ ownerId, name, type: "SCHOOL", joinCode, status: "ACTIVE" });
  await Membership.create({ userId: ownerId, workspaceId: workspace._id, role: "SCHOOL_ADMIN" });
  return workspace;
}
