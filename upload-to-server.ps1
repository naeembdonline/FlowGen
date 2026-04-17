# ============================================================================
# FIKERFLOW LEAD SAAS - AUTOMATED UPLOAD SCRIPT
# Run this on your Windows machine to upload everything to your server
# ============================================================================

Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "  FIKERFLOW LEAD SAAS - UPLOAD TO SERVER" -ForegroundColor Blue
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host ""

# Configuration
$Server = "root@72.60.234.138"
$ProjectPath = "F:\Parsa\Lead Saas"
$RemotePath = "/root/fikerflow-lead-saas"

Write-Host "[1/4] Checking project files..." -ForegroundColor Yellow

if (!(Test-Path $ProjectPath)) {
    Write-Host "❌ Project path not found: $ProjectPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project path found" -ForegroundColor Green
Write-Host ""

Write-Host "[2/4] Creating deployment package..." -ForegroundColor Yellow

# Create a temporary directory for the package
$TempDir = "$env:TEMP\fikerflow-deploy"
New-Item -ItemType Directory -Force -Path $TempDir | Out-Null

# Copy essential files
Write-Host "Copying backend files..."
Copy-Item -Path "$ProjectPath\backend\*" -Destination "$TempDir\backend\" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Copying frontend files..."
Copy-Item -Path "$ProjectPath\frontend\*" -Destination "$TempDir\frontend\" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Copying configuration files..."
Copy-Item -Path "$ProjectPath\docker-compose.production.yml" -Destination "$TempDir\" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$ProjectPath\nginx.conf" -Destination "$TempDir\" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$ProjectPath\deploy-to-server.sh" -Destination "$TempDir\" -Force -ErrorAction SilentlyContinue

Write-Host "✅ Deployment package created" -ForegroundColor Green
Write-Host ""

Write-Host "[3/4] Uploading to server..." -ForegroundColor Yellow

# Check if SCP is available (comes with Git Bash or OpenSSH)
try {
    # Create tar archive for efficient transfer
    $TarFile = "$TempDir\fikerflow-deploy.tar.gz"
    Write-Host "Creating compressed archive..."
    & tar -czf $TarFile -C $TempDir .

    Write-Host "Uploading compressed archive to server..."
    & scp $TarFile "$Server`:$RemotePath.tar.gz"

    Write-Host "Extracting on server..."
    & ssh $Server "mkdir -p $RemotePath && tar -xzf $RemotePath.tar.gz -C $RemotePath && rm $RemotePath.tar.gz"

    Write-Host "✅ Files uploaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Upload failed. Make sure you have SSH/SCP available" -ForegroundColor Red
    Write-Host "Install Git for Windows or OpenSSH client" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

Write-Host "[4/4) Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $TempDir
Write-Host "✅ Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host "  UPLOAD COMPLETE!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Blue
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH into your server: ssh $Server" -ForegroundColor White
Write-Host "2. Run the deployment script: bash $RemotePath/deploy-to-server.sh" -ForegroundColor White
Write-Host "3. Click the link when it's done!" -ForegroundColor White
Write-Host ""

Write-Host "Or run this one-liner:" -ForegroundColor Yellow
Write-Host "ssh $Server 'bash $RemotePath/deploy-to-server.sh'" -ForegroundColor Green
Write-Host ""