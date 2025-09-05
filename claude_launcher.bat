@echo off

REM Set window title immediately
title Claude

set "CURRENT_DIR=%~dp0"
set "WSL_PATH=/mnt/c%CURRENT_DIR:C:=%"
set "WSL_PATH=%WSL_PATH:\=/%"

REM Remove trailing slash if present
if "%WSL_PATH:~-1%"=="/" set "WSL_PATH=%WSL_PATH:~0,-1%"

echo Starting Claude Code...
title Claude - Running in %CURRENT_DIR%
wsl -d Ubuntu -e bash -i -c "cd '%WSL_PATH%' && claude"