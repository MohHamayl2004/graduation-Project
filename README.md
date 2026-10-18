# NIPRAS AI Tutor

## Run locally

Student registration now collects name, email, date of birth, one of the six
academic streams, and an optional contracted-school discount code. Accounts can
sign in immediately; there is no email verification or email delivery setup.
See [student accounts](docs/accounts.md) for profile, coupon and test details.

Study Plan starts with the supplied Arabic VARK questionnaire. Completed students
can save daily or weekly study preferences. Weekly selections contain dates and
lessons without hours. A student can open a daily selection linked to a saved
week and choose a time then; only that week's dates and lessons are allowed.
Daily selections use dated time windows. A small animated calendar selects dates,
and scroll wheels select hours/minutes with automatic AM/PM display. The
study/exam goal and lessons come from the eight-subject catalog. English has no
lessons. Subject arrows reveal units and lesson checkboxes; selecting a subject
or unit selects all its lessons. The API validates dates, overlapping windows
and lesson IDs, computes total time, and stores each student's plans and VARK
score snapshot in MongoDB. Returning students can generate a saved timetable,
edit preferences, and confirm regeneration. Weekly plans distribute lessons by
estimated load; each day preselects its lessons for the linked daily builder.
Daily plans split activities across available windows, reserve breaks and report
unfinished work without compressing it. VARK scores affect actual activity time.
Session cards open explicitly labeled demo resource previews, without playing
unrelated media, generating educational content, or recording learning progress.
See the scheduling rules and validation notes in [student accounts](docs/accounts.md).

On the Windows workstation already prepared for this checkout, start all local
services from the repository root:

```powershell
npm run local
```

Open `http://localhost:5173`. Run this command in your own VS Code terminal and
keep it open: it displays each service's running/stopped status. Press Ctrl+C
to stop, or use `npm run local:stop` from another terminal. Local services need
to be started again after the computer or their launching session stops.
The startup script uses the portable MongoDB under `.local/mongodb`, database
files under `.local/mongo-data`, the AI virtual environment under
`Nipras_Ai_Models/.venv`, and the generated RAG index. Ollama must already be
running with the configured tutor model downloaded. Logs are in `.local/logs`.
To start only MongoDB, the API, and the frontend while preparing AI, use
`npm run local -- -SkipAI`.

This laptop uses `nipras-local-cpu:latest`, a local Ollama configuration that
reuses the `qwen3.5:9b` weights with `num_gpu=0`. It is not another model download.
The local AI `.env` sets `NIPRAS_TUTOR_TIMEOUT_SECONDS=600`, and `backend/.env`
sets `AI_TIMEOUT_MS=660000`. The shared Python default remains 180 seconds.
Local CPU answers can take several minutes, especially for the first question.

These commands reuse the installed local prerequisites; a fresh clone still
requires the setup below. The local database is separate from any team database.

Prerequisites: Node.js with npm, a running MongoDB instance, and (for AI Tutor)
Python, Ollama, and the AI repository's required models and retrieval data.
The exact Python version, model names, and data preparation steps must be checked
in `Nipras_Ai_Models` after downloading it.

Download the pinned AI submodule before setting up the AI service:

```powershell
git submodule update --init --recursive
```

If GitHub returns `Repository not found`, verify the URL in `.gitmodules` and
that the Git account on this computer has access to that repository. An empty
`Nipras_Ai_Models` directory does not mean the submodule was downloaded.
On Windows, if Git reports missing `basename`, `sed`, or `git-sh-setup`, this
Git Bash invocation supplies the helper tools for that command:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -c 'export PATH="/usr/bin:/mingw64/bin:$PATH"; git submodule update --init --recursive'
```

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
Copy the root `.env.example` to `.env.local` to configure it explicitly.
For a local MongoDB instance, set `MONGO_URI=mongodb://127.0.0.1:27017/nipras`
and leave `MONGO_URI_STANDARD` empty. The API waits for MongoDB before listening;
the database must already be running. If using Atlas instead, supply its valid
connection string. Run API commands through `npm --prefix backend` as shown
above so dotenv reads `backend/.env`.

Keep `.env.local`, `backend/.env`, and the AI service's `.env` out of Git.
Use the same secret for backend `AI_SERVICE_KEY` and AI `NIPRAS_SERVICE_KEY`.
Check `ollama list` for the required models; an empty list means the AI models
still need downloading, even if Ollama itself is running.

See [the local readiness check](docs/local-readiness.md) for this workstation's
last verification and outstanding setup requirements.

## Tests and production build

```powershell
npm test
npm --prefix backend test
npm run build
```

Database-backed integration tests require a separate `MONGO_URI_TEST`, `NODE_ENV=test`, and a database name containing `test`. The test helper rejects every other database name and never falls back to `MONGO_URI`.

