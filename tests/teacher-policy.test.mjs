import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SpeechAuthorization, isSpeechRequest, canTeacherNavigate } from '../src/companion/teacherPolicy.js';
import { dueCheckpoint, persistAssessmentResult } from '../src/companion/assessmentPlayback.js';
import { TutorIntegration } from '../src/character-engine/TutorIntegration.js';

const turn = (text, id = 'u1', status = 'streaming') => [
  { id, role: 'user', content: text },
  { id: `${id}-answer`, role: 'assistant', status, content: status === 'complete' ? 'answer' : '' },
];
test('Arabic and English explicit speech requests authorize; ordinary chat and navigation stay silent', () => {
  for (const text of ['يا معلم اشرح لي هذا السؤال', 'أستاذ فهمني هذا السؤال', 'نبراس وضح لي الفكرة', 'Teacher, explain this', 'ممكن تشرح الدرس؟']) {
    assert.equal(isSpeechRequest(text), true, text);
  }
  for (const text of ['اشرح لي السؤال', 'اِقْرَأْ السؤال', 'أعد الشرح', 'عيد الشرح', 'كرر الشرح', 'explain this question', 'please read aloud', 'Can you explain derivatives?', 'repeat explanation']) {
    assert.equal(isSpeechRequest(text), true, text);
    const gate = new SpeechAuthorization();
    assert.equal(gate.observe(turn(text)), null);
    assert.equal(gate.observe(turn(text, 'u1', 'complete'))?.content, 'answer');
    assert.equal(gate.observe(turn(text, 'u1', 'complete')), null);
  }
  for (const text of ['مرحبا', 'ما مشتقة س؟', 'افتح دروسي', 'open my lessons', 'لا تقرأ السؤال', 'do not explain', 'the teacher said repeat', 'quiz feedback']) {
    assert.equal(isSpeechRequest(text), false, text);
    const gate = new SpeechAuthorization();
    gate.observe(turn(text));
    assert.equal(gate.observe(turn(text, 'u1', 'complete')), null);
  }
});
test('opening history, cancellation and page changes cannot revive queued speech', () => {
  const gate = new SpeechAuthorization(turn('explain this', 'old', 'complete'));
  assert.equal(gate.observe(turn('explain this', 'old', 'complete')), null);
  const messages = turn('explain this', 'new');
  gate.observe(messages);
  gate.revoke(messages);
  gate.observe(messages);
  assert.equal(gate.observe(turn('explain this', 'new', 'complete')), null);
  gate.observe(turn('hello', 'next'));
  assert.equal(gate.observe(turn('hello', 'next', 'complete')), null);
  gate.observe(turn('repeat explanation', 'explicit'));
  assert.ok(gate.observe(turn('repeat explanation', 'explicit', 'complete')));
});
test('server assistant IDs can replace local IDs without losing explicit authorization', () => {
  const gate = new SpeechAuthorization();
  gate.observe(turn('read aloud'));
  const completed = turn('read aloud', 'u1', 'complete');
  completed[1].id = 'server-message';
  assert.equal(gate.observe(completed)?.id, 'server-message');
});
test('revocation during synthesis prevents stale audio creation and playback', async () => {
  let resolve, created = 0;
  const bridge = new TutorIntegration({ synthesize: () => new Promise(r => { resolve = r; }), createAudio: () => { created++; } });
  const task = bridge.speak('authorized answer');
  bridge.interrupt();
  resolve(new Blob(['audio']));
  await task;
  assert.equal(created, 0);
  bridge.dispose();
});
test('checkpoints are ordered, precise, seek safe and excluded after persisted answers or skips', () => {
  let plan = { revision: 'r1', questions: [{ id: 'later', at: 20 }, { id: 'first', at: 10 }], results: [] };
  assert.equal(dueCheckpoint(plan, 9.999), null);
  assert.equal(dueCheckpoint(plan, 10).id, 'first');
  assert.equal(dueCheckpoint(plan, 25).id, 'first');
  plan = persistAssessmentResult(plan, { questionId: 'first', status: 'skipped' });
  assert.equal(dueCheckpoint(plan, 25).id, 'later');
  plan = persistAssessmentResult(plan, { questionId: 'later', status: 'correct', feedback: 'saved' });
  assert.equal(dueCheckpoint(plan, 100), null);
  plan = persistAssessmentResult(plan, { questionId: 'later', status: 'correct', feedback: 'server' });
  assert.equal(plan.results.length, 2);
  assert.equal(plan.revision, 'r1');
  assert.equal(dueCheckpoint({ questions: [{ id: 'zero', at: 0 }], results: [] }, 0, 30).id, 'zero');
});
test('router and speech call sites enforce policy and overlay retains accessibility and API fields', async () => {
  assert.equal(canTeacherNavigate('/lectures?subject=math'), true);
  assert.equal(canTeacherNavigate('/lectures'), false);
  const [navigation, floating, player, hook, provider] = await Promise.all([
    'src/companion/useVoiceNavigation.js', 'src/companion/FloatingTeacher.jsx',
    'src/pages/Lectures/AssessmentPlayer.jsx', 'src/hooks/useTutorCharacter.js',
    'src/companion/TutorCompanionContext.jsx',
  ].map(p => readFile(new URL('../' + p, import.meta.url), 'utf8')));
  assert.doesNotMatch(navigation + floating, /navigate\((?:-1|"\/)/);
  assert.doesNotMatch(navigation, /speakText\(action.confirmation/);
  assert.doesNotMatch(player, /speakText\(data.result.feedback/);
  assert.match(hook, /!isSpeechRequest\(request\)/);
  assert.match(provider, /location.key, location.pathname, location.search/);
  assert.match(player, /modal.showModal\(\)/);
  assert.match(player, /data-voice-question=\{question.prompt\}/);
  assert.match(player, /requestVideoFrameCallback/);
  assert.match(player, /JSON.stringify\(\{ answer, skip, revision:plan.revision,/);
  assert.match(floating, /event.code === "AltRight"/);
});
