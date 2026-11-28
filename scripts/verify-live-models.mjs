// Read-only model smoke test: real Qwen answer -> real Fish WAV. Never prints keys.
import '../backend/config/env.js';
import { openTutorStream } from '../backend/services/aiTutorClient.js';
import { createFishSpeechService } from '../backend/services/fishSpeechService.js';
import { mkdirSync, writeFileSync } from 'node:fs';

const output = '.agents/check-output/live-tutor'; mkdirSync(output, { recursive: true });
try {
  const events = await openTutorStream({ question: 'احسب ٢ + ٣. أجب بالعربية بجملة قصيرة واحدة.', signal: AbortSignal.timeout(60000) });
  let answer, model;
  for await (const event of events) { if (event.type === 'meta') model = event.model; if (event.type === 'done') answer = event.answer; }
  if (!answer || !/[\u0600-\u06ff]/.test(answer)) throw Error('Qwen did not return Arabic text');
  const started = Date.now();
  const result = await createFishSpeechService()({ text: answer.slice(0, 2000) });
  if (result.audio.toString('ascii', 0, 4) !== 'RIFF') throw Error('Fish did not return a WAV');
  writeFileSync(`${output}/arabic.wav`, result.audio);
  const summary = { success: true, model, answer, audioBytes: result.audio.length, contentType: result.contentType, synthesisSeconds: (Date.now() - started) / 1000 };
  writeFileSync(`${output}/models-results.json`, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary));
} catch (error) { console.error(JSON.stringify({ success: false, code: error.code || error.name })); process.exitCode = 1; }
