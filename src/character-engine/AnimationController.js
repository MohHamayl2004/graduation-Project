import * as THREE from 'three';
import { damping, rotateInFrame, vector } from './motionMath.js';
import { getBodyFrame, solveSafeArm, enforceArmSafety } from './ArmConstraints.js';
import { TeachingGestureState } from './TeachingGestureState.js';
import { greetingEnvelope, gestureTarget } from './TeachingPoses.js';
import { gestureState, normalizeGesture } from './gestureContract.js';

export const CHARACTER_STATES = ['idle', 'listening', 'thinking', 'speaking', 'explaining', 'celebrating', 'greeting', 'talking_left_hand', 'talking_right_hand', 'switching_hands', 'pointing', 'encouraging'];
const baseState = state => ({ greeting:'idle', talking_left_hand:'speaking', talking_right_hand:'speaking', switching_hands:'speaking', pointing:'explaining', encouraging:'idle' }[state] || state);
export class AnimationController {
  constructor(rig, { clips = [], root = rig.root } = {}) {
    this.rig = rig; this.state = 'idle'; this.weights = Object.fromEntries(CHARACTER_STATES.map(s => [s, s === 'idle' ? 1 : 0]));
    this.elapsed = 0; this.lastGesture = null; this.nextGesture = 5; this.gestureIndex = 0;
    this.mixer = clips.length ? new THREE.AnimationMixer(root) : null;
    this.actions = Object.fromEntries(clips.map(clip => [clip.name, this.mixer.clipAction(clip)]));
    this.armPose = new Map();
    this.teacher = new TeachingGestureState();
    this.state = null; this.setState('idle');
  }
  playClip(clip) {
    if (!clip?.tracks?.length) return false;
    this.mixer ||= new THREE.AnimationMixer(this.rig.root);
    this.activeAction?.fadeOut(.2);
    const action = this.mixer.clipAction(clip); action.reset().setLoop(THREE.LoopOnce, 1).fadeIn(.15).play();
    this.activeAction = action;
    const finished = event => { if (event.action === action) { if (this.activeAction === action) this.activeAction = null; this.mixer.removeEventListener('finished', finished); } };
    this.mixer.addEventListener('finished', finished); return true;
  }
  selectGesture(gesture) {
    const selected = normalizeGesture({ gesture }).gesture;
    const restingSide = this.teacher.getSnapshot().restingSide || 'left';
    this.cancelGestures();
    const state = gestureState(selected);
    if (['speaking','explaining','pointing','talking_left_hand','talking_right_hand','switching_hands'].includes(state)) this.teacher.setSpeaking(true);
    if (selected === 'SWITCHING_HANDS') this.teacher.setPocket(restingSide);
    this.setState(state);
    if (selected === 'CELEBRATING') this.contextualEnd = this.teacher.clock + 2.4;
    // Explicit hand choice seeds the scheduler, then returns ownership to it.
    if (['TALKING_LEFT','TALKING_RIGHT','SWITCHING_HANDS'].includes(selected)) this.teacher.manual = false;
    return selected;
  }
  setState(state) {
    if (!CHARACTER_STATES.includes(state) || state === this.state) return;
    const previous = this.state;
    const previousFreeSide = this.teacher.getSnapshot().freeSide || 'right';
    this.state = state;
    if (state === 'greeting') { this.greetingReturn = previous === 'greeting' ? 'idle' : previous || 'idle'; this.teacher.greet({force:true}); }
    else if (state === 'talking_left_hand') this.teacher.setPocket('right');
    else if (state === 'talking_right_hand') this.teacher.setPocket('left');
    else if (state === 'switching_hands') this.teacher.switchHands();
    else if (!['speaking','explaining','pointing'].includes(state)) this.teacher.returnToIdle();
    if (state === 'encouraging') { this.actionReturn = previous === 'encouraging' ? 'idle' : previous || 'idle'; this.gesture = null; this.playGesture('encourage',{side:previousFreeSide,duration:2}); }
    const clip = this.rig.calibration.clips?.[state], action = this.actions[clip];
    if (this.activeAction !== action) {
      this.activeAction?.fadeOut(.35); action?.reset().fadeIn(.35).play(); this.activeAction = action;
    }
  }
  playGesture(name, { side = 'right', duration = 1.8, automatic = false } = {}) {
    if (['greeting','salute'].includes(name)) return this.greet({force:true});
    if (!['point', 'explain', 'emphasis', 'encourage'].includes(name)) return false;
    const key = `${name}:${side}`;
    if (this.gesture || (this.lastGesture?.key === key && this.teacher.clock - this.lastGesture.time < 3)) return false;
    this.gesture = { name, side, automatic, start: this.teacher.clock, duration: THREE.MathUtils.clamp(duration, .6, 4) };
    this.lastGesture = { key, time: this.teacher.clock }; return true;
  }
  greet(options) { return this.rig.capabilities.head && this.rig.capabilities.rightArm ? this.teacher.greet(options) : false; }
  restHand(side) { this.gesture = null; return this.teacher.setPocket(side); }
  switchHands() { this.gesture = null; return this.teacher.switchHands(); }
  getTeachingSnapshot() {
    const state = { ...this.teacher.getSnapshot(), reducedMotion: Boolean(this.reducedMotion) };
    return { ...state, greetingWeight: state.greetingElapsed === null ? 0 : greetingEnvelope(state.greetingElapsed), pointingSide: this.gesture?.name === 'point' ? this.gesture.side : this.state === 'pointing' ? state.freeSide || 'right' : null, gestureName:this.gesture?.name || null, pocketInsertionSupported:false };
  }
  cancelGestures() { this.gesture = null; this.contextualEnd = null; this.teacher.returnToIdle(); this.nextGesture = this.teacher.clock + 5; }
  update(delta, elapsed) {
    this.elapsed = Number.isFinite(elapsed) ? elapsed : this.elapsed + Math.max(0, delta || 0);
    const alpha = damping(8, delta);
    for (const state of CHARACTER_STATES) this.weights[state] += ((state === baseState(this.state) ? 1 : 0) - this.weights[state]) * alpha;
    this.teacher.setSpeaking(['speaking','explaining','talking_left_hand','talking_right_hand','switching_hands','pointing'].includes(this.state));
    this.teacher.update(delta, {reducedMotion:this.reducedMotion,busy:Boolean(this.gesture)});
    if (this.contextualEnd !== null && this.contextualEnd !== undefined && this.teacher.clock >= this.contextualEnd) { this.contextualEnd = null; this.setState('speaking'); }
    if (this.state === 'greeting' && this.teacher.getSnapshot().greetingElapsed === null) this.setState(this.greetingReturn || 'idle');
    const teaching = this.getTeachingSnapshot();
    this.mixer?.update(Math.max(0, Math.min(delta || 0, .1)));
    if (this.clipMaskAction !== this.activeAction) {
      this.clipMaskAction = this.activeAction;
      this.clipBones = new Set((this.activeAction?.getClip().tracks || []).map(track => {
        const binding = THREE.PropertyBinding.parseTrackName(track.name);
        return binding.objectName === 'bones' ? binding.objectIndex : binding.nodeName;
      }));
    }
    const time = this.reducedMotion ? 0 : this.elapsed;
    const w = this.weights;
    const bodyFrame = getBodyFrame(this.rig);
    rotateInFrame(this.rig.bones.Spine, bodyFrame.quaternion, Math.sin(time * 1.25) * .008 + w.listening * .025, 0, Math.sin(time * .43) * .009);
    rotateInFrame(this.rig.bones.Head, bodyFrame.quaternion, Math.sin(time * .72) * .016 + w.listening * .04, Math.sin(time * .37) * .025 + w.thinking * .09, w.thinking * .025);
    if (!this.reducedMotion && !this.gesture && !teaching.switching && !teaching.greetingWeight && this.teacher.clock >= this.nextGesture && (w.speaking + w.explaining > .6)) {
      this.playGesture(this.gestureIndex % 2 ? 'emphasis' : 'explain', { side: teaching.freeSide || 'right', automatic:true });
      this.gestureIndex++; this.nextGesture = this.teacher.clock + 5.5 + (this.gestureIndex % 3) * 1.4;
    }
    let envelope = 0;
    if (this.gesture) {
      const progress = (this.teacher.clock - this.gesture.start) / this.gesture.duration;
      if (progress >= 1) { this.gesture = null; if (this.state === 'encouraging') this.setState(this.actionReturn || 'idle'); }
      else envelope = Math.sin(Math.max(0, progress) * Math.PI) ** 2;
    }
    for (const side of ['left', 'right']) {
      if (!this.rig.capabilities[`${side}Arm`]) continue;
      const role = side === 'left' ? 'Left' : 'Right', sign = side === 'left' ? 1 : -1;
      const frame = getBodyFrame(this.rig), b = this.rig.bones;
      const upper = b[`${role}UpperArm`], lower = b[`${role}LowerArm`], hand = b[`${role}Hand`];
      const position = bone => bone.getWorldPosition(new THREE.Vector3());
      const shoulder = position(upper), first = shoulder.distanceTo(position(lower)), second = position(lower).distanceTo(position(hand)), length = first + second;
      const base = vector(this.rig.calibration.armDirections[side]).normalize().multiplyScalar(first)
        .add(vector(this.rig.calibration.forearmDirections?.[side] || [sign * .16, -.92, .34]).normalize().multiplyScalar(second));
      const speech = teaching.switching ? 0 : w.speaking + w.explaining;
      const wave = this.reducedMotion ? 0 : Math.sin(time * 1.15 + (side === 'left' ? 0 : 1.8));
      base.z += length * (speech * (.19 + wave * .035) + w.explaining * .12);
      base.y += length * (speech * (.15 + wave * .035) + w.explaining * .1);
      base.x += sign * length * (speech * .025 + (this.reducedMotion ? 0 : Math.sin(time * .7) * .006));
      if (side === 'right') { base.z += length * w.thinking * .15; base.y += length * w.thinking * .12; }
      base.y += length * w.celebrating * .4; base.z += length * w.celebrating * .3;
      const landmarks = { shoulder:frame.toBody(shoulder).toArray(), head:frame.toBody(position(b.Head || b.Neck || upper)).toArray(), hips:frame.toBody(position(b.Hips || b.Spine || upper)).toArray(), armLength:length, halfWidth:frame.halfWidth };
      let targetBody = frame.toBody(shoulder.clone().add(frame.direction(base)));
      const free = !teaching.freeSide || teaching.freeSide === side;
      if (free && speech > .001) targetBody.lerp(vector(gestureTarget('explain',side,landmarks,time,this.reducedMotion)), speech * .85);
      const active = this.gesture && (this.gesture.side === side || (this.gesture.name === 'explain' && free));
      const restWeight = teaching.pocketWeights[side] * (active ? 1-envelope : 1);
      if (restWeight > .001) targetBody.lerp(vector(gestureTarget('pocket',side,landmarks,time,this.reducedMotion)),restWeight);
      if (active && (!teaching.switching || !this.gesture.automatic)) {
        const pose = this.gesture.name === 'point' ? 'point' : this.gesture.name === 'encourage' ? 'encourage' : 'explain';
        targetBody.lerp(vector(gestureTarget(pose,side,landmarks,time,this.reducedMotion)),envelope * (this.gesture.name === 'emphasis' ? .25 : .85));
      }
      if (this.state === 'pointing' && side === (teaching.freeSide || 'right')) targetBody.copy(vector(gestureTarget('point',side,landmarks,time,this.reducedMotion)));
      if (side === 'right' && teaching.greetingWeight) {
        targetBody.lerp(vector(gestureTarget('greeting',side,landmarks,time,this.reducedMotion)),teaching.greetingWeight);
      }
      // Smooth in body coordinates so a root transform cannot leave stale
      // world-space target positions behind.
      const previous = this.armPose.get(side) || frame.toBody(position(hand));
      previous.lerp(targetBody, damping(14, delta)); this.armPose.set(side, previous);
      const pole = side === 'right' && teaching.greetingWeight > .001
        ? shoulder.clone().add(frame.direction(vector(this.rig.calibration.elbowPoles?.right || [-.35,-.2,-.9]).lerp(new THREE.Vector3(-1,-.45,.35),teaching.greetingWeight))) : undefined;
      solveSafeArm(this.rig, side, frame.toWorld(previous), { weight: this.activeAction && this.clipBones.has(upper.name) ? .2 : 1, pole });
      enforceArmSafety(this.rig, side);
    }
    this.rig.root.updateMatrixWorld(true);
  }
  dispose() { this.mixer?.stopAllAction(); if (this.mixer) this.mixer.uncacheRoot(this.rig.root); this.gesture = null; this.armPose.clear(); }
}
