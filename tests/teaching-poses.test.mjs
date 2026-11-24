import test from 'node:test';
import assert from 'node:assert/strict';
import { greetingEnvelope, greetingWave, gestureTarget } from '../src/character-engine/TeachingPoses.js';
const landmarks = { shoulder: [-.2,1.34,0], head: [0,1.5,0], hips: [0,.85,0], armLength: .52, halfWidth: .2 };
test('welcome has a one-shot 1.25 second wave interval and a smooth rise/return', () => {
  assert.equal(greetingEnvelope(0),0); assert.equal(greetingEnvelope(.8),1); assert.equal(greetingEnvelope(2.05),1); assert.equal(greetingEnvelope(2.9),0); assert.equal(greetingEnvelope(99),0);
  assert.ok(greetingEnvelope(.4) > 0 && greetingEnvelope(.4) < 1);
  assert.ok(Math.abs(greetingEnvelope(.799)-greetingEnvelope(.8)) < .001);
});
test('pose targets are finite, body-relative, restrained and do not mutate landmarks', () => {
  const original=JSON.stringify(landmarks);
  for(const pose of ['pocket','explain','point','encourage'])for(const side of ['left','right'])assert.ok(gestureTarget(pose,side,landmarks,1).every(Number.isFinite));
  const welcome=gestureTarget('greeting','right',landmarks);
  assert.ok(welcome[0]<-.28 && welcome[1]<1.5 && welcome[2]>.15);
  assert.equal(gestureTarget('salute','left',landmarks),null);
  assert.equal(gestureTarget('unknown','right',landmarks),null); assert.equal(JSON.stringify(landmarks),original);
  assert.deepEqual(gestureTarget('explain','right',landmarks,1,true),gestureTarget('explain','right',landmarks,2,true));
});
test('welcome wrist wave makes exactly two eased cycles, with no motion outside its interval', () => {
  assert.equal(greetingWave(.8),0); assert.ok(Math.abs(greetingWave(2.05))<1e-9);
  assert.equal(greetingWave(1.2,true),0);
  const values=Array.from({length:126},(_,i)=>greetingWave(.8+i*.01));
  const signs=values.filter(v=>Math.abs(v)>1e-5).map(Math.sign);
  assert.equal(signs.filter((s,i)=>i&&s!==signs[i-1]).length,3);
  assert.ok(Math.max(...values.map(Math.abs))<=.18);
});
