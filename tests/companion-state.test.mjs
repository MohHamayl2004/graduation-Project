import test from 'node:test';
import assert from 'node:assert/strict';
import {clampPosition,readSettings,isPushToTalk,dragMoved,canStartDrag} from '../src/companion/companionState.js';
test('corrupt local storage and offscreen positions recover safely',()=>{
 assert.equal(readSettings('{broken').mode,'floating');assert.equal(readSettings('{"size":9999}').size,320);
 assert.deepEqual(clampPosition({x:-500,y:900},{width:390,height:700},{width:200,height:300}),{x:8,y:392});
});
test('primary-button dragging uses a threshold and preserves right-click and AltGr',()=>{
 assert.equal(canStartDrag({pointerType:'mouse',button:0}),true);
 assert.equal(canStartDrag({pointerType:'mouse',button:2}),false);
 assert.equal(canStartDrag({pointerType:'touch',button:0}),true);
 assert.equal(dragMoved({x:0,y:0},{x:3,y:3}),false);assert.equal(dragMoved({x:0,y:0},{x:8,y:0}),true);
 assert.equal(isPushToTalk({code:'AltRight',ctrlKey:true}),false);assert.equal(isPushToTalk({code:'AltRight',ctrlKey:false}),true);
});
