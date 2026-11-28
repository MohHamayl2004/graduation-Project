import { ApiError } from '../errors/ApiError.js';
import { readWavMetadata } from './wavMetadata.js';

export function createFishSpeechService({ env = process.env, fetchImpl = globalThis.fetch, maxAudioBytes = 15 * 1024 * 1024 } = {}) {
  let busy = false;
  return async function synthesize({ text, signal } = {}) {
    if (signal?.aborted) throw new ApiError(499, 'TTS_CANCELLED', 'Speech generation cancelled.');
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new ApiError(400, 'TTS_INVALID_TEXT', 'Speech text must contain 1–2000 characters.');
    if (!env.FISH_TTS_BASE_URL) throw new ApiError(503, 'TTS_UNAVAILABLE', 'Fish speech is not configured.');
    let endpoint;
    try {
      const base = new URL(env.FISH_TTS_BASE_URL);
      if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('Invalid endpoint');
      endpoint = `${base.href.replace(/\/$/, '')}/generate`;
    } catch { throw new ApiError(503, 'TTS_UNAVAILABLE', 'Fish speech endpoint configuration is invalid.'); }
    if (busy) throw new ApiError(503, 'TTS_BUSY', 'Speech generation is busy. Try again shortly.');
    busy = true;
    const timeout = AbortSignal.timeout(Math.max(1000, Math.min(Number(env.FISH_TTS_TIMEOUT_MS) || 60000, 120000)));
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const form = new FormData(); form.set('text', text.trim());
      form.set('params', JSON.stringify({ max_new_tokens: Math.max(128, Math.min(Number(env.FISH_TTS_MAX_TOKENS) || 1024, 4096)), temperature: .7, top_p: .8 }));
      const response = await fetchImpl(endpoint, {
        method: 'POST', signal: combined, body: form,
        headers: env.FISH_TTS_API_KEY ? { Authorization: `Bearer ${env.FISH_TTS_API_KEY}` } : {},
      });
      if (response.status === 503) throw new ApiError(503, 'TTS_BUSY', 'Speech generation is busy. Try again shortly.');
      if (!response.ok) throw new ApiError(502, 'TTS_UPSTREAM_ERROR', 'Fish speech generation failed.');
      const contentType = response.headers.get('Content-Type')?.split(';')[0];
      if (!contentType?.startsWith('audio/')) throw new ApiError(502, 'TTS_INVALID_RESPONSE', 'Fish returned invalid audio.');
      if (Number(response.headers.get('Content-Length')) > maxAudioBytes) throw new ApiError(502, 'TTS_AUDIO_TOO_LARGE', 'Generated audio exceeds the size limit.');
      const reader = response.body?.getReader(); const chunks = []; let length = 0;
      if (!reader) throw new ApiError(502, 'TTS_INVALID_RESPONSE', 'Fish returned no audio.');
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          length += value.length;
          if (length > maxAudioBytes) { await reader.cancel(); throw new ApiError(502, 'TTS_AUDIO_TOO_LARGE', 'Generated audio exceeds the size limit.'); }
          chunks.push(Buffer.from(value));
        }
      } finally { reader.releaseLock(); }
      if (!length) throw new ApiError(502, 'TTS_INVALID_RESPONSE', 'Fish returned empty audio.');
      const audio = Buffer.concat(chunks), metadata = readWavMetadata(audio);
      return { audio, contentType, model: env.FISH_TTS_MODEL_ID || 's2-pro-q6_k', sync: { mode: 'audio-amplitude', durationSeconds: metadata?.durationSeconds ?? null } };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (signal?.aborted) throw new ApiError(499, 'TTS_CANCELLED', 'Speech generation cancelled.');
      if (timeout.aborted) throw new ApiError(504, 'TTS_TIMEOUT', 'Speech generation timed out.');
      throw new ApiError(502, 'TTS_UPSTREAM_ERROR', 'Fish speech is unavailable.');
    } finally { busy = false; }
  };
}
