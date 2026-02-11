@echo off
REM Quick Start Script for Vocal Tone Analyzer GUI
REM This script launches the GUI application

echo ========================================
echo   Vocal Tone Analyzer - Quick Start
echo ========================================
echo.
echo Starting the application...
echo.
echo NOTE: On first run, the AI model (~380MB) will be downloaded.
echo This may take a few minutes. Please be patient!
echo.
echo ----------------------------------------
echo.

python vocal_tone_gui.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   Error: Application failed to start
    echo ========================================
    echo.
    echo Common solutions:
    echo 1. Make sure Python is installed
    echo 2. Install dependencies:
    echo    pip install -r ai_engine/requirements.txt
    echo 3. Check your internet connection
    echo.
    pause
)
