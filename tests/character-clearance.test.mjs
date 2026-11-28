import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRig } from '../src/character-engine/rig.js';
import { BIP01_ADAPTER, STANDARD_ADAPTER } from '../src/character-engine/adapters.js';
import { AnimationController } from '../src/character-engine/AnimationController.js';
import { IKController } from '../src/character-engine/IKController.js';
import {
  createArmConstraints,
  evaluateArmClearance,
  enforceArmSafety,
  getBodyFrame,
  sanitizeHandTarget,
} from '../src/character-engine/ArmConstraints.js';

const RIG_AUDIT_BONES = {
  male: [
    { name: 'Bip01_Pelvis', parent: null, translation: [0, 0.8433039085153686, -2.5500790788941256e-10], rotation: [0.5000010262946408, 0.5000003328945916, 0.4999996671042622, 0.4999989737041768] },
    { name: 'Bip01_Spine', parent: 'Bip01_Pelvis', translation: [12.025939941406236, -0.1628549695014954, 1.6903417417779568e-05], rotation: [-2.064252594217105e-06, -6.777958951272613e-07, -0.022256109671307527, 0.9997523021116671] },
    { name: 'Bip01_Spine1', parent: 'Bip01_Spine', translation: [15.316879272460923, -0.012191772460935724, -3.3814103517202146e-08], rotation: [1.5787304411973477e-14, 3.794147778744394e-08, -0.01367950391513488, 0.9999064312087579] },
    { name: 'Bip01_Spine2', parent: 'Bip01_Spine1', translation: [15.317573547363281, -0.012191295623784626, -3.381501301191747e-08], rotation: [-9.145429628823631e-14, -4.3166573834062337e-08, 0.015563369243528928, 0.9998788834342826] },
    { name: 'Bip01_Neck', parent: 'Bip01_Spine2', translation: [15.0, 0, 0], rotation: [0, 0, 0, 1] },
    { name: 'Head', parent: 'Bip01_Neck', translation: [9.0, 0, 0], rotation: [0, 0, 0, 1] },
    { name: 'Bip01_L_Clavicle', parent: 'Bip01_Neck', translation: [-6.206558227539091, 0.7088241577148509, 7.28219223022461], rotation: [0.6135297823223437, -0.11396154063065785, 0.7713326410512164, 0.12505970697846663] },
    { name: 'Bip01_L_UpperArm', parent: 'Bip01_L_Clavicle', translation: [14.10797882080079, 0, -1.52587890625e-05], rotation: [0.0900091015047837, 0.2669895341598253, -0.029684071393640262, 0.9590275315135214] },
    { name: 'Bip01_L_Forearm', parent: 'Bip01_L_UpperArm', translation: [28.58015441894529, 0, -7.629394517039145e-06], rotation: [-7.05334828488836e-18, 4.1328210552668875e-17, -0.1794171146012354, 0.9837730932426273] },
    { name: 'Bip01_L_Hand', parent: 'Bip01_L_Forearm', translation: [27.09194564819335, 9.536743137417147e-07, 0], rotation: [-0.714762258596655, 0.012448762224819415, 0.03602427262094099, 0.6983281419125328] },
    { name: 'Bip01_R_Clavicle', parent: 'Bip01_Neck', translation: [-6.206558227539091, 0.7088661193847798, -7.282182693481445], rotation: [-0.6135294304940665, 0.11395939714352286, 0.7713329620440638, 0.12506140645555722] },
    { name: 'Bip01_R_UpperArm', parent: 'Bip01_R_Clavicle', translation: [14.107980728149418, -4.768371586472142e-07, -2.842170943040401e-14], rotation: [-0.09000910552450313, -0.26698950452856723, -0.02968406901389242, 0.9590275394591374] },
    { name: 'Bip01_R_Forearm', parent: 'Bip01_R_UpperArm', translation: [28.580150604248068, -1.9073486292597863e-06, 7.62939453125e-06], rotation: [7.053347950047308e-18, -1.0910649204059777e-17, -0.17941713530092795, 0.9837730894674892] },
    { name: 'Bip01_R_Hand', parent: 'Bip01_R_Forearm', translation: [27.091941833496094, -4.884981308350689e-15, 0], rotation: [0.7147622594109406, -0.012448743048923318, 0.036024267671383496, 0.6983281416762536] },
  ],
  female: [
    { name: 'Bip01_Pelvis', parent: null, translation: [0, 0.9089852648733915, 0], rotation: [0.5000010262946408, 0.5000003328945916, 0.4999996671042622, 0.49999897370417673] },
    { name: 'Bip01_Spine', parent: 'Bip01_Pelvis', translation: [12.026268005371094, -0.16054904460906982, 1.6900667105801404e-05], rotation: [-2.072519319688085e-06, -6.858013539573794e-07, -0.010899177871442014, 0.9999406021944308] },
    { name: 'Bip01_Spine1', parent: 'Bip01_Spine', translation: [12.408256530761705, -0.009672403335571733, -2.6827819965574056e-08], rotation: [-5.509837091178553e-14, 1.193266565806718e-07, -0.04302229787990145, 0.9990741123085508] },
    { name: 'Bip01_Spine2', parent: 'Bip01_Spine1', translation: [12.192115783691392, -0.009884834289552558, -2.7419446269023135e-08], rotation: [8.214613019960164e-14, 7.249917213912779e-08, -0.02613901362992062, 0.9996583176097968] },
    { name: 'Bip01_Neck', parent: 'Bip01_Spine2', translation: [13.5, 0, 0], rotation: [0, 0, 0, 1] },
    { name: 'Head', parent: 'Bip01_Neck', translation: [8.5, 0, 0], rotation: [0, 0, 0, 1] },
    { name: 'Bip01_L_Clavicle', parent: 'Bip01_Neck', translation: [-4.6310577392578125, 2.646179199218743, 7.650492191314695], rotation: [0.6058152525946642, -0.1508092126384586, 0.7712912537432656, 0.12391231983210128] },
    { name: 'Bip01_L_UpperArm', parent: 'Bip01_L_Clavicle', translation: [9.838584899902349, 0, 5.684341886080802e-14], rotation: [0.07616581187636351, 0.2503736625792788, 0.008960207082973355, 0.9651069955589805] },
    { name: 'Bip01_L_Forearm', parent: 'Bip01_L_UpperArm', translation: [25.267696380615234, 7.152557364165091e-07, 0], rotation: [2.6573591678654816e-18, -7.764472852959689e-18, -0.20289977789077512, 0.9791995098711366] },
    { name: 'Bip01_L_Hand', parent: 'Bip01_L_Forearm', translation: [24.015785217285142, -1.9073486399179274e-06, -7.629394545460855e-06], rotation: [-0.6739460401893342, 0.09311877019490472, 0.06876943272794729, 0.7296549833125112] },
    { name: 'Bip01_R_Clavicle', parent: 'Bip01_Neck', translation: [-4.631057739257841, 2.6462211608886577, -7.65049600601196], rotation: [-0.6058149146454602, 0.1508070613774847, 0.7712916709077493, 0.12391399364128927] },
    { name: 'Bip01_R_UpperArm', parent: 'Bip01_R_Clavicle', translation: [9.838586807250982, 3.552713678800501e-15, 0], rotation: [-0.07616582302691731, -0.2503736768957006, 0.008960208448198817, 0.9651069909522594] },
    { name: 'Bip01_R_Forearm', parent: 'Bip01_R_UpperArm', translation: [25.267692565917955, 2.3841857776929487e-07, -2.842170943040401e-14], rotation: [-2.3916233264226048e-17, 2.2905885635028958e-17, -0.2028997662948864, 0.9791995122739188] },
    { name: 'Bip01_R_Hand', parent: 'Bip01_R_Forearm', translation: [24.015781402587887, -1.9073486363652137e-06, 7.629394545460855e-06], rotation: [0.6739460202405083, -0.09311876237507692, 0.06876943948037285, 0.7296550020998072] },
  ],
};

