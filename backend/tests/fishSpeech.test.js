import test from 'node:test';
import assert from 'node:assert/strict';
import { createFishSpeechService } from '../services/fishSpeechService.js';
import express from 'express';
import request from 'supertest';
import { createSpeechRouter } from '../routes/speechRoutes.js';
import { errorHandler } from '../middleware/errorMiddleware.js';

test('Fish remains explicitly unavailable when no endpoint is configured', async () => {
  const synthesize = createFishSpeechService({ env: {}, fetchImpl: () => { throw new Error('must not fetch'); } });
  await assert.rejects(synthesize({ text: 'hello' }), e => e.code === 'TTS_UNAVAILABLE');
});
test('Fish proxy forwards only text, bounded generation settings and server-side authentication', async () => {
  let request;
  const synthesize = createFishSpeechService({ env: { FISH_TTS_BASE_URL: 'http://127.0.0.1:8081', FISH_TTS_API_KEY: 'server-secret' }, fetchImpl: async (url, init) => { request = { url, ...init }; return new Response(new Uint8Array([1,2,3]), { headers: { 'Content-Type': 'audio/wav' } }); } });
  const result = await synthesize({ text: 'مرحبا' });
  assert.equal(request.url, 'http://127.0.0.1:8081/generate');
  assert.equal(request.headers.Authorization, 'Bearer server-secret'); assert.equal(request.body.get('text'), 'مرحبا');
  assert.equal(request.body.has('reference'), false); assert.equal(result.audio.length, 3);
});
test('Fish busy replies remain retryable and non-audio responses fail', async () => {
  const env = { FISH_TTS_BASE_URL: 'http://127.0.0.1:8081' };
  await assert.rejects(createFishSpeechService({ env, fetchImpl: async () => new Response('busy', { status: 503 }) })({ text: 'hello' }), e => e.code === 'TTS_BUSY');
  await assert.rejects(createFishSpeechService({ env, fetchImpl: async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }) })({ text: 'hello' }), e => e.code === 'TTS_INVALID_RESPONSE');
});
test('invalid text never reaches the model, and excessive audio is rejected', async () => {
  let calls = 0;
  const synthesize = createFishSpeechService({ env: { FISH_TTS_BASE_URL: 'http://127.0.0.1:8081' }, maxAudioBytes: 2, fetchImpl: async () => { calls++; return new Response(new Uint8Array(3), { headers: { 'Content-Type': 'audio/wav' } }); } });
  await assert.rejects(synthesize({ text: '' }), e => e.code === 'TTS_INVALID_TEXT'); assert.equal(calls, 0);
  await assert.rejects(synthesize({ text: 'hello' }), e => e.code === 'TTS_AUDIO_TOO_LARGE');
});

test('only one Fish request runs at a time and the slot is released afterward', async () => {
  let resolve;
  const synthesize = createFishSpeechService({ env: { FISH_TTS_BASE_URL: 'http://127.0.0.1:8081' }, fetchImpl: () => new Promise(r => { resolve = r; }) });
  const first = synthesize({ text: 'first' });
  await assert.rejects(synthesize({ text: 'second' }), e => e.code === 'TTS_BUSY');
  resolve(new Response('wav', { headers: { 'Content-Type': 'audio/wav' } })); await first;
  const third = synthesize({ text: 'third' }); resolve(new Response('wav', { headers: { 'Content-Type': 'audio/wav' } })); await third;
});

test('speech route requires authentication and returns private audio without forwarding reference uploads', async () => {
  const unauthenticated = express(); unauthenticated.use(express.json()); unauthenticated.use(createSpeechRouter()); unauthenticated.use(errorHandler);
  assert.equal((await request(unauthenticated).post('/').send({ text: 'hello' })).status, 401);
  let input;
  const app = express(); app.use(express.json()); app.use(createSpeechRouter({ guard: (_req, _res, next) => next(), synthesize: async value => { input = value; return { audio: Buffer.from('wav'), contentType: 'audio/wav', model: 's2-pro-q6_k' }; } })); app.use(errorHandler);
  const response = await request(app).post('/').send({ text: 'hello', reference: 'do-not-clone' });
  assert.equal(response.status, 200); assert.equal(response.headers['cache-control'], 'no-store'); assert.equal(input.reference, undefined);
  assert.ok(input.signal instanceof AbortSignal);
});
