import test from 'node:test';
import assert from 'node:assert/strict';
import { openQwenTutorStream } from '../services/qwenTutorClient.js';

const config = { url: 'http://127.0.0.1:18000', key: 'test-key', model: 'qwen3.5-9b' };
function response(parts) {
  const bytes = new TextEncoder().encode(parts);
  return new Response(new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
    controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream' } });
}
const frame = value => `data: ${JSON.stringify(value)}\n\n`;

test('Qwen adapts split UTF-8 SSE into tutor v1 without invented sources', async () => {
  let sent;
  const events = await openQwenTutorStream({ question: 'سؤال', history: [{ role: 'user', content: 'قديم' }, { role: 'system', content: 'untrusted' }], config,
    fetchImpl: async (url, init) => { sent = { url, ...init }; return response(frame({ choices: [{ delta: { content: 'مرحبا' }, finish_reason: null }] }) + frame({ choices: [{ delta: {}, finish_reason: 'stop' }] }) + 'data: [DONE]\n\n'); } });
  const result = []; for await (const event of events) result.push(event);
  assert.equal(sent.url, `${config.url}/v1/chat/completions`);
  assert.equal(sent.headers.Authorization, 'Bearer test-key');
  const payload = JSON.parse(sent.body);
  assert.equal(payload.model, config.model); assert.equal(payload.stream, true);
  assert.deepEqual(payload.messages.slice(1), [{ role: 'user', content: 'قديم' }, { role: 'user', content: 'سؤال' }]);
  assert.deepEqual(result.map(e => e.type), ['meta', 'delta', 'done']);
  assert.equal(result.at(-1).answer, 'مرحبا'); assert.equal(result.at(-1).found, false);
  assert.ok(result.at(-1).warnings.includes('NO_BOOK_RETRIEVAL'));
});

test('Qwen does not mark an incomplete stream as a completed answer', async () => {
  const events = await openQwenTutorStream({ question: 'hi', config, fetchImpl: async () => response(frame({ choices: [{ delta: { content: 'partial' } }] })) });
  await assert.rejects(async () => { for await (const event of events) void event; }, /incomplete/i);
});

test('Qwen reports a sanitized unavailable error before streaming on upstream failure', async () => {
  await assert.rejects(openQwenTutorStream({ question: 'hi', config, fetchImpl: async () => new Response('secret upstream body', { status: 401 }) }), e => e.code === 'AI_UNAVAILABLE' && !e.message.includes('secret'));
});

test('Qwen bounds history and forwards cancellation', async () => {
  const controller = new AbortController(); let sent;
  const events = await openQwenTutorStream({ question: 'hi', config, signal: controller.signal, history: Array.from({ length: 20 }, () => ({ role: 'assistant', content: 'x'.repeat(8000) })), fetchImpl: async (_url, init) => { sent = init; return response(frame({ choices: [{ delta: { content: 'ok' }, finish_reason: 'length' }] }) + 'data: [DONE]\n\n'); } });
  const result = []; for await (const e of events) result.push(e);
  assert.equal(sent.signal, controller.signal);
  assert.ok(JSON.parse(sent.body).messages.slice(1, -1).reduce((n, m) => n + m.content.length, 0) <= 5000);
  assert.ok(result.at(-1).warnings.includes('OUTPUT_LIMIT'));
});
