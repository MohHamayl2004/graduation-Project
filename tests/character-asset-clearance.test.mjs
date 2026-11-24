import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadCharacterFixture } from '../scripts/lib/load-character-fixture.mjs';
import { AnimationController } from '../src/character-engine/AnimationController.js';
import { IKController } from '../src/character-engine/IKController.js';
import { createArmConstraints, getBodyFrame, enforceArmSafety } from '../src/character-engine/ArmConstraints.js';
import { alignWorldDirection, vector } from '../src/character-engine/motionMath.js';

// Independent integration check on the real assets, rather than testing the
// implementation's own collision predicate. A conservative inner torso capsule
// must remain clear even when an external pointing target is inside the chest.
for (const id of ['male', 'female']) test(`${id}: unsafe pointing cannot put a hand or forearm through the inner torso`, async () => {
  const avatar = await loadCharacterFixture(id), rig = avatar.rig;
  const animation = new AnimationController(rig), ik = new IKController(rig);
  const position = bone => bone.getWorldPosition(new THREE.Vector3());
  try {
    const originalPosition = rig.root.position.clone();
    for (const turn of [0, Math.PI / 2]) {
      rig.root.rotation.y = turn; rig.root.updateMatrixWorld(true);
      animation.setState('speaking');
      for (const side of ['left', 'right']) {
        rig.resetPose();
        const center = position(rig.bones.Chest);
        const width = position(rig.bones.LeftUpperArm).distanceTo(position(rig.bones.RightUpperArm));
        const radius = width * .23;
        const top = position(rig.bones.UpperChest).lerp(position(rig.bones.Neck), .2);
        const bottom = position(rig.bones.Hips).lerp(center, .15);
        ik.setHandTarget(side, center);
        for (let frame = 0; frame < 150; frame++) {
          rig.resetPose(); animation.update(1 / 60, frame / 60); ik.update(1 / 60);
        }
        const role = side === 'left' ? 'Left' : 'Right';
        const elbow = position(rig.bones[`${role}LowerArm`]), hand = position(rig.bones[`${role}Hand`]);
        const axis = new THREE.Line3(bottom, top);
        let closest = Infinity;
        for (let i = 0; i <= 16; i++) {
          const p = elbow.clone().lerp(hand, i / 16);
          closest = Math.min(closest, p.distanceTo(axis.closestPointToPoint(p, true, new THREE.Vector3())));
        }
        assert.ok(closest >= radius, `${id} ${side} rotation ${turn}: forearm clearance ${closest.toFixed(4)} < inner torso radius ${radius.toFixed(4)}`);
        ik.setHandTarget(side, null);
      }
      assert.ok(rig.root.position.distanceTo(originalPosition) < 1e-9, 'Teacher must not translate while gesturing');
    }
  } finally { animation.dispose(); ik.dispose(); avatar.dispose(); }
});

for (const id of ['male', 'female']) test(`${id}: speaking arms follow an avatar's rotated and scaled body frame`, async () => {
  const avatars = await Promise.all([loadCharacterFixture(id), loadCharacterFixture(id)]);
  const positions = [];
  try {
    for (const [index, avatar] of avatars.entries()) {
      if (index) { avatar.root.rotation.y = 1.2; avatar.root.scale.multiplyScalar(.8); avatar.root.position.add(new THREE.Vector3(.3, .1, -.2)); }
      avatar.root.updateMatrixWorld(true);
      const animation = new AnimationController(avatar.rig), ik = new IKController(avatar.rig);
      animation.setState('speaking');
      for (let frame = 0; frame < 360; frame++) { avatar.rig.resetPose(); animation.update(1 / 60, frame / 60); ik.update(1 / 60); }
      positions.push(['LeftHand', 'RightHand'].map(role => avatar.rig.bones[role].getWorldPosition(new THREE.Vector3())));
      animation.dispose(); ik.dispose();
    }
    const transform = avatars[1].root.matrixWorld.clone().multiply(avatars[0].root.matrixWorld.clone().invert());
    for (let i = 0; i < 2; i++) assert.ok(positions[0][i].applyMatrix4(transform).distanceTo(positions[1][i]) < .025, `${id} hand ${i}: animation depends on world axes rather than the avatar`);
  } finally { avatars.forEach(avatar => avatar.dispose()); }
});

