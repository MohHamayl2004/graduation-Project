# Character engine validation

Implemented locally on nipras-reactive-book; no commits, pushes, dependency installs or Vast operations.

- Frontend: 98 tests passed (`node --test tests/*.test.mjs`).
- Relevant backend: 8 tests passed (`node --test backend/tests/fishSpeech.test.js backend/tests/lessonBooks.test.js`).
- Production Vite build passed into .agents/check-output/character-build; original dist changes preserved.
- Browser: actual male/female compressed GLBs, independent hand IK, complete blink channels, head/expression/posture controls, generated quaternion clip retargeting, repeated swaps without same-avatar GPU resource growth, failed-swap recovery, timed pointing release, actual diagnostic audio playback, cancellation and replay, and 1440/390px layouts passed. Screenshots manually inspected.
- Male: 7435 triangles, 11 draw calls, 11 geometries, 18 textures. Female: 8270 triangles, 9 draw calls, 9 geometries, 16 textures. These are observed renderer counters, not an FPS benchmark.
- Independent review found failed-swap freezing, persistent IK pointing and incorrect stalled-media handling; all corrected with targeted regression checks.

## Boundaries

Actual diagnostic WAV playback verifies audio-event and amplitude-driven mouth behavior, not human speech pronunciation or phoneme lip-sync. Live Fish S2 Pro synthesis needs an existing configured endpoint and was not run. VRM, root-motion locomotion and facial-animation clip retargeting are not claimed. Existing student layouts/book were preserved; active teacher remains male.

The broader backend/services/app.test.js is pre-existing blocked: it imports ./helpers/testDatabase.js, while the helper is under backend/tests/helpers. It was not modified as part of this feature.

Gemini CLI/model access was attempted through the isolated runner. Its Windows sandbox rejected relative write paths and a bypass attempt was denied. Only its reviewed motion tests were retained; Codex completed implementation without further paid retries. Actual run usage/status/diff are preserved in ignored run artifacts.

Preview: http://127.0.0.1:5188/character-playground.html (localhost-only).
