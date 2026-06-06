import { Router } from "express";
import {
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

export default router;