for (const id of ['male', 'female']) test(`${id}: full idle and teaching cycles keep forearms outside the inner torso`, async () => {
  const avatar = await loadCharacterFixture(id), rig = avatar.rig;
  const animation = new AnimationController(rig), ik = new IKController(rig);
  const at = role => rig.bones[role].getWorldPosition(new THREE.Vector3());
  const rootPosition = rig.root.position.clone();
  try {
    for (const state of ['idle', 'listening', 'speaking', 'explaining', 'thinking']) {
      animation.setState(state);
      for (let frame = 0; frame < 720; frame++) {
        rig.resetPose(); animation.update(1 / 60, frame / 60); ik.update(1 / 60);
        const axis = new THREE.Line3(at('Hips').lerp(at('Chest'), .15), at('UpperChest').lerp(at('Neck'), .2));
        const radius = at('LeftUpperArm').distanceTo(at('RightUpperArm')) * .21;
        for (const side of ['Left', 'Right']) {
          const elbow = at(`${side}LowerArm`), hand = at(`${side}Hand`);
          for (let i = 0; i <= 8; i++) {
            const point = elbow.clone().lerp(hand, i / 8);
            assert.ok(point.distanceTo(axis.closestPointToPoint(point, true, new THREE.Vector3())) >= radius, `${id} ${state} ${side} frame ${frame}: forearm enters inner torso`);
          }
        }
        assert.ok(rig.root.position.distanceTo(rootPosition) < 1e-9);
      }
    }
  } finally { animation.dispose(); ik.dispose(); avatar.dispose(); }
});

for (const id of ['male', 'female']) test(`${id}: collision envelope includes the actual torso garment depth`, async () => {
  const avatar = await loadCharacterFixture(id), rig = avatar.rig, frame = getBodyFrame(rig);
  try {
    const torso = new Set(['Hips','Spine','Chest','UpperChest'].map(role => rig.bones[role]));
    let depth = 0;
    avatar.root.traverse(mesh => {
      if (!mesh.isSkinnedMesh) return;
      mesh.skeleton.update();
      const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
      for (let i = 0; i < position.count; i += 2) {
        let weight = 0;
        for (let j = 0; j < 4; j++) if (torso.has(mesh.skeleton.bones[skinIndex.getComponent(i,j)])) weight += skinWeight.getComponent(i,j);
        if (weight < .7) continue;
        const p = frame.toBody(mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
        if (Math.abs(p.y) <= frame.halfWidth * 1.4) depth = Math.max(depth, Math.abs(p.z));
      }
    });
    assert.ok(createArmConstraints(rig).torso.safeRadiusZ >= depth + frame.halfWidth * .025, `${id} collision proxy ignores garment depth ${depth}`);
  } finally { avatar.dispose(); }
});

for (const id of ['male','female']) test(`${id}: final clip safety also enforces the shoulder range`, async () => {
  const avatar = await loadCharacterFixture(id), rig = avatar.rig;
  try {
    const frame = getBodyFrame(rig), b = rig.bones;
    alignWorldDirection(b.LeftUpperArm, b.LeftLowerArm, frame.up);
    alignWorldDirection(b.LeftLowerArm, b.LeftHand, frame.forward.clone().addScaledVector(frame.up, .2));
    enforceArmSafety(rig, 'left');
    const direction = b.LeftLowerArm.getWorldPosition(new THREE.Vector3()).sub(b.LeftUpperArm.getWorldPosition(new THREE.Vector3())).normalize();
    assert.ok(direction.angleTo(getBodyFrame(rig).direction(vector(rig.calibration.armDirections.left)).normalize()) <= rig.calibration.armLimits.shoulder + .01, 'A clear but over-rotated authored shoulder must still be constrained');
  } finally { avatar.dispose(); }
});
