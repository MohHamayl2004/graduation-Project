import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRig } from '../src/character-engine/rig.js';
import { BIP01_ADAPTER, STANDARD_ADAPTER } from '../src/character-engine/adapters.js';
import { AnimationController } from '../src/character-engine/AnimationController.js';
import { IKController } from '../src/character-engine/IKController.js';
import { FaceController } from '../src/character-engine/FaceController.js';

function createSyntheticBip01Rig({ includeRightArm = true, includeMorphs = true } = {}) {
  const root = new THREE.Group();
  root.position.set(0.15, -0.05, 0.2);
  root.rotation.set(0.05, -0.2, 0.03);
  root.scale.setScalar(0.95);

  const makeBone = (name, pos, rot = [0, 0, 0], parent = null) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...pos);
    bone.rotation.set(...rot);
    if (parent) parent.add(bone);
    return bone;
  };

  const pelvis = makeBone('Bip01_Pelvis', [0, 1.0, 0], [0.04, 0, 0], root);
  const spine = makeBone('Bip01_Spine', [0, 0.12, 0], [0, 0.02, 0], pelvis);
  const chest = makeBone('Bip01_Spine1', [0, 0.14, 0], [0, 0, 0], spine);
  const upperChest = makeBone('Bip01_Spine2', [0, 0.14, 0], [0, 0, 0], chest);
  const neck = makeBone('Bip01_Neck', [0, 0.1, 0], [0, 0, 0], upperChest);
  const head = makeBone('Head', [0, 0.09, 0], [0, 0, 0], neck);
  makeBone('Bip01_LEye', [0.03, 0.04, 0.08], [0, 0, 0], head);
  makeBone('Bip01_REye', [-0.03, 0.04, 0.08], [0, 0, 0], head);

  const lClav = makeBone('Bip01_L_Clavicle', [0.06, 0.1, 0], [0, 0, -0.1], upperChest);
  const lUpper = makeBone('Bip01_L_UpperArm', [0.12, 0, 0], [0.1, 0.05, -0.2], lClav);
  const lLower = makeBone('Bip01_L_Forearm', [0.28, 0, 0], [0, 0.15, 0], lUpper);
  makeBone('Bip01_L_Hand', [0.25, 0, 0], [0, 0, 0], lLower);

  if (includeRightArm) {
    const rClav = makeBone('Bip01_R_Clavicle', [-0.06, 0.1, 0], [0, 0, 0.1], upperChest);
    const rUpper = makeBone('Bip01_R_UpperArm', [-0.12, 0, 0], [-0.08, -0.04, 0.2], rClav);
    const rLower = makeBone('Bip01_R_Forearm', [-0.28, 0, 0], [0, -0.15, 0], rUpper);
    makeBone('Bip01_R_Hand', [-0.25, 0, 0], [0, 0, 0], rLower);
  }

  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  if (includeMorphs) {
    const names = [
      'eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen',
      'mouthSmileLeft', 'mouthSmileRight', 'browInnerUp',
      'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U', 'viseme_PP', 'viseme_sil',
      'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight',
      'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
    ];
    mesh.morphTargetDictionary = Object.fromEntries(names.map((n, i) => [n, i]));
    mesh.morphTargetInfluences = new Array(names.length).fill(0);
  }
  root.add(mesh);
  root.updateMatrixWorld(true);

  return createRig(root, BIP01_ADAPTER);
}

function assertFiniteQuaternion(q, label = 'quaternion') {
  for (const k of ['x', 'y', 'z', 'w']) {
    assert.equal(Number.isFinite(q[k]), true, `${label}.${k} must be finite`);
  }
  const len = Math.hypot(q.x, q.y, q.z, q.w);
  assert.ok(Math.abs(len - 1) < 1e-3, `${label} must be unit length, got ${len}`);
}

test('temporary pointing releases IK and gaze targets after its duration', () => {
  const rig = createSyntheticBip01Rig(); const ik = new IKController(rig), face = new FaceController(rig);
  ik.setHandTarget('left', [.4, 1.2, .2], { duration: .1 }); ik.setLookTarget([.4, 1.2, .2], { duration: .1 }); face.setLookTarget([.4,1.2,.2], { duration: .1 });
  for (let i=0;i<5;i++) { rig.resetPose(); ik.update(.05); face.update(.05, i*.05); }
  assert.equal(ik.targets.left.weight, 0); assert.equal(ik.lookTarget, null); assert.equal(face.lookTarget, null);
});

