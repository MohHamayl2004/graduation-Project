# Tutor stream contract — v1

The one format the AI service (`Nipras_Ai_Models/rag/service.py`), the API (`backend/`) and the client (`src/`) share for a chat answer. Design: `docs/superpowers/specs/2026-09-22-ai-tutor-chat-design.md`.

**Change rule.** Never edit v1 in place. A field that changes meaning, disappears, or becomes required is `v2`, with its own fixtures, supported side by side until every caller moved. Adding an optional field is allowed in v1 when every reader ignores unknown fields (all three do).

## Transport

- `POST`, `Content-Type: application/x-ndjson`, UTF-8.
- One JSON object per line, `\n`-terminated. A reader must accept a line split across network chunks, and a UTF-8 character split across chunks.
- The HTTP status is `200` once streaming starts; failures after that are `error` events. Before streaming starts the API uses normal JSON errors (`401`, `404`, `409`, `503`).

## Events

Order: `meta`, then at most one `sources`, at most one `calculation`, any number of `delta`, then exactly one `done` **or** `error`.

| type | fields | notes |
|---|---|---|
| `meta` | `model`; `chatId`, `messageId` (added by the API) | always first |
| `sources` | `items[]`: `{ order, lesson, lessonTitle, document, pages[], label, via }` | before any text. `document` is `math` (the book) or `solutions`. `via` is `search`, `method` (the rule for a computed exercise), `continuation` or `solution`. |
| `calculation` | `answer`, `facts[]`, `methods[]` | only when sympy computed the exercise. `answer` is final and verified. |
| `delta` | `text` | append to the answer as it arrives |
| `done` | `answer`, `found`, `refused`, `warnings[]`, `checks` (object or `null`), `seconds` | `answer` equals all `delta` texts joined, or, when there were no deltas (a refusal), is the whole reply |
| `error` | `code`, `message` | `message` is Arabic and safe to show |

A refusal (another unit, not maths, nothing relevant in the book) is `meta` → `done` with `refused: true` and no model call.

Error codes: `AI_UNAVAILABLE` (Ollama or index down), `AI_BUSY` (queue full), `AI_TIMEOUT`, `AI_INTERNAL`; the API adds `AI_INTERRUPTED` when the upstream stream breaks mid-answer.

## Fixtures

`fixtures/answer.ndjson`, `fixtures/refusal.ndjson`, `fixtures/error.ndjson` are replayed by the API tests (as a fake AI service) and parsed by the client tests. Keep them valid v1.
