#!/bin/bash

# Use Node.js 20 from Homebrew
export PATH="/usr/local/opt/node@20/bin:$PATH"

# Function to kill process on a port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port)
    if [ -n "$pids" ]; then
        echo "Killing process on port $port..."
        echo "$pids" | xargs kill -9
    else
        echo "No process found on port $port."
    fi
}

echo "=== Restarting AI Reading Co-pilot ==="

# Stop Backend
echo "Stopping Backend..."
kill_port 8000

# Stop Frontend
echo "Stopping Frontend..."
kill_port 5173

# Start Backend
echo "Starting Backend..."
cd backend
python3 -m uvicorn app.main:app --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID. Logs redirected to backend.log."
cd ..

# Start Frontend
echo "Starting Frontend..."
cd src-react
# Use npx to run vite directly
npx vite --port 5173
