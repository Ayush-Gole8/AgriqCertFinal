# AgriQCert Backend - Quick Start Script
# Run this script to setup and start the backend

Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "║   🌾 AgriQCert Backend - Quick Start                ║" -ForegroundColor Cyan
Write-Host "║                                                       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
Write-Host ""
Write-Host "🔍 Checking MongoDB connection..." -ForegroundColor Yellow
try {
    $mongoTest = Test-Connection -TargetName localhost -TcpPort 27017 -Count 1 -ErrorAction SilentlyContinue
    if ($mongoTest) {
        Write-Host "✅ MongoDB is running on localhost:27017" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB doesn't seem to be running on localhost:27017" -ForegroundColor Yellow
        Write-Host "   Please start MongoDB or update MONGODB_URI in .env" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify MongoDB connection" -ForegroundColor Yellow
}

# Check if .env exists
Write-Host ""
Write-Host "🔍 Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "   Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ .env file created! Please review and update as needed." -ForegroundColor Green
}

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Ask if user wants to seed database
Write-Host ""
$seedChoice = Read-Host "Do you want to seed the database with sample data? (y/N)"
if ($seedChoice -eq 'y' -or $seedChoice -eq 'Y') {
    Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
    npm run seed
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database seeded successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Database seeding encountered issues" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║   ✅ Setup Complete!                                 ║" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting development server..." -ForegroundColor Cyan
Write-Host ""

# Start the development server
npm run dev
