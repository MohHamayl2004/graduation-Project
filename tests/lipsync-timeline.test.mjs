import test from 'node:test';
import assert from 'node:assert/strict';
import { LipSyncController } from '../src/character-engine/LipSyncController.js';

test('genuine cue intervals follow media time, gaps and backward seeks', () => {
  const lips = new LipSyncController({ supportedRoles: ['visemePP', 'visemeAA', 'jawOpen'] });
  lips.setTimingData([{ start: .4, end: .6, visemes: { visemeAA: .8 } }, { start: .1, end: .2, visemes: { visemePP: 1 } }]);
  assert.equal(lips.update({ playing: true, playbackTime: .5 }).weights.visemeAA, .8);
  assert.equal(lips.update({ playing: true, playbackTime: .15 }).weights.visemePP, 1);
  const gap = lips.update({ playing: true, playbackTime: .3, energy: 1 });
  assert.equal(gap.mode, 'timed-visemes'); assert.ok(Object.values(gap.weights).every(value => value === 0));
});
test('without timing only measured energy drives supported fallback mouth shape', () => {
  const lips = new LipSyncController({ supportedRoles: ['visemeAA', 'blinkLeft'] });
  assert.deepEqual(lips.update({ playing: true, playbackTime: 999, energy: .5 }), { mode: 'audio-amplitude', weights: { visemeAA: .4 } });
  assert.equal(lips.update({ playing: false, energy: 1 }).weights.visemeAA, 0);
  assert.equal(new LipSyncController().update({ playing: true, energy: 1 }).mode, 'unavailable');
});
test('malformed timings and unsupported/nonfinite weights cannot affect facial controls', () => {
  const lips = new LipSyncController({ supportedRoles: ['jawOpen', 'visemePP'] });
  lips.setTimingData([null, { start: -1, end: 1 }, { start: 1, end: 0 }, { start: 0, end: 1, visemes: { visemePP: 2, jawOpen: NaN, blinkLeft: 1 } }]);
  assert.deepEqual(lips.update({ playing: true, playbackTime: .5 }).weights, { jawOpen: 0, visemePP: 1 });
  lips.stop(); assert.equal(lips.getDiagnostics().mode, 'idle');
});
