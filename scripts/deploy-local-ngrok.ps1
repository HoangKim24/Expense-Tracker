<#
Simple helper to build and run Docker Compose for this project,
and instructions to start ngrok for exposing the API.

Usage:
  1. Copy `.env.example` to `.env` and fill values.
  2. Run this script in PowerShell: `./scripts/deploy-local-ngrok.ps1`
#>

Write-Host "Starting local Docker Compose for Expense Tracker..." -ForegroundColor Cyan

# Ensure .env exists
if (-Not (Test-Path -Path ".env")) {
    Write-Host "No .env file found. Copying .env.example to .env (you must edit secrets)." -ForegroundColor Yellow
    Copy-Item -Path ".env.example" -Destination ".env" -Force
    Write-Host "Please edit .env before continuing if you need to set real secrets." -ForegroundColor Yellow
}

# Build and run
docker compose up -d --build

Write-Host "Docker Compose started. Check containers with: docker compose ps" -ForegroundColor Green
Write-Host "If you want to expose the API temporarily to the internet, run ngrok:" -ForegroundColor Cyan
Write-Host "  ngrok http 8080" -ForegroundColor Magenta
Write-Host "Then open the generated ngrok URL (https) and append /swagger for API docs." -ForegroundColor Cyan

Write-Host "To stop and remove containers: docker compose down" -ForegroundColor Yellow
