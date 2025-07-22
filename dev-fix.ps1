# Development Fix Script for Ebook Admin
# Run this script when experiencing chunk loading errors or development issues

Write-Host "🔧 Fixing Development Issues..." -ForegroundColor Cyan

# Stop any running dev servers
Write-Host "⏹️  Stopping any running processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear Next.js cache
Write-Host "🗑️  Clearing Next.js cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Clear node modules cache
Write-Host "🗑️  Clearing node modules cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

# Clear npm cache
Write-Host "🗑️  Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

# Wait a moment
Start-Sleep -Seconds 2

# Start dev server
Write-Host "🚀 Starting development server..." -ForegroundColor Green
Write-Host "💡 After server starts, please:" -ForegroundColor Cyan
Write-Host "   1. Wait for compilation to complete" -ForegroundColor White
Write-Host "   2. Hard refresh browser (Ctrl + Shift + R)" -ForegroundColor White
Write-Host "   3. If still issues, try incognito mode" -ForegroundColor White
Write-Host ""

# Start the dev server
npm run dev 