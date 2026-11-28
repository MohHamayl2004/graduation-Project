import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { readWavMetadata } from '../services/wavMetadata.js';
import { createFishSpeechService } from '../services/fishSpeechService.js';
import { createSpeechRouter } from '../routes/speechRoutes.js';

function wave() {
  const b = Buffer.alloc(44 + 32000); b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(32000, 40); return b;
}
test('WAV duration comes from valid sample chunks rather than text length', () => {
  assert.deepEqual(readWavMetadata(wave()), { durationSeconds: 1, sampleRate: 16000, channels: 1 });
  for (const bytes of [Buffer.from('not wav'), wave().subarray(0, 48)]) assert.equal(readWavMetadata(bytes), null);
  const corrupt = wave(); corrupt.writeUInt32LE(0, 28); assert.equal(readWavMetadata(corrupt), null);
});
test('Fish returns honest fallback sync metadata and skips pre-cancelled generation', async () => {
  let calls = 0; const synthesize = createFishSpeechService({ env: { FISH_TTS_BASE_URL: 'http://localhost:8081' }, fetchImpl: async () => { calls++; return new Response(wave(), { headers: { 'Content-Type': 'audio/wav' } }); } });
  const result = await synthesize({ text: 'مرحبا' }); assert.equal(result.sync.mode, 'audio-amplitude'); assert.equal(result.sync.durationSeconds, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(synthesize({ text: 'مرحبا', signal: controller.signal }), e => e.code === 'TTS_CANCELLED'); assert.equal(calls, 1);
});
test('authenticated binary speech retains its body and exposes safe timing metadata', async () => {
  const app = express(); app.use(express.json()); app.use(createSpeechRouter({ guard: (_req, _res, next) => next(), synthesize: async () => ({ audio: wave(), contentType: 'audio/wav', model: 'fish-test', sync: { mode: 'audio-amplitude', durationSeconds: 1 } }) }));
  const result = await request(app).post('/').send({ text: 'مرحبا' });
  assert.equal(result.status, 200); assert.equal(result.headers['x-tts-sync'], 'audio-amplitude'); assert.equal(result.headers['x-tts-duration'], '1'); assert.equal(result.body.length, wave().length);
});
