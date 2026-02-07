@echo off
set "SCRIPT_DIR=%~dp0"
echo Restarting All Services...
call "%SCRIPT_DIR%stop_all.bat"
timeout /t 2 >nul
call "%SCRIPT_DIR%start_all.bat"
