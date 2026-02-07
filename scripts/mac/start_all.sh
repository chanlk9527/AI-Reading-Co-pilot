#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/start_server.sh"
sleep 2
"$SCRIPT_DIR/start_frontend.sh"
