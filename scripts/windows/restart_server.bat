@echo off
set "SCRIPT_DIR=%~dp0"
echo Stopping existing backend server...
call "%SCRIPT_DIR%stop_server.bat"

echo Starting backend server...
if exist "%SCRIPT_DIR%..\..\backend" (
    cd /d "%SCRIPT_DIR%..\..\backend"
) else (
    echo Error: Could not find backend directory
    pause
    exit /b 1
)

start "AI Reading Co-pilot Backend" cmd /k "py server.py"
echo Backend server started in a new window.
