@echo off
chcp 65001 >nul
title MOF PSDG AI Chatbot - Starting

setlocal
set BACKEND_DIR=D:\Chatbot mof new\mof-psdg-chatbot\backend
set FRONTEND_URL=http://127.0.0.1:8000

cd /d "%BACKEND_DIR%"

echo ========================================
echo   MOF PSDG AI Chatbot - Starting System
echo ========================================
echo.

if not exist "app\main.py" (
    echo ERROR: app\main.py not found.
    pause
    exit /b 1
)

echo [1/3] Starting backend server...
start "MOF Backend Server" /d "%BACKEND_DIR%" python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo [2/3] Waiting for server to be ready...
timeout /t 20 >nul

echo [3/3] Opening chatbot page in browser...
start "" "%FRONTEND_URL%/simple-chat.html"

echo.
echo ========================================
echo   System is ready!
echo   - Chatbot page: Opened in your browser
echo   - Server: http://127.0.0.1:8000
echo   - To stop server: Close this command window
echo ========================================

endlocal
pause
