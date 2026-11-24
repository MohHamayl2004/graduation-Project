import * as THREE from 'three';

// Actual rendered alpha includes every skinned/morphed silhouette. No cloned
// skeletons, geometry mutations or rectangular backing are needed.
export class SilhouetteOutline {
  constructor({ width = 2.5, opacity = .75, color = 0xffffff, enabled = true } = {}) {
    this.width = THREE.MathUtils.clamp(width, 0, 5); this.opacity = THREE.MathUtils.clamp(opacity, 0, 1);
    this.color = new THREE.Color(color); this.enabled = enabled; this.disposed = false; this.renderCount = 0;
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, samples: 4 });
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.haloMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
      uniforms: { image: { value: this.renderTarget.texture }, texel: { value: new THREE.Vector2(1, 1) }, radius: { value: this.width }, opacity: { value: this.opacity }, color: { value: this.color } },
      vertexShader: 'varying vec2 uvScreen; void main(){ uvScreen=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
      fragmentShader: `precision highp float;
        uniform sampler2D image; uniform vec2 texel; uniform float radius; uniform float opacity; uniform vec3 color; varying vec2 uvScreen;
        void main(){
          float centerAlpha=texture2D(image,uvScreen).a; float coverage=0.0;
          for(int i=0;i<12;i++){
            float angle=float(i)*6.28318530718/12.0;
            vec2 direction=vec2(cos(angle),sin(angle))*texel*radius;
            coverage=max(coverage,texture2D(image,uvScreen+direction).a*.72);
            coverage=max(coverage,texture2D(image,uvScreen+direction*.55).a);
          }
          float alpha=coverage*(1.0-centerAlpha)*opacity;
          if(alpha<.005) discard;
          gl_FragColor=vec4(color,alpha);
        }`,
    });
    this.scene = new THREE.Scene(); this.scene.name = 'silhouette-halo-scene';
    this.scene.add(new THREE.Mesh(this.quadGeometry, this.haloMaterial));
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  syncCharacter(root) {
    this.root = root; this.skinnedMeshes = 0; this.morphMeshes = 0;
    root?.traverse(node => { if (node.isSkinnedMesh) this.skinnedMeshes++; if (node.morphTargetInfluences?.length) this.morphMeshes++; });
  }
  setEnabled(value) { this.enabled = Boolean(value); }
  setSize(width, height, pixelRatio = 1) {
    const ratio = Math.min(Math.max(.5, pixelRatio), 1.5, 2048 / Math.max(1, width, height));
    const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
    this.renderTarget.setSize(w, h); this.haloMaterial.uniforms.texel.value.set(1 / w, 1 / h);
    this.haloMaterial.uniforms.radius.value = this.width * ratio;
  }
  getDiagnostics() {
    return { enabled: this.enabled, mode: 'alpha-halo', active: Boolean(this.root && !this.disposed), width: this.width, color: `#${this.color.getHexString()}`, skinnedMeshes: this.skinnedMeshes || 0, morphMeshes: this.morphMeshes || 0, targetSize: [this.renderTarget.width, this.renderTarget.height], renderCount: this.renderCount, disposed: this.disposed };
  }
  render(renderer, scene, camera) {
    if (!this.enabled || this.disposed || !this.root) { renderer.render(scene, camera); return; }
    const target = renderer.getRenderTarget(), autoClear = renderer.autoClear, autoReset = renderer.info.autoReset;
    const clearColor = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha(), background = scene.background;
    try {
      renderer.info.autoReset = false; renderer.info.reset(); renderer.autoClear = true; scene.background = null;
      renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(this.renderTarget); renderer.clear(); renderer.render(scene, camera);
      renderer.setRenderTarget(target); renderer.clear(); renderer.render(this.scene, this.camera);
      renderer.autoClear = false; renderer.clearDepth(); renderer.render(scene, camera); this.renderCount++;
    } finally {
      scene.background = background; renderer.setRenderTarget(target); renderer.setClearColor(clearColor, clearAlpha);
      renderer.autoClear = autoClear; renderer.info.autoReset = autoReset;
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.root = null; this.renderTarget.dispose(); this.quadGeometry.dispose(); this.haloMaterial.dispose(); this.scene.clear();
  }
}
