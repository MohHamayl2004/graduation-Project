import * as THREE from 'three';

// Transfer rotation deltas through each rig's authored world rest frame.
// Translation, scale and facial tracks require separate calibrated policies.
export function retargetAnimationClip(sourceClip, sourceRig, targetRig, { name = sourceClip.name } = {}) {
  const tracks = [], warnings = [];
  for (const track of sourceClip.tracks) {
    const binding = THREE.PropertyBinding.parseTrackName(track.name);
    const boneName = binding.objectName === 'bones' ? binding.objectIndex : binding.nodeName;
    const sourceEntry = Object.entries(sourceRig.bones).find(([, bone]) => bone.name === boneName);
    const targetBone = sourceEntry && targetRig.bones[sourceEntry[0]];
    if (binding.propertyName !== 'quaternion' || !targetBone || track.getValueSize() !== 4 || track.getInterpolation() === THREE.InterpolateSmooth) {
      warnings.push(`Skipped unsupported or unmapped track: ${track.name}`); continue;
    }
    const sourceRest = sourceRig.restPose.get(sourceEntry[1]), targetRest = targetRig.restPose.get(targetBone);
    const values = [], sourceInverse = sourceRest.quaternion.clone().invert();
    let previous;
    for (let offset = 0; offset < track.values.length; offset += 4) {
      const localDelta = sourceInverse.clone().multiply(new THREE.Quaternion().fromArray(track.values, offset));
      const worldDelta = sourceRest.worldQuaternion.clone().multiply(localDelta).multiply(sourceRest.worldQuaternion.clone().invert());
      const result = targetRest.parentWorldQuaternion.clone().invert().multiply(worldDelta).multiply(targetRest.worldQuaternion).normalize();
      if (previous && previous.dot(result) < 0) result.set(-result.x, -result.y, -result.z, -result.w);
      values.push(...result.toArray()); previous = result;
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${targetBone.name}.quaternion`, track.times.slice(), values, track.getInterpolation()));
  }
  return { clip: new THREE.AnimationClip(name, sourceClip.duration, tracks), warnings };
}
