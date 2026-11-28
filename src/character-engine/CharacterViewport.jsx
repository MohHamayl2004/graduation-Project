import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { CharacterManager } from './CharacterManager.js';
import { AVATARS } from './avatars.js';
import { AnimationController } from './AnimationController.js';
import { IKController } from './IKController.js';
import { FaceController } from './FaceController.js';
import { SilhouetteOutline } from './SilhouetteOutline.js';
import { HandPoseController } from './HandPoseController.js';

export const CharacterViewport = forwardRef(function CharacterViewport({ avatarId = 'male', state = 'idle', framing = 'full', className = '', onReady, onError, onFrame, reducedMotion, outline = true }, forwardedRef) {
  const host = useRef(null), runtime = useRef(null), props = useRef(null);
  props.current = { state, framing, onReady, onError, onFrame, reducedMotion, outline };
  useImperativeHandle(forwardedRef, () => ({
    getControllers: () => runtime.current?.controllers || null,
    setCharacter: id => runtime.current?.load(id),
    getSnapshot: () => runtime.current?.snapshot() || { ready: false },
    pointAtElement: (element, side = 'right') => runtime.current?.pointAtElement(element, side),
    hitTest: (x,y) => runtime.current?.hitTest(x,y) || false,
  }), []);

  useEffect(() => {
    const element = host.current;
    let disposed = false, frame, renderer, observer, intersection, current, controllers, visible = true, last = 0, renderedAt = 0, elapsed = 0;
    let selected = null, requested = null, loading = false, error = null, loadError = null;
    const manager = new CharacterManager(), scene = new THREE.Scene();
    const silhouette = new SilhouetteOutline();
    const camera = new THREE.PerspectiveCamera(30, 1, .01, 100);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clearControllers = () => { controllers?.animation.dispose(); controllers?.ik.dispose(); controllers?.face.dispose(); controllers?.hands.dispose(); controllers = null; };
    const fail = (reason, fatal = true) => {
      if (disposed) return;
      const message = reason?.message || '3D character unavailable';
      if (fatal) error = message; else loadError = message;
      element.dataset.status = current && !fatal ? 'ready' : 'error';
      props.current.onError?.(reason instanceof Error ? reason : new Error(message));
    };
    const placeCamera = () => {
      const portrait = props.current.framing === 'portrait';
      const distance = portrait ? 2.1 : Math.max(3.8, 2.2 / Math.max(.45, camera.aspect));
      camera.position.set(0, portrait ? 1.34 : .94, distance);
      camera.lookAt(0, portrait ? 1.34 : .88, 0); camera.updateProjectionMatrix();
    };
    const resize = () => {
      if (!renderer || !element.clientWidth || !element.clientHeight) return;
      renderer.setSize(element.clientWidth, element.clientHeight, false);
      silhouette.setSize(element.clientWidth, element.clientHeight, renderer.getPixelRatio());
      camera.aspect = element.clientWidth / element.clientHeight; placeCamera();
    };
    const snapshot = () => ({
      ready: Boolean(current && !error), loading, error: error || loadError, avatarId: selected, requestedAvatarId: requested, animationState: controllers?.animation.state, clip: controllers?.animation.activeAction?.getClip().name || null,
      capabilities: current?.rig.capabilities || {}, warnings: current?.rig.warnings || [],
      outline: silhouette.getDiagnostics(),
      speech: controllers?.face.getSpeechDiagnostics?.() || { mode: 'unavailable' },
      teaching: controllers?.animation.getTeachingSnapshot?.() || null,
      fingers: controllers?.hands.getDiagnostics() || {},
      bones: Object.fromEntries(Object.entries(current?.rig.bones || {}).map(([role, bone]) => [role, { quaternion: bone.quaternion.toArray(), worldPosition: bone.getWorldPosition(new THREE.Vector3()).toArray() }])),
      morphs: Object.fromEntries(Object.entries(current?.rig.morphs || {}).map(([role, bindings]) => [role, bindings[0]?.mesh.morphTargetInfluences[bindings[0].index] || 0])),
      renderer: renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures } : null,
    });
    const load = async id => {
      const descriptor = typeof id === 'string' ? AVATARS[id] : id;
      if (!descriptor) { fail(new Error('Unknown character descriptor'), false); return null; }
      requested = descriptor.id; loading = true; element.dataset.status = 'loading';
      try {
        const next = await manager.load(descriptor); if (disposed || !next) return null;
        clearControllers(); current = next; selected = descriptor.id; error = null; loadError = null;
        scene.add(next.root);
        silhouette.syncCharacter(next.root);
        controllers = { rig: next.rig, animation: new AnimationController(next.rig, { clips: next.animations, root: next.scene }), ik: new IKController(next.rig), face: new FaceController(next.rig), hands:new HandPoseController(next.rig) };
        controllers.animation.setState(props.current.state); runtime.current.controllers = controllers;
        loading = false; element.dataset.status = 'ready';
        props.current.onReady?.(runtime.current); return next;
      } catch (reason) { loading = false; fail(reason, false); return null; }
    };
    const pointAtElement = (target, side = 'right') => {
      if (!target || !controllers) return false;
      const rect = target.getBoundingClientRect(), bounds = element.getBoundingClientRect();
      // DOM targets can sit outside the canvas (for example in the book).
      const x = ((rect.left + rect.width / 2 - bounds.left) / Math.max(1, bounds.width)) * 2 - 1;
      const y = -((rect.top + rect.height / 2 - bounds.top) / Math.max(1, bounds.height)) * 2 + 1;
      const point = new THREE.Vector3(THREE.MathUtils.clamp(x, -1.5, 1.5), THREE.MathUtils.clamp(y, -1.5, 1.5), .5).unproject(camera);
      const ray = point.sub(camera.position).normalize();
      const distance = (.4 - camera.position.z) / Math.min(-.01, ray.z);
      const world = camera.position.clone().addScaledVector(ray, distance);
      controllers.ik.setLookTarget(world, { duration: 2.2 }); controllers.face.setLookTarget(world, { duration: 2.2 });
      controllers.animation.playGesture('point', { side }); return controllers.ik.setHandTarget(side, world, { duration: 2.2 });
    };
    runtime.current = { load, snapshot, pointAtElement, resize, controllers: null, getControllers: () => controllers, getSnapshot: snapshot, setCharacter: load };
    const hitRay=new THREE.Raycaster(),hitPoint=new THREE.Vector2();
    runtime.current.hitTest=(x,y)=>{
      if(!renderer||!current)return false;
      const rect=renderer.domElement.getBoundingClientRect();
      if(!rect.width||!rect.height||x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return false;
      hitPoint.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);
      camera.updateMatrixWorld();hitRay.setFromCamera(hitPoint,camera);
      return hitRay.intersectObject(current.root,true).length>0;
    };
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const contextLost = event => { event.preventDefault(); fail(new Error('WebGL context lost')); };
      renderer.domElement.addEventListener('webglcontextlost', contextLost); element.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x84948a, 2.5));
      const light = new THREE.DirectionalLight(0xfff1df, 3); light.position.set(2, 3, 4); scene.add(light);
      observer = new ResizeObserver(resize); observer.observe(element);
      intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); intersection.observe(element);
      resize(); load(avatarId);
      const render = now => {
        if (disposed) return; frame = requestAnimationFrame(render);
        const delta = Math.min((now - (last || now)) / 1000, .05); last = now;
        const reduced = props.current.reducedMotion ?? motion.matches;
        if (!visible || document.hidden || error || now - renderedAt < (reduced ? 1000 / 30 : 1000 / 60)) return;
        const frameDelta = Math.min((now - (renderedAt || now)) / 1000, .1); renderedAt = now;
        if (!reduced) elapsed += frameDelta || delta;
        try {
          if (controllers) {
            controllers.rig.resetPose(); controllers.animation.reducedMotion = reduced; controllers.face.reducedMotion = reduced;
            props.current.onFrame?.(frameDelta, elapsed);
            controllers.animation.update(frameDelta, elapsed); controllers.ik.update(frameDelta); controllers.hands.update(controllers.animation.getTeachingSnapshot()); controllers.face.update(frameDelta, elapsed);
          }
          silhouette.setEnabled(props.current.outline);
          silhouette.render(renderer, scene, camera);
        } catch (reason) { fail(reason); }
      };
      frame = requestAnimationFrame(render);
      runtime.current.removeContextListener = () => renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    } catch (reason) { fail(reason); }
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer?.disconnect(); intersection?.disconnect();
      runtime.current?.removeContextListener?.(); clearControllers(); silhouette.dispose(); manager.dispose();
      renderer?.dispose(); renderer?.forceContextLoss(); renderer?.domElement.remove(); runtime.current = null;
    };
  }, []);
  useEffect(() => { const runtimeValue = runtime.current; if (runtimeValue && runtimeValue.snapshot().requestedAvatarId !== avatarId) runtimeValue.load(avatarId); }, [avatarId]);
  useEffect(() => { runtime.current?.controllers?.animation.setState(state); }, [state]);
  useEffect(() => { runtime.current?.resize(); }, [framing]);
  return <span ref={host} className={className} style={{ display: 'block', width: '100%', height: '100%' }} data-character-viewport="true" />;
});

export default CharacterViewport;