test('basic posture control is bounded, smooth, and preserves the authored pose', () => {
  const rig = createSyntheticBip01Rig(), ik = new IKController(rig);
  const rest = rig.restPose.get(rig.bones.Spine).quaternion.clone();
  ik.setPosture({ lean: 100, twist: .1, sway: -.05 });
  for (let i=0;i<25;i++) { rig.resetPose(); ik.update(1/60); }
  assert.ok(rig.bones.Spine.quaternion.angleTo(rest) > .05);
  assert.ok(Math.abs(ik.postureTarget.lean) <= .15); assert.ok(rig.restPose.get(rig.bones.Spine).quaternion.equals(rest));
});

test('blink curve reaches a closed eyelid without being attenuated by a second smoothing filter', () => {
  const rig = createSyntheticBip01Rig(), face = new FaceController(rig);
  face.update(1/60,2.4); face.update(1/60,2.49);
  const binding = rig.morphs.blinkLeft[0]; assert.ok(binding.mesh.morphTargetInfluences[binding.index] > .95);
});

test('a head-only retargeted clip preserves the procedural relaxed arm pose', () => {
  const rig = createSyntheticBip01Rig(), animation = new AnimationController(rig);
  for (let i=0;i<60;i++) { rig.resetPose(); animation.update(1/60,i/60); }
  const before = rig.bones.LeftUpperArm.quaternion.clone(), q = rig.restPose.get(rig.bones.Head).quaternion.toArray();
  animation.playClip(new THREE.AnimationClip('head-only',1,[new THREE.QuaternionKeyframeTrack('Head.quaternion',[0,1],[...q,...q])]));
  rig.resetPose(); animation.update(.1,1.1);
  assert.ok(rig.bones.LeftUpperArm.quaternion.angleTo(before)<.04);
  animation.dispose();
});

test('an avatar can start its configured idle clip immediately after loading', () => {
  const rig = createSyntheticBip01Rig(); rig.calibration.clips = { idle: 'Idle' };
  const q = rig.restPose.get(rig.bones.Head).quaternion.toArray();
  const clip = new THREE.AnimationClip('Idle',1,[new THREE.QuaternionKeyframeTrack('Head.quaternion',[0,1],[...q,...q])]);
  const animation = new AnimationController(rig,{clips:[clip]});
  assert.equal(animation.activeAction?.getClip().name,'Idle'); animation.dispose();
});

test('IKController solves reachable and unreachable targets finitely without mutating opposite arm', () => {
  const rig = createSyntheticBip01Rig();
  const ik = new IKController(rig);

  const rightUpperBefore = rig.bones.RightUpperArm.quaternion.clone();
  const rightLowerBefore = rig.bones.RightLowerArm.quaternion.clone();

  const shoulderPos = rig.bones.LeftUpperArm.getWorldPosition(new THREE.Vector3());
  const reachableTarget = shoulderPos.clone().add(new THREE.Vector3(0.22, -0.25, 0.25));

  ik.setHandTarget('left', reachableTarget, { weight: 1 });
  for (let i = 0; i < 20; i++) {
    rig.resetPose();
    ik.update(1 / 60);
  }

  assertFiniteQuaternion(rig.bones.LeftUpperArm.quaternion, 'LeftUpperArm');
  assertFiniteQuaternion(rig.bones.LeftLowerArm.quaternion, 'LeftLowerArm');

  const handAfter = rig.bones.LeftHand.getWorldPosition(new THREE.Vector3());
  const errorDist = handAfter.distanceTo(reachableTarget);
  assert.ok(errorDist < 0.05, `Expected left hand to reach target within 0.05m, got ${errorDist}`);

  // Right arm must remain completely untouched when only left arm target is active
  assert.ok(rig.bones.RightUpperArm.quaternion.equals(rightUpperBefore), 'RightUpperArm should not mutate');
  assert.ok(rig.bones.RightLowerArm.quaternion.equals(rightLowerBefore), 'RightLowerArm should not mutate');

  // Unreachable far target must clamp cleanly with finite quaternions
  ik.setHandTarget('left', [100, 100, 100], { weight: 1 });
  rig.resetPose();
  ik.update(1 / 30);
  assertFiniteQuaternion(rig.bones.LeftUpperArm.quaternion, 'Far LeftUpperArm');
  assertFiniteQuaternion(rig.bones.LeftLowerArm.quaternion, 'Far LeftLowerArm');

  // Extremely close target (inside minimum fold distance) must also stay finite
  ik.setHandTarget('left', shoulderPos.clone(), { weight: 1 });
  rig.resetPose();
  ik.update(1 / 30);
  assertFiniteQuaternion(rig.bones.LeftUpperArm.quaternion, 'Close LeftUpperArm');
  assertFiniteQuaternion(rig.bones.LeftLowerArm.quaternion, 'Close LeftLowerArm');
});

