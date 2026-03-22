@echo off
title LayoutAnnotator
color 0A

echo.
echo  ===========================================
echo   LayoutAnnotator v2.1
echo  ===========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found.
    echo Please install from https://nodejs.org then re-run.
    pause
    exit /b 1
)
echo OK: Node.js found.

:: Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found.
    echo Please install from https://python.org then re-run.
    pause
    exit /b 1
)
echo OK: Python found.

:: Check Tesseract
if not exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo WARNING: Tesseract not found at C:\Program Files\Tesseract-OCR\
    echo OCR features will be disabled.
    echo Download from: https://github.com/tesseract-ocr/tesseract/releases
    echo.
    echo Press any key to continue without OCR, or close to install first.
    pause >nul
)

:: Install frontend deps if missing
if not exist "node_modules" (
    echo SETUP: Installing frontend dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo OK: Frontend dependencies installed.
) else (
    echo OK: Frontend dependencies ready.
)

:: Create venv if missing
if not exist "backend\venv" (
    echo SETUP: Creating Python virtual environment...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo OK: Virtual environment created.
) else (
    echo OK: Virtual environment ready.
)

:: Activate venv
call backend\venv\Scripts\activate.bat

:: Install missing Python packages
echo SETUP: Checking Python packages...

python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: fastapi...
    pip install -q fastapi
)

python -c "import uvicorn" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: uvicorn...
    pip install -q uvicorn
)

python -c "import pytesseract" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: pytesseract...
    pip install -q pytesseract
)

python -c "import PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: pillow...
    pip install -q pillow
)

python -c "import numpy" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: numpy...
    pip install -q numpy
)

python -c "import torch" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: torch and torchvision - this may take a few minutes...
    pip install -q torch torchvision
)

python -c "import transformers" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: transformers...
    pip install -q transformers
)

python -c "import sentencepiece" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: sentencepiece...
    pip install -q sentencepiece
)

python -c "import tiktoken" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: tiktoken...
    pip install -q tiktoken
)

python -c "import slowapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo INSTALL: slowapi...
    pip install -q slowapi
)

echo OK: All Python packages ready.

:: Start backend
if exist "backend\server.py" (
    echo START: OCR backend on http://localhost:8000
    start "OCR Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python server.py"
    timeout /t 3 /nobreak >nul
    echo OK: Backend starting in background window.
) else (
    echo SKIP: backend\server.py not found - OCR features disabled.
)

:: Start frontend
echo START: Frontend on http://localhost:5173
echo.
echo  ===========================================
echo   App:        http://localhost:5173
echo   OCR Server: http://localhost:8000
echo   Use Chrome or Edge.
echo   Close this window to stop.
echo  ===========================================
echo.

timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"
call npm run dev