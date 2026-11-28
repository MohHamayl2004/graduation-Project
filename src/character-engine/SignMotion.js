import * as THREE from 'three';
import { alignWorldDirection } from './motionMath.js';

// Plays recorded signing (tools/sign-capture/extract.py) on the character: each
// arm and finger bone is turned to point the way the signer's did, frame by frame.
// Directions only, so the signer's size does not matter.
//
// clip.frames[i] = { t, pose: { '11': [x,y,z], ... }, left: [21×[x,y,z]] | null, right: ..., face }
// in the character's space (x to the viewer's right, y up, z toward the viewer);
// left/right are the signer's own hands, as they are the character's.

const P = { lShoulder: '11', rShoulder: '12', lElbow: '13', rElbow: '14', lWrist: '15', rWrist: '16' };
// MediaPipe hand points: 0 wrist; thumb 1-4; index 5-8; middle 9-12; ring 13-16; little 17-20.
const FINGER_POINTS = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
const THUMB_POINTS = [1, 2, 3, 4];

const v = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const dir = (from, to) => v(to).sub(v(from));
const childBone = (bone) => bone?.children.find((c) => c.isBone);
const lerp3 = (a, b, s) => [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];

// The frame at time t, blending the two recorded frames around it.
export function frameAt(clip, t) {
  const frames = clip?.frames;
  if (!frames?.length) return null;
  if (t <= frames[0].t) return frames[0];
  if (t >= frames.at(-1).t) return frames.at(-1);
  let lo = 0, hi = frames.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; (frames[mid].t <= t ? (lo = mid) : (hi = mid)); }
  const a = frames[lo], b = frames[hi], s = (t - a.t) / Math.max(1e-6, b.t - a.t);
  const blendHand = (x, y) => (x && y ? x.map((p, i) => lerp3(p, y[i], s)) : s < 0.5 ? x : y);
  return {
    t,
    pose: Object.fromEntries(Object.keys(a.pose).map((k) => [k, lerp3(a.pose[k], b.pose[k] || a.pose[k], s)])),
    left: blendHand(a.left, b.left),
    right: blendHand(a.right, b.right),
    face: a.face && b.face ? Object.fromEntries(Object.keys(a.face).map((k) => [k, a.face[k] + ((b.face[k] ?? a.face[k]) - a.face[k]) * s])) : a.face,
  };
}

// The signed segment of a track at video time t, and the time inside its clip.
// A clip longer or shorter than its sentence is stretched to fit it.
export function segmentAt(track, t) {
  for (const seg of track || []) {
    if (t >= seg.start && t < seg.end) {
      const span = seg.end - seg.start, length = seg.clipDuration ?? span;
      return { seg, clipTime: ((t - seg.start) / span) * length };
    }
  }
  return null;
}

// How the sign at time t shows: its weight, and the sign it blends from.
// A segment eases in from the companion's pose (easeIn) or from the previous sign,
// and eases out at its end if nothing follows straight away (easeOut).
export function signBlend(track, t, ease = 0.15) {
  const i = (track || []).findIndex((s) => t >= s.start && t < s.end);
  if (i < 0) return null;
  const seg = track[i], span = seg.end - seg.start, e = Math.min(ease, span / 3);
  const into = Math.min(1, (t - seg.start) / e), out = Math.min(1, (seg.end - t) / e);
  return { seg, previous: seg.easeIn === false ? track[i - 1] || null : null, weight: Math.max(0, Math.min(seg.easeIn === false ? 1 : into, seg.easeOut === false ? 1 : out)), into };
}

// Turn a bone so it points along `direction`, then roll it about that axis so
// `sideBone` lies along `side` (fixes which way the palm faces).
function alignWithRoll(bone, child, direction, sideFrom, sideTo, side, weight = 1) {
  alignWorldDirection(bone, child, direction, weight);
  if (!sideFrom || !sideTo || !side) return;
  bone.updateWorldMatrix(true, true);
  const axis = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
  const current = sideTo.getWorldPosition(new THREE.Vector3()).sub(sideFrom.getWorldPosition(new THREE.Vector3()));
  const want = side.clone();
  current.addScaledVector(axis, -current.dot(axis)); want.addScaledVector(axis, -want.dot(axis));
  if (current.lengthSq() < 1e-10 || want.lengthSq() < 1e-10) return;
  current.normalize(); want.normalize();
  const angle = weight * Math.atan2(new THREE.Vector3().crossVectors(current, want).dot(axis), current.dot(want));
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(axis, angle));
  const parent = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  bone.quaternion.copy(parent.invert().multiply(world)).normalize();
  bone.updateWorldMatrix(false, true);
}

function applyHand(rig, side, hand, weight) {
  const role = side === 'left' ? 'Left' : 'Right';
  const wrist = rig.bones[`${role}Hand`], fingers = rig.hands?.[side]?.fingers || [], thumb = rig.hands?.[side]?.thumb;
  if (!wrist || !hand || fingers.length < 3) return;
  // The hand: points from the wrist to the middle knuckle, palm turned so index→little matches.
  const middleRoot = fingers[Math.min(1, fingers.length - 1)];
  alignWithRoll(wrist, middleRoot, dir(hand[0], hand[9]), fingers[0], fingers.at(-1), dir(hand[5], hand[17]), weight);
  // Each finger, joint by joint.
  fingers.slice(0, 4).forEach((root, f) => {
    const pts = FINGER_POINTS[f]; let bone = root;
    for (let j = 0; j < 3 && bone; j++) { const next = childBone(bone); if (next) alignWorldDirection(bone, next, dir(hand[pts[j]], hand[pts[j + 1]]), weight); bone = next; }
  });
  let bone = thumb;
  for (let j = 0; j < 3 && bone; j++) { const next = childBone(bone); if (next) alignWorldDirection(bone, next, dir(hand[THUMB_POINTS[j]], hand[THUMB_POINTS[j + 1]]), weight); bone = next; }
}

// Pose the character from one recorded frame. Call after the other controllers,
// so the signing is what shows. weight < 1 blends from the pose already on the
// character (easing into a sign, or from the previous sign). Returns false if the rig cannot sign.
export function applySignFrame(rig, frame, weight = 1) {
  if (!rig || !frame) return false;
  rig.handOverrides ??= new Set();
  for (const side of ['left', 'right']) {
    const role = side === 'left' ? 'Left' : 'Right', s = side === 'left' ? 'l' : 'r';
    const upper = rig.bones[`${role}UpperArm`], lower = rig.bones[`${role}LowerArm`], wrist = rig.bones[`${role}Hand`];
    const shoulder = frame.pose[P[`${s}Shoulder`]], elbow = frame.pose[P[`${s}Elbow`]], hand = frame.pose[P[`${s}Wrist`]];
    if (!upper || !lower || !wrist || !shoulder || !elbow || !hand) continue;
    rig.handOverrides.add(side);
    alignWorldDirection(upper, lower, dir(shoulder, elbow), weight);
    alignWorldDirection(lower, wrist, dir(elbow, hand), weight);
    applyHand(rig, side, frame[side], weight);
  }
  return true;
}

export function releaseSign(rig) { rig?.handOverrides?.clear(); }

// Morph weights for the face from the signer's expression (sign languages use the face too).
export const faceGoals = (frame) => frame?.face ? {
  jawOpen: frame.face.jawOpen ?? 0,
  mouthSmile: ((frame.face.mouthSmileLeft ?? 0) + (frame.face.mouthSmileRight ?? 0)) / 2,
  browInnerUp: frame.face.browInnerUp ?? 0,
} : null;
