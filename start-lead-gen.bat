@echo off
REM ============================================================================
REM FLOWGEN LEAD GENERATION - QUICK START SCRIPT
REM ============================================================================
REM Starts Backend and Frontend for Lead Generation Dashboard
REM ============================================================================

echo.
echo ============================================================
echo FlowGen Lead Generation - Quick Start
echo ============================================================
echo.

REM Check if we're in the right directory
if not exist "backend\package.json" (
    echo [ERROR] backend\package.json not found!
    echo Please run this script from the project root directory.
    echo.
    pause
    exit /b 1
)

if not exist "frontend\package.json" (
    echo [ERROR] frontend\package.json not found!
    echo Please run this script from the project root directory.
    echo.
    pause
    exit /b 1
)

echo [OK] Project structure validated
echo.

echo Starting Backend (Minimal Server)...
echo Opening Backend in new window...
start "FlowGen Backend - Lead Gen" cmd /k "title FlowGen Backend && cd backend && echo Starting Backend Server (Minimal) for Lead Generation... && echo. && echo Server will be available at: http://localhost:3001 && echo. && npm run dev:minimal"

REM Wait a moment for backend to start
timeout /t 4 /nobreak >nul

echo Starting Frontend...
echo Opening Frontend in new window...
start "FlowGen Frontend - Lead Gen" cmd /k "title FlowGen Frontend && cd frontend && echo Starting Frontend Server... && echo. && echo Dashboard will be available at: http://localhost:3000/import && echo. && npm run dev"

echo.
echo ============================================================
echo LEAD GENERATION SYSTEM STARTED!
echo ============================================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:3000
echo   Dashboard: http://localhost:3000/import
echo.
echo   Check the service windows for startup logs.
echo   Each window shows real-time logs and any errors.
echo.
echo   To stop all services:
echo     1. Press Ctrl+C in the Backend window
echo     2. Press Ctrl+C in the Frontend window
echo.
echo   To start generating leads:
echo     1. Open your browser to: http://localhost:3000/import
echo     2. Enter a keyword (e.g., "coffee shops")
echo     3. Enter a location (e.g., "San Francisco, CA")
echo     4. Click "Start Lead Generation"
echo     5. Watch leads appear in real-time!
echo.
echo   Opening browser in 5 seconds...
echo.

REM Wait and open browser
timeout /t 5 /nobreak >nul

REM Try to open browser automatically
start http://localhost:3000/import

echo.
echo ============================================================
echo BROWSER OPENED - READY TO GENERATE LEADS!
echo ============================================================
echo.
echo Your lead generation dashboard is now open!
echo Enter your search criteria and start generating leads.
echo.
echo Press any key to exit this setup script...
pause >nul
