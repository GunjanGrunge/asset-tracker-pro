# AWS Elastic Beanstalk Deployment Script for Windows PowerShell
# This script builds and deploys the application to AWS Elastic Beanstalk

param(
    [string]$Environment = "production",
    [switch]$SkipBuild = $false
)

Write-Host "🚀 Starting AWS Elastic Beanstalk deployment..." -ForegroundColor Green

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
}

# Check if EB CLI is installed
try {
    eb --version | Out-Null
    Write-Host "✅ EB CLI found" -ForegroundColor Green
} catch {
    Write-Host "❌ EB CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Install: pip install awsebcli"
    exit 1
}

# Build the frontend first
if (-not $SkipBuild) {
    Write-Host "📦 Building frontend..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Frontend built successfully" -ForegroundColor Green
}

# Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$deployDir = "asset-tracker-deploy-$timestamp"

# Create deployment directory
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# Copy necessary files and directories
Copy-Item -Path "backend" -Destination "$deployDir\backend" -Recurse
Copy-Item -Path "python-ai" -Destination "$deployDir\python-ai" -Recurse
Copy-Item -Path "dist" -Destination "$deployDir\frontend" -Recurse
Copy-Item -Path "api" -Destination "$deployDir\api" -Recurse
Copy-Item -Path ".ebextensions" -Destination "$deployDir\.ebextensions" -Recurse
Copy-Item -Path "Dockerfile" -Destination "$deployDir\Dockerfile"
Copy-Item -Path "Dockerrun.aws.json" -Destination "$deployDir\Dockerrun.aws.json"
Copy-Item -Path "package.json" -Destination "$deployDir\package.json"
Copy-Item -Path "package-lock.json" -Destination "$deployDir\package-lock.json"

# Copy environment template
Copy-Item -Path ".env.example" -Destination "$deployDir\.env"

Write-Host "✅ Deployment package created in $deployDir" -ForegroundColor Green

# Initialize EB application if not exists
if (-not (Test-Path ".elasticbeanstalk\config.yml")) {
    Write-Host "🔧 Initializing Elastic Beanstalk application..." -ForegroundColor Yellow
    eb init --platform docker --region ap-south-1 asset-tracker-pro
}

# Change to deployment directory and deploy
Write-Host "🚀 Deploying to Elastic Beanstalk..." -ForegroundColor Yellow
Set-Location $deployDir

try {
    eb deploy
    Write-Host "✅ Deployment completed!" -ForegroundColor Green
    Write-Host "🌐 Check your application status with: eb status" -ForegroundColor Green
    Write-Host "📝 View logs with: eb logs" -ForegroundColor Green
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Set-Location ..
    Remove-Item -Path $deployDir -Recurse -Force
    exit 1
}

# Go back and cleanup
Set-Location ..
Remove-Item -Path $deployDir -Recurse -Force
Write-Host "🧹 Cleanup completed!" -ForegroundColor Green

Write-Host "🎉 Deployment process finished!" -ForegroundColor Green
