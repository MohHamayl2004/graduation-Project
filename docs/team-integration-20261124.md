# NIPRAS implementation handoff

## Ownership and branches

Codex CLI used gpt-6.1-sol with Medium reasoning on feature/teacher-policy-1124. It implemented teacher-only navigation policy, speech authorization, cancellation, and the video quiz overlay. Files are src/companion/teacherPolicy.js, assessmentPlayback.js, voiceActions.js, voiceNavigation.js, useVoiceNavigation.js, TutorCompanionContext.jsx, FloatingTeacher.jsx, src/hooks/useTutorCharacter.js, AssessmentPlayer.jsx, assessment-player.css, policy tests and documentation.

Gemini used gemini-3.8-flash-medium on feature/book-reader-1124. It modified LivingBook.jsx, living-book.css, reader-layout.test.mjs and book-reader-comparison.md. The leader corrected whitespace, bounded unsupported research claims and checked actual browser rendering.

The leader integrated scoped patches into the existing development checkout, retained existing dirty work, implemented source-grounded video generation, added backend retry history, extended explicit speech examples, and verified integration.

## Behavior

Teacher navigation permits only /lectures?subject=math. Ordinary website navigation remains available. Normal AI messages, navigation, and quiz feedback do not authorize TTS. Explicit explanation, reading and replay actions can authorize speech. Navigation and cancellation revoke pending automatic speech authorization.

The player pauses at the selected timestamp, dims the video, opens a focus-managed RTL modal, and displays textual feedback. Skip persists through the existing API. Retry uses updatedAt to avoid overwriting concurrent attempts and retains history. Database verification of this new retry path remains blocked.

## Lessons

Original PDF cover and pages 6, 8, 13, 23 and 24 were inspected. Grade 12, scientific and industrial streams; Unit 1 حساب التفاضل. The three videos are focused introductions, with scripts, storyboard, animation sources and narration retained.

| Lesson | File | Duration | Checkpoints |
| --- | --- | --- | --- |
| متوسط التغير | public/videos/unit1-lesson1.mp4 | 54.30 s | 25.64, 39.24 |
| قواعد الاشتقاق | public/videos/unit1-lesson2.mp4 | 59.09 s | 29.63, 43.32 |
| مشتقات الاقترانات المثلثية | public/videos/unit1-lesson3.mp4 | 61.27 s | 30.28, 60.87 |

Qwen selected both source-reviewed candidates for each lesson. The backend JSON records model selection and explanations. Each candidate follows completed narration. Answer keys are excluded from public animation sources.

## Verification

- Frontend suite passed 168 tests.
- Backend suite passed 97 tests with five database-dependent skips.
- Vite production build passed.
- Mounted browser regression fixture passed overlay, failed save, persisted skip, silent chat/quiz, explicit speech, and cancellation checks. This fixture uses controlled API/audio responses and is a regression test.
- Actual generated MP4 playback paused at 25.637914 seconds and opened the corresponding actual question in a UI-only preview.
- All three MP4 files fully decoded without FFmpeg errors.
- Actual textbook leaves rendered at desktop and 390px widths with source zoom and focus/text controls. UI-only screenshots are .local/book-before-desktop.png, book-before-mobile.png, book-after-desktop.png, book-after-mobile.png, and book-focus-desktop.png.
- Actual video overlay screenshots are .local/actual-video-overlay.png and actual-video-overlay-mobile.png.

## External blockers and limits

The original FAISS index and matching metadata remain missing. No RAG retrieval or grounded-generation success is claimed. See curriculum-rag-audit.md.


No deployment or main-branch merge was performed. Generated lessons summarize selected verified concepts, with full lessons and exercises still available in the curriculum reader.
