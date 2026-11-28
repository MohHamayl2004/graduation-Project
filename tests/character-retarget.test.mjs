import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRig } from '../src/character-engine/rig.js';
import { STANDARD_ADAPTER } from '../src/character-engine/adapters.js';
import { retargetAnimationClip } from '../src/character-engine/retarget.js';

test('quaternion clips retarget semantic joints with different names and rest axes', () => {
  const source = new THREE.Group(), sourceHead = new THREE.Bone(); sourceHead.name = 'Head'; sourceHead.rotation.x = .2; source.add(sourceHead);
  const target = new THREE.Group(), parent = new THREE.Bone(), targetHead = new THREE.Bone(); parent.rotation.y = .7; targetHead.name = 'teacher_head'; targetHead.rotation.z = .3; parent.add(targetHead); target.add(parent);
  const a = createRig(source), b = createRig(target, { ...STANDARD_ADAPTER, bones: { Head: ['teacher_head'] } });
  const sourceRest = sourceHead.quaternion.clone(), turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), .25);
  const clip = new THREE.AnimationClip('nod', 1, [new THREE.QuaternionKeyframeTrack('Head.quaternion', [0, 1], [...sourceRest.toArray(), ...sourceRest.clone().multiply(turn).toArray()])]);
  const result = retargetAnimationClip(clip, a, b); assert.equal(result.clip.tracks[0].name, 'teacher_head.quaternion');
  const values = result.clip.tracks[0].values;
  assert.ok(new THREE.Quaternion().fromArray(values, 0).angleTo(b.restPose.get(targetHead).quaternion) < 1e-6);
  const worldDelta = a.restPose.get(sourceHead).worldQuaternion.clone().multiply(turn).multiply(a.restPose.get(sourceHead).worldQuaternion.clone().invert());
  const expected = b.restPose.get(targetHead).parentWorldQuaternion.clone().invert().multiply(worldDelta).multiply(b.restPose.get(targetHead).worldQuaternion);
  assert.ok(new THREE.Quaternion().fromArray(values, 4).angleTo(expected) < 1e-6);
});
test('unsupported tracks are reported instead of changing proportions or unmapped bones', () => {
  const a = createRig(new THREE.Group()), b = createRig(new THREE.Group());
  const clip = new THREE.AnimationClip('walk', 1, [new THREE.VectorKeyframeTrack('Hips.position', [0,1], [0,0,0,1,0,0])]);
  const result = retargetAnimationClip(clip, a, b); assert.equal(result.clip.tracks.length, 0); assert.equal(result.warnings.length, 1);
});
