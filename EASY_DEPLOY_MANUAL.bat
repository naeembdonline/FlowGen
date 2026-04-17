@echo off
REM ============================================================================
REM LEAD GENERATION SAAS - MANUAL DEPLOYMENT WITH CLEAR PASSWORD PROMPTS
REM ============================================================================

echo ============================================================================
echo   LEAD GENERATION SAAS - MANUAL DEPLOYMENT
echo ============================================================================
echo.
echo This will help you deploy manually with clear password prompts.
echo.

REM ============================================================================
REM CREATE DEPLOYMENT PACKAGE
REM ============================================================================

echo ============================================================================
echo   STEP 1: CREATING DEPLOYMENT PACKAGE
echo ============================================================================

set PROJECT_DIR=F:\Parsa\Lead Saas
set TEMP_DIR=%TEMP%\lead-saas-deploy
set ZIP_FILE=%TEMP_DIR%\lead-saas-upload.zip

echo.
echo Creating temporary deployment directory...
if exist %TEMP_DIR% rmdir /s /q %TEMP_DIR%
mkdir %TEMP_DIR%

echo Creating clean project structure...
mkdir %TEMP_DIR%\lead-saas
mkdir %TEMP_DIR%\lead-saas\backend
mkdir %TEMP_DIR%\lead-saas\frontend

echo Copying backend files (excluding node_modules)...
xcopy "%PROJECT_DIR%\backend" "%TEMP_DIR%\lead-saas\backend\" /E /I /Y /Q > nul 2>&1
if exist "%TEMP_DIR%\lead-saas\backend\node_modules" rmdir /s /q "%TEMP_DIR%\lead-saas\backend\node_modules"

echo Copying frontend files (excluding node_modules)...
xcopy "%PROJECT_DIR%\frontend" "%TEMP_DIR%\lead-saas\frontend\" /E /I /Y /Q > nul 2>&1
if exist "%TEMP_DIR%\lead-saas\frontend\node_modules" rmdir /s /q "%TEMP_DIR%\lead-saas\frontend\node_modules"

echo Copying configuration files...
copy "%PROJECT_DIR%\docker-compose.production.yml" "%TEMP_DIR%\lead-saas\" /Y > nul
copy "%PROJECT_DIR%\nginx.conf" "%TEMP_DIR%\lead-saas\" /Y > nul
copy "%PROJECT_DIR%\backend\.env" "%TEMP_DIR%\lead-saas\backend\" /Y > nul 2>&1
copy "%PROJECT_DIR%\deploy-server.sh" "%TEMP_DIR%\lead-saas\deploy.sh" /Y > nul 2>&1

echo Creating compressed archive...
powershell -Command "Compress-Archive -Path '%TEMP_DIR%\lead-saas\*' -DestinationPath '%ZIP_FILE%' -Force"

echo.
echo ✅ Deployment package created: %ZIP_FILE%
echo.

echo ============================================================================
echo   STEP 2: MANUAL UPLOAD INSTRUCTIONS
echo ============================================================================

echo.
echo Your deployment package is ready at:
echo %ZIP_FILE%
echo.
echo Please upload this file to your server using ONE of these methods:
echo.

echo METHOD 1: Using WinSCP (RECOMMENDED - GUI)
echo   1. Open WinSCP
echo   2. Connect to: 72.60.234.138
echo      - Username: root
echo      - Password: [your server password]
echo      - Port: 22
echo   3. Navigate to: /root
echo   4. Drag and drop: %ZIP_FILE%
echo   5. Rename uploaded file to: lead-saas-upload.zip
echo.

echo METHOD 2: Using PuTTY SCP (Command Line)
echo   1. Open Command Prompt
echo   2. Navigate to: %TEMP_DIR%
echo   3. Run: pscp -P 22 lead-saas-upload.zip root@72.60.234.138:/root/
echo.

echo METHOD 3: Using FileZilla (GUI)
echo   1. Open FileZilla
echo   2. Host: 72.60.234.138
echo      - Username: root
echo      - Password: [your server password]
echo      - Port: 22
echo   3. Upload: %ZIP_FILE% to /root/
echo.

echo ============================================================================
echo   STEP 3: SERVER DEPLOYMENT COMMANDS
echo ============================================================================

echo.
echo AFTER uploading the ZIP file, run these commands on your server:
echo.
echo 1. SSH into your server:
echo    ssh root@72.60.234.138
echo    [Enter your password when prompted]
echo.
echo 2. Navigate to root directory:
echo    cd /root
echo.
echo 3. Extract the deployment package:
echo    unzip -q lead-saas-upload.zip -d /tmp/lead-saas
echo.
echo 4. Copy files to project directory:
echo    rm -rf /root/lead-saas
echo    mkdir -p /root/lead-saas
echo    cp -r /tmp/lead-saas/lead-saas/* /root/lead-saas/
echo.
echo 5. Run the deployment script:
echo    cd /root/lead-saas
echo    bash deploy.sh
echo.
echo Or run this ONE-LINER after uploading:
echo    unzip -q /root/lead-saas-upload.zip -d /tmp/lead-saas && rm -rf /root/lead-saas && mkdir -p /root/lead-saas && cp -r /tmp/lead-saas/lead-saas/* /root/lead-saas/ && cd /root/lead-saas && bash deploy.sh
echo.

echo ============================================================================
echo   STEP 4: ALTERNATIVE - TRY AUTOMATED UPLOAD
echo ============================================================================

echo.
echo If you want to try automated upload with clear password prompts:
echo.
set /p CONTINUE="Try automated upload? (Y/N): "
if /i "%CONTINUE%"=="Y" (
    echo.
    echo Attempting automated upload...
    echo You will be prompted for your password multiple times.
    echo.
    echo Password: [Your server password for root@72.60.234.138]
    echo.

    scp -o StrictHostKeyChecking=no "%ZIP_FILE%" root@72.60.234.138:/root/lead-saas-upload.zip

    if not errorlevel 1 (
        echo.
        echo ✅ Upload successful! Running deployment...
        echo.

        ssh -o StrictHostKeyChecking=no root@72.60.234.138 "cd /root && unzip -q lead-saas-upload.zip -d /tmp/lead-saas && rm -rf /root/lead-saas && mkdir -p /root/lead-saas && cp -r /tmp/lead-saas/lead-saas/* /root/lead-saas/ && cd /root/lead-saas && bash deploy.sh"

        if not errorlevel 1 (
            echo.
            echo ============================================================================
            echo   🎉 DEPLOYMENT COMPLETE!
            echo ============================================================================
            echo.
            echo Your application should now be live at:
            echo   https://leads.naeemmia.bd
            echo   https://leads.naeemmia.bd/health
            echo.
            pause
            start https://leads.naeemmia.bd
            start https://leads.naeemmia.bd/health
            exit /b 0
        )
    )
)

echo.
echo ============================================================================
echo   MANUAL DEPLOYMENT COMPLETE
echo ============================================================================

echo.
echo Your deployment package is ready at:
echo %ZIP_FILE%
echo.
echo Follow the manual upload instructions above to complete deployment.
echo.
echo After deployment, your application will be live at:
echo   https://leads.naeemmia.bd
echo   https://leads.naeemmia.bd/health
echo.

pause