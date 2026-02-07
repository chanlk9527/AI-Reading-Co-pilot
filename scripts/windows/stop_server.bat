@echo off
echo Stopping AI Reading Co-pilot Backend...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do (
    echo Found process with PID %%a listening on port 8000. Killing...
    taskkill /f /pid %%a
)

echo Done. Make sure the backend window is closed.
