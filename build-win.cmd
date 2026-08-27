@echo off
REM 一键 Windows 打包（需已安装 Python 3.11 与 VS 2022 生成工具）
REM 如重装过 node_modules，需确保 node_modules\7zip-bin\win\x64\7za.exe 仍是符号链接容错包装器（否则 winCodeSign 解压会失败）。
set npm_config_python=C:\Users\shang\AppData\Local\Programs\Python\Python311\python.exe
cd /d "D:\ai agent\Ai agent\happy-friday-lite"
npm run electron:build:win
