import "./config/dns.js";
import "./config/env.js";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import materialRoutes from "./routes/materialRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

const PORT = process.env.PORT || 5000;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((origin) => origin.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (_req, res) => {
  res.send("NIPRAS API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/materials", materialRoutes);

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  console.log(`Node version: ${process.version}`);
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the existing process or set a different PORT in .env.`);
      process.exit(1);
    }

    console.error("Server failed to start:", error);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Failed to start NIPRAS API:", error);
  process.exit(1);
});
