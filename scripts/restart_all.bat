@echo off
echo Restarting All Services...
call .\stop_all.bat
timeout /t 2 >nul
call .\start_all.bat
