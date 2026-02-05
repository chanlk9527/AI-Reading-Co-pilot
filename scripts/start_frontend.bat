@echo off
echo Starting Frontend...

:: Check directory
if exist "..\frontend" (
    cd ..\frontend
) else (
    if exist "..\src-react" (
        cd ..\src-react
    ) else (
        echo Error: Could not find 'frontend' or 'src-react' directory.
        pause
        exit /b 1
    )
)

:: Install dependencies if missing
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

:: Start Dev Server
start "AI Reading Co-pilot Frontend" cmd /k "npm run dev"
echo Frontend started in a new window.
