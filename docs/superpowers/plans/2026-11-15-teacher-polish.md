# Teacher animation and silhouette implementation plan

**Goal:** Improve the existing stationary teacher's idle/speech motion, prevent torso intersections, and add a subtle animated white silhouette for both existing GLBs.

**Design:** Retain the semantic humanoid rig, character manager, speech bridge and React/Three.js renderer. Both GLBs have the same Bip01 arm hierarchy and no embedded animation clips. Replace unconstrained world-direction poses with body-relative safe arm trajectories and a final constraint pass that also handles external IK. Derive collision dimensions from rig proportions and, where practical, torso skin vertices; keep calibration separate from controller logic. Use a transparent silhouette halo that follows the skinned render, with bounded GPU cost and resource cleanup.

**Ownership:** Gemini owns scoped animation/rig/outline implementation in a runner-created isolated worktree. Codex owns integration review and independent numerical/browser verification. Preserve all existing uncommitted files, models, API contracts and unrelated layouts. No Vast operations, new dependencies, commits or pushes.

- [x] Phase 1: Argon audit completed; both actual GLBs inspected; initial real-asset regressions reproduced collision and world-axis failures.
- [x] Phase 2: Reviewed Gemini partial helpers/tests retained after implementation timeout; Codex completed constraints and movement. All real-asset and joint-limit checks pass.
- [x] Phase 3: Alpha silhouette implemented, with bounded render target, resize handling and disposal.
- [x] Phase 4: Independent review completed; reproduced and fixed shoulder-range omission. Final 116 tests and build pass.
- [x] Phase 5: Both real GLBs verified front/side in idle/listening/speaking; original 15 browser checks pass. Results, costs, ownership and limits recorded in `docs/teacher-animation-improvements.md`.

**Validation:** Bone/segment clearance over full gesture cycles, finite bounded joints, stationary root, transformed/scaled rig cases, both avatar assets, speech lifecycle tests, real WebGL screenshots and a normal production build into ignored output. No claim of universal mesh-level collision proof or phoneme lip-sync based on a screenshot alone.
