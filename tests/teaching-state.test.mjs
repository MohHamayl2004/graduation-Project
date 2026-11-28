import test from 'node:test';
import assert from 'node:assert/strict';
import { TeachingGestureState } from '../src/character-engine/TeachingGestureState.js';
const advance = (state, seconds, options) => { for(let i=0;i<Math.ceil(seconds*60);i++)state.update(1/60,options); };
test('welcome greeting is one-shot, terminates, and can be explicitly replayed by developer controls', () => {
  const state=new TeachingGestureState(); assert.equal(state.greet(),true); assert.equal(state.greet(),false);
  advance(state,3.2); assert.equal(state.getSnapshot().greetingElapsed,null);
  advance(state,40); assert.equal(state.getSnapshot().greetingElapsed,null); assert.equal(state.greet(),false); assert.equal(state.greet({force:true}),true);
});
test('pocket switching releases both arms to neutral before acquiring the other side', () => {
  const state=new TeachingGestureState();state.setPocket('left');advance(state,2.2);assert.equal(state.getSnapshot().restingSide,'left');
  state.switchHands();advance(state,1);const neutral=state.getSnapshot();assert.ok(neutral.pocketWeights.left<.001&&neutral.pocketWeights.right<.001);
  advance(state,1.3);assert.equal(state.getSnapshot().restingSide,'right');assert.ok(state.getSnapshot().pocketWeights.right>.99);
});
test('automatic speaking switches are infrequent, reduced motion disables them, and idle cancels ownership', () => {
  const state=new TeachingGestureState();state.setSpeaking(true);advance(state,10);assert.equal(state.getSnapshot().restingSide,'left');
  advance(state,30,{reducedMotion:true});assert.equal(state.getSnapshot().restingSide,'left');
  state.returnToIdle();advance(state,2);assert.equal(state.getSnapshot().restingSide,null);assert.ok(Object.values(state.getSnapshot().pocketWeights).every(v=>v<.001));
});
