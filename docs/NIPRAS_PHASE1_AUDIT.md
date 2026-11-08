# NIPRAS Phase 1 audit — 2026-11-03

## Scope and evidence

Audited the current checkout on `main`, starting at `b056fbb`, rather than treating historical design documents as implemented features. Existing September plans describe both completed and still-unimplemented work. `docs/local-readiness.md` describes a different local setup and AI revision; its old runtime claims are not current evidence.

Public landing, login, auth flows, dashboard design and tutor design were not changed. Phase 2 requires explicit approval.

## Mock inventory and feature map

| Feature / frontend evidence | Classification | Actual backend / data source | Phase 1 disposition / next work |
| --- | --- | --- | --- |
| `Dashboard/index.jsx`, `data/mockDashboard.js` | Mock metrics; real identity | `AuthContext` + `/api/auth/me` supply name, stream, benefit; no dashboard aggregate API | Preserve real identity. Phase 2 must replace fixed goal, 14/20 lessons, 78% grade, streak, weekly minutes, focus/mastery, invented exams and resume progress. Use saved plans/materials/chats; unavailable metrics must remain unavailable. |
| Dashboard question textarea / calendar / lesson cards | Partial / inert | Tutor and plan routes exist | Phase 2: wire navigation, preserve entered question or use a direct tutor link; no fake continuation without persisted position. |
| `Analysis/index.jsx` | Was simulated; now partial real integration | `GET /api/materials`, owner filter `userId`; server status is `uploaded/analyzing/analyzed/failed` | Removed timer, fixed filename, countdown, false completed stages and redirect. Lists real records with honest status, loading, retry/error and empty states. Upload/processing UI is explicitly unavailable. |
| `services/materialService.js` | Real API adapter | `GET /api/materials`, `GET /:id`, `POST /upload` | List adapter now accepts abort signal and validates response list shape. No new public file links. |
| Material processing | Missing | `Analysis` model exists; no worker, analysis routes, extraction/OCR/indexing/generation integration | Phase 4 batch 1: protect storage first; define actual processing contract before building processing UI. Saving a file is not analysis. |
| `Lectures/index.jsx`, `data/mockLectures.js` | Static educational content with fake personalization | `Lecture` schema only; no lecture routes/controllers | Preserve educational text. Phase 4: remove false AI-generated claim, fixed 35% completion and unsupported personalized advice; connect published owner-scoped lectures or show unavailable state. Quiz/download/remediation/simulation/topic buttons are inert. |
| `Lesson/slides.js`, `data/mockLesson.js` | Legitimate authored math content; partial player | Static lesson 1-1, narration/TTS and local checkpoint events; no lesson-progress API | Preserve textbook content, graph and modes. Removed unused fixed `progress: 40`. Route `:code` currently does not select a different lesson; helper uses authored responses, not live AI; events remain in memory. Phase 4: resolve content by code and persist actual events. |
| `InteractiveLesson/index.jsx`, `data/interactive/demo.json` | Static demonstration with working local interaction | YouTube player + checkpoint state; no stored results | Keep educational content/test fixture. Label/select authored lesson appropriately and persist actual activity in Phase 4; do not treat local answers as account progress. Missing-video copy currently asks users to edit source code. |
| `Quizzes/index.jsx`, `data/mockQuizzes.js` | Mock quiz workflow | `Quiz` and `QuizAttempt` schemas only, no routes/controllers/grading | Fixed question 3/10, timer 12:34 and answer dots are invented. Submit only sets a success toast; skip/previous are inert. Phase 4: server grading, owner-scoped attempts and real history, or honest unavailable state. |
| `Progress/index.jsx`, `data/mockProgress.js` | Mock analytics and fake export | `Progress` schema exists, but no event producers or API | Fixed lessons/scores/hours/streak/mastery/2023 history/chart/recommendations; export produces no file; goal is local state. Phase 4: persisted-event definitions first, then derived analytics/export. |
| `StudyPlan/index.jsx`, `PlanBuilder`, `SavedPlans` | Real persistence; resource previews partial | `/api/study-plan/assessment` GET/PUT; `/plans` GET/POST; `/:id` PUT/DELETE; `/:id/generate` POST; `LearningAssessment`, `StudyPlan` | Preserve working VARK validation, ownership, revision guards and deterministic schedule generation. `GeneratedPlan.jsx` explicitly labels resources as demonstration previews; actual lesson/practice/quiz material is not generated. Planned minutes are not studied minutes. |
| `services/studyPlanService.js` | Empty unused adapter, not missing plan backend | Study-plan components currently call `apiRequest` directly | No duplicate service implementation. Consolidate only if useful in an approved later phase. |
| `services/lectureService.js`, `quizService.js`, `progressService.js` | Empty unused adapters | Matching schemas do not constitute APIs | Implement methods only alongside approved complete backend features. |
| `AITutor/index.jsx`, `MainChat`, `useTutorChat`, `tutorService.js` | Real chat/streaming implementation; runtime blocked | `/api/tutor/chats` GET/POST; `/:chatId` GET/DELETE; `/:chatId/messages` POST; `AIChat`, owner-scoped `tutorChatService`, `tutorRelay` | Preserve NDJSON reader, history, cancellation, partial answers, sources and math display. Phase 3: actual source/subject context, retry and responsive review. Unit badge is hardcoded to differential calculus; it is not a selectable retrieval filter. |
| `AITutor/RightStudyPanel.jsx` | Unused mock module | No imports/references | Deleted: invented 68% progress, 45% last score, 2024 exam and fake flashcard success. Live tutor did not mount it. |
| `data/mockStudyPlan.js` | Unused obsolete mock | Real study-plan backend supersedes it; no imports/references | Deleted after reference check. |
| `data/userProfile.js` | Unused hardcoded account | Auth context + StudentBadge already display real account | Deleted obsolete module; retained image asset. |
| Sidebar / Navbar | Partial / inert controls | No settings, notifications or global search API | `myMaterials` has no destination, settings/help/notifications have no action; search has no handler; notification dot is caller-controlled, not sourced. Record for focused navigation cleanup. No auth/navigation redesign in this phase. |
| Auth, workspaces, schools | Real implementation | `/api/auth/signup`, `/login`, `/me`; `/api/workspaces`; `/api/schools/join`; `User`, `Workspace`, school/coupon services | Preserve current route protection, session hydration/recovery, real identity, logout and optional coupon behavior. |
| Subscription/admin/coupons | Real persistence with explicitly labeled demo payment | `/api/billing`, `/api/admin`, coupon routes, `Payment`, `Membership`, `SchoolCoupon`, `AdminEvent` | Demo card/payment is clearly labeled and gated by configuration; not a real payment processor. Preserve this distinction and legitimate test fixtures. |

