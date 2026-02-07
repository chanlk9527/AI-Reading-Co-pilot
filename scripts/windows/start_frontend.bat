@echo off
set "SCRIPT_DIR=%~dp0"
echo Starting Frontend...

if exist "%SCRIPT_DIR%..\..\frontend" (
    pushd "%SCRIPT_DIR%..\..\frontend"
) else (
    if exist "%SCRIPT_DIR%..\..\src-react" (
        pushd "%SCRIPT_DIR%..\..\src-react"
    ) else (
        echo Error: Could not find 'frontend' or 'src-react' directory.
        pause
        exit /b 1
    )
)

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

start "AI Reading Co-pilot Frontend" cmd /k "npm run dev"
popd

echo Frontend started in a new window.
