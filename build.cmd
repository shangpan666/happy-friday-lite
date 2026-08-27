@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Happy Friday Lite - build release package
echo ============================================
echo.

echo [1/2] Installing dependencies (npm install)...
call npm install --legacy-peer-deps --registry=https://registry.npmmirror.com
if errorlevel 1 (
  echo.
  echo [ERROR] npm install failed.
  pause
  exit /b 1
)

echo.
echo [2/2] Building release package (output -> release/)...
call npm run electron:build
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo.
echo Build done. Check the release/ folder.
pause
