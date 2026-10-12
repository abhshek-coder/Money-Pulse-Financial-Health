@echo off
title MoneyPulse Financial Health
cd /d "%~dp0"
echo Starting MoneyPulse from:
echo %CD%
echo.
node --trace-uncaught server.js
echo.
echo MoneyPulse stopped or exited. Review any error above.
pause
