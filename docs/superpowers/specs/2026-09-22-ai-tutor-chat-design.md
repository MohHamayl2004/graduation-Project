# NIPRAS AI Tutor Chat Design

## Goal

Replace the mock AI Tutor page with a real, streaming, ChatGPT-style conversation backed by the unit-1 tutor (`Nipras_Ai_Models`), with every conversation saved to the student's account. The design must survive growth (more units, more users, a GPU server later) without the client, the API, and the AI service drifting apart.

## Existing architecture found

- **Client.** `src/pages/AITutor/MainChat.jsx` renders hard-coded chemistry messages; `handleSend` appends a fake reply. `src/services/tutorService.js` is an empty object. `apiRequest` in `src/services/api.js` supports JSON only (no streaming).
- **API.** Express 4 with `createApp()`, `protect` (JWT bearer), `ApiError(status, code, message)` and a safe `errorHandler` returning `{ code, message }`. Tests use `node:test` + `supertest`. No tutor routes exist. `models/AIChat.js` already defines `{ owner, material?, title, messages[{ role, content, citations[{ material, label }], createdAt }] }` and is unused.
- **AI service.** `Nipras_Ai_Models/rag/service.py` (FastAPI) exposes a blocking `POST /ask` returning the whole answer after 60-170 s on the current CPU-only machine. CORS allows the Vite origin directly. `Tutor.ask()` runs scope gate -> hybrid retrieval -> sympy calculator -> prompt -> Ollama -> checks, in one function.

## Decisions

1. **One public entry point.** `React -> Express /api/tutor/* -> Python AI service -> Ollama`. The browser never calls the AI service. Express owns identity, persistence, rate limits and error shape; Python owns everything about answering.
2. **The AI service is internal.** It binds to `127.0.0.1` by default, has no browser CORS, and rejects requests without the shared header `X-Nipras-Service-Key` (constant-time compare). Deploying it on a GPU machine later changes one env var (`AI_SERVICE_URL`).
3. **Streaming as NDJSON over POST.** `EventSource` cannot send `Authorization` or a body, so the client uses `fetch` + `ReadableStream`. One JSON object per line, `Content-Type: application/x-ndjson`. The same event schema is produced by Python, relayed by Express, and consumed by React.
4. **One versioned contract, tested on all three sides.** The event schema lives in `docs/contracts/tutor-stream-v1.md` with a fixture file `docs/contracts/fixtures/tutor-stream-v1.ndjson`. Python tests assert their output matches it, Express tests replay it through a fake AI service, and client tests parse it. A change to the schema is a new version (`v2`), never a silent edit.
5. **Conversation memory is in the contract from day one.** Express sends the last turns as `history`; the first implementation uses it for follow-up questions only in retrieval and prompt context, but the field and storage exist now so adding memory later changes no API shape.
6. **The answer the student saw is the answer stored.** The assistant message is written once, from the `done` event (including an appended verified-answer line), or marked `interrupted` with the partial text if the stream breaks.

## Stream contract (v1)

Each line is one event: `{ "type": ..., ... }`. Order is fixed: `meta` first, then at most one `sources`, at most one `calculation`, any number of `delta`, and exactly one terminal `done` or `error`.

| type | fields | when |
|---|---|---|
| `meta` | `chatId`, `messageId` (Express adds), `model` | immediately |
| `sources` | `items[{ order, lesson, lessonTitle, document, pages[], label, via }]` | after retrieval, before any text (< 1 s) |
| `calculation` | `answer`, `facts[]`, `methods[]` | only when the sympy calculator solved it |
| `delta` | `text` | as Ollama streams tokens |
| `done` | `answer` (final full text), `found`, `refused`, `warnings[]`, `checks{}`, `seconds` | once, last |
| `error` | `code`, `message` (Arabic, safe) | instead of `done` |

A refusal (out of scope, or nothing relevant found) is `meta` -> `done` with `refused: true`, no model call. Error codes: `AI_UNAVAILABLE` (Ollama or index down), `AI_TIMEOUT`, `AI_BUSY` (queue full), `AI_INTERNAL`.

## AI service (Python)

- Split `Tutor.ask()` into `prepare(question, history)` -> either an immediate reply (refusal) or a `Prepared` object `{ prompt, sources, calculation, grounding }`, and `finish(prepared, answer)` -> `{ answer, checks, warnings }`. `ask()` becomes `prepare` + blocking generate + `finish`; `stream()` is `prepare` + streamed generate + `finish`. No logic exists twice.
- `generate_stream()` calls Ollama with `stream: true`, yields text pieces, and closes the HTTP response when the caller stops iterating (client disconnect stops the model).
- `POST /v1/tutor/stream` returns the NDJSON stream. `GET /v1/health` reports model, index and Ollama reachability. The old `POST /ask` stays for the evaluation scripts.
- One generation at a time (Ollama on one GPU/CPU): an `asyncio.Semaphore(1)` with a short wait; beyond `AI_MAX_QUEUE` waiting requests the service answers `error: AI_BUSY` instead of piling up.
- Warm-up on start (`--warm`) loads the index and sends a 1-token prompt so the first student does not pay the model load.

