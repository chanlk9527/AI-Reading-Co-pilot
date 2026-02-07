#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

if [ ! -d "$BACKEND_DIR" ]; then
  echo "Error: backend directory not found: $BACKEND_DIR"
  exit 1
fi

if lsof -ti tcp:8000 >/dev/null 2>&1; then
  echo "Backend already running on port 8000."
  exit 0
fi

echo "Starting backend..."
cd "$BACKEND_DIR"
nohup python3 server.py > "$ROOT_DIR/backend.log" 2>&1 &
echo "Backend started at http://localhost:8000"
