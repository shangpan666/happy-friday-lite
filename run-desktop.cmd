@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

echo [%DATE% %TIME%] run-desktop.cmd started > electron-run-log.txt
echo [%DATE% %TIME%] cwd: %CD% >> electron-run-log.txt
where node >> electron-run-log.txt 2>&1
node -v >> electron-run-log.txt 2>&1
where npm >> electron-run-log.txt 2>&1

if not exist node_modules (
  echo [%DATE% %TIME%] node_modules missing, installing dependencies... >> electron-run-log.txt
  call npm install --legacy-peer-deps --force --registry=https://registry.npmmirror.com >> electron-run-log.txt 2>&1
)

if not exist node_modules\electron\dist\electron.exe (
  echo [%DATE% %TIME%] electron.exe missing, running electron postinstall... >> electron-run-log.txt
  call npm rebuild electron >> electron-run-log.txt 2>&1
)

echo [%DATE% %TIME%] Launching Electron desktop app... >> electron-run-log.txt
call npm run electron:dev >> electron-run-log.txt 2>&1

echo [%DATE% %TIME%] electron:dev exited with code %errorlevel% >> electron-run-log.txt
echo.
echo ===================================================
type electron-run-log.txt
echo ===================================================
echo Press any key to close this window...
pause