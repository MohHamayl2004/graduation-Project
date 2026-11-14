import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import modelUrl from "../../../assets/images/male.glb?url";
import { mascotConfig } from "../../../config/mascotConfig";
import { animateMouth, teacherState } from "../teacherAnimation";

let modelBytes;
function loadModel() {
  // Cache bytes, not GPU resources: every mount owns and disposes its scene.
  modelBytes ||= fetch(modelUrl).then((response) => {
    if (!response.ok) throw new Error("Teacher model unavailable");
    return response.arrayBuffer();
  }).catch((error) => { modelBytes = null; throw error; });
  return modelBytes.then((bytes) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes, ""));
}

function disposeModel(model) {
  const resources = new Set();
  model?.traverse((node) => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of node.material ? [].concat(node.material) : []) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
    if (node.skeleton) resources.add(node.skeleton);
  });
  resources.forEach((resource) => resource.dispose());
}

export default function TeacherCharacter({ speechPlayback, idleOnly = false }) {
  const host = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const currentState = useRef(teacherState(speechPlayback));
  currentState.current = teacherState(speechPlayback);

  useEffect(() => {
    const element = host.current;
    let renderer, model, frame, observer, visibility;
    let disposed = false, visible = true, last = 0, dirty = true, renderedReduced = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
    const meshes = [];
    const fail = () => {
      if (disposed) return;
      cancelAnimationFrame(frame);
      setFailed(true);
    };
    const resize = () => {
      if (!renderer || !element.clientWidth || !element.clientHeight) return;
      renderer.setSize(element.clientWidth, element.clientHeight, false);
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      dirty = true;
    };
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setClearColor(0, 0);
      renderer.domElement.addEventListener("webglcontextlost", fail);
      element.appendChild(renderer.domElement);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x879baf, 2.5));
      const light = new THREE.DirectionalLight(0xfff1df, 3);
      light.position.set(2, 3, 4);
      scene.add(light);
      observer = new ResizeObserver(resize);
      observer.observe(element);
      visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
      visibility.observe(element);
      resize();
      loadModel().then((gltf) => {
        if (disposed) { disposeModel(gltf.scene); return; }
        model = gltf.scene;
        scene.add(model);
        model.updateMatrixWorld(true);
        // Relax the supplied arms-out bind pose using its actual skeleton.
        for (const side of ["L", "R"]) {
          const arm = model.getObjectByName(`Bip01_${side}_UpperArm`);
          const forearm = model.getObjectByName(`Bip01_${side}_Forearm`);
          if (!arm || !forearm) continue;
          const direction = forearm.getWorldPosition(new THREE.Vector3()).sub(arm.getWorldPosition(new THREE.Vector3())).normalize();
          const down = new THREE.Vector3(side === "L" ? 0.12 : -0.12, -1, 0.08).normalize();
          const turn = new THREE.Quaternion().setFromUnitVectors(direction, down);
          const world = arm.getWorldQuaternion(new THREE.Quaternion()).premultiply(turn);
          arm.quaternion.copy(arm.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
          model.updateMatrixWorld(true);
        }
        model.traverse((node) => node.skeleton?.update());
        const box = new THREE.Box3().setFromObject(model, true);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // Preserve the existing upper-body framing.
        const target = new THREE.Vector3(center.x, box.min.y + size.y * 0.79, center.z);
        camera.position.set(target.x, target.y, box.max.z + size.y * 1.2);
        camera.lookAt(target);
        model.traverse((node) => { if (node.morphTargetDictionary) meshes.push(node); });
        const render = (now) => {
          if (disposed) return;
          frame = requestAnimationFrame(render);
          const delta = Math.min((now - (last || now)) / 1000, 0.05);
          last = now;
          if (!visible || document.hidden) return;
          if (reduced.matches && renderedReduced && !dirty) return;
          try {
            const speaking = currentState.current === "speaking" && !reduced.matches;
            const time = now / 1000;
            animateMouth(meshes, speaking, time, delta);
            renderer.render(scene, camera);
            renderedReduced = reduced.matches;
            dirty = false;
          } catch { fail(); }
        };
        setLoaded(true);
        frame = requestAnimationFrame(render);
      }).catch(fail);
    } catch { fail(); }
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      visibility?.disconnect();
      disposeModel(model);
      if (renderer) {
        renderer.domElement.removeEventListener("webglcontextlost", fail);
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
  }, []);

  if (idleOnly) return <span className="sidebar-teacher" aria-hidden="true">
    {(!loaded || failed) && <img src={mascotConfig.image} alt="" />}
    <span ref={host} className="sidebar-teacher-canvas" hidden={failed} />
  </span>;
  return <span className="tutor-teacher" data-state={teacherState(speechPlayback)} aria-hidden="true">
    <span className="tutor-teacher-visual">
      {(!loaded || failed) && <img src={mascotConfig.image} alt="" />}
      <span ref={host} className="tutor-teacher-canvas" hidden={failed} />
    </span>
  </span>;
}
