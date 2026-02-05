@echo off
echo Starting Backend...

:: Use pushd to change directory temporarily so we can popd back
if exist "..\backend" (
    pushd "..\backend"
) else (
    echo Error: Could not find backend directory
    pause
    exit /b 1
)

:: Start server in a new window, preserving the current directory inside that window
start "AI Reading Co-pilot Backend" cmd /k "py server.py"

:: Return to original directory
popd

echo Backend server started in a new window.
