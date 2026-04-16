@echo off
REM ============================================================================
REM FLOWGEN - CLEAN STARTUP SCRIPT (No Concurrently Dependency)
REM ============================================================================
REM Starts Backend and Frontend in separate windows reliably
REM ============================================================================

echo.
echo ============================================================
echo FlowGen Lead Generation SaaS - Development Startup
echo ============================================================
echo.

REM ============================================================================
REM VALIDATION CHECKS
REM ============================================================================

REM Check if we're in the right directory
if not exist "frontend\package.json" (
    echo [ERROR] frontend\package.json not found!
    echo Please run this script from the project root directory.
    echo.
    pause
    exit /b 1
)

if not exist "backend\package.json" (
    echo [ERROR] backend\package.json not found!
    echo Please run this script from the project root directory.
    echo.
    pause
    exit /b 1
)

echo [OK] Project structure validated
echo.

REM ============================================================================
REDIS SETUP
REM ============================================================================

echo [1/5] Starting Redis with Docker...
docker-compose up -d redis >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Redis
    echo Make sure Docker Desktop is running.
    echo.
    pause
    exit /b 1
)
echo [OK] Redis started
echo.

REM Wait for Redis to be ready
echo [2/5] Waiting for Redis to initialize...
timeout /t 3 /nobreak >nul

REM Test Redis connection
redis-cli -p 6379 ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Redis is responding
) else (
    echo [WARNING] Redis might not be fully ready yet
    echo Continuing anyway...
)
echo.

REM ============================================================================
<arg_value>DEPENDENCY CHECK
REM ============================================================================

echo [3/5] Checking project dependencies...

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies already installed
)
echo.

REM ============================================================================
<arg_value>START SERVICES
REM ============================================================================

echo [4/5] Starting Backend server...
echo Opening Backend in new window...
start "FlowGen Backend" cmd /k "title FlowGen Backend && cd backend && echo Starting Backend Server... && echo. && echo Server will be available at: http://localhost:3001 && echo. && npm run dev"

REM Wait a moment for backend to start
timeout /t 4 /nobreak >nul

echo [5/5] Starting Frontend server...
echo Opening Frontend in new window...
start "FlowGen Frontend" cmd /k "title FlowGen Frontend && cd frontend && echo Starting Frontend Server... && echo. && echo App will be available at: http://localhost:3000 && echo. && npm run dev"

echo.
echo ============================================================
echo ALL SERVICES STARTED!
echo ============================================================
echo.
echo   Backend:  http://localhost:3001
echo   Frontend: http://localhost:3000
echo   Import:   http://localhost:3000/import
echo.
echo   Check the service windows for startup logs.
echo   Each window shows real-time logs and any errors.
echo.
echo   To stop all services:
echo     1. Press Ctrl+C in the Backend window
echo     2. Press Ctrl+C in the Frontend window
echo     3. Run: stop-dev.bat
echo.
echo   To view the application:
echo     Browser will open automatically in 5 seconds...
echo.

REM Wait and open browser
timeout /t 5 /nobreak >nul

REM Try to open browser automatically
start http://localhost:3000

echo.
echo ============================================================
echo BROWSER OPENED!
echo ============================================================
echo.
echo FlowGen is now running in the background.
echo You can close this window - the services will continue running.
echo.
echo Press any key to exit this setup script...
pause >nul
