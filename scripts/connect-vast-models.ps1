param([string]$ServerAddress = '66.154.125.122', [int]$SshPort = 40625)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stateDirectory = Join-Path $projectRoot '.local'
New-Item -ItemType Directory -Force $stateDirectory | Out-Null
$pidFile = Join-Path $stateDirectory 'vast-models-tunnel.json'
function Test-Forward([int]$Port) {
    $client = [Net.Sockets.TcpClient]::new()
    try { $client.Connect('127.0.0.1', $Port); return $client.Connected }
    catch { return $false }
    finally { $client.Dispose() }
}
if (Test-Path $pidFile) {
    $saved = Get-Content $pidFile -Raw | ConvertFrom-Json
    $existing = Get-Process -Id $saved.Id -ErrorAction SilentlyContinue
    if ($existing -and $existing.ProcessName -eq 'ssh' -and $existing.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.Started) {
        if ($saved.Address -and ($saved.Address -ne $ServerAddress -or $saved.Port -ne $SshPort)) { throw 'An existing model tunnel targets another server. It was preserved.' }
        if (-not ((Test-Forward 18000) -and (Test-Forward 18001))) { throw 'Existing SSH process has no ready model forwards. Check .local/vast-models-tunnel.log.' }
        Write-Host 'Model SSH tunnel is already running.'
        return
    }
}
foreach ($port in @(18000, 18001)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($listener) { throw "Local port $port is already occupied. Existing processes were preserved." }
}
$ssh = (Get-Command ssh -ErrorAction Stop).Source
$arguments = @('-N', '-T', '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-o', 'ServerAliveInterval=30', '-o', 'ServerAliveCountMax=3', '-o', 'ConnectTimeout=15', '-p', $SshPort, '-L', '127.0.0.1:18000:127.0.0.1:8000', '-L', '127.0.0.1:18001:127.0.0.1:8081', "root@$ServerAddress")
$process = Start-Process -FilePath $ssh -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $stateDirectory 'vast-models-tunnel.log')
$deadline = [DateTime]::UtcNow.AddSeconds(20)
$ready = $false
while ([DateTime]::UtcNow -lt $deadline) {
    $process.Refresh()
    if ($process.HasExited) { throw 'SSH tunnel failed. Check .local/vast-models-tunnel.log.' }
    if ((Test-Forward 18000) -and (Test-Forward 18001)) { $ready = $true; break }
    Start-Sleep -Milliseconds 250
}
if (-not $ready) { throw 'SSH forwarding did not become ready. Check .local/vast-models-tunnel.log.' }
@{ Id = $process.Id; Started = $process.StartTime.ToUniversalTime().Ticks.ToString(); Address = $ServerAddress; Port = $SshPort } | ConvertTo-Json | Set-Content $pidFile
Write-Host 'Private model forwarding is running independently: Qwen :18000, Fish :18001.'
