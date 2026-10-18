#!/usr/bin/env bash
# ============================================================
# Start NIPRAS on the GPU server and print its public address.
#
#   bash /workspace/nipras/app/deploy/vast/start.sh
#
#   AI service  127.0.0.1:8000   (internal; only the API calls it)
#   API         127.0.0.1:5000
#   tunnel      https://<random>.trycloudflare.com -> the API
#
# Nothing listens on a public port: the only way in is the HTTPS
# tunnel, and it reaches the API alone.
#
# Running this again restarts the AI service and the API but KEEPS a
# working tunnel, so the address in public/config.js stays valid. A
# new address appears only after the server itself restarted, or with
#   bash start.sh --new-tunnel
# ============================================================

set -euo pipefail

ROOT=/workspace/nipras
APP="$ROOT/app"
LOG="$ROOT/logs"
mkdir -p "$LOG"

NEW_TUNNEL=0
[ "${1:-}" = "--new-tunnel" ] && NEW_TUNNEL=1

if [ "$NEW_TUNNEL" = 1 ]; then
  bash "$APP/deploy/vast/stop.sh" --all >/dev/null 2>&1 || true
else
  bash "$APP/deploy/vast/stop.sh" >/dev/null 2>&1 || true
fi

if grep -q PASTE_YOUR_MONGODB_URI_HERE "$APP/backend/.env" 2>/dev/null; then
  echo "backend/.env has no MongoDB address yet:  nano $APP/backend/.env"
  exit 1
fi

wait_for() {  # name url seconds
  for _ in $(seq 1 "$3"); do
    curl -fsS -o /dev/null "$2" 2>/dev/null && { echo "   $1 ready"; return 0; }
    sleep 1
  done
  echo "   $1 did not start - see $LOG"; return 1
}

echo "== Ollama"
wait_for "ollama" http://127.0.0.1:11434/api/tags 60

echo "== AI service (first start downloads the embedding model, ~1 GB)"
cd "$APP/Nipras_Ai_Models"
nohup "$ROOT/venv/bin/python" -m rag.service --warm >"$LOG/ai.log" 2>&1 &
echo $! >"$ROOT/ai.pid"
wait_for "AI service" http://127.0.0.1:8000/v1/health 600

echo "== API"
cd "$APP/backend"
nohup node server.js >"$LOG/api.log" 2>&1 &
echo $! >"$ROOT/api.pid"
wait_for "API" http://127.0.0.1:5000/ 90

echo "== Public HTTPS address"
URL=""
OLD_URL="$(sed 's#/api$##' "$ROOT/api-url.txt" 2>/dev/null || true)"
if [ -f "$ROOT/tunnel.pid" ] && kill -0 "$(cat "$ROOT/tunnel.pid")" 2>/dev/null    && [ -n "$OLD_URL" ] && curl -fsS -o /dev/null -m 20 "$OLD_URL/"; then
  URL="$OLD_URL"
  echo "   kept the running tunnel - the address has not changed"
else
  bash "$APP/deploy/vast/stop.sh" --tunnel-only >/dev/null 2>&1 || true
  CLOUDFLARED="$(command -v cloudflared || echo /opt/instance-tools/bin/cloudflared)"
  nohup "$CLOUDFLARED" tunnel --no-autoupdate --url http://127.0.0.1:5000 >"$LOG/tunnel.log" 2>&1 &
  echo $! >"$ROOT/tunnel.pid"
  for _ in $(seq 1 60); do
    URL="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$LOG/tunnel.log" | head -1 || true)"
    [ -n "$URL" ] && break
    sleep 1
  done
  [ -n "$URL" ] || { echo "   no tunnel address - see $LOG/tunnel.log"; exit 1; }
  wait_for "tunnel" "$URL/" 60 || true
  echo "$URL/api" >"$ROOT/api-url.txt"
  echo "   NEW address - public/config.js on GitHub must be updated"
fi

cat <<EOF

NIPRAS is running.

  API:  $URL/api

Put this line in public/config.js on GitHub (edit the file in the browser
and commit to main); the site updates in about a minute:

  window.NIPRAS_CONFIG = { apiUrl: "$URL/api" };

Logs:  tail -f $LOG/api.log $LOG/ai.log
Stop:  bash $APP/deploy/vast/stop.sh
EOF
