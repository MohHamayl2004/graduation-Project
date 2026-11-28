# Floating NIPRAS teacher

Implemented by Codex alone. The existing rigged `male.glb` (black suit, white shirt, red tie) is reused; no new model or reference screenshots were attached. Existing greeting, safe-arm constraints, hand switching, contextual Qwen metadata, outline and playback-driven lip movement remain in place.

`TutorCompanionProvider` owns one shared chat and speech bridge above the application routes. `FloatingTeacher` mounts one lazy-loaded full-body viewport on student pages. The sidebar uses the static NIPRAS mascot, so it no longer creates duplicate 3D teachers. Moving between supported pages preserves the viewport. Hiding suspends rendering without discarding the model.

Left mouse dragging moves the screen container only; a six-pixel threshold distinguishes dragging from clicking. Right-click opens the context menu. Position and settings are stored locally and clamped to the viewport. Mesh hit-testing lets transparent pixels pass through to the page. Touch dragging and an explicit menu button are available. The RTL dark menu includes chat/content navigation, view modes, size, voice, microphone, calm motion, contextual gestures, glow/shadow and reset controls. A restore button remains after hiding.

Hold Right Alt to record, release to transcribe and submit the recognized question through the shared tutor chat. AltGr combinations and editable fields are excluded to preserve typing. The menu microphone button provides tap-to-start/tap-to-stop recording. Recording is capped at 45 seconds and 6 MB. Microphone tracks close on stop, cancellation, loss of eligibility and cleanup. Browser speech recognition is an explicit fallback where supported; it may use the browser vendor's online service.

## Private voice configuration




## Verification and limits


