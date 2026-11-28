import test from 'node:test';
import assert from 'node:assert/strict';
import { TutorIntegration } from '../src/character-engine/TutorIntegration.js';
import { FishSpeechClient } from '../src/character-engine/FishSpeechClient.js';

class AudioStub extends EventTarget {
  currentTime = 0; paused = true;
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  async play() { this.paused = false; this.dispatchEvent(new Event('playing')); }
}
function harness() {
  const calls = { speech: [], states: [] };
  const controllers = { animation: { setState: s => calls.states.push(s) }, face: { setSpeech: s => calls.speech.push(s) } };
  const bridge = new TutorIntegration({ getControllers: () => controllers });
  return { bridge, calls };
}

test('blocked autoplay can resume the same synthesized audio without a second model request', async () => {
  let requests = 0, attempts = 0; const statuses = [];
  const audio = new AudioStub();
  audio.play = async () => { if (++attempts === 1) throw new DOMException('Gesture required', 'NotAllowedError'); audio.paused = false; audio.dispatchEvent(new Event('playing')); };
  const bridge = new TutorIntegration({ synthesize: async () => { requests++; return new Blob(['wav']); }, createAudio: () => audio, createObjectURL: () => 'blob:test', revokeObjectURL() {}, onStatus: status => statuses.push(status) });
  await bridge.speak('مرحبا');
  assert.equal(statuses.at(-1), 'blocked'); assert.equal(bridge.playing, false);
  await bridge.resume(); assert.equal(bridge.playing, true); assert.equal(requests, 1);
  bridge.dispose();
});
test('text generation is thinking, and actual audio playback owns speaking state', async () => {
  const { bridge, calls } = harness(); bridge.setTutorState({ phase: 'streaming' });
  assert.equal(calls.states.at(-1), 'thinking');
  const audio = new AudioStub(); bridge.attachAudio(audio); await audio.play();
  assert.equal(calls.states.at(-1), 'speaking');
  audio.dispatchEvent(new Event('waiting')); assert.equal(calls.speech.at(-1).playing, false);
  await audio.play(); bridge.interrupt();
  assert.equal(audio.paused, true); assert.equal(calls.speech.at(-1).playing, false);
  assert.equal(calls.states.at(-1), 'idle'); bridge.dispose();
});
test('time-aligned cues follow media currentTime and reset after seeking outside a cue', async () => {
  const { bridge, calls } = harness(); const audio = new AudioStub();
  bridge.attachAudio(audio, { cues: [{ start: .5, end: 1, visemes: { visemeAA: .8 } }] });
  await audio.play(); audio.currentTime = .75; bridge.update();
  assert.equal(calls.speech.at(-1).visemes.visemeAA, .8);
  audio.currentTime = 1.5; bridge.update(); assert.equal(calls.speech.at(-1).visemes, null);
  bridge.dispose();
});
test('interrupted synthesis cannot create or play stale audio', async () => {
  let resolve; let created = 0;
  const { bridge } = harness(); bridge.synthesize = () => new Promise(r => { resolve = r; });
  bridge.createAudio = () => { created++; return new AudioStub(); };
  const pending = bridge.speak('hello'); bridge.interrupt(); resolve(new Blob(['wav'], { type: 'audio/wav' }));
  await pending; assert.equal(created, 0); bridge.dispose();
});
test('disposal detaches media listeners and closes mouth', async () => {
  const { bridge, calls } = harness(); const audio = new AudioStub(); bridge.attachAudio(audio); bridge.dispose();
  const n = calls.states.length; await audio.play(); assert.equal(calls.states.length, n);
  assert.equal(calls.speech.at(-1).playing, false);
});
test('stalled network fetching does not stop animation while buffered media keeps playing', async () => {
  const { bridge, calls } = harness(); const audio = new AudioStub(); bridge.attachAudio(audio); await audio.play();
  audio.dispatchEvent(new Event('stalled'));
  assert.equal(bridge.playing, true); assert.equal(calls.states.at(-1), 'speaking'); bridge.dispose();
});
test('interruption clears temporary IK and facial gaze targets', () => {
  let cleared = 0, gaze;
  const bridge = new TutorIntegration({ getControllers: () => ({ ik: { clearTargets: () => cleared++ }, face: { setSpeech() {}, setLookTarget: target => { gaze = target; } }, animation: { setState() {}, cancelGestures() {} } }) });
  bridge.interrupt(); assert.equal(cleared, 1); assert.equal(gaze, null); bridge.dispose();
});
test('Fish client sends only text and app authorization to configured backend', async () => {
  let request;
  const client = new FishSpeechClient({ fetchImpl: async (url, init) => { request = { url, ...init }; return new Response(new Blob(['audio'], { type: 'audio/wav' })); } });
  const blob = await client.synthesize('مرحبا', { token: 'user-token' });
  assert.equal(blob.type, 'audio/wav'); assert.deepEqual(JSON.parse(request.body), { text: 'مرحبا' });
  assert.equal(request.headers.Authorization, 'Bearer user-token');
});
test('Fish client rejects non-audio success responses instead of pretending speech works', async () => {
  const client = new FishSpeechClient({ fetchImpl: async () => new Response('{}', { headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(client.synthesize('hello'), /audio/i);
});

test('Fish metadata result preserves audio and does not invent viseme timing', async () => {
  const client = new FishSpeechClient({ fetchImpl: async () => new Response('wav', { headers: { 'Content-Type': 'audio/wav', 'X-TTS-Sync': 'audio-amplitude', 'X-TTS-Duration': '1.25' } }) });
  const result = await client.synthesizeSpeech('مرحبا');
  assert.ok(result.audio instanceof Blob); assert.deepEqual(result.timingData, []);
  assert.deepEqual(result.sync, { mode: 'audio-amplitude', durationSeconds: 1.25 });
});

test('structured synthesis carries timing and actual media clock to the face', async () => {
  const { bridge, calls } = harness(); const audio = new AudioStub(); const timingData = [{ start: .2, end: .4, visemes: { visemePP: 1 } }];
  bridge.synthesize = async () => ({ audio: new Blob(['wav']), timingData, sync: { mode: 'timed-visemes', durationSeconds: 1 } });
  bridge.createObjectURL = blob => { assert.ok(blob instanceof Blob); return 'blob:test'; }; bridge.revokeObjectURL = () => {}; bridge.createAudio = () => audio;
  await bridge.speak('مرحبا'); audio.currentTime = .3; bridge.update();
  assert.equal(calls.speech.at(-1).playbackTime, .3); assert.equal(calls.speech.at(-1).visemes.visemePP, 1);
  assert.equal(bridge.getSpeechSnapshot().mode, 'timed-visemes');
  audio.currentTime = .1; bridge.update(); assert.equal(calls.speech.at(-1).visemes, null);
  bridge.dispose(); assert.equal(bridge.getSpeechSnapshot().mode, 'idle');
});

test('a resume waiting for AudioContext cannot play a newer utterance after interruption', async () => {
  const { bridge } = harness(); const first = new AudioStub(), second = new AudioStub(); let release;
  bridge.ownedContext = { resume: () => new Promise(resolve => { release = resolve; }), close: async () => {} };
  bridge.attachAudio(first); const resume = bridge.resume(); bridge.interrupt(); bridge.attachAudio(second); release(); await resume;
  assert.equal(first.paused, true); assert.equal(second.paused, true); bridge.dispose();
});

test('playback end cancels speech gestures as well as mouth movement', async () => {
  let cancelled = 0; const { bridge, calls } = harness();
  const controls = bridge.getControllers(); controls.animation.cancelGestures = () => cancelled++;
  const audio = new AudioStub(); bridge.attachAudio(audio); await audio.play(); audio.dispatchEvent(new Event('ended'));
  assert.ok(cancelled > 0); assert.equal(calls.speech.at(-1).playing, false); assert.equal(calls.states.at(-1), 'idle'); bridge.dispose();
});

test('a cancelled resume cannot surface a stale playback error in a later conversation', async () => {
  const {bridge}=harness();const audio=new AudioStub();let rejectPlay;
  audio.play=()=>new Promise((_resolve,reject)=>{rejectPlay=reject;});
  bridge.attachAudio(audio);const pending=bridge.resume();
  await Promise.resolve();bridge.interrupt();rejectPlay(new DOMException('Playback was interrupted','AbortError'));
  await assert.doesNotReject(pending);bridge.dispose();
});

test('genuine playback failures still propagate instead of being hidden', async () => {
  const {bridge}=harness();const audio=new AudioStub();audio.play=async()=>{throw new DOMException('Invalid audio','NotSupportedError');};
  bridge.attachAudio(audio);await assert.rejects(bridge.resume(),error=>error.name==='NotSupportedError');bridge.dispose();
});

test('identical concurrent speech requests share synthesis rather than cancel and generate twice', async () => {
  const {bridge}=harness();let resolve,calls=0;
  bridge.synthesize=()=>{calls++;return new Promise(done=>{resolve=done;});};
  bridge.createAudio=()=>new AudioStub();bridge.createObjectURL=()=> 'blob:test';bridge.revokeObjectURL=()=>{};
  const first=bridge.speak('same answer',{token:'student'}),second=bridge.speak('same answer',{token:'student'});
  assert.equal(calls,1);resolve(new Blob(['wav']));await Promise.all([first,second]);bridge.dispose();
});

test('replaying the last answer uses one bounded clip, and changing identity clears that cache', async () => {
  const {bridge}=harness();let calls=0;
  bridge.synthesize=async()=>{calls++;return new Blob(['wav']);};
  bridge.createAudio=()=>new AudioStub();bridge.createObjectURL=()=> 'blob:test';bridge.revokeObjectURL=()=>{};
  const audio=await bridge.speak('same answer',{token:'student'});audio.dispatchEvent(new Event('ended'));
  await bridge.speak('same answer',{token:'student'});assert.equal(calls,1);
  bridge.clearSpeechCache();await bridge.speak('same answer',{token:'student'});assert.equal(calls,2);
  await bridge.speak('same answer',{token:'another-student'});assert.equal(calls,3);bridge.dispose();
});
