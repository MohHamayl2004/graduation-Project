import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SilhouetteOutline } from '../src/character-engine/SilhouetteOutline.js';
import { disposeCharacter } from '../src/character-engine/CharacterManager.js';

function createSkinnedAvatarScene(name = 'avatar') {
  const root = new THREE.Group();
  root.name = name;
  const pelvis = new THREE.Bone();
  pelvis.name = 'Bip01_Pelvis';
  const spine = new THREE.Bone();
  spine.name = 'Bip01_Spine';
  spine.position.set(0, 0.5, 0);
  pelvis.add(spine);
  root.add(pelvis);

  const geometry = new THREE.BoxGeometry(0.4, 1.2, 0.25);
  const vertexCount = geometry.attributes.position.count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Array(vertexCount * 4).fill(0), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(
    Array.from({ length: vertexCount * 4 }, (_, i) => (i % 4 === 0 ? 1 : 0)),
    4
  ));
  geometry.morphAttributes.position = [geometry.attributes.position.clone()];

  const material = new THREE.MeshStandardMaterial({ color: 0x2d6a4f });
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.morphTargetDictionary = { jawOpen: 0 };
  mesh.morphTargetInfluences = [0];
  const skeleton = new THREE.Skeleton([pelvis, spine]);
  mesh.bind(skeleton);
  root.add(mesh);
  root.updateMatrixWorld(true);

  return { root, mesh, skeleton, geometry, material };
}

function createMockRenderer() {
  const calls = [];
  let currentTarget = null;
  const clearColor = new THREE.Color(0x000000);
  let clearAlpha = 0;

  return {
    calls,
    autoClear: true,
    info: {
      autoReset: true,
      render: { calls: 0, triangles: 0 },
      memory: { geometries: 0, textures: 0 },
      reset() {
        this.render.calls = 0;
        this.render.triangles = 0;
      },
    },
    getPixelRatio: () => 1.5,
    getSize: target => target.set(400, 600),
    getRenderTarget: () => currentTarget,
    setRenderTarget: target => {
      currentTarget = target;
      calls.push({ type: 'setRenderTarget', target: target ? 'offscreen' : null });
    },
    getClearColor: target => target.copy(clearColor),
    getClearAlpha: () => clearAlpha,
    setClearColor: (color, alpha = 1) => {
      clearColor.copy(color);
      clearAlpha = alpha;
    },
    clear: () => {
      calls.push({ type: 'clear', target: currentTarget ? 'offscreen' : null });
    },
    clearDepth: () => {
      calls.push({ type: 'clearDepth', target: currentTarget ? 'offscreen' : null });
    },
    render: (scene, camera) => {
      calls.push({
        type: 'render',
        target: currentTarget ? 'offscreen' : null,
        sceneName: scene.name || 'scene',
        cameraType: camera?.type,
      });
      if (!currentTarget) {
        // Simulate main scene triangle count
        scene.traverse(node => {
          if (node.isMesh) {
            calls.at(-1).meshRendered = true;
          }
        });
      }
    },
  };
}

test('SilhouetteOutline configures transparent exterior-only white halo shader and diagnostics', () => {
  const outline = new SilhouetteOutline({ width: 2.5, opacity: 0.85, color: 0xffffff });
  const diag = outline.getDiagnostics();

  assert.equal(diag.enabled, true);
  assert.equal(diag.mode, 'alpha-halo');
  assert.equal(diag.width, 2.5);
  assert.equal(diag.color, '#ffffff');
  assert.equal(diag.disposed, false);

  // Verify shader guards against filling interior (centerAlpha) or transparent background
  const frag = outline.haloMaterial.fragmentShader;
  assert.ok(frag.includes('centerAlpha'), 'Fragment shader must sample centerAlpha to exclude character interior');
  assert.ok(frag.includes('discard'), 'Fragment shader must discard empty background pixels to prevent rectangular backing');

  outline.dispose();
  assert.equal(outline.getDiagnostics().disposed, true);
});