## AI compatibility at the actual pin

Gitlink: `f68f12e0e056bf823f908ca036645cf4451abd01`; local submodule is uninitialized. Read [rag/service.py at that exact commit](https://github.com/Tareqbtw/Nipras_Ai_Models/blob/f68f12e0e056bf823f908ca036645cf4451abd01/rag/service.py) through GitHub, not AI main.

- Pinned service exposes `POST /v1/tutor/stream`, `GET /v1/health`, legacy `POST /ask`.
- Express `backend/services/aiTutorClient.js` sends `{question, history}` with `X-Nipras-Service-Key`; Python accepts this shape and emits contract-v1 NDJSON.
- Python expects `NIPRAS_SERVICE_KEY`; Express expects matching `AI_SERVICE_KEY`. Python stream request has optional student context, but no subject/unit/source selector. Legacy `/ask` supports subject/unit; this does not establish those filters on the streaming endpoint.
- Current local backend points at port 8000 with a placeholder key; health endpoint is unreachable. No Python/Ollama/index availability or real answer was verified in this phase.
- Existing frontend and backend streaming tests use controlled fixtures/fake services. Their success proves code behavior, not a live model connection.

## Security and operational blockers

1. **High priority: private uploads are publicly served** by `backend/app.js` through `/uploads` static middleware. Metadata queries are owner-scoped, but byte access is not. Phase 4 batch 1 needs an authenticated owner-checked download endpoint and removal of the public mount. This phase adds no download links or upload interface.
2. Upload middleware does not create its destination on a fresh checkout; MIME metadata alone is trusted. PDF/image/TXT/DOCX acceptance does not establish OCR/extraction support. Validate input, directory creation, cleanup and storage before enabling uploads.
3. `backend/.env.example` already contains credentials and is modified by the user/session. It is excluded from the Phase 1 commit. Secret values were not copied into documentation or tests. Added an ignore rule for the newly supplied `backend/atlas-credentials.env`; local credential files remain on disk.
4. Four backend database tests skip without isolated `MONGO_URI_TEST`. Do not point cleanup-capable tests at the student's Atlas database. Existing legacy `backend/services/app.test.js` (outside the npm test glob) has a broken helper import; preserve this pre-existing file and report it separately.
5. `public/config.js` references a temporary external API tunnel for production; current public reachability is not verified. Dev uses Vite's local API proxy. Test local and deployed flows separately.
6. Existing prior DNS/env fixes are uncommitted and excluded from Phase 1; the earlier session confirmed Atlas authentication after the DNS fix, but that is not Phase 1 end-to-end evidence.

## Verification

- Targeted material service/status tests: passed; controlled fetch responses cover auth header, cancellation, saved/empty/malformed list, auth failure and unknown server statuses.
- Root suite: 36 passed, 0 failed.
- Backend suite: 54 passed, 0 failed, 4 skipped (isolated database not configured).
- Production build: passed outside sandbox; sandbox initially blocked esbuild config resolution. Final build directed to `.local/phase1-build` to avoid tracked `dist` changes. Existing Browserslist dataset age warning remains.
- Deleted-module reference search and diff whitespace check: passed.
- Not run: browser/mobile visual review, authenticated materials against live MongoDB, actual upload, real Python answer, production tunnel, or isolated database integration suite. No full-stack completion claim.

## Next approved work

Phase 2 only after approval: redesign `/dashboard` in the existing NIPRAS palette/Tajawal/RTL, load actual plans/materials/chat metadata, use honest unavailable metrics, and adapt the login press interaction into shared primary-action styling with focus, disabled/loading and reduced-motion behavior. Keep `/` and login intact. Stop again after Phase 2 tests and commit.
