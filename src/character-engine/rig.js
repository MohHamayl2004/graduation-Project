import { STANDARD_ADAPTER } from './adapters.js';

export function createRig(root, adapter = STANDARD_ADAPTER, calibration = {}) {
  root.updateMatrixWorld(true);
  const bones = {}, morphs = {}, restPose = new Map(), warnings = [];
  const named = new Map();
  root.traverse(node => {
    if (node.isBone) {
      const matches = named.get(node.name) || []; matches.push(node); named.set(node.name, matches);
      restPose.set(node, { position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone(), worldQuaternion: node.getWorldQuaternion(node.quaternion.clone()), parentWorldQuaternion: node.parent?.getWorldQuaternion(node.quaternion.clone()) || node.quaternion.clone().identity() });
    }
    if (node.morphTargetDictionary && node.morphTargetInfluences) {
      for (const [role, aliases] of Object.entries(adapter.morphs || {})) {
        const name = aliases.find(alias => node.morphTargetDictionary[alias] !== undefined);
        if (name) (morphs[role] ||= []).push({ mesh: node, index: node.morphTargetDictionary[name] });
      }
    }
  });
  for (const [role, aliases] of Object.entries(adapter.bones || {})) {
    const matches = [...new Set(aliases.flatMap(alias => named.get(alias) || []))];
    if (matches.length === 1) bones[role] = matches[0];
    else if (matches.length > 1) warnings.push(`Ambiguous ${role}; provide an explicit avatar adapter.`);
  }
  const hands = Object.fromEntries(['left','right'].map(side => {
    const mapping = adapter.fingers?.[side];
    const find = name => named.get(name)?.length === 1 ? named.get(name)[0] : null;
    return [side, { thumb: find(mapping?.thumb), fingers: (mapping?.fingers || []).map(find).filter(Boolean) }];
  }));
  const descendant = (child, ancestor) => {
    if (!child || !ancestor || child === ancestor) return false;
    for (let p = child.parent; p; p = p.parent) if (p === ancestor) return true;
    return false;
  };
  const arm = side => descendant(bones[`${side}LowerArm`], bones[`${side}UpperArm`]) && descendant(bones[`${side}Hand`], bones[`${side}LowerArm`]);
  const has = role => Boolean(morphs[role]?.length);
  const capabilities = {
    leftArm: arm('Left'), rightArm: arm('Right'), head: Boolean(bones.Head), body: Boolean(bones.Spine),
    blink: has('blinkLeft') && has('blinkRight'),
    gaze: (has('lookUpLeft') && has('lookUpRight')) || Boolean(bones.LeftEye && bones.RightEye),
    expressions: has('smileLeft') || has('browInnerUp'), visemes: has('visemeAA') || has('jawOpen'),
  };
  for (const [role, supported] of Object.entries(capabilities)) if (!supported) warnings.push(`${role.replace(/([A-Z])/g, ' $1')} unavailable on this avatar.`);
  return {
    root, bones, hands, morphs, restPose, capabilities, warnings,
    calibration: { ...STANDARD_ADAPTER.calibration, ...adapter.calibration, ...calibration },
    resetPose() {
      for (const [node, pose] of restPose) {
        node.position.copy(pose.position); node.quaternion.copy(pose.quaternion); node.scale.copy(pose.scale);
      }
      root.updateMatrixWorld(true);
    },
  };
}
