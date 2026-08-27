@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo  Capture npm install output to install-log.txt
echo ============================================
echo.
echo Installing dependencies (this can take several minutes)...
call npm install --legacy-peer-deps --force --registry=https://registry.npmmirror.com > install-log.txt 2>&1
echo.
echo exit code: %errorlevel% >> install-log.txt
echo.
echo Install finished. Output saved to install-log.txt
echo (You can close this window; the agent will read install-log.txt)
pause
