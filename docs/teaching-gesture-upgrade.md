# Teaching gesture upgrade — 2026-11-15

The existing procedural engine is extended, with the same male/female GLBs, scale, stationary root, speech bridge and silhouette outline. No dependency, asset replacement, commit, push or Vast lifecycle operation was performed.

## Actual collaboration and authorship

Gemini CLI (`agy` 1.5.9), model `gemini-4-argon-medium`, was successfully invoked through `scripts/delegate_gemini.py`. It returned the actual code for `src/character-engine/TeachingPoses.js`; Codex reviewed and applied that code. Gemini did **not** directly edit worktree files. The module supplies bounded, anatomical-frame greeting, pocket, explanation, pointing and encouragement trajectories and the 0.8s rise / 1.25s hold / 0.85s return greeting envelope.

Evidence (ignored local run artifacts):

- `.agents/runs/teaching-gestures/pose-task.json`; run `20261115-202333-c9e4c33b`, complete code response, provider-reported 17,837 tokens, 45.168s.
- Same conversation `887212de-6656-41cd-ba31-518064b184f0` resumed for focused cross-review; task `review-task.json`, run `20261115-203145-076b7b5b`, 43,514 tokens, 39.128s.
- Gemini found a pointing/resting-arm conflict and encouraging-state/profile mismatch. Codex reproduced both in tests and corrected them. Independent final review also found the reduced-motion action-clock hang; Codex added a failing regression test and separated action time from procedural movement time.
- Combined reported usage: 61,351 tokens for those two successful calls. There is no comparable single-agent baseline, so token savings cannot be measured.

## Files authored or extended by Codex in this upgrade

| Files | Purpose |
|---|---|
| `src/character-engine/TeachingGestureState.js`, `AnimationController.js` | Single greeting, arm ownership, release/neutral/acquire switching, infrequent dwell variation, free-arm gestures and finite action timing |
| `src/character-engine/GestureLandmarks.js`, `HandPoseController.js` | Actual head-weighted surface calibration, forehead target, bounded palm roll and semantic finger articulation |
| `src/character-engine/ArmConstraints.js` | Apply shoulder limits to the humerus, rather than mistakenly restricting a bent-arm shoulder-to-wrist vector |
| `src/character-engine/adapters.js`, `rig.js` | Adapter-only finger naming and reusable semantic hand mapping |
| `src/character-engine/CharacterViewport.jsx` | Hand-controller lifecycle, frame ordering and diagnostic snapshots |
| `src/hooks/useTutorCharacter.js` | One-shot welcome and optional `nipras:teacher-encourage` event; preserves speech integration |
| `src/dev/CharacterPlayground.jsx` | Developer gesture buttons and actual lesson-element pointing target |
| `tests/teaching-poses.test.mjs`, `teaching-state.test.mjs`, `teaching-gestures.test.mjs`, `character-clearance.test.mjs` | Pure profiles, state transitions, real rigs, gesture timing, arm ownership, surface clearance and reduced-motion regressions |
| `scripts/verify-teaching-gestures.mjs`, `verify-teaching-speech.mjs` | Browser gesture sequences, screenshots, playback interruption/replay; optional existing-WAV mode |
| This report, `docs/teaching-gesture-contract.md`, implementation plan | Contracts, ownership and evidence |

These files were already untracked/dirty as part of ongoing development; this is authorship for the focused upgrade, not a claim that all existing content was written in this turn. Prior speech/backend changes remain preserved.

## Behavior and limits

- Greeting is recognizable on both models: right hand near forehead, fingers aligned, one hold, smooth return; no repeating welcome. No reference image was attached, so a conventional salute was used.
- Closed clothing meshes have no operational pocket openings. The supported fallback is a hand resting outside the front-side hip, never intentional insertion through trousers.
- Speaking alternates free/resting hands after varied 13/16/19-second dwell intervals, through release, neutral and acquire phases. Reduced motion suppresses automatic switching but explicit actions still finish.
- Explanation, small emphasis, lesson pointing and encouragement have working developer triggers. The gestures are restrained; open-palm/finger presentation can still receive artistic refinement. Correct-answer business logic must dispatch the encouragement event; it is not automatically wired to every assessment.
- Root position stays fixed. Current numerical sweeps and inspected front/side captures showed no torso penetration. Protection uses the existing garment-calibrated torso proxy and constrained IK, not full cloth/self-collision physics; this is not a guarantee for every future asset or pose.
- Semantic bone/finger adapters and normalized surface landmarks keep the engine reusable. Future avatars still require compatible mapping, capability validation and visual calibration.
- Existing white outline remains attached to the animated silhouette. Canva was not used; these tasks required rig/Three.js changes.

## Verification

- `node --test tests/*.test.mjs`: **132 passed, 0 failed**, final run after action-clock fix.
- Vite production build to ignored `.agents/check-output/teaching-gestures-build`: passed; existing bundle-size/Browserslist notices remain.
- New browser gesture suite: passed on both actual GLBs, with 25 front/side/transition/mobile captures in `.agents/check-output/teaching-gestures`. Stationary root, finger capability and animated outline confirmed.
- Existing `verify-character-engine.mjs`: passed after integration, including retargeting, model switching, speech controls and responsive widths.
- Existing local Arabic WAV playback: passed on both models, nonzero measured mouth movement, interruption closes mouth/cancels greeting, replay works. Evidence: `.agents/check-output/teaching-speech/results.json` and screenshots.
- Live Qwen/Fish chain attempt stopped at Qwen with `503 AI_UNAVAILABLE`; no new Fish synthesis was reached. Current live service availability and the requested new sentence are **not verified**. No service restart was attempted. Audio-amplitude animation is **not** verified phoneme-level Arabic lip-sync.
- Graph refreshed with `graphify update .` (AST only).

## Preview

Open `http://127.0.0.1:5188/character-playground.html`. Choose either avatar and use the eight Teaching Gestures buttons. Upload an audio file in Actual Audio Playback to combine gestures with speech; stop/reset and replay to test interruption. Rotate the stage for side inspection. This interface is developer-only; unrelated pages/layouts are preserved.
