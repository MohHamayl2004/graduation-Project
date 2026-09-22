import asyncHandler from "../middleware/asyncHandler.js";
import { validateSchoolJoinInput } from "../validation/authValidation.js";
import { joinSchool } from "../services/workspaceService.js";
export const join = asyncHandler(async (req, res) => res.status(201).json({ workspace: await joinSchool(req.user._id, validateSchoolJoinInput(req.body).schoolCode) }));
