#!/usr/bin/env bash
set -euo pipefail

echo "Stopping backend (port 8000)..."
pids="$(lsof -ti tcp:8000 || true)"
if [ -n "$pids" ]; then
  echo "$pids" | xargs kill -9
  echo "Backend stopped."
else
  echo "No backend process found on port 8000."
fi
