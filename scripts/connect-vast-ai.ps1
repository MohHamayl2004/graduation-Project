$ErrorActionPreference = 'Stop'
$healthUrl = 'http://127.0.0.1:18000/v1/health'
try {
    $existing = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    if ($existing.contract -eq 'v1' -and $existing.model -eq 'qwen3.5:9b') {
        Write-Host 'NIPRAS AI tunnel is already connected.'
        exit 0
    }
    throw 'Port 18000 is occupied by another service.'
} catch [System.Net.WebException] { }

$ssh = (Get-Command ssh.exe -ErrorAction Stop).Source
$arguments = @('-N', '-T', '-p', '6704', '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-L', '127.0.0.1:18000:127.0.0.1:8000', 'root@122.51.254.66')
$process = Start-Process -FilePath $ssh -ArgumentList $arguments -WindowStyle Hidden -PassThru
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    $process.Refresh()
    if ($process.HasExited) { throw 'SSH tunnel exited; check the server connection and SSH key.' }
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
        if ($health.contract -eq 'v1' -and $health.model -eq 'qwen3.5:9b') {
            $stateDir = Join-Path $PSScriptRoot '..\.local'
            New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
            Set-Content -LiteralPath (Join-Path $stateDir 'vast-ai-tunnel.pid') -Value $process.Id
            Write-Host 'NIPRAS AI tunnel connected on 127.0.0.1:18000.'
            exit 0
        }
    } catch [System.Net.WebException] { }
}
Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
throw 'AI service did not respond through the SSH tunnel.'
