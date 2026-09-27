import express from "express";
import { generateImage } from "../services/aiImageClient.js";

const router = express.Router();

router.post("/generate", async (req, res, next) => {
  try {
    const result = await generateImage(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
