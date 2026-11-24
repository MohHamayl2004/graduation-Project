# Talking teacher — incomplete implementation checkpoint

**Later verification, 2026-11-15:** The pending focused speech tests passed (25), followed by the final full frontend suite (132) and production build. Existing local Arabic WAV playback, interruption/reset and replay now pass on both avatars. The live chain attempt returned `503 AI_UNAVAILABLE` from Qwen before Fish synthesis, so new requested-sentence synthesis and live repeated-question checks remain unverified. See `teaching-gesture-upgrade.md` for the current evidence. The historical Gemini timeout below remains accurate for the speech task; successful subsequent Gemini collaboration was on gesture code and review, not the lip-sync implementation.

Codex continued source implementation after the execution-review quota was exhausted. No tools were used to bypass the blocked test launch.

**Last verified:** 19 focused TTS/backend/client tests passed before the last bridge/facial changes.

**Latest changes, unverified:** deterministic optional viseme timeline with seek/gap handling; FaceController integration; structured speech result and actual playback-time propagation; stale AudioContext resume cancellation; gesture cleanup on playback end; speech diagnostics in the viewport; and the tutor hook's metadata-capable client connection.

**Gemini:** invoked through Argon CLI in run `20261115-130035-8e7a23f6`, conversation `109e4d71-ea83-40a3-ae7b-a9dad5943725`; timed out with no changed files and no returned interface review. Successful active two-agent coding/cross-review is not confirmed for this task. The implementation after that timeout is Codex's work.

**Not completed:** latest tests, build, actual requested-sentence synthesis/playback, repeated-question/interruption integration verification, mutual review, final approval and graph refresh. No pronunciation-level lip-sync claim is justified: the configured Fish endpoint returns audio without phoneme timing.

See `docs/superpowers/plans/2026-11-15-talking-teacher.md` for the exact next verification commands and `docs/talking-teacher-contract.md` for the proposed API. No code was committed or pushed, and no Vast lifecycle actions or downloads were performed.
