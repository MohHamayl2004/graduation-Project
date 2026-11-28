export class FishSpeechClient {
  constructor({ endpoint = '/api/tutor/speech', fetchImpl = globalThis.fetch, maxAudioBytes = 15 * 1024 * 1024 } = {}) {
    this.endpoint = endpoint; this.fetch = fetchImpl.bind(globalThis); this.maxAudioBytes = maxAudioBytes;
  }
  async synthesize(text, options = {}) { return (await this.synthesizeSpeech(text, options)).audio; }
  async synthesizeSpeech(text, { token, signal } = {}) {
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new Error('Speech text must contain 1–2000 characters.');
    const response = await this.fetch(this.endpoint, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text: text.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const error = new Error(payload?.message || 'Fish speech is currently unavailable.');
      error.code = payload?.code || 'TTS_UNAVAILABLE'; error.status = response.status; throw error;
    }
    if (!response.headers.get('Content-Type')?.startsWith('audio/')) throw new Error('Fish returned a non-audio response.');
    const declared = Number(response.headers.get('Content-Length'));
    if (declared > this.maxAudioBytes) throw new Error('Speech audio exceeds the size limit.');
    const reader = response.body?.getReader(), chunks = []; let length = 0;
    if (!reader) throw new Error('Speech audio is empty.');
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        length += value.length;
        if (length > this.maxAudioBytes) { await reader.cancel(); throw new Error('Speech audio exceeds the size limit.'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const blob = new Blob(chunks, { type: response.headers.get('Content-Type') });
    if (!blob.size || blob.size > this.maxAudioBytes) throw new Error('Speech audio is empty or exceeds the size limit.');
    const duration = Number(response.headers.get('X-TTS-Duration'));
    return { audio: blob, timingData: [], sync: { mode: 'audio-amplitude', durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null } };
  }
}
