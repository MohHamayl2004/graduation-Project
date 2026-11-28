import test from 'node:test';
import assert from 'node:assert/strict';
import { openQwenTutorStream } from '../services/qwenTutorClient.js';

const config = { url: 'http://local', key: 'test', model: 'qwen3.5-9b' };
async function run(value) {
  let payload;
  const events = await openQwenTutorStream({ question: 'hi', config, fetchImpl: async (_url, init) => {
    payload = JSON.parse(init.body);
    const frames = [...value].map(content => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`).join('');
    return new Response(frames + 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } });
  } });
  const result = []; for await (const event of events) result.push(event);
  return { result, payload };
}
test('Qwen schema streams escaped Arabic text while hiding structured gesture metadata', async () => {
  const text = 'مرحبا "أحسنت"\n\\ نهاية';
  const { result, payload } = await run(JSON.stringify({ text, gesture: 'ENCOURAGING', emotion: 'happy' }));
  assert.ok(payload.response_format.json_schema.schema);
  assert.equal(result.filter(e => e.type === 'delta').map(e => e.text).join(''), text);
  assert.equal(result.at(-1).answer, text); assert.equal(result.at(-1).gesture, 'ENCOURAGING');
  assert.ok(result.filter(e => e.type === 'delta').length > 1);
});
test('invalid metadata falls back without blocking the answer', async () => {
  const { result } = await run(JSON.stringify({ text: 'hello', gesture: 'eval(code)', emotion: 'evil' }));
  assert.equal(result.at(-1).answer, 'hello'); assert.equal(result.at(-1).gesture, 'EXPLAINING');
  assert.equal(result.at(-1).emotion, 'neutral');
});
test('metadata before text and unicode escapes are decoded without exposing JSON', async () => {
  const { result } = await run('{"gesture":"POINTING","emotion":"neutral","text":"hi \\u0645"}');
  assert.equal(result.filter(e => e.type === 'delta').map(e => e.text).join(''), 'hi م');
});
