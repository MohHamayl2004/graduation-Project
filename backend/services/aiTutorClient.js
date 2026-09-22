import { aiServiceConfig } from "../config/aiService.js";
import { ApiError } from "../errors/ApiError.js";
import { readNdjson } from "../utils/ndjson.js";

const unavailable = () => new ApiError(503, "AI_UNAVAILABLE", "المدرّس الذكي غير متاح الآن. حاول بعد قليل.");

// Opens the stream and checks the response BEFORE anything is sent to the
// student, so "the AI service is down" is still a normal JSON 503 and not a
// half-started stream. Returns an async iterator of contract-v1 events.
export async function openTutorStream({ question, history = [], signal, config = aiServiceConfig() }) {
  if (!config.key) throw new ApiError(503, "AI_MISCONFIGURED", "المدرّس الذكي غير مُعدّ على الخادم");
  let response;
  try {
    response = await fetch(`${config.url}/v1/tutor/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Nipras-Service-Key": config.key },
      body: JSON.stringify({ question, history }),
      signal
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw unavailable();
  }
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    throw unavailable();
  }
  return readNdjson(response.body);
}
