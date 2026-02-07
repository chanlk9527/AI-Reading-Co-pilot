#!/usr/bin/env bash
set -euo pipefail

echo "Stopping frontend (port 3000)..."
pids="$(lsof -ti tcp:3000 || true)"
if [ -n "$pids" ]; then
  echo "$pids" | xargs kill -9
  echo "Frontend stopped."
else
  echo "No frontend process found on port 3000."
fi
