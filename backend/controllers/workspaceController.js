import asyncHandler from "../middleware/asyncHandler.js";
import { listWorkspaces } from "../services/workspaceService.js";
export const getWorkspaces = asyncHandler(async (req, res) => res.json({ workspaces: await listWorkspaces(req.user._id) }));
