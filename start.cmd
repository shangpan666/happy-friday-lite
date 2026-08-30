@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Phronesis Lite - install and dev launcher
echo ============================================
echo.

if exist node_modules (
  echo [0/2] Removing old node_modules for a clean reinstall...
  rd /s /q node_modules 2>nul
)
echo [0.5/2] Clearing npm cache (avoids corrupted tarballs like lucide-vue-next)...
call npm cache clean --force 2>nul

echo [1/2] Installing dependencies (npm install)...
echo (--force is required: a Linux-only native binary in the dep tree would
echo  otherwise abort install with EBADPLATFORM on Windows. It is skipped safely.)
echo (This may take a few minutes; output is logged to install-log.txt)
call npm install --legacy-peer-deps --force --registry=https://registry.npmmirror.com > install-log.txt 2>&1
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed. See install-log.txt below / tell me to read it.
  type install-log.txt
  pause
  exit /b 1
)

echo.
echo [1.5/2] Rebuilding native modules (node-pty / esbuild / @zvec / koffi)...
call npm rebuild
if errorlevel 1 (
  echo [WARN] npm rebuild reported issues; the app may still launch.
)

echo.
echo [2/2] Starting Electron dev mode...
echo (First launch may take a while; the app window will pop up automatically)
echo (All output is logged to electron-run-log.txt for troubleshooting)
echo.
call npm run electron:dev > electron-run-log.txt 2>&1

echo.
echo ============================================
echo  Electron exited. Last 60 lines of electron-run-log.txt:
echo ============================================
type electron-run-log.txt
pause
