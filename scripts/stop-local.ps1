$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectRoot '.local/processes.json'
if (-not (Test-Path $statePath)) { Write-Host 'No recorded local processes.'; return }
$tracked = Get-Content $statePath -Raw | ConvertFrom-Json
# Only stop recorded processes with matching creation times, in reverse order.
# Ollama and external MongoDB processes are not recorded here.
foreach ($serviceName in @('web', 'api', 'ai', 'mongodb')) {
    foreach ($record in @($tracked | Where-Object { $_.Name -eq $serviceName })) {
        $process = Get-Process -Id $record.Id -ErrorAction SilentlyContinue
        if ($process -and $process.StartTime.ToUniversalTime().Ticks.ToString() -eq $record.Started) {
            # The Windows venv Python launcher has a child interpreter.
            # Stop that service's whole process tree after verifying its identity.
            & taskkill.exe /PID $process.Id /T /F | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Could not stop $serviceName." }
            Write-Host "Stopped $serviceName."
        }
    }
}
Set-Content $statePath '[]'
