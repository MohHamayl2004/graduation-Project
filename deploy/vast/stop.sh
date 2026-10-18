#!/usr/bin/env bash
# Stop what start.sh started. Ollama is left to the template's supervisor.

ROOT=/workspace/nipras

for name in tunnel api ai; do
  pid_file="$ROOT/$name.pid"
  if [ -f "$pid_file" ]; then
    kill "$(cat "$pid_file")" 2>/dev/null && echo "stopped $name"
    rm -f "$pid_file"
  fi
done
