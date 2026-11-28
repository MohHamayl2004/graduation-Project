import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ADAPTERS, STANDARD_ADAPTER } from './adapters.js';
import { createRig } from './rig.js';

const byteCache = new Map();
async function loadAsset(descriptor) {
  const url = new URL(descriptor.url, globalThis.location?.href || import.meta.url).href;
  if (!byteCache.has(url)) {
    const bytes = fetch(url).then(response => {
      if (!response.ok) throw new Error(`Character download failed (${response.status})`);
      return response.arrayBuffer();
    }).catch(error => { byteCache.delete(url); throw error; });
    byteCache.set(url, bytes);
    if (byteCache.size > 4) byteCache.delete(byteCache.keys().next().value);
  }
  const bytes = await byteCache.get(url);
  const resourcePath = /^(blob:|data:)/.test(url) ? '' : new URL('.', url).href;
  return new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.slice(0), resourcePath);
}

export function disposeCharacter(root) {
  const resources = new Set();
  root.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of node.material ? [].concat(node.material) : []) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
    if (node.skeleton) resources.add(node.skeleton);
  });
  root.removeFromParent();
  resources.forEach(resource => resource.dispose?.());
}

export class CharacterManager {
  constructor(options = {}) { this.loadAsset = options.loadAsset || loadAsset; this.current = null; this.generation = 0; }

  async load(avatar) {
    if (!avatar?.url) throw new Error('A character asset URL is required.');
    const generation = ++this.generation;
    let gltf;
    try { gltf = await this.loadAsset(avatar); }
    catch (error) { if (generation !== this.generation) return null; throw error; }
    if (generation !== this.generation) { disposeCharacter(gltf.scene); return null; }
    const root = new THREE.Group(); root.name = `avatar:${avatar.id}`; root.add(gltf.scene);
    if (avatar.orientation) root.rotation.set(...avatar.orientation);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true);
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
      const scale = (avatar.height || 1.7) / Math.max(size.y, 0.001);
      root.scale.setScalar(scale); root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    }
    root.updateMatrixWorld(true);
    const adapter = typeof avatar.adapter === 'object' ? avatar.adapter : ADAPTERS[avatar.adapter] || STANDARD_ADAPTER;
    const rig = createRig(root, adapter, avatar.calibration);
    let disposed = false;
    const handle = { root, scene: gltf.scene, rig, animations: gltf.animations || [], avatar,
      dispose() { if (!disposed) { disposed = true; disposeCharacter(root); } },
    };
    const previous = this.current; this.current = handle; previous?.dispose();
    return handle;
  }

  dispose() { this.generation++; this.current?.dispose(); this.current = null; }
}
