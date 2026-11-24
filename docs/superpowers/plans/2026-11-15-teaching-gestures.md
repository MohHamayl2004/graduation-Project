# Teaching gesture implementation plan

**Goal:** Extend the existing procedural teacher with a one-shot salute, safe near-pocket speaking poses, infrequent neutral hand switching and teaching gestures.

**Ownership/contract:** `docs/teaching-gesture-contract.md`. Gemini authors bounded pose trajectories through a real CLI code response; Codex reviews/applies that module and concurrently implements controller scheduling, articulation, integration, tests and developer-only controls. No model/asset replacement, unrelated layouts, dependencies, commits, pushes or Vast operations.

- [x] Inspect relevant graph/source and finger hierarchy; verify 25 pending speech tests and Argon CLI availability.
- [x] Obtain and independently review actual Gemini pose code; record invocation, response and authorship honestly.
- [x] Extend state/gesture scheduling with a single greeting hold, near-pocket fallback and safe alternating free-arm control.
- [x] Add bounded salute finger/palm articulation and explicit test controls in existing character lab.
- [x] Run real-asset numerical checks, frontend regressions/build and front/side browser sequences. Mark only visually believable poses complete; document limits and preview.

Evidence and remaining limits: `docs/teaching-gesture-upgrade.md`. Live Qwen returned 503; existing-WAV playback passed, without a new synthesis claim.
