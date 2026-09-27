# NIPRAS AI Tutor

## Run locally

Install dependencies once:

```powershell
npm install
npm --prefix backend install
```

Create `backend/.env` from `backend/.env.example`, set `MONGO_URI` (or `MONGO_URI_STANDARD`) and a strong `JWT_SECRET`, then start the API and Vite client in separate terminals:

```powershell
npm --prefix backend run dev
npm run dev
```

The client uses the API URL configured in `src/services/api.js`.

## Tests and production build

```powershell
npm test
npm --prefix backend test
npm run build
```

Database-backed integration tests require a separate `MONGO_URI_TEST`, `NODE_ENV=test`, and a database name containing `test`. The test helper rejects every other database name and never falls back to `MONGO_URI`.

## Workspace foundation operations

Every signup receives an immutable `NIP-XXXXXXX` identifier, a PERSONAL workspace, and an OWNER membership. A student can optionally provide a school code during signup or join an existing school later through the authenticated API.

Create a school only through the operator CLI:

```powershell
node backend/scripts/createSchool.js --ownerEmail owner@example.com --name "Example School" --joinCode EXAMPLE-001
```

For an existing populated database, keep `User.niprasId` sparse while rolling out, run the backfill, confirm every user has an ID, then migrate the index to required/unique:

```powershell
node backend/scripts/backfillNiprasIds.js
```

Registration uses a MongoDB transaction on a replica set. A standalone MongoDB deployment uses compensated cleanup for documents created by the failed registration, while preserving the consumed counter ID.

## Deferred SaaS work

Materials, analyses, lessons, quizzes, chats, study plans, and progress remain user-owned. Future work includes workspace scoping for those models, school administration, invitations, billing, analytics, audit logs, rate limits, production CORS policy, password reset, secure cookie sessions, monitoring, backups, CI, and Stripe.

## AI Tutor chat

Three processes: Ollama, the AI service (Python), and the API. The browser only ever talks to the API.

```
React  ->  Express /api/tutor  ->  Nipras_Ai_Models (python -m rag.service)  ->  Ollama
```

One-time setup:

```powershell
# 1. The AI service
cd Nipras_Ai_Models
pip install -r requirements.txt
copy .env.example .env        # set NIPRAS_TUTOR_MODEL and a long random NIPRAS_SERVICE_KEY
cd ..

# 2. The API: add to backend/.env the same key
#    AI_SERVICE_URL=http://127.0.0.1:8000
#    AI_SERVICE_KEY=<the same value as NIPRAS_SERVICE_KEY>
```

Run (four terminals, from the repository root):

```powershell
ollama serve                                   # if it is not already running
cd Nipras_Ai_Models; python -m rag.service --warm
npm --prefix backend run dev
npm run dev
```

Open `/login`, sign in, then open the AI Tutor page. Answers stream word by word; sources appear first. On a CPU-only machine an answer takes one to two minutes; on a GPU, seconds.

- Design: `docs/superpowers/specs/2026-09-22-ai-tutor-chat-design.md`
- Stream contract (shared by all three sides, with test fixtures): `docs/contracts/tutor-stream-v1.md`
- Tests: `npm test`, `npm --prefix backend test`, `python Nipras_Ai_Models/tests/test_service_stream.py`
