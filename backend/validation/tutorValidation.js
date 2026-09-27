import { ApiError } from "../errors/ApiError.js";

export const MESSAGE_MAX_LENGTH = 2000;
export const TITLE_MAX_LENGTH = 80;

export function validateMessageInput(payload = {}) {
  const content = String(payload.content ?? "").trim();
  if (!content) throw new ApiError(400, "VALIDATION_ERROR", "اكتب سؤالك أولاً");
  if (content.length > MESSAGE_MAX_LENGTH) throw new ApiError(400, "VALIDATION_ERROR", `السؤال أطول من ${MESSAGE_MAX_LENGTH} حرف`);
  return { content };
}

export function validateChatInput(payload = {}) {
  const title = String(payload.title ?? "").trim().slice(0, TITLE_MAX_LENGTH);
  return { title: title || undefined };
}
