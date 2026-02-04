#!/bin/bash
echo "Stopping existing backend server on port 8000..."
lsof -ti:8000 | xargs kill -9 >/dev/null 2>&1

echo "Starting backend server with Uvicorn..."
# Check if python3 or python is available
if command -v python3 &> /dev/null; then
    python3 -m uvicorn server:app --port 8000 --reload &
elif command -v python &> /dev/null; then
    python -m uvicorn server:app --port 8000 --reload &
else
    echo "Python not found! Please install Python."
    exit 1
fi

echo "Backend server started in background."
