# Talking teacher collaboration plan

**Goal:** Codex and Gemini both implement the existing teacher's media-clock speech path, with traceable contributions and mutual review.

**Contract:** `docs/talking-teacher-contract.md`. Preserve current rig constraints, white silhouette, models, layouts, chatbot authentication and uncommitted work. No new paid API, dependencies, model download, commit or push.

- [ ] Verify CLI and inspect only speech/facial files and actual GLB morph metadata.
- [ ] Gemini implements the bounded facial timeline controller and FaceController integration while Codex implements TTS metadata, client result transport, cancellation and playback diagnostics in separate files.
- [ ] Codex reviews/tests Gemini's actual patch. Resume its recorded conversation for a focused review of Codex's completed integration; resolve concrete interface defects without repeated implementation retries.
- [ ] Test exact requested Arabic sentence, repeated questions and interruption using actual Qwen/Fish where available. Browser-check both rigs, timed fixture behavior, real-audio fallback, idle/reset, body safety and outline.
- [ ] Record actual commands, conversation IDs, files, checks, cross-review findings and honest remaining timing limitations.

## Checkpoint after execution capacity was blocked

- CLI 1.5.9 and Argon Medium catalog were verified. Real invocation through `scripts/delegate_gemini.py .agents/runs/talking-teacher/facial-task.json` ran in isolated worktree `gemini-20261115-130035-8e7a23f6`; conversation `109e4d71-ea83-40a3-ae7b-a9dad5943725` timed out after 240s with zero changed files. The runner reports 12,339 total tokens. No implementation or mutual review is attributed to Gemini for this task; no paid retry was made.
- Codex implemented `backend/services/wavMetadata.js`, updated `fishSpeechService.js`, `speechRoutes.js`, and `FishSpeechClient.js`, and added metadata/cancellation tests. The focused run passed 19 tests before the usage block.
- Codex then added media-clock/structured-result and stale-resume regression tests. Their execution was rejected before launch because automatic approval review could not complete after hitting the account usage limit. This was not an unsafe-action determination, and no alternative execution route was used to bypass it.
- With the Gemini run finished, Codex completed `LipSyncController.js`, its tests, `FaceController.js`, `TutorIntegration.js`, the tutor hook and viewport diagnostics locally. These latest edits were statically reviewed but **not executed, built, browser-verified, mutually reviewed, or graph-refreshed**. They must not be reported as complete or passing.
- Original GLBs, body constraints, outline and unrelated pages were preserved. No commits or pushes.

Pending once execution capacity is restored: run `node --test tests/character-speech.test.mjs tests/lipsync-timeline.test.mjs backend/tests/speechMetadata.test.js backend/tests/fishSpeech.test.js`, address failures, obtain actual Gemini cross-review only if a further call is authorized, run the full frontend suite and isolated production build, verify both avatars with the exact requested Arabic sentence plus interruption/repeated questions, then run `graphify update .`. Current native Fish audio lacks phoneme timestamps; amplitude fallback remains explicitly identified rather than claimed as accurate Arabic viseme alignment.
