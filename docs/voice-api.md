# Speech API

Authenticated speech routes are mounted at /api/tutor/speech.

- GET /capabilities reports whether Qwen transcription and Fish synthesis have configuration.
- POST /transcribe accepts one audio recording of up to 6 MiB and returns recognized text.
- POST / accepts text and returns synthesized audio.

Configure QWEN_ASR_URL and QWEN_ASR_KEY for transcription. Configure FISH_TTS_BASE_URL and optional FISH_TTS_API_KEY for synthesis. Credentials belong in the ignored backend environment file.

Client disconnects cancel active requests. Voice playback requires explicit student authorization. Audio amplitude drives the existing character mouth movement. A configured endpoint still requires a live health and inference test.