## Workspace foundation operations

Every signup receives an immutable `NIP-XXXXXXX` identifier, a PERSONAL workspace, and an OWNER membership. Signup accepts an optional contracted-school discount coupon, which stores a discount benefit without granting school workspace access. Joining a school workspace remains a separate authenticated API operation.

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

### Local subscriptions and admin

Signup includes a city and either a seven-day free trial or a paid plan. Monthly,
quarterly and yearly plans cost $39.99/30 days, $109.99/120 days and $399.99/365 days.
The `/subscription` checkout simulates Visa and automatically activates access;
it does not charge money. Demo checkout is disabled in production.

Run `node backend/scripts/createAdmin.js` to provision the local admin, then read
the generated credentials in ignored `.local/admin-account.json` and sign in at
`/login`. The `/admin` dashboard supports city/plan filters, real database reports,
manual account actions, an audit log, CSV export and printing/Save as PDF.
See [account and billing details](docs/accounts.md) for behavior and integration tests.

## Five-minute lectures

The tutor model writes a short lecture for one lesson as JSON (slides, narration, one focus question); a fixed template draws it as an HTML/CSS page that plays like a video lesson, with a timeline, captions and a voice.

```powershell
cd Nipras_Ai_Models
python scripts/generate_lecture.py --lesson 1-2                       # writes ../public/lectures/lesson-1-2/
python scripts/generate_lecture.py --lesson 1-2 --focus "قاعدة الضرب"
python scripts/generate_lecture.py --from ../public/lectures/lesson-1-2/lecture.json   # re-draw after a hand edit
```

The Vite app then serves it at `/lectures/lesson-1-2/index.html`. The model never writes HTML: every string it produces is escaped into one shared design (`rag/lecture_template/`). Before a lecture is written it is checked (length for five minutes, one correct choice confirmed by the calculator, no numbers that are not in the book, book notation); a failed check is sent back to the model (three attempts in all), and anything still wrong is listed under `needs_review` in `lecture.json` for a person to fix.

Voice: set `NIPRAS_TTS_URL` in `Nipras_Ai_Models/.env` to use the TTS model (one audio file per slide, in `audio/`). Without it the page reads the lecture with the browser's own Arabic voice. The request shape the TTS service is assumed to accept is at the top of `rag/tts.py`.

Answers to the focus question are posted to the parent window (`{ type: "nipras-lecture", event: "answer", checkpointId, answerId, correct, atSeconds }`), so an `<iframe>` in the React app can store them as progress.

Tests: `python Nipras_Ai_Models/tests/test_lecture.py`

## Deploying (GitHub Pages + the GPU server)

```
any device -> GitHub Pages (this React app)
                 | HTTPS, address in public/config.js
                 v
        vast.ai GPU server (cloudflared tunnel -> API only)
          - Express API             <-> MongoDB Atlas
          - AI service (127.0.0.1)  -> Ollama + qwen3.5:9b (127.0.0.1)
```

**Site.** `.github/workflows/pages.yml` builds and publishes on every push to `main`, at `https://nipras.site`. One-time: repository *Settings -> Pages -> Source: GitHub Actions*, then *Custom domain: nipras.site* and *Enforce HTTPS* (Pages on the free plan needs a public repository). The domain's DNS: four `A` records for `@` -> `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and `CNAME www` -> `mohhamayl2004.github.io`. The server's `CORS_ORIGINS` lists `https://nipras.site,https://www.nipras.site`.

**Server, once.** Copy the code in (the AI repository is private, so the server cannot clone it), then run the setup:

```powershell
tar --exclude=node_modules --exclude=.git -czf - . | ssh -p <port> root@<ip> "mkdir -p /workspace/nipras/app && tar -xzf - -C /workspace/nipras/app"
ssh -p <port> root@<ip> "bash /workspace/nipras/app/deploy/vast/setup.sh"
ssh -p <port> root@<ip> "nano /workspace/nipras/app/backend/.env"      # paste MONGO_URI
```

Allow the server's IP in MongoDB Atlas -> Network Access. The service key and JWT secret are generated on the server and never leave it.

**Every demo.** Start the server on vast.ai, then:

```powershell
ssh -p <port> root@<ip> "bash /workspace/nipras/app/deploy/vast/start.sh"
```

It prints a new `https://....trycloudflare.com/api` address each time. Put it in `public/config.js` on GitHub (edit in the browser, commit to `main`); the site picks it up in about a minute. Stop the vast.ai instance afterwards - it is billed by the hour.

Only the API is reachable from outside, through the tunnel; it accepts browsers from `CORS_ORIGINS` only. The AI service and Ollama listen on 127.0.0.1.
