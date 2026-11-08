import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import modelUrl from "../../../assets/images/male.glb?url";
import { mascotConfig } from "../../../config/mascotConfig";
import { animateMouth, teacherDestination, teacherSidebarHome, teacherTravelPoint, visualSpeechDuration } from "../teacherAnimation";

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

export default function TeacherCharacter({ state = "idle", response, idleOnly = false }) {
  const anchor = useRef(null);
  const layer = useRef(null);
  const host = useRef(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [visualSpeaking, setVisualSpeaking] = useState(false);
  const [motion, setMotion] = useState("idle");
  const previousState = useRef("idle");
  const speechTimer = useRef(null);
  const placed = useRef(false);
  const effectiveState = ["processing", "speaking", "error"].includes(state) ? state : visualSpeaking ? "speaking" : state;
  const away = ["processing", "speaking"].includes(effectiveState);
  const currentState = useRef(effectiveState);
  currentState.current = effectiveState;

  useLayoutEffect(() => {
    if (["processing", "speaking", "error"].includes(state)) {
      clearTimeout(speechTimer.current);
      setVisualSpeaking(false);
    } else if (state === "idle" && previousState.current === "processing" && ["complete", "refused"].includes(response?.status) && response.content.trim()) {
      setVisualSpeaking(true);
      speechTimer.current = setTimeout(() => setVisualSpeaking(false), visualSpeechDuration(response.content));
    }
    previousState.current = state;
  }, [state, response?.id, response?.status, response?.content]);
  useEffect(() => () => clearTimeout(speechTimer.current), []);

  useLayoutEffect(() => {
    if (idleOnly) return;
    const source = anchor.current;
    const overlay = layer.current;
    const workspace = source.closest(".tutor-screen").querySelector(".chat-workspace");
    const drawer = source.closest(".app-drawer");
    if (!workspace || !loaded || failed) {
      overlay.style.visibility = "hidden";
      workspace?.style.removeProperty("--teacher-clearance");
      placed.current = false;
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation, drawerFrame, target, travelling = false;
    const translate = (point) => `translate3d(${point.x}px, ${point.y}px, 0)`;
    const stop = () => {
      if (!animation) return;
      const rect = overlay.getBoundingClientRect();
      overlay.style.transform = translate({ x: rect.left, y: rect.top });
      animation.onfinish = null;
      animation.cancel();
      animation = null;
    };
    const measure = (force = false) => {
      const origin = source.getBoundingClientRect();
      const bounds = workspace.getBoundingClientRect();
      const composer = workspace.querySelector(".chat-composer")?.getBoundingClientRect();
      const destination = teacherDestination(bounds, origin, composer?.top);
      const sidebar = drawer.getBoundingClientRect(), style = getComputedStyle(drawer), viewport = window.visualViewport;
      const visible = { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0,
        right: (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth), bottom: (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) };
      const bottomInset = Math.max(parseFloat(style.borderBottomLeftRadius) || 0, parseFloat(style.borderBottomRightRadius) || 0,
        parseFloat(getComputedStyle(source.closest(".app-drawer-account")).paddingBottom) || 0);
      const sidebarHome = teacherSidebarHome(origin, sidebar, visible, bottomInset);
      const sourceVisible = drawer.getAttribute("aria-hidden") !== "true" && sidebar.bottom > visible.top && sidebar.top < visible.bottom && sidebar.right > visible.left && sidebar.left < visible.right;
      // A closed mobile drawer has no visible origin; depart from the workspace's lower edge.
      const home = sourceVisible ? sidebarHome : {
        x: bounds.right - destination.width - 16,
        y: Math.max(bounds.top + 16, (composer?.top ?? bounds.bottom) - destination.height - 16)
      };
      const next = away ? destination : home;
      overlay.style.width = `${away || !sourceVisible ? destination.width : sidebarHome.width}px`;
      overlay.style.height = `${away || !sourceVisible ? destination.height : sidebarHome.height}px`;
      if (!placed.current) { overlay.style.transform = translate(home); placed.current = true; }
      overlay.style.visibility = away || travelling || sourceVisible ? "visible" : "hidden";
      if (away) workspace.style.setProperty("--teacher-clearance", `${destination.height + 32}px`);
      if (!force && target && Math.abs(target.x - next.x) < 0.5 && Math.abs(target.y - next.y) < 0.5) return;
      stop();
      target = next;
      const current = overlay.getBoundingClientRect();
      const start = { x: current.left, y: current.top };
      const finished = () => {
        travelling = false;
        overlay.style.transform = translate(next);
        animation?.cancel();
        animation = null;
        setMotion(away ? "processing" : "idle");
        if (!away) {
          workspace.style.removeProperty("--teacher-clearance");
          overlay.style.visibility = sourceVisible ? "visible" : "hidden";
        }
      };
      const resting = !away && !workspace.style.getPropertyValue("--teacher-clearance");
      if (resting || reduced.matches || Math.hypot(next.x - start.x, next.y - start.y) < 1 || !overlay.animate) { finished(); return; }
      travelling = true;
      overlay.style.visibility = "visible";
      setMotion(away ? "moving" : "returning");
      animation = overlay.animate(Array.from({ length: 25 }, (_, index) => ({ transform: translate(teacherTravelPoint(start, next, index / 24)) })), {
        duration: 1000, easing: "cubic-bezier(.45, 0, .55, 1)", fill: "forwards"
      });
      animation.onfinish = finished;
    };
    const update = () => measure();
    const motionChange = () => measure(true);
    const trackDrawer = (event) => {
      if (event.target !== drawer || event.propertyName !== "transform") return;
      cancelAnimationFrame(drawerFrame);
      const follow = () => {
        measure();
        if (drawer.getAnimations().some((item) => item.playState === "running")) drawerFrame = requestAnimationFrame(follow);
      };
      follow();
    };
    const observer = new ResizeObserver(update);
    [source, workspace, drawer, source.closest(".app-drawer-account"), workspace.querySelector(".chat-composer")].filter(Boolean).forEach((element) => observer.observe(element));
    const drawerChanges = new MutationObserver(update);
    drawerChanges.observe(drawer, { attributes: true, attributeFilter: ["aria-hidden", "data-collapsed"] });
    drawer.addEventListener("transitionrun", trackDrawer);
    drawer.addEventListener("transitionend", update);
    drawer.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    reduced.addEventListener("change", motionChange);
    measure(true);
    return () => {
      stop();
      cancelAnimationFrame(drawerFrame);
      observer.disconnect();
      drawerChanges.disconnect();
      drawer.removeEventListener("transitionrun", trackDrawer);
      drawer.removeEventListener("transitionend", update);
      drawer.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      reduced.removeEventListener("change", motionChange);
    };
  }, [away, loaded, failed, idleOnly]);

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
        // Preserve the existing upper-body framing throughout travel.
        const target = new THREE.Vector3(center.x, box.min.y + size.y * 0.79, center.z);
        camera.position.set(target.x, target.y, box.max.z + size.y * 1.2);
        camera.lookAt(target);
        model.traverse((node) => { if (node.morphTargetDictionary) meshes.push(node); });
        const origin = model.position.clone();
        const head = model.getObjectByName("Head");
        const headRest = head?.quaternion.clone();
        const nod = new THREE.Quaternion();
        const nodAxis = new THREE.Vector3(0, 0, 1);
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
            model.position.copy(origin);
            model.position.y += reduced.matches ? 0 : size.y * Math.sin(time * 1.8) * 0.008;
            if (head) head.quaternion.copy(headRest).multiply(nod.setFromAxisAngle(nodAxis, speaking ? Math.sin(time * 1.7) * 0.018 : 0));
            animateMouth(meshes, speaking, time, delta);
            const blinkPhase = time % 4.7;
            const blink = !reduced.matches && blinkPhase < 0.18 ? Math.sin(blinkPhase / 0.18 * Math.PI) ** 2 : 0;
            for (const mesh of meshes) for (const name of ["eyeBlinkLeft", "eyeBlinkRight"]) {
              const index = mesh.morphTargetDictionary[name];
              if (index !== undefined) mesh.morphTargetInfluences[index] = blink;
            }
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

  const visibleState = motion === "processing" ? effectiveState : motion;
  if (idleOnly) return <span className="sidebar-teacher" aria-hidden="true">
    {(!loaded || failed) && <img src={mascotConfig.image} alt="" />}
    <span ref={host} className="sidebar-teacher-canvas" hidden={failed} />
  </span>;
  return <>
    <span ref={anchor} className="tutor-teacher" data-state={visibleState} data-loaded={loaded && !failed} aria-hidden="true">
      {(!loaded || failed) && <img src={mascotConfig.image} alt="" />}
    </span>
    {createPortal(<span ref={layer} className="tutor-teacher-flight" data-motion={visibleState} data-state={effectiveState} data-loaded={loaded && !failed} hidden={failed} aria-hidden="true">
      <span ref={host} className="tutor-teacher-canvas" />
    </span>, document.body)}
  </>;
}
