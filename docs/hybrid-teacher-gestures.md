# Hybrid teacher gesture integration

Codex added schema-constrained Qwen output in the existing streaming inference, an incremental text decoder, a strict 12-gesture allowlist, hidden terminal metadata, controller selection and playback-driven gestures. Existing pose targets, safe IK, slow hand switching, Fish synthesis and independent lip-sync are reused. Celebration returns to speaking after 2.4 seconds. No models, dependencies or inference stages were added.

Microphone integrations can dispatch `nipras:microphone-start`, `nipras:student-speaking`, `nipras:student-interrupt` and `nipras:microphone-stop`. The first three cancel teacher audio and enter listening; stop releases listening. The current composer has no microphone implementation. Streaming questions enter thinking. Greeting remains once per mounted tutor session, with reduced-motion suppression.

Verification: 61 focused tests passed, including all gesture selections on the actual male rig, arm clearance, hand ownership, reduced motion, escaped streaming JSON, invalid metadata and cancellation. Production build passed. Existing-WAV Chrome playback passed on both real avatars: amplitude-driven mouth movement, interruption reset and replay. All gesture aesthetics and accurate phoneme alignment are not visually verified. Pointing uses the existing target-element event; Qwen selects its category, not a lesson anchor. Historical responses use default gestures because metadata is not persisted.

Gemini was invoked through the actual delegation runner. It returned `model_unavailable` for `gemini-4-argon-medium`, no changed files, no usage data and no checks. No replacement model or retry was used; no Gemini refinements were integrated. One live Qwen request returned `AI_UNAVAILABLE`, so live structured-output compatibility remains unverified. The two-agent objective is therefore incomplete.

No commits, pushes or deployments were performed. Existing user changes were preserved.
