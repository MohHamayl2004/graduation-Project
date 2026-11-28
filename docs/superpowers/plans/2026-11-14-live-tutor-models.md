# Live tutor models implementation plan

**Goal:** Connect the existing Vast Qwen and Fish models to the authenticated tutor and reusable character.

**Architecture:** Keep model services on remote loopback with private SSH forwards. Add an explicit Qwen/OpenAI provider alongside the unchanged default retrieval service. Reuse the existing Fish proxy and media-driven character bridge. Direct Qwen mode must not invent book citations or verified calculations.

**Constraints:** Preserve ongoing work, downloaded weights, running Qwen, pages and authentication. No instance lifecycle operations, public model ports, commits or pushes.

- [x] Test and implement bounded Qwen streaming adaptation in `backend/services/qwenTutorClient.js`; select it in `backend/config/aiService.js` and `backend/services/aiTutorClient.js`.
- [x] Build pinned s2.cpp on RTX 3090, manage its loopback service with Supervisor, and test an actual Arabic WAV.
- [x] Configure ignored environment files and independent SSH forwarding; enable existing speech bridge with minimal playback controls and visible failures.
- [x] Verify backend protocol/error tests, character audio lifecycle, frontend build and real model requests. Document running endpoints and limitations in `docs/live-tutor-models.md`.

Independent review identified premature tunnel success reporting; fixed with bounded listener readiness checks. Actual forward reuse verified after the fix. Model results and real browser playback evidence are retained in ignored `.agents/check-output/live-tutor/`.

**Review focus:** cancellation, incomplete upstream streams, secret-safe errors, unavailable TTS preserving chat, stale history not auto-speaking, browser autoplay recovery, and combined GPU memory.
