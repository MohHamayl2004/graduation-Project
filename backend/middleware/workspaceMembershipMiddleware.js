import Membership from "../models/Membership.js";
import asyncHandler from "./asyncHandler.js";
import { ApiError } from "../errors/ApiError.js";

export const requireActiveMembership = (getWorkspaceId) => asyncHandler(async (req, _res, next) => {
  const workspaceId = getWorkspaceId(req);
  const membership = await Membership.findOne({ userId: req.user._id, workspaceId, status: "ACTIVE" });
  if (!membership) throw new ApiError(403, "WORKSPACE_ACCESS_DENIED", "لا تملك صلاحية الوصول إلى هذه المدرسة");
  req.workspaceMembership = membership;
  next();
});
