@echo off
REM ============================================================================
REM SETUP PASSWORDLESS SSH - Run this once for easier deployments
REM ============================================================================

echo ============================================================================
echo   SETUP PASSWORDLESS SSH FOR YOUR SERVER
echo ============================================================================
echo.

echo This will set up SSH keys so you don't need to enter your password
echo every time you deploy.
echo.

echo Step 1: Check if SSH key already exists...
if exist "%USERPROFILE%\.ssh\id_ed25519" (
    echo ✅ SSH key already exists
    goto :COPY_KEY
) else if exist "%USERPROFILE%\.ssh\id_rsa" (
    echo ✅ SSH key already exists
    goto :COPY_KEY
) else (
    echo Creating new SSH key...
    ssh-keygen -t ed25519 -f "%USERPROFILE%\.ssh\id_ed25519" -N "" -C "deployer@fikerflow"
    echo ✅ SSH key created
)

:COPY_KEY
echo.
echo Step 2: Copy SSH key to server...
echo You will be prompted for your server password ONE TIME only.
echo.

type "%USERPROFILE%\.ssh\id_ed25519.pub" | ssh -o StrictHostKeyChecking=no root@72.60.234.138 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

if errorlevel 1 (
    echo.
    echo ❌ Key copy failed! Trying manual method...
    echo.
    echo Please run this command manually:
    echo.
    echo type "%USERPROFILE%\.ssh\id_ed25519.pub" ^| ssh root@72.60.234.138 "mkdir -p ~/.ssh ^&^& chmod 700 ~/.ssh ^&^& cat ^>^> ~/.ssh/authorized_keys ^&^& chmod 600 ~/.ssh/authorized_keys"
    echo.
    pause
    exit /b 1
)

echo.
echo Step 3: Testing passwordless SSH...
echo.

ssh -o BatchMode=yes -o ConnectTimeout=5 root@72.60.234.138 "echo '✅ Passwordless SSH is working!'"

if errorlevel 1 (
    echo.
    echo ⚠️ Passwordless SSH not working yet.
    echo You may need to enter your password during deployment.
    echo.
) else (
    echo.
    echo ✅ SUCCESS! Passwordless SSH is configured!
    echo You can now deploy without entering your password.
    echo.
)

echo ============================================================================
echo   SETUP COMPLETE!
echo ============================================================================
echo.
echo Next steps:
echo 1. Run: EASY_DEPLOY.bat
echo 2. Your deployment will be much easier now!
echo.
pause