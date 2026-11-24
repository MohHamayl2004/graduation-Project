# Local tutor with Vast models

Validated 2026-11-14 on `nipras-reactive-book`. Model services run on the existing Vast RTX 3090 instance; no public inference ports or paid APIs were added.

| Component | Remote loopback | Local SSH forward |
| --- | --- | --- |
| Qwen3.5-9B Q4_K_M / llama.cpp b9222 | 127.0.0.1:8000 | 127.0.0.1:18000 |
| Fish S2 Pro Q6_K / s2.cpp 2c332619 | 127.0.0.1:8081 | 127.0.0.1:18001 |

`scripts/connect-vast-models.ps1` starts hidden independent SSH forwarding, checks readiness, and records the process under ignored `.local/`. Run it again after Windows restarts or a connection drops. It preserves other listeners and SSH sessions, including Jupyter on 8080. Remote model processes are managed independently by Supervisor (`nipras-qwen`, `nipras-fish`). No model downloads are needed for reconnecting.

Private `backend/.env` selects `AI_SERVICE_PROVIDER=qwen`, `AI_MODEL_ID=qwen3.5-9b`, and the two loopback endpoints. Qwen's service credential stays server-side. Private root `.env.local` enables `VITE_NIPRAS_TUTOR_SPEECH=true`. Restart an already-running backend/Vite server after changing environment files. Never publish these environment files.

The default `rag` provider remains available. Direct Qwen mode preserves authentication, subscriptions, ownership, saved chat history, interruption and tutor stream v1. It does **not** run textbook retrieval or the symbolic calculator: it returns no citations or verified-calculation claims, and marks `NO_BOOK_RETRIEVAL`. The expected local AI checkout is currently empty, so restoring that pipeline is separate work. Existing retrieval code was not removed.

The character reads newly completed answers through the Fish proxy. Reading historical messages requires the **قراءة الإجابة** button. Browser autoplay rejection retains the generated audio and offers **تشغيل الصوت** without another model request. **إيقاف الصوت** cancels playback, closes the mouth and clears temporary gestures. Speech failures are visible and do not block text chat.

Validation: 99 frontend tests, 31 focused backend tests, and a production build passed. Real Qwen Arabic text was synthesized by Fish into a WAV in about 7 seconds for a short answer. Isolated Chrome playback of that WAV drove the real avatar's mouth (peak approximately 0.80), entered speaking state, and reset to zero on stop. A screenshot and measured results are in ignored `.agents/check-output/live-tutor/`. Both services coexisted at approximately 10.3 GiB total GPU usage after generation.

Limitations: mouth opening follows audio amplitude; pronunciation-level lip-sync and voice quality have not been verified. No reference voice or voice cloning is configured. Fish uses its research license. Speech is generated after each text answer completes, with one Fish synthesis at a time. Downloads reside on container storage and are lost if the instance is recycled or destroyed.
