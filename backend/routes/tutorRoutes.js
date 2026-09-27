import { Router } from "express";
import { createTutorHandlers } from "../controllers/tutorController.js";
import { protect as defaultProtect } from "../middleware/authMiddleware.js";

export function createTutorRouter({ protect = defaultProtect, handlers = createTutorHandlers() } = {}) {
  const router = Router();
  router.use(protect);
  router.get("/chats", handlers.listChats);
  router.post("/chats", handlers.createChat);
  router.get("/chats/:chatId", handlers.getChat);
  router.delete("/chats/:chatId", handlers.deleteChat);
  // Streams contract-v1 NDJSON: docs/contracts/tutor-stream-v1.md
  router.post("/chats/:chatId/messages", handlers.streamMessage);
  return router;
}

export default createTutorRouter();
