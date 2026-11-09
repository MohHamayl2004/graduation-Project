# NIPRAS Codex progress

Updated: 2026-11-03 (Asia/Hebron).

## Current phase and approval

- Phase 2 — dashboard redesign and real data. User explicitly approved starting Phase 2.
- Implementation and automated verification completed; status Partial because browser/mobile visual and interaction verification is blocked by the browser tool.
- User instruction: do not commit anything. All Phase 1/2 work remains unstaged and uncommitted.
- Phase 3 and Phase 4 have not started. Stop for user review; do not start Phase 3 without explicit approval.

## Focused Phase 1 plan

- [x] Inspect branch, dirty work, recent commits and prior plans.
- [x] Inventory mock data, simulated actions, existing services/routes/models.
- [x] Check pinned AI service contract, not AI main.
- [x] Replace simulated analysis with existing saved-material API and honest unavailable processing state.
- [x] Remove only unused mock/account modules and unused hardcoded lesson progress.
- [x] Add meaningful service/status tests; retain educational content and fixtures.
- [x] Complete final tests/build and review explicit staged paths.
- [x] User waived commits and requested that all work remain uncommitted.
- [x] Findings handed over; user subsequently approved Phase 2.

## Completed work and decisions

- Audit and integration map: [NIPRAS_PHASE1_AUDIT.md](NIPRAS_PHASE1_AUDIT.md).
- `/analysis` keeps its route but now lists actual saved materials with loading/empty/error/retry states. Removed invented file processing and automatic success redirect.
- Status labels describe server state, not generated lessons/OCR/indexing. No new upload/download UI.
- Removed unused `mockStudyPlan`, unused tutor `RightStudyPanel`, unused hardcoded `userProfile`, and unused fixed lesson progress. Deletions recoverable from Git history; educational content retained.
- `getMaterials(token, {signal})` remains backward compatible; validates response shape and supports cancellation.
- Ignored the supplied Atlas credentials file; credentials themselves are not part of this commit.
- Preserve working authentication, tutor streaming and study-plan persistence. Existing old design plans are not proof of implementation.

## Files changed in Phase 1

- `.gitignore`
- `src/pages/Analysis/index.jsx`
- `src/services/materialService.js`, `src/services/materialStatus.js`
- `src/data/mockLesson.js` (unused progress property only)
- Deleted: `src/data/mockStudyPlan.js`, `src/data/userProfile.js`, `src/pages/AITutor/RightStudyPanel.jsx`
- `tests/materials.test.mjs`
- `docs/NIPRAS_PHASE1_AUDIT.md`, this checkpoint

## Verification

- Final root suite: 36 passed, 0 failed; backend: 54 passed, 0 failed, 4 database tests skipped.
- Final production build passed: `npm.cmd run build -- --outDir .local/phase1-build` (outside sandbox).
- Deleted-module reference search and staged diff whitespace check passed. Existing Browserslist age warning only.
- New tests use controlled fetch fixtures; browser/live materials/real AI not verified.
- Legacy `backend/services/app.test.js` is outside the backend npm test glob and has a pre-existing broken helper import. Not altered by this phase.

## Commits and pre-existing dirty work

- Started on `main` at `b056fbb`.
- Phase 1 commit: none. Initial attempt failed with `Author identity unknown`; user then explicitly instructed not to commit anything. Do not request author details or retry commits.
- Phase 1/2 files are unstaged; all source changes remain in the working tree. Earlier backend edits remain untouched.
- Exclude these pre-existing modifications from Phase 1: `backend/.env.example`, `backend/config/dns.js`, `backend/config/env.js`, `backend/services/app.test.js`.
- Preserve local ignored `.env` and `backend/atlas-credentials.env`. Never stage credentials.
- Build regenerated tracked `dist` files; restored only these agent-generated changes because `dist` was clean at phase start. Final build used `.local/phase1-build`; no tracked build artifacts remain changed.

## Blockers / exact next task

- No dashboard aggregate, lecture API, quiz grading API, progress event API or file-processing worker yet. See inventory for current mocks.
- Public `/uploads` byte access lacks auth; fix before enabling upload UI in approved Phase 4 batch 1.
- AI gitlink is `f68f12e0e056bf823f908ca036645cf4451abd01`; fetched pinned `rag/service.py` through GitHub. Local submodule absent, AI health unreachable, key placeholder. Stream contract exists, live AI is blocked.
- No isolated database configured; production tunnel not verified; tracked environment template contains credentials in pre-existing work.
- Exact next task: review the implemented `/dashboard` in desktop/mobile browsers and verify its selected-plan/chat links with an authenticated session when browser access is available. Then wait for explicit Phase 3 approval. Keep work uncommitted. Do not modify landing or redesign login.

