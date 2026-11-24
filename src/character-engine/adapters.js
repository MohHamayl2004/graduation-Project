// Asset naming and calibration belong here, never inside animation controllers.
const roles = ['Hips', 'Spine', 'Chest', 'UpperChest', 'Neck', 'Head', 'LeftShoulder', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand', 'RightShoulder', 'RightUpperArm', 'RightLowerArm', 'RightHand', 'LeftEye', 'RightEye'];
const morphAliases = {
  blinkLeft: ['eyeBlinkLeft'], blinkRight: ['eyeBlinkRight'], jawOpen: ['jawOpen'],
  smileLeft: ['mouthSmileLeft'], smileRight: ['mouthSmileRight'], browInnerUp: ['browInnerUp'],
  visemeAA: ['viseme_aa'], visemeE: ['viseme_E'], visemeI: ['viseme_I'], visemeO: ['viseme_O'], visemeU: ['viseme_U'], visemePP: ['viseme_PP'], visemeSil: ['viseme_sil'],
  visemeFF: ['viseme_FF'], visemeTH: ['viseme_TH'], visemeDD: ['viseme_DD'], visemeKK: ['viseme_kk'], visemeCH: ['viseme_CH'], visemeSS: ['viseme_SS'], visemeNN: ['viseme_nn'], visemeRR: ['viseme_RR'],
};
for (const side of ['Left', 'Right']) for (const direction of ['Up', 'Down', 'In', 'Out']) morphAliases[`look${direction}${side}`] = [`eyeLook${direction}${side}`];

export const STANDARD_ADAPTER = {
  id: 'standard',
  bones: Object.fromEntries(roles.map(role => [role, [role, role[0].toLowerCase() + role.slice(1)]])),
  morphs: morphAliases,
  calibration: {
    armDirections: { left: [0.22, -0.96, 0.08], right: [-0.22, -0.96, 0.08] },
    forearmDirections: { left: [0.16, -0.92, 0.34], right: [-0.16, -0.92, 0.34] },
    elbowPoles: { left: [0.35, -0.2, -0.9], right: [-0.35, -0.2, -0.9] },
    armLimits: { shoulder: 2.1, minElbowBend: 0.12, maxElbowBend: 2.35, wrist: 0.5 },
    headLimits: { yaw: 0.65, pitch: 0.35, roll: 0.2 },
    postureLimits: { lean: 0.15, twist: 0.3, sway: 0.12 },
  },
};

export const BIP01_ADAPTER = {
  ...STANDARD_ADAPTER,
  id: 'bip01',
  bones: {
    Hips: ['Bip01_Pelvis'], Spine: ['Bip01_Spine'], Chest: ['Bip01_Spine1'], UpperChest: ['Bip01_Spine2'], Neck: ['Bip01_Neck'], Head: ['Head'],
    LeftShoulder: ['Bip01_L_Clavicle'], LeftUpperArm: ['Bip01_L_UpperArm'], LeftLowerArm: ['Bip01_L_Forearm'], LeftHand: ['Bip01_L_Hand'],
    RightShoulder: ['Bip01_R_Clavicle'], RightUpperArm: ['Bip01_R_UpperArm'], RightLowerArm: ['Bip01_R_Forearm'], RightHand: ['Bip01_R_Hand'],
    LeftEye: ['Bip01_LEye'], RightEye: ['Bip01_REye'],
  },
  fingers: Object.fromEntries(['left','right'].map(side => {
    const prefix = side === 'left' ? 'Bip01_L_' : 'Bip01_R_';
    return [side, { thumb: `${prefix}Finger0`, fingers: [1,2,3,4].map(index => `${prefix}Finger${index}`) }];
  })),
};

export const ADAPTERS = { standard: STANDARD_ADAPTER, bip01: BIP01_ADAPTER };
