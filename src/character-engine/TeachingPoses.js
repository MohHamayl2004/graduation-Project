const smoothstep = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

const isVec3 = (v) =>
  Array.isArray(v) &&
  v.length >= 3 &&
  Number.isFinite(v[0]) &&
  Number.isFinite(v[1]) &&
  Number.isFinite(v[2]);

const validLandmarks = (lm) =>
  Boolean(
    lm &&
      typeof lm === 'object' &&
      isVec3(lm.shoulder) &&
      isVec3(lm.head) &&
      isVec3(lm.hips) &&
      Number.isFinite(lm.armLength) &&
      lm.armLength > 0 &&
      Number.isFinite(lm.halfWidth) &&
      lm.halfWidth > 0
  );

export function greetingEnvelope(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds >= 2.9) return 0;
  if (seconds < 0.8) return smoothstep(seconds / 0.8);
  if (seconds <= 2.05) return 1;
  return 1 - smoothstep((seconds - 2.05) / 0.85);
}

export function greetingWave(seconds, reducedMotion = false) {
  if (reducedMotion || !Number.isFinite(seconds) || seconds <= .8 || seconds >= 2.05) return 0;
  const progress = (seconds - .8) / 1.25;
  // Two wrist cycles with zero velocity at both ends of the wave interval.
  return .18 * Math.sin(progress * Math.PI * 4) * Math.sin(progress * Math.PI) ** 2;
}

export function gestureTarget(pose, side, landmarks, seconds = 0, reducedMotion = false) {
  if ((side !== 'left' && side !== 'right') || !validLandmarks(landmarks)) return null;
  const { shoulder, head, hips, armLength, halfWidth } = landmarks;
  const sideSign = side === 'left' ? 1 : -1;
  const t = !reducedMotion && Number.isFinite(seconds) ? seconds : 0;
  const phase = side === 'left' ? 0 : 0.9;
  const swayX = reducedMotion ? 0 : sideSign * Math.sin(t * 1.6 + phase) * halfWidth * 0.08;
  const swayY = reducedMotion ? 0 : Math.cos(t * 1.3 + phase) * armLength * 0.035;
  const swayZ = reducedMotion ? 0 : Math.sin(t * 1.1 + phase) * armLength * 0.03;

  switch (pose) {
    case 'greeting':
    case 'salute': // Legacy caller alias; the welcome no longer touches the brow.
      if (side !== 'right') return null;
      return [
        head[0] - halfWidth * 1.65,
        head[1] - armLength * 0.08,
        head[2] + armLength * 0.42,
      ];
    case 'pocket':
      return [
        sideSign * halfWidth * 1.2,
        hips[1] + armLength * 0.05,
        hips[2] + halfWidth * 0.95,
      ];
    case 'explain':
      return [
        shoulder[0] + sideSign * halfWidth * 0.25 + swayX,
        shoulder[1] - armLength * 0.18 + swayY,
        shoulder[2] + armLength * 0.52 + swayZ,
      ];
    case 'point':
      return [
        shoulder[0] + sideSign * halfWidth * 0.14 + swayX * 0.4,
        shoulder[1] + armLength * 0.06 + swayY * 0.4,
        shoulder[2] + armLength * 0.62,
      ];
    case 'encourage':
      return [
        shoulder[0] + sideSign * halfWidth * 0.34 + swayX,
        shoulder[1] - armLength * 0.08 + swayY,
        shoulder[2] + armLength * 0.48 + swayZ,
      ];
    default:
      return null;
  }
}
