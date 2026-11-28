import * as THREE from 'three';
import { alignWorldDirection } from './motionMath.js';
import { getBodyFrame } from './ArmConstraints.js';
import { greetingWave } from './TeachingPoses.js';

const position = node => node.getWorldPosition(new THREE.Vector3());
const childBone = node => node.children.find(child => child.isBone);
function rotateAroundWorldAxis(bone, axis, angle) {
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
  bone.quaternion.copy((bone.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion()).invert().multiply(world)).normalize();
  bone.updateWorldMatrix(false, true);
}

export class HandPoseController {
  constructor(rig) { this.rig = rig; }
  update({ greetingWeight = 0, greetingElapsed = 0, reducedMotion = false, pointingSide = null, freeSide = null, phase = 'idle', gestureName = null } = {}) {
    const rig = this.rig; if (!rig) return;
    for (const side of ['left', 'right']) {
      if (rig.handOverrides?.has(side)) continue;
      const hand = rig.hands?.[side], role = side === 'left' ? 'Left' : 'Right';
      if (!hand || hand.fingers.length < 3) continue;
      const weight = side === 'right' ? greetingWeight : 0;
      const open = (side === freeSide && phase.startsWith('talking_')) || (gestureName === 'explain' && (!freeSide || freeSide === side)) || (gestureName === 'encourage' && (!freeSide || freeSide === side));
      if (weight < .001 && pointingSide !== side && !open) continue;
      const wrist = rig.bones[`${role}Hand`], forearm = rig.bones[`${role}LowerArm`];
      const roots = hand.fingers, direction = new THREE.Vector3();
      for (const root of roots) { const child = childBone(root); if (child) direction.add(position(child).sub(position(root)).normalize()); }
      if (direction.lengthSq() < 1e-8) continue;
      direction.normalize();
      if (weight > .001 && wrist) {
        const frame = getBodyFrame(rig), original = wrist.quaternion.clone();
        // Supinate the forearm before bending the wrist. On these right-hand
        // rigs across(index→little) × fingers is the palm-facing normal.
        if (forearm) {
          const axis=position(wrist).sub(position(forearm)).normalize();
          const across=position(roots[0]).sub(position(roots.at(-1))).normalize();
          const normal=new THREE.Vector3().crossVectors(across,direction).normalize();
          const desired=frame.forward.clone();
          normal.addScaledVector(axis,-normal.dot(axis));desired.addScaledVector(axis,-desired.dot(axis));
          if(normal.lengthSq()>1e-8&&desired.lengthSq()>1e-8){
            normal.normalize();desired.normalize();
            const angle=Math.atan2(axis.dot(new THREE.Vector3().crossVectors(normal,desired)),normal.dot(desired));
            const roll=THREE.MathUtils.clamp(angle,-1.4,1.4)*weight;
            rotateAroundWorldAxis(forearm,axis,roll);direction.applyAxisAngle(axis,roll);
          }
        }
        const up = frame.up.clone().addScaledVector(frame.left, -.1).normalize();
        const turn = new THREE.Quaternion().setFromUnitVectors(direction, up);
        const axis = new THREE.Vector3(turn.x, turn.y, turn.z);
        if (axis.lengthSq() > 1e-8) rotateAroundWorldAxis(wrist, axis.normalize(), 2 * Math.acos(THREE.MathUtils.clamp(turn.w, -1, 1)));
        const across = position(roots[0]).sub(position(roots.at(-1))).normalize();
        const normal = new THREE.Vector3().crossVectors(across, up).normalize();
        const desired = frame.forward.clone().addScaledVector(up, -frame.forward.dot(up)).normalize();
        const twist = Math.atan2(up.dot(new THREE.Vector3().crossVectors(normal, desired)), normal.dot(desired));
        rotateAroundWorldAxis(wrist, up, twist);
        // Reserve wrist range for the wave instead of twisting the entire
        // welcome through the wrist. The arm solver's limit is .5 radians.
        const angle=original.angleTo(wrist.quaternion);
        if(angle>.32)wrist.quaternion.slerpQuaternions(original,wrist.quaternion.clone(),.32/angle);
        wrist.updateWorldMatrix(false,true);
        rotateAroundWorldAxis(wrist, frame.forward, greetingWave(greetingElapsed, reducedMotion));
        wrist.quaternion.slerpQuaternions(original, wrist.quaternion.clone(), weight);
        wrist.updateWorldMatrix(false, true);
        // Relaxed open fingers: preserve their natural small fan instead of
        // pressing all four together as in the previous military salute.
        const fingerUp = frame.up.clone().applyAxisAngle(frame.forward, greetingWave(greetingElapsed, reducedMotion) - .1);
        for (const [index, root] of roots.entries()) {
          const target = fingerUp.clone().addScaledVector(frame.left, (1.5-index)*.035).normalize();
          let node = root;
          for (let depth=0;depth<3;depth++) { const child=childBone(node); if(!child)break; alignWorldDirection(node,child,target,weight*.85); node=child; }
        }
        if (hand.thumb) {
          const child=childBone(hand.thumb);
          if(child)alignWorldDirection(hand.thumb,child,fingerUp.clone().multiplyScalar(.5).addScaledVector(frame.left,.75).normalize(),weight*.6);
        }
        continue;
      }
      if ((weight > .001 || open) && forearm && wrist) {
        const across = position(roots[0]).sub(position(roots.at(-1))).normalize();
        const normal = new THREE.Vector3().crossVectors(direction, across).normalize();
        const axis = position(wrist).sub(position(forearm)).normalize(), desired = weight > .001 ? getBodyFrame(rig).forward : getBodyFrame(rig).up;
        normal.addScaledVector(axis, -normal.dot(axis)); desired.addScaledVector(axis, -desired.dot(axis));
        if (normal.lengthSq() > 1e-8 && desired.lengthSq() > 1e-8) {
          normal.normalize(); desired.normalize();
          const angle = Math.atan2(axis.dot(new THREE.Vector3().crossVectors(normal, desired)), normal.dot(desired));
          const rotation = THREE.MathUtils.clamp(angle, -1.1, 1.1) * (weight > .001 ? weight : .45);
          rotateAroundWorldAxis(forearm, axis, rotation); direction.applyAxisAngle(axis, rotation);
        }
      }
      for (const [index, root] of roots.entries()) {
        let node = root;
        for (let depth = 0; depth < 3; depth++) {
          const child = childBone(node); if (!child) break;
          if (weight > .001 || index === 0 || open) alignWorldDirection(node, child, direction, weight > .001 ? weight : open ? .45 : .8);
          node = child;
        }
      }
      if (weight > .001 && hand.thumb) {
        const child = childBone(hand.thumb);
        if (child) {
          const towardIndex = position(roots[0]).sub(position(hand.thumb)).addScaledVector(direction, position(child).distanceTo(position(hand.thumb)));
          alignWorldDirection(hand.thumb, child, towardIndex, weight * .7);
        }
      }
    }
    rig.root.updateMatrixWorld(true);
  }
  getDiagnostics() { return Object.fromEntries(['left','right'].map(side => [side, (this.rig?.hands?.[side]?.fingers.length || 0) >= 3])); }
  dispose() { this.rig = null; }
}
