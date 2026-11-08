@echo off
title Handy Adaptive trainer
cd /d "%~dp0trainer"
where py >nul 2>nul
if %errorlevel%==0 (py trainer.py) else (python trainer.py)
echo.
pause
