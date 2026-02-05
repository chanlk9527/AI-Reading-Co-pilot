@echo off
echo Stopping Frontend (Port 3000)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo Found process with PID %%a listening on port 3000. Killing...
    taskkill /f /pid %%a
)
echo Done.
