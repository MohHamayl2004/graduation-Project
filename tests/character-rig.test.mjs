import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRig } from '../src/character-engine/rig.js';
import { CharacterManager } from '../src/character-engine/CharacterManager.js';

function avatar() {
  const root = new THREE.Group();
  const hips = new THREE.Bone(); hips.name = 'Hips'; root.add(hips);
  const spine = new THREE.Bone(); spine.name = 'Spine'; hips.add(spine);
  const head = new THREE.Bone(); head.name = 'Head'; head.position.y = 1; spine.add(head);
  for (const side of ['Left', 'Right']) {
    let parent = spine;
    for (const part of ['UpperArm', 'LowerArm', 'Hand']) {
      const bone = new THREE.Bone(); bone.name = side + part; bone.position.x = side === 'Left' ? .3 : -.3;
      parent.add(bone); parent = bone;
    }
  }
  root.updateMatrixWorld(true);
  return { scene: root, animations: [] };
}

test('semantic rig restores authored transforms and detects arm capabilities', () => {
  const { scene } = avatar(); const rig = createRig(scene);
  assert.equal(rig.capabilities.leftArm, true); assert.equal(rig.capabilities.rightArm, true);
  const bone = rig.bones.LeftLowerArm; const rest = bone.position.clone();
  bone.position.set(8, 8, 8); bone.rotation.set(1, 1, 1); rig.resetPose();
  assert.ok(bone.position.distanceTo(rest) < 1e-9); assert.ok(bone.quaternion.angleTo(new THREE.Quaternion()) < 1e-9);
});

test('missing or disconnected arm chains degrade independently with useful warnings', () => {
  const { scene } = avatar(); const hand = scene.getObjectByName('LeftHand'); scene.add(hand);
  const rig = createRig(scene);
  assert.equal(rig.capabilities.leftArm, false); assert.equal(rig.capabilities.rightArm, true);
  assert.ok(rig.warnings.some(x => /left.*arm/i.test(x)));
  assert.equal(rig.capabilities.blink, false); assert.doesNotThrow(() => rig.resetPose());
});

test('a model load failure preserves the current avatar', async () => {
  const manager = new CharacterManager({ loadAsset: async d => { if (d.id === 'bad') throw new Error('bad model'); return avatar(); } });
  const first = await manager.load({ id: 'first', url: '/first.glb' });
  await assert.rejects(manager.load({ id: 'bad', url: '/bad.glb' }), /bad model/);
  assert.equal(manager.current, first); manager.dispose(); assert.equal(manager.current, null);
});

test('a superseded load is disposed and cannot replace the newer avatar', async () => {
  let resolve; let releases = 0;
  const slow = avatar(); const geometry = new THREE.BoxGeometry(); geometry.addEventListener('dispose', () => releases++);
  slow.scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
  const manager = new CharacterManager({ loadAsset: d => d.id === 'slow' ? new Promise(r => { resolve = r; }) : Promise.resolve(avatar()) });
  const pending = manager.load({ id: 'slow', url: '/slow.glb' });
  await manager.load({ id: 'fast', url: '/fast.glb' }); resolve(slow);
  assert.equal(await pending, null); assert.equal(manager.current.avatar.id, 'fast'); assert.equal(releases, 1);
  manager.dispose();
});

test('the default loader accepts relative asset URLs for replacement avatars', async t => {
  const original = globalThis.fetch;
  const bytes = new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }], nodes: [] })).buffer;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => bytes }); t.after(() => { globalThis.fetch = original; });
  const manager = new CharacterManager();
  const model = await manager.load({ id: 'relative-test', url: './replacement-test.glb' });
  assert.equal(model.avatar.id, 'relative-test'); manager.dispose();
});
