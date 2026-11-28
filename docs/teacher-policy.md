# Floating teacher policy

The teacher menu and Arabic/English voice commands may navigate only to **دروسي**, `/lectures?subject=math`. Chatbot, progress, history back, first/next lesson and every other destination are unavailable through the teacher. Ordinary application menus retain their routes. Explanations use the current visible question without changing pages.

Voice settings enable speech capability; they do not authorize automatic narration. Normal chat, quiz feedback, page opening and navigation remain silent. A direct Arabic/English explain, read aloud or repeat request authorizes one response. Explicit play/read controls authorize their selected text. `speakText(text, request)` requires a direct request such as `read aloud`; an omitted request stays silent. Existing text, chat and assessment API payloads remain unchanged.

Stop, microphone interruption, mute, token/chat changes and page changes cancel playback. Revocation consumes pending turn authorization so a late completion cannot start speech. The existing audio integration aborts synthesis and discards stale audio; timed lipsync remains attached to actual media playback. Right Alt push-to-talk remains available, including focused quiz inputs.

The RTL quiz opens as a centered native modal above a darkened paused video, including wrapper fullscreen. It traps keyboard focus, exposes its prompt for contextual voice actions, and focuses Continue after persisted feedback. Escape resumes only after a result is saved; otherwise use the visible Skip control. Forward seeks stop at the earliest unresolved checkpoint. The player snaps to the exact checkpoint and uses video frame callbacks with timeupdate fallback. Answer and skip PUT requests retain `answer`, `skip`, and `revision`; only confirmed server results unlock resume. Reopening loads saved results from the existing GET endpoint. Feedback is text only; Read question is explicit speech.

Focused checks: `node --test tests/teacher-policy.test.mjs tests/voice-actions.test.mjs tests/voice-navigation.test.mjs tests/companion-state.test.mjs tests/character-speech.test.mjs tests/lipsync-timeline.test.mjs` and `npm.cmd run build`.

For mounted browser checks, run Vite and open `/tests/teacher-policy.browser.html`. This isolated fixture mocks network responses and media playback, checks modal focus, persistence/retry, speech authorization and late cancellation, and displays its results. Real media timing and device fullscreen should also receive a manual check.
