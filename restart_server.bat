@echo off
echo Stopping existing backend server...
call stop_server.bat

echo Starting backend server...
cd backend
start "AI Reading Co-pilot Backend" cmd /k "py server.py"
echo Backend server started in a new window.
