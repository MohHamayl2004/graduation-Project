param([string]$ServerAddress='154.64.230.50',[int]$SshPort=50403,[int]$LocalPort=18000,[int]$AsrLocalPort=18002)
$ErrorActionPreference='Stop'
$stateDirectory=Join-Path (Split-Path -Parent $PSScriptRoot) '.local'
New-Item -ItemType Directory -Force $stateDirectory | Out-Null
$record=Join-Path $stateDirectory 'qwen-tunnel.json'
if(Test-Path -LiteralPath $record){
  $saved=Get-Content -Raw -LiteralPath $record | ConvertFrom-Json
  $running=Get-Process -Id $saved.Id -ErrorAction SilentlyContinue
  if($running -and $running.ProcessName -eq 'ssh' -and $running.StartTime.ToUniversalTime().Ticks.ToString() -eq $saved.Started){
    if($saved.Address -ne $ServerAddress -or $saved.Port -ne $SshPort -or $saved.LocalPort -ne $LocalPort -or $saved.AsrPort -ne $AsrLocalPort){throw 'A recorded Qwen tunnel targets another endpoint; it was preserved.'}
    Write-Host "Qwen SSH tunnel is already running on 127.0.0.1:$LocalPort."
    return
  }
}
if(Get-NetTCPConnection -State Listen -LocalPort $LocalPort -ErrorAction SilentlyContinue){throw "Local port $LocalPort is occupied; the existing listener was preserved."}
if(Get-NetTCPConnection -State Listen -LocalPort $AsrLocalPort -ErrorAction SilentlyContinue){throw "Local port $AsrLocalPort is occupied; the existing listener was preserved."}
$arguments=@('-N','-T','-o','BatchMode=yes','-o','ExitOnForwardFailure=yes','-o','ConnectTimeout=15','-o','ServerAliveInterval=30','-o','ServerAliveCountMax=3','-p',$SshPort,'-L',"127.0.0.1:${LocalPort}:127.0.0.1:8000",'-L',"127.0.0.1:${AsrLocalPort}:127.0.0.1:8001","root@$ServerAddress")
$process=Start-Process -FilePath (Get-Command ssh -ErrorAction Stop).Source -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $stateDirectory 'qwen-tunnel.log')
$deadline=[DateTime]::UtcNow.AddSeconds(20)
do{
  $process.Refresh();if($process.HasExited){throw 'Qwen SSH tunnel failed. Check .local/qwen-tunnel.log.'}
  $client=[Net.Sockets.TcpClient]::new()
  try{$client.Connect('127.0.0.1',$LocalPort);$ready=$client.Connected}catch{$ready=$false}finally{$client.Dispose()}
  if(-not $ready){Start-Sleep -Milliseconds 250}
}while(-not $ready -and [DateTime]::UtcNow -lt $deadline)
if(-not $ready){throw 'Qwen forwarding did not become ready. Check .local/qwen-tunnel.log.'}
@{Id=$process.Id;Started=$process.StartTime.ToUniversalTime().Ticks.ToString();Address=$ServerAddress;Port=$SshPort;LocalPort=$LocalPort;AsrPort=$AsrLocalPort}|ConvertTo-Json|Set-Content -LiteralPath $record
Write-Host "Private Qwen tunnel ready: 127.0.0.1:$LocalPort -> remote 127.0.0.1:8000."
