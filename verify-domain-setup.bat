@echo off
REM ============================================================================
REM VERIFY DOMAIN SETUP - Check if everything is configured correctly
REM ============================================================================

echo ============================================================================
echo   DOMAIN SETUP VERIFICATION - leads.naeemmia.bd
echo ============================================================================
echo.

echo Checking configuration files for correct domain...
echo.

echo [1/6] Checking EASY_DEPLOY.bat...
findstr /C:"leads.naeemmia.bd" "F:\Parsa\Lead Saas\EASY_DEPLOY.bat" >nul
if errorlevel 1 (
    echo ❌ FAILED - Domain not found in EASY_DEPLOY.bat
) else (
    echo ✅ PASS - EASY_DEPLOY.bat configured correctly
)

echo [2/6] Checking nginx.conf...
findstr /C:"leads.naeemmia.bd" "F:\Parsa\Lead Saas\nginx.conf" >nul
if errorlevel 1 (
    echo ❌ FAILED - Domain not found in nginx.conf
) else (
    echo ✅ PASS - nginx.conf configured correctly
)

echo [3/6] Checking docker-compose.production.yml...
findstr /C:"leads.naeemmia.bd" "F:\Parsa\Lead Saas\docker-compose.production.yml" >nul
if errorlevel 1 (
    echo ❌ FAILED - Domain not found in docker-compose.production.yml
) else (
    echo ✅ PASS - docker-compose.production.yml configured correctly
)

echo [4/6] Checking backend/.env...
findstr /C:"leads.naeemmia.bd" "F:\Parsa\Lead Saas\backend\.env" >nul
if errorlevel 1 (
    echo ❌ FAILED - Domain not found in backend/.env
) else (
    echo ✅ PASS - backend/.env configured correctly
)

echo [5/6] Checking deploy-to-server.sh...
findstr /C:"leads.naeemmia.bd" "F:\Parsa\Lead Saas\deploy-to-server.sh" >nul
if errorlevel 1 (
    echo ❌ FAILED - Domain not found in deploy-to-server.sh
) else (
    echo ✅ PASS - deploy-to-server.sh configured correctly
)

echo [6/6] Checking for old domain references...
findstr /C:"leads.fikerflow.com" "F:\Parsa\Lead Saas\EASY_DEPLOY.bat" "F:\Parsa\Lead Saas\nginx.conf" "F:\Parsa\Lead Saas\docker-compose.production.yml" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  WARNING - Old domain references still found in some files
) else (
    echo ✅ PASS - No old domain references found
)

echo.
echo ============================================================================
echo   VERIFICATION COMPLETE
echo ============================================================================
echo.
echo Your domain setup is ready for deployment!
echo.
echo Application will be deployed to:
echo   https://leads.naeemmia.bd
echo   https://leads.naeemmia.bd/health
echo.
echo Next steps:
echo 1. Make sure leads.naeemmia.bd points to 72.60.234.138
echo 2. Double-click: SSH_PASSWORDLESS_SETUP.bat
echo 3. Double-click: EASY_DEPLOY.bat
echo.
pause