import { Router } from "express";
import {
  deleteMaterial,
  getMaterialById,
  getMaterials,
  uploadMaterial
} from "../controllers/materialController.js";
import { protect } from "../middleware/authMiddleware.js";
import { uploadMaterialFile } from "../middleware/uploadMiddleware.js";

const router = Router();

router.use(protect);

router.post("/upload", uploadMaterialFile.single("file"), uploadMaterial);
router.get("/", getMaterials);
router.get("/:id", getMaterialById);
router.delete("/:id", deleteMaterial);

export default router;
