import * as THREE from 'three';
import { alignWorldDirection, vector } from './motionMath.js';

const point = bone => bone?.getWorldPosition(new THREE.Vector3());
const roleFor = side => side === 'left' ? 'Left' : 'Right';

// The frame follows mapped anatomy, including later root transforms and posture.
// No assumption about asset bone axes or their names is used by the solver.
export function getBodyFrame(rig) {
  rig.root.updateMatrixWorld(true);
  const b = rig.bones, a = point(b.LeftUpperArm), c = point(b.RightUpperArm);
  const hips = point(b.Hips || b.Spine) || rig.root.getWorldPosition(new THREE.Vector3());
  const neck = point(b.Neck || b.UpperChest || b.Head) || hips.clone().add(new THREE.Vector3(0, 1, 0));
  const up = neck.clone().sub(hips).normalize();
  const left = a && c ? a.clone().sub(c) : new THREE.Vector3(1, 0, 0).applyQuaternion(rig.root.getWorldQuaternion(new THREE.Quaternion()));
  left.addScaledVector(up, -left.dot(up)).normalize();
  const forward = new THREE.Vector3().crossVectors(left, up).normalize();
  const origin = hips.clone().lerp(neck, .5);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(left, up, forward));
  const halfWidth = a && c ? a.distanceTo(c) * .5 : hips.distanceTo(neck) * .36;
  return { origin, left, up, forward, quaternion, halfWidth, hips, neck,
    toBody: p => { const d = p.clone().sub(origin); return new THREE.Vector3(d.dot(left), d.dot(up), d.dot(forward)); },
    toWorld: p => origin.clone().addScaledVector(left, p.x).addScaledVector(up, p.y).addScaledVector(forward, p.z),
    direction: p => left.clone().multiplyScalar(p.x).addScaledVector(up, p.y).addScaledVector(forward, p.z) };
}

