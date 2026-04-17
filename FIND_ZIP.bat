@echo off
REM ============================================================================
REM FIND YOUR DEPLOYMENT ZIP FILE
REM ============================================================================

echo ============================================================================
echo   FIND YOUR DEPLOYMENT ZIP FILE
echo ============================================================================
echo.

echo Looking for your deployment package...
echo.

set ZIP_FILE=
set TEMP_DIR=%TEMP%\lead-saas-deploy

if exist "%TEMP_DIR%\lead-saas-upload.zip" (
    set ZIP_FILE=%TEMP_DIR%\lead-saas-upload.zip
    echo ✅ FOUND: %ZIP_FILE%
    echo.
    goto :FOUND
)

if exist "%TEMP%\lead-saas-upload.zip" (
    set ZIP_FILE=%TEMP%\lead-saas-upload.zip
    echo ✅ FOUND: %ZIP_FILE%
    echo.
    goto :FOUND
)

echo ❌ Deployment package not found!
echo.
echo Please run EASY_DEPLOY_MANUAL.bat first to create the package.
echo.
pause
exit /b 1

:FOUND
echo ============================================================================
echo   NEXT STEPS
echo ============================================================================

echo.
echo Your deployment package is ready:
echo %ZIP_FILE%
echo.

echo Choose your upload method:
echo.
echo METHOD 1: WinSCP (RECOMMENDED)
echo   1. Open WinSCP
echo   2. Connect to: 72.60.234.138
echo      - Username: root
echo      - Password: [your server password]
echo   3. Upload the ZIP file to: /root/
echo.

echo METHOD 2: FileZilla
echo   1. Open FileZilla
echo   2. Host: 72.60.234.138, Username: root, Password: [your password]
echo   3. Upload the ZIP file to: /root/
echo.

echo METHOD 3: Manual SCP
echo   1. Open Command Prompt in this folder: %TEMP_DIR%
echo   2. Run: pscp -P 22 lead-saas-upload.zip root@72.60.234.138:/root/
echo.

echo ============================================================================
echo   AFTER UPLOAD
echo ============================================================================

echo.
echo Once uploaded, SSH into your server:
echo.
echo ssh root@72.60.234.138
echo.
echo Then run this command:
echo.
echo cd /root && unzip -q lead-saas-upload.zip -d /tmp/lead-saas && rm -rf /root/lead-saas && mkdir -p /root/lead-saas && cp -r /tmp/lead-saas/lead-saas/* /root/lead-saas/ && cd /root/lead-saas && bash deploy.sh
echo.

echo ============================================================================
echo   WANT TO OPEN THE FOLDER?
echo ============================================================================

set /p OPEN="Open folder in Explorer? (Y/N): "
if /i "%OPEN%"=="Y" (
    explorer "%TEMP_DIR%"
)

echo.
echo For detailed instructions, see: MANUAL_DEPLOYMENT_GUIDE.txt
echo.
pause