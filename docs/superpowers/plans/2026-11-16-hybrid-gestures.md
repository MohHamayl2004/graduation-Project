# Hybrid teacher gesture implementation plan

Goal: connect meaningful Qwen gesture choices to the existing safe procedural teacher and Fish playback lifecycle.

Architecture: preserve streamed tutor text. Request an optional structured tool call alongside text in the same Qwen inference; validate its arguments and attach metadata only to the terminal event. Missing or malformed metadata uses EXPLAINING. Never parse student-visible prose for gestures. Existing audio playing/pause/waiting/end events own body and mouth lifecycle. The controller retains safe IK and automatic slow hand switching.

User specification: attached “NIPRAS — Hybrid AI Teacher Gesture System”, 2026-11-16. Existing dirty files must survive. No commits, deployment, new dependencies, model changes or second inference. Microphone UI is absent; provide deterministic integration events and report this limitation.

1. Codex: add shared gesture allowlist/normalization, focused failing tests and Qwen optional tool metadata adapter. Extend chat done-event metadata without changing displayed content or persistence contracts.
2. Gemini CLI: reserve TeachingPoses.js and TeachingGestureState.js for bounded pose/transition refinements. Preserve existing signatures, collision safety and reduced motion. Review actual returned patch before applying.
3. Codex: integrate allowlisted gestures into AnimationController and TutorIntegration. Bind speech selection only on actual playback; reset on pause/end/error/cancellation. Support microphone/listening event hooks and once-per-mounted-tutor greeting.
4. Verify focused backend, controller and speech tests plus production build to disposable output. Run graphify update. Record actual Gemini evidence and visual limitations. Stop after implementation and verification.

Review focus: malformed/oversized tool arguments; split streaming tool deltas; stale synthesis after interruption; listening across renders; reduced-motion and safe arm transitions. Keep lip-sync independent.
