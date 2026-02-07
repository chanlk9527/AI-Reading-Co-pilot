@echo off
set "SCRIPT_DIR=%~dp0"
call "%SCRIPT_DIR%stop_frontend.bat"
call "%SCRIPT_DIR%start_frontend.bat"
