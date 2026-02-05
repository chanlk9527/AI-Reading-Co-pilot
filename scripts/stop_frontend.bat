@echo off
echo Stopping Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo Found process with PID %%a listening on port 5173. Killing...
    taskkill /f /pid %%a
)
echo Done.
