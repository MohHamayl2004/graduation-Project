import { ApiError } from '../errors/ApiError.js';
import { TutorResponseDecoder, tutorResponseFormat } from './tutorGestures.js';

const unavailable = () => new ApiError(503, 'AI_UNAVAILABLE', 'المعلم الذكي غير متاح الآن. حاول بعد قليل.');
const instructions = 'أنت معلم نبراس، تساعد الطلاب باللغة العربية بوضوح وبخطوات قصيرة. أجب باختصار في نحو 150 كلمة أو أقل. لا تعرض التفكير الداخلي. لا تدّع الرجوع إلى كتاب أو صفحات أو حسابات متحققة؛ هذه الجلسة غير متصلة بفهرس الكتاب. عندما لا تعرف، صرّح بذلك.';

function messagesFor(question, history) {
  const recent = []; let remaining = 5000;
  for (const turn of history.slice(-10).reverse()) {
    if (!['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string') continue;
    // Preserve whole recent turns instead of cutting a previous answer in half.
    if (turn.content.length > remaining) break;
    recent.unshift({ role: turn.role, content: turn.content }); remaining -= turn.content.length;
  }
  return [{ role: 'system', content: instructions + '\nReturn the required JSON object, with text first. Put the complete student-facing answer in text. Select one meaningful gesture and emotion from the schema. Never include metadata, joint rotations or animation code in text.' }, ...recent, { role: 'user', content: question }];
}

async function* dataLines(body) {
  const reader = body.getReader(), decoder = new TextDecoder(); let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 128 * 1024) throw new Error('Qwen stream frame exceeds limit');
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trimEnd(); buffer = buffer.slice(end + 1);
        if (line.startsWith('data:')) yield line.slice(5).trimStart();
      }
      if (done) { if (buffer.startsWith('data:')) yield buffer.slice(5).trim(); return; }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

// Explicit direct-model mode: preserve the tutor v1 transport and ownership layer,
// while making no claim of textbook retrieval or symbolic verification.
export async function openQwenTutorStream({ question, history = [], signal, config, fetchImpl = globalThis.fetch }) {
  const tunnel = config?.localTunnel && ['127.0.0.1', '[::1]'].includes(new URL(config.url).hostname);
  if (!config?.key && !tunnel) throw new ApiError(503, 'AI_MISCONFIGURED', 'المعلم الذكي غير معد على الخادم.');
  const started = Date.now(); let response;
  try {
    response = await fetchImpl(`${config.url.replace(/\/+$/, '')}/v1/chat/completions`, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', ...(!tunnel && { Authorization: `Bearer ${config.key}` }) },
      body: JSON.stringify({ model: config.model || 'qwen3.5-9b', messages: messagesFor(question, history), response_format: tutorResponseFormat, stream: true, max_tokens: 640, temperature: .7, top_p: .8, ...(tunnel && { reasoning_effort:'none' }), chat_template_kwargs: { enable_thinking: false } }),
    });
  } catch (error) { if (signal?.aborted) throw error; throw unavailable(); }
  if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    await response.body?.cancel().catch(() => {}); throw unavailable();
  }
  return (async function* () {
    yield { type: 'meta', model: config.model || 'qwen3.5-9b' };
    let answer = '', finished = false, reason;
    const decoder = new TutorResponseDecoder();
    for await (const line of dataLines(response.body)) {
      if (line === '[DONE]') break;
      if (!line) continue;
      const data = JSON.parse(line);
      if (data.error) throw new Error('Qwen generation failed');
      const choice = data.choices?.[0];
      const text = choice?.delta?.content;
      if (typeof text === 'string' && text) {
        const visible = decoder.push(text);
        answer += visible;
        if (visible) yield { type: 'delta', text: visible };
      }
      if (choice?.finish_reason) { finished = true; reason = choice.finish_reason; }
    }
    if (!finished || !answer.trim()) throw new Error('Qwen stream incomplete');
    yield { type: 'done', answer, ...decoder.metadata(), found: false, refused: false, warnings: ['NO_BOOK_RETRIEVAL', ...(reason === 'length' ? ['OUTPUT_LIMIT'] : [])], checks: null, seconds: (Date.now() - started) / 1000 };
  })();
}
