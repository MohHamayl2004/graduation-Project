# NIPRAS Full-Stack Correctness Design

## Purpose

Turn the current Arabic RTL prototype into a working graduation-project application. A student must be able to create an account, sign in, upload a supported study file, follow its analysis, open generated lessons and quizzes, chat against the uploaded material, maintain a study plan, and see progress that comes from saved activity.

## Product flows

1. A visitor can view the landing page and create an account or sign in.
2. Authentication survives a page refresh for the current browser session and protects every student route.
3. A signed-in student uploads a PDF, DOCX, or TXT file. The file is private to its owner.
4. The backend extracts and chunks the material, asks an OpenAI-compatible provider for structured Arabic content, and records analysis status in MongoDB.
5. The frontend polls the analysis resource and shows real progress, failure, cancellation, and completion states.
6. Completed analysis produces at least one lecture and one quiz linked to the source material.
7. Quiz attempts are graded on the server. Completion updates progress.
8. Tutor replies are generated from retrieved chunks and return citations to the source material.
9. Study-plan tasks and progress survive refreshes and are isolated by user.

## Technical decisions

- Preserve React, Vite, React Router, Express, MongoDB, Mongoose, and the Arabic-only RTL interface.
- Keep bearer JWT authentication for this graduation-project version. Store the token in `sessionStorage`, hydrate it through `/api/auth/me`, and clear it after a 401. A later production hardening pass can move the token to a secure HTTP-only cookie.
- Standardize ownership fields on `owner`; migrate existing `Material.userId` values before removing that field.
- Support PDF, DOCX, and TXT during the first complete implementation. Reject image uploads until an OCR provider is deliberately added.
- Use an OpenAI-compatible HTTP API through native `fetch`, configured with `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, and `AI_EMBEDDING_MODEL`. Do not hard-code a vendor key or silently return fake AI content.
- Start analysis asynchronously, persist every status transition, and reset stale `processing` jobs to `pending` when the server starts before resuming them. This is appropriate for a single API process. A multi-instance deployment must replace the in-process runner with a durable queue.
- Serve uploaded files only through an authenticated ownership-checked endpoint. Do not expose the uploads directory with `express.static`.
- Return one error shape everywhere: `{ "message": string, "code": string, "details"?: object }`.

## Quality requirements

- All user-facing copy remains Arabic and the document remains `lang="ar" dir="rtl"`.
- Loading, empty, success, and failure states must exist for every API-backed page.
- Buttons must perform an action, navigate somewhere, or be removed/disabled with an explanation.
- API payloads must be validated before database operations.
- Object ownership must be included in every query for private resources.
- Tests must cover behavior at the API boundary and visible user journeys, not source-code string matching.
- The final frontend build and backend test suite must pass, and the main flow must be verified in a browser at desktop and mobile widths.

## Explicit non-goals

- Google OAuth is not part of this implementation. Remove the inactive Google buttons until OAuth credentials and callback URLs are supplied.
- Image OCR, payments, social features, and multi-tenant administration are not included.
- The plan does not replace the current visual design or Arabic terminology.
