// Load the actual asset's geometry/skin in Node without browser-only textures.
// This changes an in-memory GLB copy, never the source model.
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { CharacterManager } from '../../src/character-engine/CharacterManager.js';

export async function loadCharacterFixture(id) {
  const bytes = readFileSync(new URL(`../../src/assets/images/${id}.glb`, import.meta.url));
  const size = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + size).toString());
  delete json.images; delete json.textures; delete json.materials;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  const text = Buffer.from(JSON.stringify(json)), padding = Buffer.alloc((4 - text.length % 4) % 4, 32);
  const body = Buffer.concat([text, padding]), tail = bytes.subarray(20 + size), header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + body.length + tail.length, 8);
  header.writeUInt32LE(body.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const copy = Buffer.concat([header, body, tail]);
  const manager = new CharacterManager({ loadAsset: () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength), '') });
  const character = await manager.load({ id, url: 'fixture', adapter: 'bip01', height: 1.7 });
  return { ...character, dispose: () => manager.dispose() };
}
