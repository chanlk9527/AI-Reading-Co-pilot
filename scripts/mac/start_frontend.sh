#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -d "$ROOT_DIR/frontend" ]; then
  FRONTEND_DIR="$ROOT_DIR/frontend"
elif [ -d "$ROOT_DIR/src-react" ]; then
  FRONTEND_DIR="$ROOT_DIR/src-react"
else
  echo "Error: neither frontend nor src-react directory exists."
  exit 1
fi

if lsof -ti tcp:3000 >/dev/null 2>&1; then
  echo "Frontend already running on port 3000."
  exit 0
fi

echo "Starting frontend..."
cd "$FRONTEND_DIR"
if [ ! -d node_modules ]; then
  echo "Installing npm dependencies..."
  npm install
fi
nohup npm run dev > "$ROOT_DIR/frontend.log" 2>&1 &
echo "Frontend started at http://localhost:3000"