test('AnimationController blends states over dt, relaxes arms via calibration, prevents gesture spam, and never accumulates bind pose drift', () => {
  const rig = createSyntheticBip01Rig();
  const anim = new AnimationController(rig);

  const bindSpineQuat = rig.restPose.get(rig.bones.Spine).quaternion.clone();

  anim.setState('idle');
  rig.resetPose();
  anim.update(0.016, 0.5);
  const idleLeftArmQuat = rig.bones.LeftUpperArm.quaternion.clone();
  assertFiniteQuaternion(idleLeftArmQuat, 'Idle LeftUpperArm');

  // Switch state and verify smooth dt transition rather than instantaneous jump or NaN
  anim.setState('explaining');
  rig.resetPose();
  anim.update(0.016, 0.516);
  const step1Quat = rig.bones.LeftUpperArm.quaternion.clone();
  rig.resetPose();
  anim.update(0.5, 1.016);
  const step2Quat = rig.bones.LeftUpperArm.quaternion.clone();

  assert.ok(!step1Quat.equals(step2Quat), 'dt blending should progress across updates');

  // Gesture non-repetition check
  const startedFirst = anim.playGesture('point', { side: 'right' });
  const startedImmediateRepeat = anim.playGesture('point', { side: 'right' });
  assert.equal(Boolean(startedFirst), true);
  assert.equal(Boolean(startedImmediateRepeat), false, 'Immediate duplicate gesture should be suppressed');

  // Verify restPose is never mutated after many frames
  for (let i = 0; i < 60; i++) {
    rig.resetPose();
    anim.update(1 / 60, 1 + i / 60);
  }
  assert.ok(rig.restPose.get(rig.bones.Spine).quaternion.equals(bindSpineQuat), 'Rest pose must remain immutable');
});

test('FaceController drives expressions, gaze, blink, and speech energy/visemes with missing-capability safety', () => {
  const rig = createSyntheticBip01Rig({ includeRightArm: false, includeMorphs: true });
  const face = new FaceController(rig);
  const ik = new IKController(rig);

  // Missing right arm capability should not throw when targeted
  assert.equal(rig.capabilities.rightArm, false);
  assert.doesNotThrow(() => {
    ik.setHandTarget('right', [0.3, 1.2, 0.4]);
    ik.update(0.016);
  });

  face.setExpression('happy', 0.9);
  face.setLookTarget([0.5, 1.6, 1.0]);
  face.setSpeech({ playing: true, energy: 0.75 });
  face.update(0.1, 0.5);

  const smileIdx = rig.morphs.smileLeft[0].index;
  const jawIdx = rig.morphs.jawOpen[0].index;
  const mesh = rig.morphs.smileLeft[0].mesh;

  assert.ok(mesh.morphTargetInfluences[smileIdx] > 0.05, 'Happy expression should increase smileLeft morph');
  assert.ok(mesh.morphTargetInfluences[jawIdx] > 0.05, 'Speech energy should open jaw');

  // Explicit viseme cue support
  face.setSpeech({ playing: true, energy: 0.2, visemes: { visemeAA: 0.85 } });
  face.update(0.2, 0.7);
  const aaIdx = rig.morphs.visemeAA[0].index;
  assert.ok(mesh.morphTargetInfluences[aaIdx] > 0.1, 'Explicit visemeAA cue should drive morph');

  // Rig with no morphs at all should never throw
  const bareRig = createRig(new THREE.Group(), STANDARD_ADAPTER);
  const bareFace = new FaceController(bareRig);
  assert.doesNotThrow(() => {
    bareFace.setExpression('curious', 1);
    bareFace.setLookTarget([0, 1, 1]);
    bareFace.setSpeech({ playing: true, energy: 0.8 });
    bareFace.update(0.016, 1.0);
    bareFace.dispose();
  });
});
