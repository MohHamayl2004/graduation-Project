import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import Material from "../models/Material.js";
import asyncHandler from "../middleware/asyncHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDirectory = path.join(__dirname, "..", "uploads");

export const uploadMaterial = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Material file is required" });
  }

  const { title, subject, description, type } = req.body;

  const material = await Material.create({
    userId: req.user._id,
    title: title?.trim() || req.file.originalname,
    subject: subject?.trim() || "Other",
    description: description?.trim(),
    type: type || req.file.mimetype,
    originalName: req.file.originalname,
    fileName: req.file.filename,
    fileUrl: `/uploads/${req.file.filename}`,
    fileSize: req.file.size,
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

export const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!material) {
    return res.status(404).json({ message: "Material not found" });
  }

  if (material.fileName) {
    const filePath = path.join(uploadDirectory, material.fileName);
    await fs.unlink(filePath).catch(() => {});
  }

  res.json({ message: "Material deleted", material });
});
