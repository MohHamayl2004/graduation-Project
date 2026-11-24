import { ApiError } from "../errors/ApiError.js";

const types = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mpeg",
]);
export function speechCapabilities(env = process.env) {
  const sttProvider = "qwen";
  const provider = "fish";
  return {
    stt: Boolean(env.QWEN_ASR_URL && env.QWEN_ASR_KEY),
    tts: Boolean(env.FISH_TTS_BASE_URL),
    provider,
    sttProvider,
  };
}

export function createTranscriptionService({
  env = process.env,
  fetchImpl = globalThis.fetch,
} = {}) {
  return async ({ audio, mimeType, signal } = {}) => {
    if (signal?.aborted)
      throw new ApiError(499, "SPEECH_CANCELLED", "Speech request cancelled.");
    const type = String(mimeType || "").split(";")[0];
    if (
      !Buffer.isBuffer(audio) ||
      !audio.length ||
      audio.length > 6 * 1024 * 1024 ||
      !types.has(type)
    )
      throw new ApiError(
        400,
        "STT_INVALID_AUDIO",
        "Record a supported audio clip of at most 6 MB.",
      );
    if (!env.QWEN_ASR_URL || !env.QWEN_ASR_KEY)
      throw new ApiError(
        503,
        "QWEN_ASR_UNAVAILABLE",
        "Speech recognition is not configured.",
      );
    const timeout = AbortSignal.timeout(60000);
    const form = new FormData();
    form.set(
      "file",
      new Blob([audio], { type }),
      "question." +
        ({
          "audio/wav": "wav",
          "audio/x-wav": "wav",
          "audio/mp4": "m4a",
          "audio/ogg": "ogg",
          "audio/mpeg": "mp3",
        }[type] || "webm"),
    );
    form.set("language", "Arabic");
    form.set("model", "qwen3-asr-0.6b");
    let response;
    try {
      response = await fetchImpl(
        `${env.QWEN_ASR_URL.replace(/\/+$/, "")}/v1/audio/transcriptions`,
        {
          method: "POST",
          body: form,
          headers: { Authorization: `Bearer ${env.QWEN_ASR_KEY}` },
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("upstream");
      }
      // Bound the streamed result even when Content-Length is missing.
      const reader = response.body?.getReader();
      if (!reader) throw new Error("empty");
      let size = 0;
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 16384) {
            await reader.cancel();
            throw new Error("oversize");
          }
          chunks.push(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
      const result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (
        typeof result.text !== "string" ||
        !result.text.trim() ||
        result.text.length > 2000
      )
        throw new ApiError(
          422,
          "STT_NO_TEXT",
          "No usable question was recognized.",
        );
      return { text: result.text.trim() };
    } catch (error) {
      if (signal?.aborted)
        throw new ApiError(
          499,
          "SPEECH_CANCELLED",
          "Speech request cancelled.",
        );
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        timeout.aborted ? 504 : 502,
        "QWEN_ASR_UNAVAILABLE",
        "Speech recognition is currently unavailable.",
      );
    }
  };
}
