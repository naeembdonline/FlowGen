@echo off
REM ============================================================================
REM FLOWGEN - VERIFY REBRANDING
REM ============================================================================
REM This script checks if the rebranding from FikrFlow to FlowGen was successful
REM ============================================================================

echo.
echo ============================================================
echo FlowGen Rebranding Verification
echo ============================================================
echo.

echo Checking key files for "FlowGen" branding...
echo.

set errors=0

REM Check root package.json
echo [1/10] Checking root package.json...
findstr /C:"flowgen-lead-saas" "F:\Parsa\Lead Saas\package.json" >nul
if %errorlevel% equ 0 (
    echo [OK] Root package.json contains "flowgen-lead-saas"
) else (
    echo [FAIL] Root package.json missing "flowgen-lead-saas"
    set /a errors+=1
)

REM Check frontend package.json
echo [2/10] Checking frontend package.json...
findstr /C:"flowgen-frontend" "F:\Parsa\Lead Saas\frontend\package.json" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend package.json contains "flowgen-frontend"
) else (
    echo [FAIL] Frontend package.json missing "flowgen-frontend"
    set /a errors+=1
)

REM Check backend package.json
echo [3/10] Checking backend package.json...
findstr /C:"flowgen-backend" "F:\Parsa\Lead Saas\backend\package.json" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend package.json contains "flowgen-backend"
) else (
    echo [FAIL] Backend package.json missing "flowgen-backend"
    set /a errors+=1
)

REM Check frontend layout
echo [4/10] Checking frontend layout...
findstr /C:"FlowGen" "F:\Parsa\Lead Saas\frontend\src\app\layout.tsx" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend layout contains "FlowGen"
) else (
    echo [FAIL] Frontend layout missing "FlowGen"
    set /a errors+=1
)

REM Check backend index
echo [5/10] Checking backend index...
findstr /C:"FLOWGEN" "F:\Parsa\Lead Saas\backend\src\index.ts" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend index contains "FLOWGEN"
) else (
    echo [FAIL] Backend index missing "FLOWGEN"
    set /a errors+=1
)

REM Check Docker Compose
echo [6/10] Checking docker-compose.yml...
findstr /C:"flowgen-network" "F:\Parsa\Lead Saas\docker-compose.yml" >nul
if %errorlevel% equ 0 (
    echo [OK] Docker Compose contains "flowgen-network"
) else (
    echo [FAIL] Docker Compose missing "flowgen-network"
    set /a errors+=1
)

REM Check Dockerfile
echo [7/10] Checking backend Dockerfile...
findstr /C:"FlowGen" "F:\Parsa\Lead Saas\backend\Dockerfile" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend Dockerfile contains "FlowGen"
) else (
    echo [FAIL] Backend Dockerfile missing "FlowGen"
    set /a errors+=1
)

REM Check README
echo [8/10] Checking README.md...
findstr /C:"FlowGen Lead Generation SaaS" "F:\Parsa\Lead Saas\README.md" >nul
if %errorlevel% equ 0 (
    echo [OK] README.md contains "FlowGen Lead Generation SaaS"
) else (
    echo [FAIL] README.md missing "FlowGen Lead Generation SaaS"
    set /a errors+=1
)

REM Check startup script
echo [9/10] Checking start-dev.bat...
findstr /C:"FlowGen" "F:\Parsa\Lead Saas\start-dev.bat" >nul
if %errorlevel% equ 0 (
    echo [OK] Startup script contains "FlowGen"
) else (
    echo [FAIL] Startup script missing "FlowGen"
    set /a errors+=1
)

REM Check for remaining old brand names
echo [10/10] Checking for any remaining "FikrFlow" instances...
findstr /S /I /C:"FikrFlow" /C:"Fikerflow" /C:"FIKERFLOW" "F:\Parsa\Lead Saas\*.md" "F:\Parsa\Lead Saas\*.json" "F:\Parsa\Lead Saas\*.bat" "F:\Parsa\Lead Saas\frontend\src\app\*.tsx" "F:\Parsa\Lead Saas\backend\src\*.ts" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Found some remaining instances of old brand names
    echo Run this command to see them:
    echo findstr /S /I /C:"FikrFlow" /C:"Fikerflow" /C:"FIKERFLOW" "F:\Parsa\Lead Saas\*.*" 2^>nul
) else (
    echo [OK] No remaining instances of old brand names found
)

echo.
echo ============================================================
if %errors% equ 0 (
    echo [SUCCESS] All key files updated to FlowGen!
    echo.
    echo You can now start the application:
    echo   - Double-click start-dev.bat
    echo   - Or run: docker-compose up -d redis ^&^& cd backend ^&^& npm run dev
    echo.
    echo Then check:
    echo   - http://localhost:3000 (should show FlowGen branding)
    echo   - http://localhost:3000/dashboard (should show FlowGen title)
    echo   - http://localhost:3001/health (should show FlowGen API)
) else (
    echo [WARNING] Found %errors% issue(s) that need attention
    echo Please check the failed checks above
)
echo ============================================================
echo.

pause
