# Global character voice navigation

Students use the existing floating teacher microphone or hold Right Alt, speak, and release. The same authenticated speech input serves navigation and tutor questions. AltGr combinations retain normal keyboard behavior.

The controller recognizes MSA, common Palestinian/Levantine expressions and English. Examples: `افتح المعلم الذكي`, `يا نبراس بدي أروح على المعلم الذكي`, `بدي أشوف دروسي`, `ورجيني تقدمي`, `افتح الخطة الدراسية`, `open AI tutor`, `show my progress`.

`matchVoiceCommand(text)` returns a fixed navigation or contextual action, or `null`. `planVoiceAction` independently validates routes and subscription access. No speech or model output can supply executable code, arbitrary URLs or admin actions. Educational questions continue to the existing tutor. Unknown navigation requests ask for a clearer destination.

The shared character stays mounted across supported student routes. Navigation starts immediately; a short confirmation uses actual backend TTS and the existing audio-driven character playback. Microphone use can be disabled in teacher settings.

Optional browser wake recognition is explicitly enabled per session, shows a visible stop control, ignores speech before `يا نبراس`, and pauses during teacher speech and when the page is hidden. Browser recognition availability depends on the browser/provider; it is separate from the verified server STT capability and uses the same microphone controller.

## Verified on 2026-11-17

- Actual Chrome microphone input → authenticated STT → Lectures to Progress using English and the clickable microphone.
- Both returned HTTP 200 transcription and real `audio/mpeg` confirmation; the character entered speaking state. No application responses were mocked. AltGr did not start recording.
- Command/permission tests reject educational questions, quoted commands, arbitrary URLs and unknown routes. Focused speech and character regression tests pass; production build passes.

Artifacts: ignored `.agents/check-output/qwen-voice/voice-navigation-browser.json` and redirect screenshots. Real ambient microphone quality and live browser wake recognition were not validated by these prerecorded-input tests.

Gemini 3.8 Flash High supplied an isolated initial matcher draft, then timed out. Codex reviewed it, repaired Arabic aliases/normalization, added tests, and integrated the controller. No further paid retries were made.
