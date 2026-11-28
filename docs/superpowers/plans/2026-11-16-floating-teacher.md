# Floating teacher implementation plan


User specification: attached Floating Interactive AI Teacher, Codex-only edition. No agents, commits, pushes or GPU/backend startup. Preserve dirty user files. Reuse existing male.glb because no replacement model or screenshots accompany this request.

2. Shared state: mount one companion provider above routes; reuse useTutorChat and useTutorCharacter. AI Tutor consumes the same chat. Replace sidebar 3D instances with the existing static mascot. Lazy-load the single full-body viewport only on relevant signed-in pages.
3. Interactions: bounded pointer dragging with a six-pixel threshold, local position/settings persistence, scoped context-menu prevention, touch dragging, accessible menu/reopen controls. Dark RTL menu: real chat/content navigation, size/view/voice/mic/motion/glow/shadow/reset settings. CSS transforms move the screen container only.
4. Voice: guarded Right Alt push-to-talk, MediaRecorder capture with duration/size caps, private backend STT, shared chat submission and playback. Release/blur stops capture; cleanup cancels stale uploads and closes microphone tracks. Browser speech recognition remains an explicit fallback where available. Preserve playback-driven gestures and amplitude lip-sync, without claiming phoneme alignment.

Review focus: duplicate avatars, stale microphone permission/upload completions, AltGr typing, viewport resize/storage corruption, cancellation and paid-provider error loops. Never log or bundle the key.
