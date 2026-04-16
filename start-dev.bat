@echo off
REM ============================================================================
REM FLOWGEN LEAD GENERATION SAAS - LOCAL DEVELOPMENT STARTUP
REM ============================================================================
REM This script starts Redis, Backend, and Frontend for local development
REM ============================================================================

echo.
echo ============================================================
echo FlowGen Lead Generation SaaS - Local Development
echo ============================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not running
    echo Please install Docker Desktop to run Redis
    echo.
    pause
    exit /b 1
)

echo [1/4] Starting Redis with Docker...
docker-compose up -d redis
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start Redis
    pause
    exit /b 1
)
echo [OK] Redis started successfully
echo.

REM Wait for Redis to be ready
echo [2/4] Waiting for Redis to be ready...
timeout /t 3 /nobreak >nul

REM Test Redis connection
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Redis might not be ready yet
    echo You may need to wait a few more seconds
) else (
    echo [OK] Redis is responding
)
echo.

REM Install backend dependencies if needed
echo [3/4] Checking backend dependencies...
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

REM Install frontend dependencies if needed
echo Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies already installed
)
echo.

echo [4/4] Starting services...
echo.
echo ============================================================
echo SERVICES STARTING IN SEPARATE WINDOWS
echo ============================================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop the services
echo.
pause

REM Start Backend in new window
start "FlowGen Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend in new window
start "FlowGen Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================================
echo ALL SERVICES STARTED!
echo ============================================================
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:3000
echo Import:   http://localhost:3000/import
echo.
echo Check the service windows for logs and any errors
echo.
echo To stop all services:
echo 1. Press Ctrl+C in the Backend window
echo 2. Press Ctrl+C in the Frontend window
echo 3. Run this command: docker-compose down
echo.
pause
