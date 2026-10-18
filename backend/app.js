import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import createAuthRouter from "./routes/authRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import schoolRoutes from "./routes/schoolRoutes.js";
import tutorRoutes from "./routes/tutorRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import studyPlanRoutes from "./routes/studyPlanRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { featureAccess } from "./middleware/subscriptionMiddleware.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.get("/", (_req, res) => res.send("NIPRAS API is running"));
  app.use("/api/auth", createAuthRouter());
  app.use("/api/billing", billingRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/materials", ...featureAccess, materialRoutes);
  app.use("/api/workspaces", ...featureAccess, workspaceRoutes);
  app.use("/api/schools", ...featureAccess, schoolRoutes);
  app.use("/api/tutor", ...featureAccess, tutorRoutes);
  app.use("/api/study-plan", ...featureAccess, studyPlanRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
