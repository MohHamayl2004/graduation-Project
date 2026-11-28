import * as THREE from 'three';
import { damping, rotateInFrame, vector } from './motionMath.js';
import { getBodyFrame, solveSafeArm, enforceArmSafety } from './ArmConstraints.js';

export class IKController {
  constructor(rig) {
    this.rig = rig; this.targets = {}; this.headTarget = { yaw: 0, pitch: 0, roll: 0 }; this.head = { ...this.headTarget };
    this.postureTarget = { lean: 0, twist: 0, sway: 0 }; this.posture = { ...this.postureTarget };
  }
  setHandTarget(side, position, { weight = 1, pole, duration = Infinity } = {}) {
    if (!['left', 'right'].includes(side)) return false;
    const role = side === 'left' ? 'Left' : 'Right';
    if (!this.rig.capabilities[`${side}Arm`]) return false;
    const target = position == null ? null : vector(position);
    if (position != null && !target) return false;
    const previous = this.targets[side];
    this.targets[side] = {
      position: target, current: previous?.current || this.rig.bones[`${role}Hand`].getWorldPosition(new THREE.Vector3()),
      currentWeight: previous?.currentWeight || 0, weight: target ? THREE.MathUtils.clamp(Number(weight) || 0, 0, 1) : 0,
      pole: pole ? vector(pole) : null,
      remaining: Number.isFinite(duration) ? Math.max(0, duration) : Infinity,
    };
    return true;
  }
  setHeadRotation({ yaw = 0, pitch = 0, roll = 0 } = {}) {
    const limits = this.rig.calibration.headLimits;
    this.headTarget = Object.fromEntries(Object.entries({ yaw, pitch, roll }).map(([name, angle]) => [name, THREE.MathUtils.clamp(Number(angle) || 0, -(limits[name] || .3), limits[name] || .3)]));
    this.lookTarget = null;
  }
  setLookTarget(position, { duration = Infinity } = {}) { this.lookTarget = position == null ? null : vector(position); this.lookRemaining = duration; }
  setPosture({ lean = 0, twist = 0, sway = 0 } = {}) {
    const limits = this.rig.calibration.postureLimits;
    for (const [key, angle] of Object.entries({ lean, twist, sway })) this.postureTarget[key] = THREE.MathUtils.clamp(Number(angle) || 0, -limits[key], limits[key]);
  }
  clearTargets() { for (const side of ['left', 'right']) this.setHandTarget(side, null); this.setHeadRotation({}); }
  update(delta) {
    const alpha = damping(14, delta);
    if (this.rig.capabilities.body) {
      for (const key of ['lean', 'twist', 'sway']) this.posture[key] += (this.postureTarget[key] - this.posture[key]) * alpha;
      rotateInFrame(this.rig.bones.Spine, getBodyFrame(this.rig).quaternion, this.posture.lean, this.posture.twist, this.posture.sway);
    }
    for (const side of ['left', 'right']) {
      const control = this.targets[side]; if (!control) continue;
      control.remaining -= Math.max(0, delta || 0);
      if (control.remaining <= 0) { control.weight = 0; control.position = null; }
      control.currentWeight += (control.weight - control.currentWeight) * alpha;
      if (control.currentWeight < .0001) continue;
      if (control.position) control.current.lerp(control.position, alpha);
      solveSafeArm(this.rig, side, control.current, { weight: control.currentWeight, pole: control.pole });
    }
    for (const side of ['left', 'right']) enforceArmSafety(this.rig, side);
    if (this.rig.capabilities.head) {
      if (this.lookTarget && Number.isFinite(this.lookRemaining)) {
        this.lookRemaining -= Math.max(0, delta || 0);
        if (this.lookRemaining <= 0) { this.lookTarget = null; this.headTarget = { yaw: 0, pitch: 0, roll: 0 }; }
      }
      if (this.lookTarget) {
        const direction = this.lookTarget.clone().sub(this.rig.bones.Head.getWorldPosition(new THREE.Vector3()));
        const target = { yaw: Math.atan2(direction.x, Math.max(.01, direction.z)), pitch: -Math.atan2(direction.y, Math.hypot(direction.x, direction.z)), roll: 0 };
        const limits = this.rig.calibration.headLimits;
        for (const name of ['yaw', 'pitch', 'roll']) this.headTarget[name] = THREE.MathUtils.clamp(target[name], -limits[name], limits[name]);
      }
      for (const name of ['yaw', 'pitch', 'roll']) this.head[name] += (this.headTarget[name] - this.head[name]) * alpha;
      rotateInFrame(this.rig.bones.Head, getBodyFrame(this.rig).quaternion, this.head.pitch, this.head.yaw, this.head.roll);
    }
  }
  dispose() { this.targets = {}; this.lookTarget = null; }
}
