# Local readiness — 2026-10-16

## Start and stop

From this repository root in VS Code:

```powershell
npm run local
npm run local:stop
```

Open `http://localhost:5173`. The launcher starts portable MongoDB, the Python
AI service, Express, and Vite. It reuses listeners already running on their ports.
Logs and recorded process identities are under `.local/`. Ollama runs separately.
The stop command stops only recorded processes with matching creation times,
including the child interpreter of the Windows virtual-environment launcher.
Stop and restart have been exercised successfully.

## Installed and configured

- Node.js 22.11.0 and npm 10.9.0; root and backend lockfile dependencies installed.
- Python 3.12.10 installed for the current Windows user; isolated AI environment
  at `Nipras_Ai_Models/.venv`, with all `requirements.txt` dependencies installed.
  `pip check` reports no broken requirements. PyTorch uses its CPU distribution.
- MongoDB Community 8.0.30 ZIP extracted under `.local/mongodb`. It listens only
  on `127.0.0.1:27017` and stores data under `.local/mongo-data`.
- The new local database is `nipras`, separate from any team database. No team
  database has been changed. Backend test database URL points to `nipras_test`.
- Ignored frontend `.env.local` and backend `.env` contain local URLs. JWT and
  internal-service secrets are random. The AI `.env` has the matching service key.
- AI submodule downloaded at pinned commit
  `f21fa84d026a16e1ce78cc63b3771b7a7d22a11a`. Both repositories are on personal
  branch `codex/topmax-local-setup`; changes have not been committed or pushed.
- Ollama `qwen3.5:9b` downloaded after `ollama list` was confirmed empty.
  The local alias `nipras-local-cpu:latest` reuses those same blobs with
  `num_gpu=0`, avoiding the MX450 GPU allocation failures. It does not download
  a second set of weights. The AI `.env` selects this alias.
- `intfloat/multilingual-e5-base` is cached in `.local/huggingface`. Startup
  uses this cache with Hugging Face offline mode enabled.
- Built `vector_db/nipras.index` and `metadata.json`: 146 chunks, comprising
  105 textbook chunks and 41 solution chunks. Indexing read 66 processed page
  records and skipped one record without a lesson code.
- Added optional `NIPRAS_TUTOR_TIMEOUT_SECONDS` to Python configuration. Default
  remains 180 seconds; local AI `.env` uses 600 and backend uses
  `AI_TIMEOUT_MS=660000`. Default and override were both verified.

## Verified behavior

- Student signup now stores name, email, birth date, one of six academic streams,
  and an optional school discount coupon. Signup/login are immediate; email
  verification, Gmail/SMTP, and email recovery were removed at the user's request.
- Verified the updated account flow against a separate MongoDB test database,
  including duplicate email, invalid/expired coupons, and inactive accounts.
  Browser login, profile name/stream display, refresh persistence, logout, and
  signed-out redirects were also checked. See [account details](accounts.md).

- Frontend HTTP and API HTTP return 200.
- Real registration, login, profile retrieval, personal workspace creation,
  chat creation, and chat retrieval work against the new local MongoDB.
- Frontend: 26 tests passed. Backend: 27 tests passed. Vite build passed.
- Python `test_rag_fixes.py`, `test_service_stream.py`, and
  `test_extract_pages.py` passed in the project virtual environment.
- A real chat request traveled through Express to Python, retrieved four textbook
  sources from the generated FAISS index, and completed an Arabic answer using
  the local CPU model. The answer was saved in MongoDB with matching content and
  status `complete`. The observed first-answer time was 213 seconds.

## Known limits

- CPU generation is slow. GPU auto-allocation failed on this MX450, and a CPU
  request exceeded the former 180-second AI timeout during prompt processing.
  The local timeout was increased rather than downloading another model.
- Two legacy Python tests fail: `test_tutor.py` assumes generic questions bypass
  the newer scope gate, and `test_service.py` calls the now-protected `/ask`
  endpoint without a service key. The newer streaming-contract test passes.
- One generated chunk (`math_1-1_c4`) is flagged for possible embedding truncation.
- Study-plan assessment, daily/weekly preferences and lesson selections are
  saved per student in MongoDB. Weekly preferences have study dates without
  times; linked daily preferences hold the selected hours. Scheduling lessons into the
  selected windows is not implemented yet. Quizzes, dashboard statistics and
  progress pages still use demo data. File upload saves files, but automated
  upload-to-RAG ingestion is not connected in this checkout.

To return to a team database later, replace `MONGO_URI` in `backend/.env`, clear
or update `MONGO_URI_STANDARD` (it has priority), and restart the API. Local data
is not automatically migrated to that database.
