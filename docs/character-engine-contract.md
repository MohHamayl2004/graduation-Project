# NIPRAS character engine contract

Approved scope: interchangeable GLB characters, isolated developer playground, procedural motion and IK, facial animation, tutor/audio lifecycle integration. Preserve student layouts, current male avatar, existing book and uncommitted changes. No Vast operations, paid animation APIs, commits or pushes.

Core uses semantic roles only. `adapters.js` owns bone and morph aliases, bind-pose calibration, joint ranges and default arm directions. `avatars.js` owns asset URLs. Existing male/female assets have 80 joints, 67 morph targets and no animation clips.

## Shared interfaces

`CharacterManager({loadAsset?})`: async `load(descriptor)` returns `{root, scene, rig, animations, avatar, dispose}` or null when superseded; `current`; `dispose()`. Preserve the previous avatar on failed loads. Each load owns/disposes its resources. Normalize the whole avatar through a wrapper, preserving authored bone transforms.

`rig`: `{root, bones, morphs, restPose, capabilities, warnings, calibration, resetPose()}`. `bones` uses Hips, Spine, Chest, UpperChest, Neck, Head, LeftShoulder, LeftUpperArm, LeftLowerArm, LeftHand, RightShoulder, RightUpperArm, RightLowerArm, RightHand, LeftEye, RightEye. `restPose` is Map<Object3D,{position,quaternion,scale}>. `morphs[role]` is array of `{mesh,index}`. Roles: blinkLeft/Right, lookUp/Down/In/OutLeft/Right, smileLeft/Right, browInnerUp, jawOpen, visemeAA/E/I/O/U/PP, visemeSil. Capabilities: leftArm, rightArm, head, body, blink, gaze, expressions, visemes. Unsupported controls report warnings and do not throw. `calibration.armDirections.left/right` are normalized world-space rest directions.

Frame order: restore rig rest pose -> AnimationController -> IKController -> FaceController -> render. Controllers never accumulate edits to the bind pose. `delta` is seconds, clamped by the viewport; `elapsed` is seconds.

`AnimationController(rig)`: `setState(state)`, `playGesture(name,options?)`, `update(delta,elapsed)`, `dispose()`. States idle/listening/thinking/speaking/explaining/celebrating. Gestures explain/point; prevent immediate repetition. Procedural arm relaxation uses adapter calibration. AnimationMixer may blend future compatible clips, never assume current assets contain them.

`IKController(rig)`: `setHandTarget(side, position|null, options?)` (position is world-space Vector3 or [x,y,z], side left/right; options.weight and pole supported), `setHeadRotation({yaw,pitch,roll})` (radians), `setLookTarget(position|null)`, `update(delta)`, `dispose()`. Independent arms, reachable-distance clamps, stable elbow pole and smooth target weights. No bone-name strings in this module.

`FaceController(rig)`: `setExpression(name,intensity=1)` (neutral/happy/curious/concerned), `setLookTarget(position|null)`, `setSpeech({playing,energy=0,visemes=null})`, `update(delta,elapsed)`, `dispose()`. Blink and gaze on supported channels. Explicit viseme cues use semantic morph roles; audio-energy jaw motion is approximate, never presented as phoneme lip-sync.

`CharacterViewport` React forwardRef component: props `avatarId='male'`, `state='idle'`, `framing='full'|'portrait'`, `className`, `onReady`, `onError`, `reducedMotion?`. Imperative ref exposes `getControllers()` returning `{rig,animation,ik,face}`, `setCharacter(id)`, `getSnapshot()` returning serializable bone rotations/morph weights/avatar/capabilities, `pointAtElement(element,side='right')`. `onReady` runs after each successful avatar change. One animation loop, dispose on unmount, bounded DPR, hidden/offscreen/reduced-motion handling. Use CharacterManager and AVATARS exports; no asset or bone-name hardcoding. Disable unsupported controls in playground.

Codex owns rig.js, adapters.js, avatars.js, CharacterManager.js, TutorIntegration.js, FishSpeechClient.js, public integration, backend proxy and integration tests. Gemini owns AnimationController.js, IKController.js, FaceController.js, CharacterViewport.jsx, src/dev/CharacterPlayground.jsx, src/dev/character-playground.css, src/dev/character-main.jsx, character-playground.html and tests/character-motion.test.mjs. No overlapping edits before review.

Speech integration uses actual HTMLAudioElement events/currentTime plus optional Web Audio amplitude or explicit time-aligned cues. Fetch interruption, stale audio, avatar swaps and unmount must not leave mouth/gesture states active. Fish API credentials stay on the backend. TTS remains disabled unless a real endpoint is configured. Do not claim remote generation or lip-sync without evidence.
