param([switch]$SkipAI, [switch]$StayOpen, [switch]$Lan)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRoot = Join-Path $projectRoot '.local'
$logRoot = Join-Path $localRoot 'logs'
$statePath = Join-Path $localRoot 'processes.json'
New-Item -ItemType Directory -Force $logRoot | Out-Null

function Test-LocalPort([int]$Port) {
    $client = [Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync('127.0.0.1', $Port)
        return ($task.Wait(500) -and $client.Connected)
    } catch { return $false } finally { $client.Dispose() }
}

$tracked = New-Object 'System.Collections.Generic.List[object]'
if (Test-Path $statePath) {
    foreach ($entry in (Get-Content $statePath -Raw | ConvertFrom-Json)) {
        if ($entry.Name) {
            $tracked.Add([pscustomobject]@{ Name = [string]$entry.Name; Id = [int]$entry.Id; Started = [string]$entry.Started })
        }
    }
}

function Start-LocalService($Name, $Executable, $Arguments, $Directory, [int]$Port) {
    if (Test-LocalPort $Port) { Write-Host "$Name already listening on $Port."; return }
    if (-not (Test-Path $Executable)) { throw "Missing $Name executable: $Executable" }
    $process = Start-Process -FilePath $Executable -ArgumentList $Arguments `
        -WorkingDirectory $Directory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logRoot "$Name.out.log") `
        -RedirectStandardError (Join-Path $logRoot "$Name.err.log")
    for ($index = $script:tracked.Count - 1; $index -ge 0; $index--) {
        if ($script:tracked[$index].Name -eq $Name) { $script:tracked.RemoveAt($index) }
    }
    $script:tracked.Add([pscustomobject]@{ Name = $Name; Id = $process.Id; Started = $process.StartTime.ToUniversalTime().Ticks.ToString() })
    ConvertTo-Json -InputObject $script:tracked.ToArray() | Set-Content $statePath
    for ($attempt = 0; $attempt -lt 240; $attempt++) {
        if (Test-LocalPort $Port) { Write-Host "$Name ready on $Port."; return }
        $process.Refresh()
        if ($process.HasExited) { throw "$Name exited. See $logRoot\$Name.err.log and $Name.out.log" }
        Start-Sleep -Milliseconds 500
    }
    throw "$Name did not become ready. See $logRoot."
}

$nodeExe = (Get-Command node -ErrorAction Stop).Source
if (-not (Test-LocalPort 27017)) {
    $mongoExe = Get-ChildItem (Join-Path $localRoot 'mongodb') -Recurse -Filter mongod.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if (-not $mongoExe) { throw 'Local MongoDB is missing under .local/mongodb.' }
    $databasePath = Join-Path $localRoot 'mongo-data'
    New-Item -ItemType Directory -Force $databasePath | Out-Null
    Start-LocalService 'mongodb' $mongoExe @('--dbpath', "`"$databasePath`"", '--bind_ip', '127.0.0.1', '--port', '27017') $projectRoot 27017
}
# Bring up the site independently of the slower AI warm-up.
Start-LocalService 'api' $nodeExe @('server.js') (Join-Path $projectRoot 'backend') 5000
$webHost = if ($Lan) { '0.0.0.0' } else { '127.0.0.1' }
Start-LocalService 'web' $nodeExe @('node_modules/vite/bin/vite.js', '--host', $webHost, '--port', '5173', '--strictPort') $projectRoot 5173
if (-not $SkipAI) {
    $aiRoot = Join-Path $projectRoot 'Nipras_Ai_Models'
    $aiSettings = @{}
    Get-Content (Join-Path $aiRoot '.env') | ForEach-Object {
        if ($_ -match '^\s*(NIPRAS_TUTOR_MODEL|NIPRAS_OLLAMA_URL)\s*=\s*(.*?)\s*$') {
            $aiSettings[$Matches[1]] = $Matches[2].Trim('"', "'")
        }
    }
    $tutorModel = if ($env:NIPRAS_TUTOR_MODEL) { $env:NIPRAS_TUTOR_MODEL } elseif ($aiSettings['NIPRAS_TUTOR_MODEL']) { $aiSettings['NIPRAS_TUTOR_MODEL'] } else { 'qwen3.5:9b' }
    $ollamaUrl = if ($env:NIPRAS_OLLAMA_URL) { $env:NIPRAS_OLLAMA_URL } elseif ($aiSettings['NIPRAS_OLLAMA_URL']) { $aiSettings['NIPRAS_OLLAMA_URL'] } else { 'http://127.0.0.1:11434' }
    $tags = Invoke-RestMethod "$($ollamaUrl.TrimEnd('/'))/api/tags" -TimeoutSec 5
    if ($tutorModel -notin @($tags.models.name)) { throw "Run ollama pull $tutorModel first." }
    if (-not (Test-Path (Join-Path $aiRoot 'vector_db/nipras.index'))) { throw 'Build the RAG index with python -m rag.ingest first.' }
    $env:PYTHONIOENCODING = 'utf-8'
    $env:HF_HOME = Join-Path $localRoot 'huggingface'
    $env:HF_HUB_OFFLINE = '1'
    Start-LocalService 'ai' (Join-Path $aiRoot '.venv/Scripts/python.exe') @('-u', '-m', 'rag.service', '--warm-index') $aiRoot 8000
}
Write-Host "Open http://localhost:5173 (logs: $logRoot)."
if ($Lan) { Write-Host 'LAN mode: open http://<computer-LAN-IP>:5173 on the same trusted Wi-Fi. Restart web if it was already running in loopback mode.' }
Write-Host 'Stop with: powershell -ExecutionPolicy Bypass -File scripts/stop-local.ps1'
if ($StayOpen) {
    Write-Host 'Local servers running. Keep this terminal open. Press Ctrl+C to stop.'
    $servicePorts = [ordered]@{ web = 5173; api = 5000; mongodb = 27017 }
    if (-not $SkipAI) { $servicePorts['ai'] = 8000 }
    $previousStatus = @{}
    try {
        while ($true) {
            foreach ($service in $servicePorts.Keys) {
                $listening = Test-LocalPort $servicePorts[$service]
                if (-not $previousStatus.ContainsKey($service) -or $previousStatus[$service] -ne $listening) {
                    if ($listening) {
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $service running on $($servicePorts[$service])." -ForegroundColor Green
                    } else {
                        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $service STOPPED. Check $logRoot\$service.err.log" -ForegroundColor Red
                    }
                    $previousStatus[$service] = $listening
                }
            }
            if (-not ($previousStatus.Values -contains $true)) { break }
            Start-Sleep -Seconds 3
        }
    } finally {
        & (Join-Path $PSScriptRoot 'stop-local.ps1')
    }
}
