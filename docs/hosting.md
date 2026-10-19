# Hosting NIPRAS

GitHub stores source code. GitHub Pages can serve the frontend but cannot run
this Express API, MongoDB, Python retrieval service or Ollama model. A Pages
URL alone would therefore not provide working accounts, plans or tutor chat.

## Prepared server deployment

The root Dockerfile builds the frontend with `/api` and serves it from Express
on the same origin. Direct links such as `/study-plan` work; unknown API and
asset paths retain their error responses. The health endpoint is `/api/health`.
Normal local development continues to use the separate Vite server.

On a Docker-capable hosting service, select the repository branch
`codex/topmax-local-setup`, root Dockerfile, and port 5000 (or its supplied PORT).
Configure these values through the hosting provider's secret/environment UI:

- `MONGO_URI`: a dedicated hosted MongoDB connection, reachable by the API.
- `JWT_SECRET`: a new long random production secret.
- `AI_SERVICE_URL`: a reachable, separately deployed Python tutor service URL.
- `AI_SERVICE_KEY`: the matching `NIPRAS_SERVICE_KEY` on that tutor service.
- `AI_TIMEOUT_MS`: greater than the Python tutor timeout, in milliseconds.

NODE_ENV=production and SERVE_FRONTEND=true are set by the image. Do not copy
development .env files or local database records into the image. The Docker
build context excludes local databases, uploads, credentials and model files.
Production disables simulated Visa payments; no real payment provider exists
yet. Free accounts and administrative subscription gifts remain separate flows.

Mount persistent storage at `/app/backend/uploads` for retained uploads. Set
its ownership so the image's non-root `node` user (UID 1000) can write there.
Use provider-managed HTTPS. A temporary filesystem will lose uploads on
replacement; the MongoDB data belongs in its separately persistent database.

The Python/Ollama service is not included in the web image. It needs its own
hosting, model weights, retrieval index and resources. Never use localhost for
an AI service running on another host. Do not expose MongoDB or Ollama directly
to the public internet. A fresh production database does not include local demo
students or the local administrator; provisioning that administrator is a
separate step once the database and hosting destination are selected.

## Verification and remaining setup

Backend tests verify hosted page refreshes, protected API routes and missing
assets. Docker is unavailable in the current workspace, so the container image
has not been built or booted here. Publishing requires an authorized hosting
account, database and AI endpoint; no public live URL has been created yet.

References: [GitHub Pages scope](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages),
[Docker on Render](https://render.com/docs/docker),
[persistent disks](https://render.com/docs/disks).
