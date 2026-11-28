# Lesson 1-1 book improvements implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fit the existing NIPRAS flipbook within the viewport and provide verified, individually selectable textbook solutions.

**Architecture:** Keep StPageFlip, stable React portal pages, the current ten leaves and backend progress. Measure the available book stage and resize the engine proportionally. Add a page-local question selector and bounded solution panel backed by verified structured lesson data; solution viewing never submits an attempt.

**Tech Stack:** React 18, StPageFlip 2, CSS, KaTeX, Node tests, Graphify.

**Spec:** User attachment `C:/Users/Tareq/.codex/attachments/ba51be6d-2b61-46c4-b30c-d6f92a8f189c/Pasted text.txt`.

## Global constraints

- Preserve the existing green/cream open book, original PDF pages, RTL and all uncommitted work.
- Scope changes to Lesson 1-1. Do not commit or push.
- Verify each question against PDF pages 4–8 and lesson JSON; report discrepancies.
- Solutions use local structured data and never mark a student's answer correct.
- Keep zoom, live graph calculations, draggable points, page turns and server progress.

## Review focus

- 1366×768 and 1920×1080: both pages, controls and graph fit without document scrolling.
- Mobile and resize transitions: one page remains usable and current reading position survives.
- Long solutions and zoom: overflow stays inside the page panel.
- Question selection, hint, reveal, next and hide address each question independently.
- Viewing a solution makes no attempt request; only the existing answer submission does.

### Task 1: Verify textbook inventory and data

**Files:** Create `src/pages/Lesson/content/lesson11Questions.js` and `tests/lesson-questions.test.mjs`.

**Interface:** Export `lesson11Questions`, each with stable `id`, `pdfPage`, `printedPage`, Arabic `label`, `prompt`, `hint`, ordered `steps: [{text, math?}]`, and optional KaTeX `answer`.

- [x] Inventory and visually verify all PDF questions and subparts; cross-check JSON.
- [x] Write coverage and independent mathematical answer checks, implement structured solutions, run tests.

### Task 2: Fit and preserve the book

**Files:** Modify `shared/lessonFlipbook.js`, `src/pages/Lesson/LivingBook.jsx`, `src/pages/Lesson/living-book.css`; create `tests/lesson-book-layout.test.mjs`.

- [x] Test aspect ratio, available bounds, desktop spread and mobile single-page sizing.
- [x] Measure stage space, resize StPageFlip without replacing portal nodes, compact existing spacing and graph.
- [x] Verify graph/sliders/navigation and resize restoration.

### Task 3: Page-local solutions and textbook zoom

**Files:** Create `src/pages/Lesson/TextbookPage.jsx` and `src/pages/Lesson/QuestionSolutions.jsx`; modify `FlipbookPages.jsx`, `living-book.css`, `tests/lesson-book-render.test.mjs`.

- [x] Test per-page selectors, all question IDs and valid KaTeX rendering.
- [x] Add hint and incremental solution reveal in a bounded page-local panel, with close/Escape and focus restoration.
- [x] Keep original page images and PDF link; add bounded in-page zoom controls.
- [x] Verify selecting/viewing a solution never invokes progress attempts.

### Task 4: Verify and update graph

- [x] Run focused tests and production build into a separate temporary output directory.
- [x] Verify desktop/mobile book bounds and interactions in a browser when access is available; report any verification blocker precisely.
- [x] Run a scoped `graphify update .` and review final modifications. Report implemented/identified question count and source discrepancies.

## Verification record

- 26/26 source items implemented; printed-page counts are 4, 2, 5, 5, 10.
- 75 Node tests passed. Production build passed.
- Isolated headless Chrome: all 26 question selectors, hints, every step, hide/Escape, zoom, graph keyboard/ranges, page turns and explicit answer submission passed at 1366×768, 1920×1080, 390×844 and 360×640. Solution views submitted zero attempts.
- Desktop/mobile resize retained the reading spread and did not write progress.
- Review found and fixed zoom-arrow propagation. Browser testing found and fixed StPageFlip's portrait corner gate rejecting programmatic backward turns.
- Original PDF takes precedence over conflicting JSON; source corrections are recorded in `lesson11QuestionVerification` with no unresolved questions.
- Scoped AST update scanned 21 files, producing 104 nodes and 232 edges. No LLM/API calls, commits or pushes.
