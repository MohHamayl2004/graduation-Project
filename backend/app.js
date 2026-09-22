import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import schoolRoutes from "./routes/schoolRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.get("/", (_req, res) => res.send("NIPRAS API is running"));
  app.use("/api/auth", authRoutes);
  app.use("/api/materials", materialRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/schools", schoolRoutes);
  app.use("/api/tutor", tutorRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
