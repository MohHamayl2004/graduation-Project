#!/usr/bin/env bash
# Stop what start.sh started. Ollama is left to the template's supervisor.
#
#   stop.sh                the AI service and the API; the tunnel - and
#                          with it the public address - keeps running
#   stop.sh --all          everything, tunnel included
#   stop.sh --tunnel-only  just the tunnel

ROOT=/workspace/nipras

case "${1:-}" in
  --all)         names="tunnel api ai" ;;
  --tunnel-only) names="tunnel" ;;
  *)             names="api ai" ;;
esac

for name in $names; do
  pid_file="$ROOT/$name.pid"
  if [ -f "$pid_file" ]; then
    kill "$(cat "$pid_file")" 2>/dev/null && echo "stopped $name"
    rm -f "$pid_file"
  fi
done