function createAuditedBip01Rig(variant = 'male', { includeTorsoMesh = true, rootTransform = null } = {}) {
  const root = new THREE.Group();
  const armature = new THREE.Group();
  // In the real GLBs, Pelvis children are in centimeter units under a 0.01 scale armature
  const nodes = new Map();
  for (const entry of RIG_AUDIT_BONES[variant]) {
    const bone = new THREE.Bone();
    bone.name = entry.name;
    if (entry.parent === null) {
      bone.position.set(...entry.translation);
      bone.scale.setScalar(0.01);
      armature.add(bone);
    } else {
      bone.position.set(...entry.translation);
      nodes.get(entry.parent).add(bone);
    }
    bone.quaternion.set(...entry.rotation);
    nodes.set(entry.name, bone);
  }
  root.add(armature);
  root.updateMatrixWorld(true);

  if (includeTorsoMesh) {
    const allBones = [...nodes.values()];
    const spineIdx = allBones.indexOf(nodes.get('Bip01_Spine1'));
    const chestIdx = allBones.indexOf(nodes.get('Bip01_Spine2'));
    const positions = [];
    const skinIndices = [];
    const skinWeights = [];
    const rx = variant === 'male' ? 0.14 : 0.125;
    const rz = variant === 'male' ? 0.105 : 0.095;
    for (let iy = 0; iy <= 6; iy++) {
      const y = 0.85 + (iy / 6) * 0.52;
      for (let ia = 0; ia < 12; ia++) {
        const theta = (ia / 12) * Math.PI * 2;
        positions.push(Math.cos(theta) * rx, y, Math.sin(theta) * rz);
        skinIndices.push(spineIdx, chestIdx, 0, 0);
        skinWeights.push(0.5, 0.5, 0, 0);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
    const skeleton = new THREE.Skeleton(allBones);
    mesh.bind(skeleton, new THREE.Matrix4());
    root.add(mesh);
  }

  if (rootTransform) {
    if (rootTransform.position) root.position.set(...rootTransform.position);
    if (rootTransform.rotation) root.rotation.set(...rootTransform.rotation);
    if (rootTransform.scale) root.scale.setScalar(rootTransform.scale);
  }
  root.updateMatrixWorld(true);
  return createRig(root, BIP01_ADAPTER);
}

function assertAllArmBonesFinite(rig, label = '') {
  for (const role of ['LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'Spine', 'Head']) {
    const bone = rig.bones[role];
    if (!bone) continue;
    const q = bone.quaternion;
    for (const k of ['x', 'y', 'z', 'w']) {
      assert.equal(Number.isFinite(q[k]), true, `${label} ${role}.quaternion.${k} must be finite`);
    }
    const len = Math.hypot(q.x, q.y, q.z, q.w);
    assert.ok(Math.abs(len - 1) < 1e-3, `${label} ${role} quaternion must be normalized, got ${len}`);
  }
}

test('body-frame constraints derive semantic proportions and torso clearance for both male and female Bip01 rigs', () => {
  for (const variant of ['male', 'female']) {
    const rig = createAuditedBip01Rig(variant);
    const constraints = rig.constraints || createArmConstraints(rig);
    assert.ok(constraints, `${variant} should expose constraints`);
    assert.ok(constraints.shoulderHalfWidth > 0.12 && constraints.shoulderHalfWidth < 0.28, `${variant} shoulderHalfWidth out of range: ${constraints.shoulderHalfWidth}`);
    assert.ok(constraints.torso.safeRadiusX > 0.1 && constraints.torso.safeRadiusX < constraints.shoulderHalfWidth * 1.05, `${variant} safeRadiusX should be proportion-scaled`);
    assert.ok(constraints.torso.safeRadiusZ > 0.08 && constraints.torso.safeRadiusZ < constraints.shoulderHalfWidth * 0.95, `${variant} safeRadiusZ should be proportion-scaled`);

    const frame = getBodyFrame(rig);
    assert.ok(frame.left.distanceTo(new THREE.Vector3(1, 0, 0)) < 0.1, `${variant} body left should align with +X`);
    assert.ok(frame.up.distanceTo(new THREE.Vector3(0, 1, 0)) < 0.1, `${variant} body up should align with +Y`);
    assert.ok(frame.forward.distanceTo(new THREE.Vector3(0, 0, 1)) < 0.1, `${variant} body forward should align with +Z`);
  }
});

test('idle and speaking states keep root stationary, arms alongside body at rest, and bilateral gestures clear of torso', () => {
  for (const variant of ['male', 'female']) {
    const rig = createAuditedBip01Rig(variant);
    const anim = new AnimationController(rig);
    const initialRootPos = rig.root.position.clone();
    const initialRootQuat = rig.root.quaternion.clone();
    const initialHipsPos = rig.bones.Hips.position.clone();

    // Settled idle state
    anim.setState('idle');
    for (let i = 0; i < 60; i++) {
      rig.resetPose();
      anim.update(1 / 60, i / 60);
      assertAllArmBonesFinite(rig, `${variant} idle frame ${i}`);
      for (const side of ['left', 'right']) {
        const evalResult = evaluateArmClearance(rig, side);
        assert.ok(evalResult.minNormalizedDistance >= 0.98, `${variant} idle ${side} arm must clear torso, got ${evalResult.minNormalizedDistance}`);
        assert.ok(evalResult.elbowBend >= 0.05 && evalResult.elbowBend <= 2.45, `${variant} idle ${side} elbow bend bounded: ${evalResult.elbowBend}`);
      }
    }

    const leftIdleEval = evaluateArmClearance(rig, 'left');
    const rightIdleEval = evaluateArmClearance(rig, 'right');
    // At rest, hands hang comfortably below the shoulders alongside the torso
    assert.ok(leftIdleEval.handBody.y < leftIdleEval.shoulderBody.y - 0.3, `${variant} left hand should hang alongside body at rest`);
    assert.ok(rightIdleEval.handBody.y < rightIdleEval.shoulderBody.y - 0.3, `${variant} right hand should hang alongside body at rest`);

    // Speaking and explaining states: bilateral gestures in front of body without torso collision
    const leftForwardSamples = [];
    const rightForwardSamples = [];
    for (const state of ['speaking', 'explaining', 'listening', 'thinking', 'celebrating']) {
      anim.setState(state);
      for (let i = 0; i < 90; i++) {
        const t = 1 + i / 30;
        rig.resetPose();
        anim.update(1 / 30, t);
        assertAllArmBonesFinite(rig, `${variant} ${state} frame ${i}`);
        assert.ok(rig.root.position.equals(initialRootPos), 'Root position must remain stationary');
        assert.ok(rig.root.quaternion.equals(initialRootQuat), 'Root quaternion must remain stationary');
        assert.ok(rig.bones.Hips.position.distanceTo(initialHipsPos) < 1e-6, 'Hips position must remain stationary');

        for (const side of ['left', 'right']) {
          const evalResult = evaluateArmClearance(rig, side);
          assert.ok(
            evalResult.minNormalizedDistance >= 0.98,
            `${variant} ${state} ${side} arm segment penetrated torso at t=${t.toFixed(2)}: ${evalResult.minNormalizedDistance}`
          );
          if (state === 'speaking') {
            (side === 'left' ? leftForwardSamples : rightForwardSamples).push(evalResult.handBody.z);
          }
        }
      }
    }

    // Both arms should lift forward in speaking relative to idle rest and exhibit motion variation
    const maxLeftZ = Math.max(...leftForwardSamples);
    const maxRightZ = Math.max(...rightForwardSamples);
    const minRightZ = Math.min(...rightForwardSamples);
    // Updated teaching contract: the left hand may rest near its pocket while
    // the right hand explains, instead of requiring both arms to gesture.
    assert.ok(Number.isFinite(maxLeftZ), `${variant} resting hand must stay finite`);
    assert.ok(maxRightZ > rightIdleEval.handBody.z + 0.04, `${variant} speaking right hand should gesture in front of idle rest`);
    assert.ok(maxRightZ - minRightZ > 0.015, `${variant} free-hand speaking gestures should vary smoothly over time`);

    anim.dispose();
  }
});

test('unsafe external IK targets (inside chest, behind back, contralateral across chest) are deflected safely with outward elbows', () => {
  const rig = createAuditedBip01Rig('male');
  const ik = new IKController(rig);
  const frame = getBodyFrame(rig);

  const unsafeTargets = [
    { name: 'inside-chest-center', pos: frame.origin.clone().add(new THREE.Vector3(0, 0.08, 0.01)) },
    { name: 'behind-spine', pos: frame.origin.clone().add(new THREE.Vector3(0.05, 0.05, -0.25)) },
    { name: 'contralateral-across-chest', pos: frame.origin.clone().add(new THREE.Vector3(-0.28, 0.06, 0.02)) },
    { name: 'deep-inside-waist', pos: frame.origin.clone().add(new THREE.Vector3(0.02, -0.15, 0)) },
  ];

  for (const item of unsafeTargets) {
    const safeTarget = sanitizeHandTarget(rig, 'left', item.pos);
    assert.ok(safeTarget, `sanitizeHandTarget should return vector for ${item.name}`);

    ik.setHandTarget('left', item.pos, { weight: 1 });
    for (let i = 0; i < 30; i++) {
      rig.resetPose();
      ik.update(1 / 60);
    }

    assertAllArmBonesFinite(rig, `IK ${item.name}`);
    const clearance = evaluateArmClearance(rig, 'left');
    assert.ok(
      clearance.minNormalizedDistance >= 0.98,
      `IK target ${item.name} must not cause arm-torso penetration, got ${clearance.minNormalizedDistance}`
    );
    assert.ok(clearance.elbowBody.x > 0.05, `Left elbow should remain outward (+X in body frame) for ${item.name}, got ${clearance.elbowBody.x}`);
    assert.ok(clearance.elbowBend >= 0.08 && clearance.elbowBend <= 2.45, `Elbow bend must stay bounded for ${item.name}: ${clearance.elbowBend}`);
    assert.ok(clearance.wristDeviation <= 0.65, `Wrist deviation must stay bounded for ${item.name}: ${clearance.wristDeviation}`);
  }
});

test('body-frame constraints and final safety pass work after root rotation, translation, scale, and unsafe clip playback', () => {
  const rig = createAuditedBip01Rig('female', {
    rootTransform: {
      position: [2.4, -0.8, -1.7],
      rotation: [0.08, Math.PI * 0.65, -0.05],
      scale: 1.35,
    },
  });
  const anim = new AnimationController(rig);
  const ik = new IKController(rig);

  // Rotate root even further after createRig to verify live body-frame tracking
  rig.root.rotation.y = -Math.PI * 0.55;
  rig.root.position.set(-1.5, 0.4, 3.2);
  rig.root.scale.setScalar(0.85);
  rig.root.updateMatrixWorld(true);

  anim.setState('speaking');
  anim.playGesture('explain', { side: 'right', duration: 1.5 });
  const frame = getBodyFrame(rig);
  // Target dead-center inside the rotated/scaled/translated torso
  ik.setHandTarget('right', frame.origin.clone(), { weight: 1 });

  for (let i = 0; i < 40; i++) {
    rig.resetPose();
    anim.update(1 / 30, i / 30);
    ik.update(1 / 30);
    assertAllArmBonesFinite(rig, `transformed frame ${i}`);
    for (const side of ['left', 'right']) {
      const clearance = evaluateArmClearance(rig, side);
      assert.ok(
        clearance.minNormalizedDistance >= 0.98,
        `Transformed rig ${side} arm must clear torso at frame ${i}, got ${clearance.minNormalizedDistance}`
      );
    }
  }

  // Test final safety pass against an unsafe clip / pose that forces arm directly into the chest
  rig.resetPose();
  const unsafeTurn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -1.35);
  rig.bones.LeftUpperArm.quaternion.multiply(unsafeTurn);
  rig.bones.LeftLowerArm.quaternion.multiply(unsafeTurn);
  rig.root.updateMatrixWorld(true);
  enforceArmSafety(rig, 'left');
  const postClipClearance = evaluateArmClearance(rig, 'left');
  assert.ok(postClipClearance.minNormalizedDistance >= 0.98, `Final safety pass must push clip-driven arm out of torso, got ${postClipClearance.minNormalizedDistance}`);

  // Reduced motion disables periodic oscillation and auto-gesture triggers
  anim.cancelGestures();
  anim.reducedMotion = true;
  anim.setState('speaking');
  for (let i = 0; i < 40; i++) {
    rig.resetPose();
    anim.update(1 / 30, 10 + i * 0.5);
  }
  const q1 = rig.bones.LeftUpperArm.quaternion.clone();
  rig.resetPose();
  anim.update(1 / 30, 35.0);
  const q2 = rig.bones.LeftUpperArm.quaternion.clone();
  assert.equal(anim.gesture, null, 'Reduced motion should not auto-trigger periodic gestures');
  assert.ok(q1.angleTo(q2) < 1e-4, 'Reduced motion pose should settle without oscillation');

  anim.dispose();
  ik.dispose();
});
