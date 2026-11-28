import * as THREE from 'three';

export const damping = (speed, delta) => 1 - Math.exp(-speed * Math.max(0, Math.min(Number(delta) || 0, 0.1)));

export function vector(value) {
  const result = value?.isVector3 ? value.clone() : new THREE.Vector3(...(Array.isArray(value) ? value : [0, 0, 0]));
  return [result.x, result.y, result.z].every(Number.isFinite) ? result : null;
}

export function alignWorldDirection(bone, child, direction, weight = 1) {
  if (!bone || !child || !direction || direction.lengthSq() < 1e-12) return;
  bone.updateWorldMatrix(true, true);
  const current = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3()));
  if (current.lengthSq() < 1e-12) return;
  const turn = new THREE.Quaternion().setFromUnitVectors(current.normalize(), direction.clone().normalize());
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);
  const parent = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  const local = parent.invert().multiply(world).normalize();
  bone.quaternion.slerp(local, THREE.MathUtils.clamp(weight, 0, 1)).normalize();
  bone.updateWorldMatrix(false, true);
}

export function rotateInFrame(bone, frameQuaternion, pitch = 0, yaw = 0, roll = 0) {
  if (!bone) return;
  const localDelta = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
  const rotation = frameQuaternion
    ? frameQuaternion.clone().multiply(localDelta).multiply(frameQuaternion.clone().invert())
    : localDelta;
  const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(rotation);
  const parent = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  bone.quaternion.copy(parent.invert().multiply(world)).normalize();
  bone.updateWorldMatrix(false, true);
}

export function rotateWorld(bone, pitch = 0, yaw = 0, roll = 0) {
  rotateInFrame(bone, null, pitch, yaw, roll);
}
