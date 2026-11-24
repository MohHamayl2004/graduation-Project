import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadCharacterFixture } from '../scripts/lib/load-character-fixture.mjs';
import { AnimationController } from '../src/character-engine/AnimationController.js';
import { IKController } from '../src/character-engine/IKController.js';
import { HandPoseController } from '../src/character-engine/HandPoseController.js';
import { evaluateArmClearance } from '../src/character-engine/ArmConstraints.js';

for(const id of ['male','female'])test(`${id}: friendly welcome, near-pocket ownership and switching remain safe on the actual rig`,async()=>{
  const avatar=await loadCharacterFixture(id),rig=avatar.rig,animation=new AnimationController(rig),ik=new IKController(rig),hands=new HandPoseController(rig);
  const root=rig.root.position.clone();let time=0;
  const tick=()=>{
    rig.resetPose();time+=1/60;animation.update(1/60,time);ik.update(1/60);hands.update(animation.getTeachingSnapshot());
    if(animation.getTeachingSnapshot().greetingWeight>.001){
      const clearance=evaluateArmClearance(rig,'right');
      assert.ok(clearance.minNormalizedDistance>=.98,'Entire greeting arc must clear the body');
      assert.ok(clearance.wristDeviation<=.501,'Wrist must stay inside the existing half-radian joint limit');
    }
  };
  try{
    assert.equal(animation.greet(),true);
    for(let i=0;i<120;i++)tick();
    assert.equal(animation.getTeachingSnapshot().greetingWeight,1);
    const wrist=rig.bones.RightHand.getWorldPosition(new THREE.Vector3()),head=rig.bones.Head.getWorldPosition(new THREE.Vector3());
    assert.ok(wrist.x<head.x-.22,'Welcome hand must remain beside the face');
    assert.ok(wrist.y<head.y+.03 && wrist.y>head.y-.14,'Wrist stays below forehead level');
    const directions=rig.hands.right.fingers.map(root=>root.children[0].getWorldPosition(new THREE.Vector3()).sub(root.getWorldPosition(new THREE.Vector3())).normalize());
    assert.ok(directions.every(d=>d.y>.7),'Open welcome fingers must point upward');
    const roots=rig.hands.right.fingers;
    const across=roots[0].getWorldPosition(new THREE.Vector3()).sub(roots.at(-1).getWorldPosition(new THREE.Vector3())).normalize();
    assert.ok(new THREE.Vector3().crossVectors(across,directions[1]).normalize().z>.7,'Open palm must face the student camera');
    for(let i=0;i<100;i++)tick();assert.equal(animation.getTeachingSnapshot().greetingWeight,0);assert.equal(animation.greet(),false);
    animation.setState('talking_right_hand');for(let i=0;i<180;i++)tick();
    assert.equal(animation.getTeachingSnapshot().restingSide,'left');assert.equal(animation.getTeachingSnapshot().pocketInsertionSupported,false);
    animation.switchHands();for(let i=0;i<70;i++)tick();
    assert.ok(Object.values(animation.getTeachingSnapshot().pocketWeights).every(v=>v<.03),'Switch should pass through neutral');
    for(let i=0;i<100;i++)tick();assert.equal(animation.getTeachingSnapshot().restingSide,'right');
    for(const side of ['left','right'])assert.ok(evaluateArmClearance(rig,side).minNormalizedDistance>=.98);
    assert.ok(rig.root.position.distanceTo(root)<1e-9);
    animation.setState('idle');animation.cancelGestures();for(let i=0;i<120;i++)tick();assert.equal(animation.getTeachingSnapshot().phase,'idle');
  }finally{hands.dispose();ik.dispose();animation.dispose();avatar.dispose();}
});

test('pointing selects the free arm and encouraging is a finite teaching gesture',async()=>{
  const avatar=await loadCharacterFixture('male'),animation=new AnimationController(avatar.rig),ik=new IKController(avatar.rig);let time=0;
  const advance=seconds=>{for(let i=0;i<seconds*60;i++){avatar.rig.resetPose();animation.update(1/60,time+=1/60);ik.update(1/60);}};
  try{
    animation.setState('talking_left_hand');advance(3);animation.setState('pointing');advance(.2);
    assert.equal(animation.getTeachingSnapshot().pointingSide,'left');
    animation.setState('idle');animation.setState('encouraging');assert.equal(animation.gesture?.name,'encourage');advance(3);assert.equal(animation.state,'idle');
    animation.setState('explaining');animation.playGesture('point',{side:'right'});advance(.9);
    assert.ok(avatar.rig.bones.RightHand.getWorldPosition(new THREE.Vector3()).y>1.1,'Explicit point must not be swallowed by initial pocket transition');
  }finally{ik.dispose();animation.dispose();avatar.dispose();}
});

test('explicit gestures finish under a frozen reduced-motion render clock',async()=>{
  const avatar=await loadCharacterFixture('male'),animation=new AnimationController(avatar.rig);
  try{
    animation.reducedMotion=true;animation.setState('encouraging');
    for(let i=0;i<300;i++){avatar.rig.resetPose();animation.update(1/60,0);}
    assert.equal(animation.state,'idle');assert.equal(animation.gesture,null);
    assert.equal(animation.playGesture('point'),true);
  }finally{animation.dispose();avatar.dispose();}
});
