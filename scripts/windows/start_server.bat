@echo off
set "SCRIPT_DIR=%~dp0"
echo Starting Backend...

if exist "%SCRIPT_DIR%..\..\backend" (
    pushd "%SCRIPT_DIR%..\..\backend"
) else (
    echo Error: Could not find backend directory
    pause
    exit /b 1
)

start "AI Reading Co-pilot Backend" cmd /k "py server.py"
popd

echo Backend server started in a new window.
