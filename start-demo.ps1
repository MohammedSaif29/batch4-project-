<#
Start-demo.ps1
Opens a new PowerShell window that runs the server and opens the browser to the app.
Usage: Right-click -> Run with PowerShell, or execute in PowerShell:
    .\start-demo.ps1
#>

param(
    [int]$Port = 3000
)

$project = Split-Path -Parent $MyInvocation.MyCommand.Definition
Write-Host "Starting AidConnect server in new PowerShell window (port $Port)..."

$startArgs = "-NoExit -Command `"cd '$project'; $env:PORT=$Port; node server.js`""
Start-Process powershell -ArgumentList $startArgs

Start-Sleep -Seconds 2
Start-Process "http://localhost:$Port"
Write-Host "Demo launched. A new window is running the server and your browser should open shortly." 
