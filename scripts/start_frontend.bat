@echo off
echo Starting Frontend...

:: Use pushd to change directory temporarily
if exist "..\frontend" (
    pushd "..\frontend"
) else (
    if exist "..\src-react" (
        pushd "..\src-react"
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

:: Return to original directory
popd

echo Frontend started in a new window.
