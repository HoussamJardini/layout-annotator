@echo off
title LayoutAnnotator - OCR Backend
color 0B

echo.
echo  ===========================================
echo   LayoutAnnotator - OCR Backend
echo  ===========================================
echo.

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
    echo OCR features will be limited.
    echo Download from: https://github.com/tesseract-ocr/tesseract/releases
    echo.
    echo Press any key to continue anyway, or close to install first.
    pause >nul
)
echo OK: Tesseract found.

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
    echo.
    echo  ===========================================
    echo   OCR Backend: http://localhost:8000
    echo   Keep this window open while annotating.
    echo   Close to stop the backend.
    echo  ===========================================
    echo.
    cd /d "%~dp0backend"
    call venv\Scripts\activate.bat
    python server.py
) else (
    echo ERROR: backend\server.py not found.
    pause
    exit /b 1
)
