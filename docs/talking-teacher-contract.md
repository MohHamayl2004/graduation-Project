# Talking teacher collaboration contract

Codex owns `TutorIntegration.js`, `FishSpeechClient.js`, `useTutorCharacter.js`, speech backend/routes and integration verification. Gemini owns `LipSyncController.js`, `FaceController.js`, and `tests/lipsync-timeline.test.mjs`. No simultaneous writes to another owner's files. Existing body safety, outline, models and layouts stay intact.

Status: this interface was proposed by Codex. The Gemini implementation invocation timed out with zero changed files and no returned review, so mutual agreement/cross-review is **not confirmed**. After that run ended, Codex implemented the facial files locally. The latest bridge/facial changes remain unverified because automatic approval review hit its usage limit before the new tests could execute.

## Facial interface (Gemini)

`new LipSyncController({ supportedRoles: string[] })`

- `setTimingData(cues)` accepts at most 5000 valid `{start,end,visemes:{semanticRole:weight}}` cues, in **seconds of the exact audio clip**. Filter invalid/unknown/nonfinite weights, clamp 0..1, ignore malformed cues, sort deterministically. Never invent timings or derive timestamps from text length.
- `update({playing,playbackTime,energy,visemes})` returns `{weights,mode}`. Weights use only supported semantic mouth roles (`jawOpen`, `viseme*`). Prefer explicitly supplied viseme weights, then a genuine timing track sampled by media time, then measured energy applied to jawOpen or visemeAA. A gap in a valid timing track is silence, not amplitude fallback. No random motion or wall-clock timers. Seeking backwards must work. No facial controls yields `unavailable` safely.
- Modes: `timed-visemes`, `audio-amplitude`, `idle`, `unavailable`. These describe the source, not its independently verified linguistic accuracy.
- `stop()` clears mouth weights immediately.

`FaceController.setSpeech` remains backward compatible and additionally accepts `playbackTime`, `timingData`. Its existing blink/gaze/expression behavior is preserved. `FaceController.getSpeechDiagnostics()` returns current mode. The bridge updates face speech state before face.update on each rendered frame. Pause/buffering/end/error/interruption close the mouth. A valid direct viseme map remains supported for older callers.

## Speech interface (Codex)

`FishSpeechClient.synthesize(text,options)` still returns a Blob. Add `synthesizeSpeech(text,options)` returning `{audio:Blob,timingData:[],sync:{mode,durationSeconds}}`. The current Fish runtime emits no timestamps: timingData is empty and mode is `audio-amplitude`. Never label that phoneme-aligned speech.

`TutorIntegration.speak` accepts either synthesis result shape. It follows `HTMLMediaElement.currentTime`, not request duration or chatbot arrival. Explicit cues from options or actual provider results are passed to FaceController. Diagnostics report timing availability. Stop aborts synthesis, detaches audio, resets mouth/body gestures, revokes URLs and prevents late prior requests/resume from changing a new utterance.

The authenticated speech route continues returning binary audio, with optional safe metadata headers (`X-TTS-Sync`, `X-TTS-Duration`). WAV duration is measured from valid audio chunks; absent/unsupported metadata stays null. No new credentials, public model endpoints, dependencies, commits or deployments.
