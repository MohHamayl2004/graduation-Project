# Qwen and Arabic voice deployment

User-authorized execution: deploy now; preserve existing work; no Gemini until the user explicitly says it is ready. The updated instruction authorizes Codex to implement all phases while Gemini is unavailable. Branch: `nipras-qwen-voice-20261117`.

1. Inventory the supplied Vast instance and reuse any complete official checkpoint. Install vLLM in a dedicated environment and verify downloaded files against Hugging Face metadata. Serve BF16 Qwen3.5-9B on authenticated loopback under Supervisor, with bounded context/concurrency and GPU headroom.
2. Reconnect the existing backend through SSH, preserving authentication, conversation ownership/history, stream v1 and teacher metadata. Verify one actual website answer and history reload. Keep the RAG provider available; report the empty local RAG checkout as a blocker rather than inventing retrieval.
3. Check existing Arabic speech with real audio. Compare Qwen3-ASR with the existing provider, inspect Habibi dialect-specific licenses, and select the working configuration based on measured latency/accuracy and memory. Preserve Right Alt, clickable microphone, audio-driven mouth movement and gestures.
4. Add focused tests for any changed provider contracts; run the relevant existing tests and build. Record actual GPU usage and sanitized evidence. Refresh graphify after code edits.
5. Implement all Unit 1 lessons from the existing curriculum JSON, with reviewed exercises, interactive diagrams, server grading and owner-scoped progress. Preserve the existing lesson 1-1 flipbook.
6. Implement a reusable Qwen storyboard → schema validation → trusted HyperFrames template → Arabic narration → MP4 pipeline. Generate and inspect one 30–60-second lesson video before adding it to the corresponding lesson. Never execute model-authored code.

Acceptance: authenticated private Qwen, a real website response saved to history, a measured voice round trip, and explicit documentation of unverified quality or unavailable services. No main merge, push, secrets in tracked files, or repeated model benchmarks.
