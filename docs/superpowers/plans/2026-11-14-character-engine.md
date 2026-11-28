# Reusable character engine implementation plan

**Goal:** independent rig adapters, reusable procedural animation, two-arm IK, facial control, avatar swapping and actual audio lifecycle support without student-layout changes.
**Spec:** docs/character-engine-contract.md plus the approved Phase 1 report.
**Architecture:** React 18 / Three.js 0.187; pure controller modules and an isolated Vite playground. Optional VRM adapter later; no new rendering framework.

- [x] 1. Codex: test and implement semantic rig discovery, capability validation, rest-pose restoration, avatar descriptors, race-safe loading/disposal. Test aliases, missing/invalid arm chains, failed and superseded loads, resource ownership.
- [x] 2. Codex (Gemini sandbox fallback): implement motion, bounded independent arm IK, blink/gaze/expression/speech controls and the developer playground in reserved files. Test finite unreachable targets, arm independence, pose repeatability and unsupported features.
- [x] 3. Codex: implement and test real-audio lifecycle, explicit cue timing, interruption and configurable Fish client/proxy. Protect authentication, timeouts, payload size and cancellation. Keep production speech opt-in.
- [x] 4. Review Gemini's exact patch and checks; one scoped correction cycle maximum. Apply only reviewed files. Re-run tests after integration.
- [x] 5. Adapt the existing teacher renderer and tutor event bridge while preserving markup/layout and the book. Build to an ignored directory; visually exercise both avatars, gestures, independent hands, actual audio playback, interruption and missing capabilities.
- [x] 6. Run relevant frontend/backend regression checks and graphify update. Independent final review; fix material findings and document measured limitations. Leave changes uncommitted.

Review focus: stale asynchronous loads/audio; authored transforms; IK coordinate conversions; conflicting pose/morph writers; cleanup/reduced motion; unavailable Fish endpoint. Actual lip-sync is not an acceptance claim for amplitude-driven mouth animation.
