import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGesture, GESTURES } from '../src/character-engine/gestureContract.js';
import { TutorIntegration } from '../src/character-engine/TutorIntegration.js';
import { applyStreamEvent } from '../src/pages/AITutor/chatState.js';
import { AnimationController } from '../src/character-engine/AnimationController.js';
import { loadCharacterFixture } from '../scripts/lib/load-character-fixture.mjs';
import { GESTURES as BACKEND_GESTURES } from '../backend/services/tutorGestures.js';
import { evaluateArmClearance } from '../src/character-engine/ArmConstraints.js';

test('strict gesture contract rejects code, unknown emotions and inherited keys', () => {
  assert.equal(GESTURES.length, 12);
  assert.deepEqual(GESTURES, BACKEND_GESTURES);
  assert.deepEqual(normalizeGesture({ gesture: 'constructor', emotion: 'evil' }), { gesture: 'EXPLAINING', emotion: 'neutral' });
  assert.equal(normalizeGesture({ gesture: 'ENCOURAGING', emotion: 'happy' }).gesture, 'ENCOURAGING');
});
test('all gesture selections run on the real rig, preserving safe targets and speech hand ownership', async () => {
  const avatar = await loadCharacterFixture('male'); const animation = new AnimationController(avatar.rig); let time = 0;
  const tick = seconds => { for (let i = 0; i < seconds * 60; i++) { avatar.rig.resetPose(); animation.update(1/60, time += 1/60); } };
  try {
    for (const gesture of GESTURES) {
      animation.setState('speaking'); animation.selectGesture(gesture); tick(3.2);
      for (const side of ['left','right']) assert.ok(evaluateArmClearance(avatar.rig, side).minNormalizedDistance >= .98, gesture + ' clearance');
      if (gesture === 'TALKING_LEFT') assert.equal(animation.getTeachingSnapshot().freeSide, 'left');
      if (gesture === 'TALKING_RIGHT') assert.equal(animation.getTeachingSnapshot().freeSide, 'right');
      if (gesture === 'CELEBRATING') assert.equal(animation.state, 'speaking');
    }
    animation.reducedMotion = true; animation.selectGesture('TALKING_LEFT'); tick(25);
    assert.equal(animation.getTeachingSnapshot().freeSide, 'left');
    animation.cancelGestures(); animation.setState('idle'); tick(2); assert.equal(animation.getTeachingSnapshot().phase, 'idle');
  } finally { animation.dispose(); avatar.dispose(); }
});
test('terminal metadata reaches speech without appearing in chat content', () => {
  const message = applyStreamEvent({ content: 'hello' }, { type: 'done', gesture: 'ENCOURAGING', emotion: 'happy' });
  assert.equal(message.content, 'hello'); assert.equal(message.gesture, 'ENCOURAGING');
});
test('selected gesture starts only on playback and listening interrupts stale audio', async () => {
  const gestures = [], states = []; let cancelled = 0;
  const animation = { setState: s => states.push(s), selectGesture: g => gestures.push(g), cancelGestures: () => cancelled++ };
  const audio = new EventTarget(); audio.currentTime = 0; audio.pause = () => {}; audio.play = async () => audio.dispatchEvent(new Event('playing'));
  const bridge = new TutorIntegration({ getControllers: () => ({ animation, face: { setSpeech() {} } }), synthesize: async () => new Blob(['wav']), createAudio: () => audio, createObjectURL: () => 'blob:test', revokeObjectURL() {} });
  await bridge.speak('hello', { gesture: 'ENCOURAGING' });
  assert.equal(gestures.at(-1), 'ENCOURAGING');
  bridge.setListening(true); assert.equal(states.at(-1), 'listening'); assert.ok(cancelled > 0);
  audio.dispatchEvent(new Event('playing')); bridge.update(); assert.equal(states.at(-1), 'listening');
  bridge.setListening(false); assert.equal(states.at(-1), 'idle'); bridge.dispose();
});
