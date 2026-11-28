# Teacher animation improvement — 2026-11-15

The existing engine, male/female GLBs, speech bridge, avatar switching and page layouts are preserved. Changes remain uncommitted on `nipras-reactive-book`.

## Actual collaboration

Argon Medium completed a read-only audit in run `20261115-122409-273d8750` (conversation `be2e8603-68e3-464c-8bd9-f65b4bbab7b4`). Its implementation run `20261115-122644-1f5e3995` timed out after ten minutes, returning only calibration/math helper edits and two test files. Codex inspected and retained those four files, then completed the controllers, constraints, outline and integration. No paid retry, model substitution or permission bypass was used in this task. An independent Codex reviewer identified a shoulder-limit gap; it was reproduced on both real assets, corrected and tested.

The audit reported 28,590 total tokens; the incomplete implementation reported 135,492. These are provider-reported counters, not evidence of token savings. No comparable Codex-only baseline exists. Both result files, the partial patch and final review are retained under ignored `.agents/runs/`.

## Causes and correction

The original procedural animation aligned arm segments to fixed world directions, used narrow resting directions and unguarded interpolation, and the IK solver used a fixed backward elbow pole. There was no torso/garment collision envelope or final joint-range enforcement for clipped poses. Rotating/scaling a compatible avatar changed the movement incorrectly, and a target inside the chest pulled the forearm through the torso.

`ArmConstraints.js` derives a live anatomical frame from semantic shoulder and torso bones. A one-time scan of torso-weighted skin vertices expands the proportion-based proxy to account for garment depth. Shared analytic two-link IK chooses outward elbow bend planes, bounds shoulder/elbow excursions, restores the authored neutral wrist and checks continuous forearm/upper-arm segments against the scaled capped torso proxy. External pointing targets are projected to safe reachable space. A final pass also constrains clip-driven poses.

The animation controller smooths restrained bilateral gestures in body coordinates, adds gentle spine/head breathing motion, and never translates the root. Visual review also corrected the elbow preference and an excessive solver margin at the fixed shoulder attachment, avoiding needless arm spreading. Reduced motion, independent hands, clip support and the existing media-driven mouth/face lifecycle remain supported.

The white 2.5px halo samples the actual skinned render's alpha. It follows arms, fingers, clothing and facial morphs without a rectangular backing or cloned skeletons. Its render target is capped at 2048px and DPR 1.5 and is disposed on unmount. Outline can be disabled through the additive viewport `outline` prop. At the tested desktop size, draw calls were 23 male / 19 female (previously 11 / 9); GPU-owned resources remained stable across repeated swaps.

## Files changed for this task

| Files | Contribution |
| --- | --- |
| `src/character-engine/adapters.js`, `motionMath.js` | Reviewed Gemini calibration and body-frame rotation helper |
| `src/character-engine/ArmConstraints.js` | Codex garment-aware safe IK and final constraints |
| `src/character-engine/AnimationController.js`, `IKController.js` | Codex constrained body-relative movement integration |
| `src/character-engine/SilhouetteOutline.js`, `CharacterViewport.jsx` | Codex alpha halo and renderer lifecycle integration |
| `tests/character-clearance.test.mjs`, `character-outline.test.mjs` | Reviewed Gemini test contributions |
| `tests/character-asset-clearance.test.mjs` | Codex independent tests on the actual two GLBs |
| `scripts/lib/load-character-fixture.mjs`, `character-browser.mjs`, `scripts/verify-teacher-polish.mjs` | Codex asset loader and front/side browser verification |
| `docs/superpowers/plans/2026-11-15-teacher-polish.md`, this report | Plan, ownership and validation |
| `graphify-out/` | AST graph refresh |

## Validation and limits

116 frontend tests and the production build passed after the final shoulder and elbow calibration corrections. Both actual assets passed unsafe chest-target, rotated/scaled frame, full motion-cycle, garment-depth and shoulder-range checks. Existing WebGL QA passed 15 checks covering reachable independent IK, facial controls, retargeting, swaps/resource ownership, failed swaps, timed pointing, media amplitude/reset/replay and desktop/mobile sizes. New visual QA captured both avatars in idle/listening/speaking from front/side, checked shaders, stationary roots and stable resources. Playback of the previously generated real Fish Arabic WAV also drove speaking state and mouth opening (peak 0.799), kept the outline active and reset the mouth on stop, without contacting Vast. Artifacts are in ignored `.agents/check-output/teacher-before/`, `teacher-after/`, `character-browser/`, and `teacher-real-audio/`. The persistent local preview is `http://127.0.0.1:5188/character-playground.html`.

Canva is not configured in Gemini's CLI and was not used; no third-party account was connected and no clothing assets were replaced. New compatible characters can reuse the semantic mapping and shared solver, but their body/garment proportions and limits must be validated. Collision protection uses an anatomy/garment-derived proxy, not full mesh-versus-mesh physics; unusually bulky clothing, extreme body morphs and unseen rigs can need per-avatar calibration. Mouth motion remains audio-amplitude driven, not verified pronunciation-level lip-sync. Full backend tests were not rerun for this frontend-only task. Existing bundle-size/Browserslist warnings remain.
