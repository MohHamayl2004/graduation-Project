#!/usr/bin/env bash
# ============================================================
# One-time setup of the NIPRAS API and AI service on a vast.ai
# instance made from the Ollama template (Ollama already runs
# under supervisor on 127.0.0.1:11434).
#
#   curl -fsSL https://raw.githubusercontent.com/MohHamayl2004/graduation-Project/main/deploy/vast/setup.sh | bash
#   # or, from a clone:   bash deploy/vast/setup.sh [branch]
#
# Safe to run again: it updates the code and keeps existing .env files.
# Everything lives under /workspace/nipras, which survives a stop/start.
# ============================================================

set -euo pipefail

BRANCH="${1:-main}"
REPO="https://github.com/MohHamayl2004/graduation-Project.git"
ROOT=/workspace/nipras
APP="$ROOT/app"
NODE_VERSION=v20.18.1
MODEL="${NIPRAS_TUTOR_MODEL:-qwen3.5:9b}"

mkdir -p "$ROOT/logs"

echo "== 1/6 Node.js"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-x64.tar.xz" | tar -xJ -C /opt
  for bin in node npm npx; do ln -sf "/opt/node-$NODE_VERSION-linux-x64/bin/$bin" /usr/local/bin/$bin; done
fi
node --version

echo "== 2/6 Code ($BRANCH)"
# Nipras_Ai_Models is a private repository, so a server without GitHub
# credentials cannot clone it. The code can instead be copied in from a
# developer's machine over SSH (README: "Deploying"); a copied folder
# has no .git and is used as it is.
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch --quiet origin
  git -C "$APP" checkout --quiet "$BRANCH"
  git -C "$APP" pull --quiet --ff-only origin "$BRANCH"
  git -C "$APP" submodule update --init --quiet \
    || echo "   could not fetch Nipras_Ai_Models (private) - copy it in over SSH"
  git -C "$APP" log -1 --format='   %h %s'
elif [ -d "$APP" ]; then
  echo "   using the code copied to $APP"
else
  git clone --quiet --branch "$BRANCH" "$REPO" "$APP"
  git -C "$APP" submodule update --init --quiet \
    || echo "   could not fetch Nipras_Ai_Models (private) - copy it in over SSH"
fi
[ -f "$APP/Nipras_Ai_Models/requirements.txt" ] \
  || { echo "   $APP/Nipras_Ai_Models is empty - copy it in, then run this again"; exit 1; }

echo "== 3/6 API dependencies"
npm --prefix "$APP/backend" ci --omit=dev --no-audit --no-fund --loglevel=error

echo "== 4/6 AI service dependencies"
# The image's Python has no ensurepip, so `python3 -m venv` makes an
# environment without pip. virtualenv carries its own.
if [ ! -x "$ROOT/venv/bin/python" ]; then
  pip3 install --quiet --break-system-packages virtualenv
  python3 -m virtualenv --quiet "$ROOT/venv"
fi
"$ROOT/venv/bin/pip" install --quiet -r "$APP/Nipras_Ai_Models/requirements.txt"

echo "== 5/6 Model ($MODEL)"
ollama pull "$MODEL" >/dev/null 2>&1 || { echo "   could not pull $MODEL"; exit 1; }
ollama list | grep -E "^NAME|$MODEL"

echo "== 6/6 Settings"
# The key between the API and the AI service, and the JWT secret, are
# generated here and never leave the server. The MongoDB address is the
# one thing a person types in.
if [ ! -f "$APP/Nipras_Ai_Models/.env" ] || [ ! -f "$APP/backend/.env" ]; then
  SERVICE_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
fi

if [ ! -f "$APP/Nipras_Ai_Models/.env" ]; then
  cat > "$APP/Nipras_Ai_Models/.env" <<EOF
NIPRAS_TUTOR_MODEL=$MODEL
NIPRAS_OLLAMA_URL=http://127.0.0.1:11434
NIPRAS_SERVICE_KEY=$SERVICE_KEY
NIPRAS_MAX_QUEUE=3
NIPRAS_TUTOR_TIMEOUT_SECONDS=120
EOF
  echo "   wrote Nipras_Ai_Models/.env"
fi

if [ ! -f "$APP/backend/.env" ]; then
  cat > "$APP/backend/.env" <<EOF
PORT=5000
# Paste the MongoDB Atlas connection string here (nano backend/.env).
MONGO_URI=PASTE_YOUR_MONGODB_URI_HERE
JWT_SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')
# Not "production": that switches off the simulated checkout, and every
# feature behind a subscription with it.
NODE_ENV=development
DEMO_PAYMENTS_ENABLED=true
CORS_ORIGINS=https://mohhamayl2004.github.io
AI_SERVICE_URL=http://127.0.0.1:8000
AI_SERVICE_KEY=$SERVICE_KEY
AI_TIMEOUT_MS=150000
EOF
  chmod 600 "$APP/backend/.env" "$APP/Nipras_Ai_Models/.env"
  echo "   wrote backend/.env"
fi

echo
if grep -q PASTE_YOUR_MONGODB_URI_HERE "$APP/backend/.env"; then
  echo "Next: put the MongoDB address in   nano $APP/backend/.env"
  echo "      and allow this server's IP in MongoDB Atlas -> Network Access."
fi
echo "Then start everything with:   bash $APP/deploy/vast/start.sh"
