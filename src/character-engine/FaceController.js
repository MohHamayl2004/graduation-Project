import * as THREE from 'three';
import { damping, rotateWorld, vector } from './motionMath.js';
import { LipSyncController } from './LipSyncController.js';

const clamp = value => THREE.MathUtils.clamp(Number(value) || 0, 0, 1);
const NO_TIMING = Object.freeze([]);
export class FaceController {
  constructor(rig) { this.rig = rig; this.lipSync = new LipSyncController({ supportedRoles: Object.keys(rig.morphs) }); this.expression = 'neutral'; this.intensity = 1; this.speech = { playing: false, energy: 0, visemes: null }; this.nextBlink = 2.4; this.blinkStart = -10; this.blinkIndex = 0; }
  setExpression(name, intensity = 1) { this.expression = ['neutral', 'happy', 'curious', 'concerned'].includes(name) ? name : 'neutral'; this.intensity = clamp(intensity); }
  setLookTarget(target, { duration = Infinity } = {}) { this.lookTarget = target == null ? null : vector(target); this.lookRemaining = duration; }
  setSpeech({ playing = false, energy = 0, visemes = null, playbackTime = 0, timingData = NO_TIMING } = {}) {
    if (this.timingData !== timingData) { this.timingData = timingData; this.lipSync.setTimingData(timingData); }
    this.speech = { playing: Boolean(playing), energy: clamp(energy), visemes, playbackTime };
    if (!playing) this.lipSync.stop();
    if (!playing) for (const role of Object.keys(this.rig.morphs)) if (/^viseme|^jawOpen$/.test(role)) for (const { mesh, index } of this.rig.morphs[role]) mesh.morphTargetInfluences[index] = 0;
  }
  update(delta, elapsed) {
    const goals = Object.fromEntries(Object.keys(this.rig.morphs).map(role => [role, 0]));
    const alpha = damping(20, delta); const time = Number.isFinite(elapsed) ? elapsed : 0;
    if (this.lookTarget && Number.isFinite(this.lookRemaining)) { this.lookRemaining -= Math.max(0, delta || 0); if (this.lookRemaining <= 0) this.lookTarget = null; }
    if (!this.reducedMotion && time >= this.nextBlink) {
      this.blinkStart = time; this.blinkIndex++; this.nextBlink = time + 3.1 + (this.blinkIndex % 4) * .73;
    }
    const blinkPhase = (time - this.blinkStart) / .18;
    const blink = !this.reducedMotion && blinkPhase >= 0 && blinkPhase <= 1 ? Math.sin(blinkPhase * Math.PI) ** 2 : 0;
    goals.blinkLeft = blink; goals.blinkRight = blink;
    if (this.expression === 'happy') { goals.smileLeft = .65 * this.intensity; goals.smileRight = .65 * this.intensity; }
    if (this.expression === 'curious') goals.browInnerUp = .45 * this.intensity;
    if (this.expression === 'concerned') goals.browInnerUp = .65 * this.intensity;
    if (this.lookTarget && this.rig.bones.Head) {
      const direction = this.lookTarget.clone().sub(this.rig.bones.Head.getWorldPosition(new THREE.Vector3()));
      const head = this.rig.bones.Head, rest = this.rig.restPose.get(head);
      if (rest) direction.applyQuaternion(head.getWorldQuaternion(new THREE.Quaternion()).multiply(rest.worldQuaternion.clone().invert()).invert());
      const x = THREE.MathUtils.clamp(Math.atan2(direction.x, Math.max(.1, direction.z)) / .7, -1, 1) * (1 - blink);
      const y = THREE.MathUtils.clamp(Math.atan2(direction.y, Math.hypot(direction.x, direction.z)) / .5, -1, 1) * (1 - blink);
      goals.lookOutLeft = goals.lookInRight = Math.max(0, x); goals.lookInLeft = goals.lookOutRight = Math.max(0, -x);
      goals.lookUpLeft = goals.lookUpRight = Math.max(0, y); goals.lookDownLeft = goals.lookDownRight = Math.max(0, -y);
      if (!this.rig.morphs.lookUpLeft && this.rig.bones.LeftEye && this.rig.bones.RightEye) {
        rotateWorld(this.rig.bones.LeftEye, -y * .2, x * .25, 0); rotateWorld(this.rig.bones.RightEye, -y * .2, x * .25, 0);
      }
    }
    Object.assign(goals, this.lipSync.update(this.speech).weights);
    for (const [role, bindings] of Object.entries(this.rig.morphs)) for (const { mesh, index } of bindings) {
      const closed = !this.speech.playing && (/^viseme/.test(role) || role === 'jawOpen');
      const target = clamp(goals[role]); mesh.morphTargetInfluences[index] = closed ? 0 : role.startsWith('blink') ? target : mesh.morphTargetInfluences[index] + (target - mesh.morphTargetInfluences[index]) * alpha;
    }
  }
  getSpeechDiagnostics() { return this.lipSync.getDiagnostics(); }
  dispose() { this.setSpeech({ playing: false }); this.lookTarget = null; }
}
