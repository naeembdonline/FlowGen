@echo off
REM ============================================================================
REM FLOWGEN LEAD GENERATION SAAS - CONNECTION TEST SCRIPT
REM ============================================================================
REM Tests connectivity between frontend, backend, and Redis services
REM ============================================================================

echo.
echo ============================================================
echo FlowGen Connection Test
echo ============================================================
echo.

echo [1/4] Testing Backend Basic Health...
curl -s http://localhost:3001/health
echo.
echo.

if %errorlevel% neq 0 (
    echo [ERROR] Backend is not running or not accessible
    echo Please start the backend: cd backend && npm run dev
    echo.
    pause
    exit /b 1
)

echo [OK] Backend is running!
echo.

echo [2/4] Testing Backend Detailed Health...
curl -s http://localhost:3001/api/v1/health/detailed
echo.
echo.

echo [3/4] Testing Backend Readiness...
curl -s http://localhost:3001/api/v1/health/ready
echo.
echo.

echo [4/4] Testing Backend Liveness...
curl -s http://localhost:3001/api/v1/health/live
echo.
echo.

echo ============================================================
echo CONCLUSION
echo ============================================================
echo.
echo If all tests passed above, your backend is healthy!
echo.
echo Next steps:
echo 1. Access the health dashboard: http://localhost:3000/system-health
echo 2. Check Docker services: docker-compose ps
echo 3. View logs: docker-compose logs -f
echo.
echo ============================================================
echo.

pause