## Phase 2 design and implementation

- Chosen approach: a study desk with one next action, today's timed agenda, recent saved materials, conversation continuation and saved plans. This follows the user's specified hierarchy and reuses the existing APIs instead of adding an aggregate endpoint.
- Retained NIPRAS navy `#152A63`, royal blue `#1460DF`, green `#1E7A3C`, Tajawal and RTL. No gradients, decorative blobs, invented charts, scores, streaks, exam dates or study-time claims.
- Dashboard now requests `/api/study-plan/plans`, `/api/materials`, `/api/tutor/chats` with the existing session token. Resources settle independently with loading/error/retry/empty states, cancellation and a 15-second timeout; refresh does not create records.
- Agenda uses `Asia/Hebron`, current-day generated daily sessions, valid times and current non-stale/non-archived plans. Weekly choices remain untimed. Past appointments never become completed work. Displayed minutes are explicitly planned minutes; no completion metric is invented.
- No lesson-position persistence exists, so continuation opens saved plans or conversations; there is no fake lesson resume position.
- Selected plan links use `/study-plan?plan=...`; SavedPlans opens the matching saved plan and scrolls to it. Conversation links use `/ai-tutor?chat=...`; useTutorChat loads that chat through the existing owner-checked API. No tutor redesign or streaming protocol change.
- Shared Button supports opt-in `press` and `loading`: royal blue, bottom shadow, hover brightness, active movement, focus-visible, disabled/loading and reduced-motion styling. Existing login classes/page are unchanged; other primary buttons keep their default appearance unless opted in.
- Dashboard has responsive columns that become a single flow on small screens, one central content scroller and the existing mobile sidebar. Layout implementation is complete but visual/keyboard checks remain unverified.
- Deleted `src/data/mockDashboard.js` after removing all imports. Recoverable from Git history; no other active mock pages were rewritten.

### Phase 2 changed files

- `src/pages/Dashboard/index.jsx`, `dashboard.css`, `dashboardModel.js`
- `src/hooks/useDashboard.js`, `src/services/dashboardService.js`
- `src/services/studyPlanService.js` (real list method), `src/services/tutorService.js` (optional list cancellation)
- `src/components/common/Button.jsx`, `button.css`
- `src/pages/StudyPlan/SavedPlans.jsx`, `src/hooks/useTutorChat.js` (selected-resource navigation only)
- Deleted `src/data/mockDashboard.js`
- `tests/dashboard.test.mjs`, `tests/dashboard-render.test.mjs`, this checkpoint

### Phase 2 verification and limits

- Root regression suite: 43 passed, 0 failed. Includes 6 schedule/API tests and 1 server-rendering test covering loaded, empty, partial failure, loading, escaped titles and shared button states. Rendering uses controlled fixtures; it is not a browser or live database test.
- Backend regression suite: 54 passed, 0 failed, 4 database integration tests skipped (no isolated `MONGO_URI_TEST`).
- Production build passed: `npm.cmd run build -- --outDir .local/phase2-build`, outside sandbox. Existing Browserslist age warning remains.
- Diff whitespace check and obsolete mock reference search passed. Landing/login source files have no changes. No backend changes in Phase 2, credentials copied, records created or commits made.
- Browser check attempted: in-app browser host unavailable. Native Chrome inspection was then stopped by the tool because it could not confidently verify the current URL. No further UI actions attempted. Desktop/mobile screenshots, focus/press/scroll behavior and live selected-plan/chat navigation are NOT verified.
- Live MongoDB-authenticated dashboard and real Python answer were NOT exercised; earlier Phase 1 AI/storage blockers remain. No end-to-end functionality claim.
- Review `/dashboard` in the normal dev app (typically `http://localhost:5173/dashboard`), already signed in. Check empty state or actual saved schedule, refresh, selected plan/chat links, mobile drawer, narrow-screen scrolling, keyboard focus and loading/error retry.
- Commits: none, as explicitly requested. Approval pending before Phase 3.
