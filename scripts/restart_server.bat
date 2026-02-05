@echo off
echo Stopping existing backend server...
call stop_server.bat

echo Starting backend server...
if exist "..\backend" (
    cd ..\backend
) else (
    echo Error: Could not find backend directory
    pause
    exit /b 1
)

start "AI Reading Co-pilot Backend" cmd /k "py server.py"
echo Backend server started in a new window.