export function createArmConstraints(rig) {
  if (rig.constraints) return rig.constraints;
  const frame = getBodyFrame(rig), half = Math.max(.001, frame.halfWidth);
  // Ratios are calibration defaults. Clearance includes the hand's thickness;
  // they can be overridden per avatar without changing solver or trajectories.
  const ratios = { radiusX: .88, radiusZ: .68, ...(rig.calibration.torsoRatios || {}) };
  const torsoBones = new Set(['Hips', 'Spine', 'Chest', 'UpperChest'].map(role => rig.bones[role]).filter(Boolean));
  let garmentX = 0, garmentZ = 0;
  rig.root.traverse(mesh => {
    const attrs = mesh.geometry?.attributes;
    if (!mesh.isSkinnedMesh || !attrs?.skinIndex || !attrs.skinWeight) return;
    mesh.skeleton.update();
    for (let i = 0; i < attrs.position.count; i += 2) {
      let weight = 0;
      for (let j = 0; j < 4; j++) if (torsoBones.has(mesh.skeleton.bones[attrs.skinIndex.getComponent(i, j)])) weight += attrs.skinWeight.getComponent(i, j);
      if (weight < .7) continue;
      const p = frame.toBody(mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
      if (Math.abs(p.y) > half * 1.4) continue;
      garmentX = Math.max(garmentX, Math.abs(p.x)); garmentZ = Math.max(garmentZ, Math.abs(p.z));
    }
  });
  // The joint where the arm joins the shoulder is intentionally outside the
  // collision body; fingers/wrists get clearance around the actual coat depth.
  ratios.radiusX = Math.max(ratios.radiusX, Math.min(.985, garmentX / half + .08));
  ratios.radiusZ = Math.max(ratios.radiusZ, garmentZ / half + .08);
  rig.constraints = { shoulderHalfWidth: half, torso: { safeRadiusX: half * ratios.radiusX, safeRadiusZ: half * ratios.radiusZ }, ratios };
  return rig.constraints;
}

function body(rig, frame) {
  const c = createArmConstraints(rig);
  return { rx: frame.halfWidth * c.ratios.radiusX, rz: frame.halfWidth * c.ratios.radiusZ,
    bottom: frame.toBody(frame.hips).y - frame.halfWidth * .35,
    top: frame.toBody(frame.neck).y - frame.halfWidth * .35 };
}
function distance(p, bounds) {
  const outsideY = Math.max(bounds.bottom - p.y, 0, p.y - bounds.top);
  return Math.hypot(p.x / bounds.rx, p.z / bounds.rz, outsideY / bounds.rx);
}
function segmentClearance(a, b, bounds) {
  // Exact minimum of a segment against the scaled capped torso. Squared
  // distance is quadratic between the two vertical cap boundaries.
  const delta = b.clone().sub(a), cuts = [0, 1];
  if (Math.abs(delta.y) > 1e-12) for (const y of [bounds.bottom, bounds.top]) {
    const t = (y - a.y) / delta.y; if (t > 0 && t < 1) cuts.push(t);
  }
  cuts.sort((x, y) => x - y);
  let result = Infinity;
  for (let i = 1; i < cuts.length; i++) {
    const lo = cuts[i - 1], hi = cuts[i], midY = a.y + delta.y * (lo + hi) / 2;
    const cap = midY < bounds.bottom ? bounds.bottom : midY > bounds.top ? bounds.top : null;
    const origin = new THREE.Vector3(a.x / bounds.rx, cap === null ? 0 : (a.y - cap) / bounds.rx, a.z / bounds.rz);
    const direction = new THREE.Vector3(delta.x / bounds.rx, cap === null ? 0 : delta.y / bounds.rx, delta.z / bounds.rz);
    const t = direction.lengthSq() > 1e-12 ? THREE.MathUtils.clamp(-origin.dot(direction) / direction.lengthSq(), lo, hi) : lo;
    result = Math.min(result, origin.addScaledVector(direction, t).length());
  }
  return result;
}

export function sanitizeHandTarget(rig, side, position) {
  const value = vector(position); if (!value) return null;
  const frame = getBodyFrame(rig), bounds = body(rig, frame), p = frame.toBody(value), sign = side === 'left' ? 1 : -1;
  // Cross-body requests remain possible in front, but cannot sweep through the
  // chest or point behind the spine. These are anatomical volumes, not offsets.
  p.z = Math.max(p.z, -bounds.rz * .15);
  if (p.z < bounds.rz * 1.35) p.x = sign * Math.max(sign * p.x, frame.halfWidth * .35);
  if (distance(p, bounds) < 1.08) {
    p.z = Math.max(p.z, bounds.rz * Math.sqrt(Math.max(0, 1.08 ** 2 - (p.x / bounds.rx) ** 2)));
  }
  return frame.toWorld(p);
}

export function evaluateArmClearance(rig, side) {
  const role = roleFor(side), b = rig.bones, frame = getBodyFrame(rig), bounds = body(rig, frame);
  if (!b[`${role}Hand`] || !b[`${role}LowerArm`] || !b[`${role}UpperArm`]) return { minNormalizedDistance: Infinity };
  const shoulderBody = frame.toBody(point(b[`${role}UpperArm`])), elbowBody = frame.toBody(point(b[`${role}LowerArm`])), handBody = frame.toBody(point(b[`${role}Hand`]));
  const upper = elbowBody.clone().sub(shoulderBody), lower = handBody.clone().sub(elbowBody);
  return { shoulderBody, elbowBody, handBody,
    minNormalizedDistance: Math.min(segmentClearance(shoulderBody, elbowBody, bounds), segmentClearance(elbowBody, handBody, bounds)),
    shoulderExcursion: upper.angleTo(vector(rig.calibration.armDirections[side]).normalize()),
    elbowBend: upper.angleTo(lower),
    wristDeviation: b[`${role}Hand`].quaternion.angleTo(rig.restPose.get(b[`${role}Hand`]).quaternion) };
}

// Analytic two-link IK, choosing a collision-free elbow from a bounded family
// of outward bend planes. Limits and collision checks also constrain clips.
export function solveSafeArm(rig, side, requested, { weight = 1, pole, allowFallback = true } = {}) {
  const role = roleFor(side), upper = rig.bones[`${role}UpperArm`], lower = rig.bones[`${role}LowerArm`], hand = rig.bones[`${role}Hand`];
  if (!upper || !lower || !hand) return false;
  const frame = getBodyFrame(rig), bounds = body(rig, frame), sign = side === 'left' ? 1 : -1;
  const a = point(upper), first = a.distanceTo(point(lower)), second = point(lower).distanceTo(point(hand));
  if (first < 1e-6 || second < 1e-6) return false;
  const limits = { shoulder: 2.1, minElbowBend: .12, maxElbowBend: 2.35, wrist: .5, ...rig.calibration.armLimits };
  const minReach = Math.sqrt(first ** 2 + second ** 2 + 2 * first * second * Math.cos(limits.maxElbowBend));
  const maxReach = Math.sqrt(first ** 2 + second ** 2 + 2 * first * second * Math.cos(limits.minElbowBend));
  let safe = sanitizeHandTarget(rig, side, requested);
  if (!safe) return false;
  const shoulderBody = frame.toBody(a);
  const preferredPole = vector(rig.calibration.elbowPoles?.[side] || [sign * .35, -.2, -.9]);
  const poles = [pole && vector(pole)?.sub(a), frame.direction(preferredPole), ...[[sign, -.2, .35], [sign, .1, 0], [sign, -.7, -.2]].map(v => frame.direction(new THREE.Vector3(...v)))].filter(Boolean);
  let best;
  for (let attempt = 0; attempt < 9; attempt++) {
    const direction = safe.clone().sub(a);
    if (direction.lengthSq() < 1e-12) direction.copy(frame.up).negate();
    let reach = THREE.MathUtils.clamp(direction.length(), minReach, maxReach); direction.normalize();
    const rest = frame.direction(vector(rig.calibration.armDirections[side]).normalize());
    // Shoulder limits apply to the humerus, not shoulder-to-wrist direction.
    // A bent elbow can put the wrist at the forehead while the upper arm stays
    // comfortably lateral; candidates below enforce the actual bone limit.
    const target = a.clone().addScaledVector(direction, reach), handBody = frame.toBody(target);
    const along = (first * first - second * second + reach * reach) / (2 * reach);
    const height = Math.sqrt(Math.max(0, first * first - along * along));
    for (const input of poles) {
      const bend = input.clone().addScaledVector(direction, -input.dot(direction));
      if (bend.lengthSq() < 1e-8) continue;
      const elbow = a.clone().addScaledVector(direction, along).addScaledVector(bend.normalize(), height), elbowBody = frame.toBody(elbow);
      if (elbow.clone().sub(a).angleTo(rest) > limits.shoulder + 1e-5) continue;
      const clearance = Math.min(segmentClearance(shoulderBody, elbowBody, bounds), segmentClearance(elbowBody, handBody, bounds));
      const score = clearance - Math.max(0, -sign * elbowBody.x / frame.halfWidth);
      if (!best || score > best.score) best = { elbow, target, clearance, score };
      if (clearance >= 1.005 && sign * elbowBody.x > frame.halfWidth * .3) break;
    }
    // Garment dimensions already include hand clearance. Requiring another
    // margin larger than the fixed shoulder's clearance cannot be solved by
    // moving the hand and would needlessly spread the elbows.
    if (best?.clearance >= 1.005) break;
    // Search outward and forward only if the requested pose has no safe bend.
    const p = frame.toBody(safe); p.x = sign * Math.max(sign * p.x + frame.halfWidth * .12, frame.halfWidth * .8); p.z += frame.halfWidth * .14;
    safe = frame.toWorld(p);
  }
  if (!best) {
    if (!allowFallback) return false;
    const neutral = a.clone().add(frame.direction(new THREE.Vector3(sign * .3, -.8, .3)).multiplyScalar(first + second));
    return solveSafeArm(rig, side, neutral, { weight, allowFallback: false });
  }
  alignWorldDirection(upper, lower, best.elbow.clone().sub(a), weight);
  alignWorldDirection(lower, hand, best.target.clone().sub(point(lower)), weight);
  // Retain the authored neutral wrist relative to its forearm rather than
  // accumulating shortest-arc twist on every pose.
  const restHand = rig.restPose.get(hand)?.quaternion;
  if (restHand) hand.quaternion.slerp(restHand, weight);
  rig.root.updateMatrixWorld(true);
  return true;
}

export function enforceArmSafety(rig, side) {
  const role = roleFor(side); if (!rig.capabilities[`${side}Arm`]) return;
  const result = evaluateArmClearance(rig, side), limits = rig.calibration.armLimits || {};
  if (result.minNormalizedDistance < 1.001 || result.shoulderExcursion > (limits.shoulder || 2.1) + .001 || result.elbowBend < (limits.minElbowBend || .12) - .01 || result.elbowBend > (limits.maxElbowBend || 2.35) + .01 || result.wristDeviation > (limits.wrist || .5)) {
    solveSafeArm(rig, side, point(rig.bones[`${role}Hand`]));
  }
}
