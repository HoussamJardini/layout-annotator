@echo off
title LayoutAnnotator
color 0A

echo.
echo  ===========================================
echo   LayoutAnnotator v2.1
echo  ===========================================
echo.

:: ── Check Node.js ──────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Please download and install it from: https://nodejs.org
    echo  Then re-run this file.
    pause
    exit /b 1
)

:: ── Check Python ───────────────────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python is not installed.
    echo  Please download and install it from: https://python.org
    echo  Then re-run this file.
    pause
    exit /b 1
)

:: ── Check Tesseract ────────────────────────────────────────
if not exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo  [WARNING] Tesseract OCR is not installed.
    echo  OCR text detection will not work.
    echo  Download from: https://github.com/tesseract-ocr/tesseract/releases
    echo  Install to default path: C:\Program Files\Tesseract-OCR\
    echo.
    echo  Press any key to continue without OCR, or close this window to install first.
    pause >nul
)

:: ── Frontend dependencies ──────────────────────────────────
if not exist "node_modules" (
    echo  [SETUP] Installing frontend dependencies (first run)...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed. Check your Node.js installation.
        pause
        exit /b 1
    )
    echo  [OK] Frontend dependencies installed.
) else (
    echo  [OK] Frontend dependencies already installed.
)

:: ── Python virtual environment ─────────────────────────────
if not exist "vevn" (
    echo  [SETUP] Creating Python virtual environment (first run)...
    python -m venv vevn
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo  [OK] Virtual environment created.
) else (
    echo  [OK] Virtual environment already exists.
)

:: ── Activate venv ──────────────────────────────────────────
call vevn\Scripts\activate.bat

:: ── Check and install backend packages one by one ──────────
echo  [SETUP] Checking backend packages...

python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] fastapi...
    pip install -q fastapi
)

python -c "import uvicorn" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] uvicorn...
    pip install -q uvicorn
)

python -c "import pytesseract" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] pytesseract...
    pip install -q pytesseract
)

python -c "import PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] pillow...
    pip install -q pillow
)

python -c "import numpy" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] numpy...
    pip install -q numpy
)

python -c "import torch" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] torch + torchvision (this may take a few minutes)...
    pip install -q torch torchvision
)

python -c "import transformers" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] transformers...
    pip install -q transformers
)

python -c "import sentencepiece" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] sentencepiece...
    pip install -q sentencepiece
)

python -c "import tiktoken" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INSTALL] tiktoken...
    pip install -q tiktoken
)

echo  [OK] All backend packages ready.

:: ── Start backend ──────────────────────────────────────────
if exist "server.py" (
    echo  [START] Starting OCR backend on http://localhost:8000 ...
    start "OCR Backend - LayoutAnnotator" cmd /k "cd /d %~dp0 && vevn\Scripts\activate.bat && python server.py"
    timeout /t 3 /nobreak >nul
    echo  [OK] Backend running in background window.
) else (
    echo  [SKIP] server.py not found - OCR features disabled.
)

:: ── Start frontend ─────────────────────────────────────────
echo  [START] Starting frontend...
echo.
echo  ===========================================
echo   App:        http://localhost:5173
echo   OCR Server: http://localhost:8000
echo.
echo   Use Chrome or Edge for full folder access.
echo   Close this window to stop the frontend.
echo  ===========================================
echo.

start "" "http://localhost:5173"
call npm run dev