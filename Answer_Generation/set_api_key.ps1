# Set Gemini API Key for PowerShell
# Run this script before using the Interviewer Agent Module
# Usage: .\set_api_key.ps1

$env:GEMINI_API_KEY="AIzaSyAD45O_-YdhcnMG2ubLyk4lHnSr_ond5uo"

Write-Host "[OK] Gemini API Key has been set for this session" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run:"
Write-Host "  python ai_engine\interviewer.py    # Run tests"
Write-Host "  python example_usage.py           # Run examples"
Write-Host ""