test('SilhouetteOutline tracks avatar swaps without mutating or disposing shared skeletons or geometries', () => {
  const outline = new SilhouetteOutline();
  const male = createSkinnedAvatarScene('male');
  const female = createSkinnedAvatarScene('female');

  let maleSkeletonDisposed = 0;
  let maleGeometryDisposed = 0;
  const origSkeletonDispose = male.skeleton.dispose.bind(male.skeleton);
  male.skeleton.dispose = () => {
    maleSkeletonDisposed++;
    origSkeletonDispose();
  };
  male.geometry.addEventListener('dispose', () => {
    maleGeometryDisposed++;
  });

  outline.syncCharacter(male.root);
  assert.equal(outline.getDiagnostics().skinnedMeshes, 1);
  assert.equal(outline.getDiagnostics().morphMeshes, 1);
  assert.equal( outline.getDiagnostics().active, true);

  // Swap to female avatar before disposing male
  outline.syncCharacter(female.root);
  assert.equal(maleSkeletonDisposed, 0, 'Swapping outline character must not dispose previous skeleton prematurely');
  assert.equal(maleGeometryDisposed, 0, 'Swapping outline character must not dispose previous geometry prematurely');
  assert.equal(outline.getDiagnostics().skinnedMeshes, 1);

  // Disposing male through CharacterManager's disposeCharacter cleans up male without breaking female outline
  disposeCharacter(male.root);
  assert.equal(maleSkeletonDisposed, 1);
  assert.equal(maleGeometryDisposed, 1);
  assert.equal(outline.getDiagnostics().active, true);

  outline.dispose();
  disposeCharacter(female.root);
});

test('SilhouetteOutline resizes bounded render target, executes mask+halo+scene passes, and cleans up resources', () => {
  const outline = new SilhouetteOutline({ width: 3, opacity: 0.8 });
  const avatar = createSkinnedAvatarScene('male');
  const scene = new THREE.Scene();
  scene.name = 'main-scene';
  scene.add(avatar.root);
  const camera = new THREE.PerspectiveCamera(30, 400 / 600, 0.01, 100);
  const renderer = createMockRenderer();

  outline.syncCharacter(avatar.root);
  outline.setSize(400, 600, 1.5);
  const diagAfterResize = outline.getDiagnostics();
  assert.deepEqual(diagAfterResize.targetSize, [600, 900]);

  outline.render(renderer, scene, camera);
  assert.equal(outline.getDiagnostics().renderCount, 1);
  assert.equal(renderer.getRenderTarget(), null, 'Render target must be restored to null after outline render');
  assert.equal(renderer.autoClear, true, 'renderer.autoClear must be restored after outline render');

  const renderSteps = renderer.calls.filter(c => c.type === 'render');
  assert.equal(renderSteps.length, 3, 'Expected offscreen mask pass, screen halo pass, and main scene pass');
  assert.equal(renderSteps[0].target, 'offscreen');
  assert.equal(renderSteps[1].target, null);
  assert.equal(renderSteps[1].sceneName, 'silhouette-halo-scene');
  assert.equal(renderSteps[2].target, null);
  assert.equal(renderSteps[2].sceneName, 'main-scene');

  // When disabled, renders only the main scene directly without offscreen pass
  renderer.calls.length = 0;
  outline.setEnabled(false);
  outline.render(renderer, scene, camera);
  const disabledSteps = renderer.calls.filter(c => c.type === 'render');
  assert.equal(disabledSteps.length, 1);
  assert.equal(disabledSteps[0].sceneName, 'main-scene');

  // Verify GPU resource disposal
  let rtDisposed = 0;
  let geoDisposed = 0;
  let matDisposed = 0;
  outline.renderTarget.addEventListener('dispose', () => rtDisposed++);
  outline.quadGeometry.addEventListener('dispose', () => geoDisposed++);
  outline.haloMaterial.addEventListener('dispose', () => matDisposed++);

  outline.dispose();
  assert.equal(rtDisposed, 1, 'WebGLRenderTarget must be disposed');
  assert.equal(geoDisposed, 1, 'Quad geometry must be disposed');
  assert.equal(matDisposed, 1, 'Halo ShaderMaterial must be disposed');
  disposeCharacter(avatar.root);
});
