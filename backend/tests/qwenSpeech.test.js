import test from "node:test";
import assert from "node:assert/strict";
import {
  createTranscriptionService,
  speechCapabilities,
} from "../services/qwenSpeechService.js";

test("Qwen transcription uses private credentials and the existing text contract", async () => {
  let sent;
  const transcribe = createTranscriptionService({
    env: {
      NIPRAS_STT_PROVIDER: "qwen",
      QWEN_ASR_URL: "http://127.0.0.1:18002",
      QWEN_ASR_KEY: "private",
    },
    fetchImpl: async (url, init) => {
      sent = { url, ...init };
      return Response.json({ text: "متوسط التغير" });
    },
  });
  assert.deepEqual(
    await transcribe({
      audio: Buffer.from("sample"),
      mimeType: "audio/webm;codecs=opus",
    }),
    { text: "متوسط التغير" },
  );
  assert.equal(sent.url, "http://127.0.0.1:18002/v1/audio/transcriptions");
  assert.equal(sent.headers.Authorization, "Bearer private");
  assert.equal(sent.body.get("language"), "Arabic");
  assert.equal(sent.body.get("file").type, "audio/webm");
});

test("invalid audio and cancellation never call Qwen; upstream errors are sanitized", async () => {
  let calls = 0;
  const service = createTranscriptionService({
    env: {
      NIPRAS_STT_PROVIDER: "qwen",
      QWEN_ASR_URL: "http://127.0.0.1:18002",
      QWEN_ASR_KEY: "private",
    },
    fetchImpl: async () => {
      calls++;
      return new Response("private upstream error", { status: 500 });
    },
  });
  await assert.rejects(
    service({ audio: Buffer.from("x"), mimeType: "text/html" }),
    (e) => e.status === 400,
  );
  await assert.rejects(
    service({
      audio: Buffer.from("x"),
      mimeType: "audio/wav",
      signal: AbortSignal.abort(),
    }),
    (e) => e.status === 499,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    service({ audio: Buffer.from("x"), mimeType: "audio/wav" }),
    (e) => e.code === "QWEN_ASR_UNAVAILABLE" && !e.message.includes("private"),
  );
});

test("capabilities describe the selected speech providers rather than unrelated credentials", () => {
  assert.deepEqual(
    speechCapabilities({
      NIPRAS_STT_PROVIDER: "qwen",
    }),
    { stt: false, tts: false, provider: "fish", sttProvider: "qwen" },
  );
  assert.equal(
    speechCapabilities({
      FISH_TTS_BASE_URL: "http://localhost",
      NIPRAS_TTS_PROVIDER: "fish",
    }).tts,
    true,
  );
});