## API (Express)

| Method | Path | Behaviour |
|---|---|---|
| `POST` | `/api/tutor/chats` | create an empty chat `{ title? }` -> `{ chat }` |
| `GET` | `/api/tutor/chats` | the student's chats, newest first, without messages |
| `GET` | `/api/tutor/chats/:chatId` | one chat with messages; 404 if not the owner's |
| `DELETE` | `/api/tutor/chats/:chatId` | delete own chat |
| `POST` | `/api/tutor/chats/:chatId/messages` | `{ content }` -> NDJSON stream (contract v1) |

All routes use `protect`; every query filters by `owner: req.user._id` (a chat ID alone never grants access). `content` is trimmed, 1-2000 characters. The user message is saved before the AI call; the first user message sets the chat title (first 60 characters). Express relays events line by line (no buffering, `X-Accel-Buffering: no`), adds `chatId` and `messageId` to `meta`, and on `done` saves the assistant message. If the client disconnects, Express aborts the upstream request. A per-user limit of one in-flight message returns `409 TUTOR_BUSY`.

`AIChat` message gains: `sources[{ lesson, lessonTitle, document, pages, label }]`, `calculation{ answer }`, `status: complete | refused | interrupted | failed`, `meta{ model, seconds }`. Existing fields stay; no migration is needed because the collection is empty.

New env: `AI_SERVICE_URL` (default `http://127.0.0.1:8000`), `AI_SERVICE_KEY`, `AI_TIMEOUT_MS` (default 240000). Documented in `backend/.env.example`.

## Client (React)

- `src/utils/ndjson.js`: a pure line parser that handles chunks split mid-line and mid-UTF-8 character. Unit-tested with the contract fixture.
- `src/services/tutorService.js`: `listChats`, `getChat`, `createChat`, `deleteChat`, and `streamMessage(chatId, content, { signal, onEvent })`.
- `src/hooks/useTutorChat.js`: a reducer-based state machine `idle -> sending -> streaming -> idle | error`, with `AbortController` stop. The reducer is a pure function, tested with the fixture.
- `MainChat` is split into `MessageList`, `AssistantMessage` (streamed text, source chips "الدرس ١-٢ · صفحة ١٧", a "محسوب ✔" badge, a calm refusal style), and `Composer` (Enter to send, Shift+Enter newline, disabled while streaming, stop button). Unit-1 starter prompts replace the chemistry ones. Auto-scroll only while the student is at the bottom.
- Text is rendered as plain text with preserved line breaks; no HTML from the model is ever injected.

## Testing

- **Python:** `prepare/finish` equivalence with the old `ask()`; stream order and schema against the fixture with a fake generator; refusal path makes no model call; service key required; disconnect stops generation.
- **Express:** a fake AI service (local HTTP server replaying the fixture) for: auth required; owner isolation; message saved on `done`; `interrupted` saved on upstream break; `AI_UNAVAILABLE` when the AI service is down; `TUTOR_BUSY`.
- **Client:** parser split-chunk cases; reducer transitions for `sources`, `calculation`, `delta`, `done`, `error`, abort.

## Non-goals (this spec)

File/photo questions, voice, quiz generation from chat, teacher views, workspace-scoped chats, multi-unit filters, horizontal scaling of the AI service, and fine-tuning. The contract leaves room for each.

## Phases

1. AI service streaming (`prepare/finish`, `/v1/tutor/stream`, key, semaphore, tests). **Done.**
2. Express tutor routes, persistence, relay, tests. **Done** (`tests/tutor.test.js`, `tests/tutorRoutes.test.js`).
3. Client parser, service, hook, components, tests. **Done** (`tests/tutor-chat.test.mjs`).
4. Follow-up questions using `history`. **Done, minimal:** a short question with no mathematics of its own (≤ 8 words) is scope-checked and searched together with the previous question; the last two exchanges go into the prompt. The calculator only ever computes the current question.
5. Run instructions for the three processes in `README.md`. **Done.**

## Known limits

- The login token lives in memory (`AuthContext`), so a page refresh signs the student out and the chat asks them to sign in again. Persisting the session is the auth work listed under "Deferred SaaS work" in `README.md`.
- The one-answer-per-student lock is in-process. It is correct for one API process; a scaled-out API needs a shared store.
- There is no end-to-end test through a real MongoDB here: the route tests run the real router and controller against an in-memory chat store.
