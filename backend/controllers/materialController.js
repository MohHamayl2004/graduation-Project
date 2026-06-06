import Material from "../models/Material.js";
import asyncHandler from "../middleware/asyncHandler.js";

export const uploadMaterial = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Material file is required" });
  }

  const { title, type } = req.body;

  const material = await Material.create({
    userId: req.user._id,
    title: title?.trim() || req.file.originalname,
    type: type || req.file.mimetype,
    fileUrl: `/uploads/${req.file.filename}`,
    status: "uploaded"
  });

  res.status(201).json({ material });
});

export const getMaterials = asyncHandler(async (req, res) => {
  const materials = await Material.find({ userId: req.user._id }).sort({ uploadedAt: -1 });
  res.json({ materials });
});

export const getMaterialById = asyncHandler(async (req, res) => {
  const material = await Material.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!material) {
    return res.status(404).json({ message: "Material not found" });
  }

  res.json({ material });
});
