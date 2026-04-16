@echo off
REM ============================================================================
REM FLOWGEN LEAD GENERATION SAAS - STOP DEVELOPMENT SERVICES
REM ============================================================================

echo.
echo ============================================================
echo Stopping FlowGen Development Services
echo ============================================================
echo.

echo [1/3] Stopping Redis...
docker-compose down
echo [OK] Redis stopped
echo.

echo [2/3] Stopping any processes on port 3001 (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    taskkill /PID %%a /F 2>nul
)
echo [OK] Backend stopped
echo.

echo [3/3] Stopping any processes on port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /PID %%a /F 2>nul
)
echo [OK] Frontend stopped
echo.

echo ============================================================
echo All services stopped successfully!
echo ============================================================
echo.
pause
