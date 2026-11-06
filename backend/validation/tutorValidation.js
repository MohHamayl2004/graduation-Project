import { ApiError } from "../errors/ApiError.js";
import { validateMathSpans } from "../../shared/mathEditor.js";

export const MESSAGE_MAX_LENGTH = 2000;
export const TITLE_MAX_LENGTH = 80;

export function validateMessageInput(payload = {}) {
  const content = String(payload.content ?? "").trim();
  if (!content) throw new ApiError(400, "VALIDATION_ERROR", "اكتب سؤالك أولاً");
  if (content.length > MESSAGE_MAX_LENGTH) throw new ApiError(400, "VALIDATION_ERROR", `السؤال أطول من ${MESSAGE_MAX_LENGTH} حرف`);
  if (payload.equations !== undefined) {
    try {
      const offset = String(payload.content ?? "").length - String(payload.content ?? "").trimStart().length;
      const equations = validateMathSpans(content, Array.isArray(payload.equations) ? payload.equations.map(e => ({ ...e, start: e.start - offset, end: e.end - offset })) : payload.equations);
      return { content, equations };
    } catch (error) { throw new ApiError(400, "VALIDATION_ERROR", error.message); }
  }
  return { content };
}

export function validateChatInput(payload = {}) {
  const title = String(payload.title ?? "").trim().slice(0, TITLE_MAX_LENGTH);
  return { title: title || undefined };
}
