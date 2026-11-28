#!/bin/bash
# Upload this file and download-qwen.py to /workspace/nipras first.
set -eu
mkdir -p /workspace/nipras/logs
cat > /workspace/nipras/provision-qwen.sh <<'SH'
#!/bin/bash
set -eu
test -x /workspace/nipras/qwen-venv/bin/python || uv venv /workspace/nipras/qwen-venv --python /venv/main/bin/python
uv pip install --python /workspace/nipras/qwen-venv/bin/python vllm==0.33.0
SH
cat > /workspace/nipras/run-qwen.sh <<'SH'
#!/bin/bash
set -eu
export HF_HOME=/workspace/.hf_home VLLM_NO_USAGE_STATS=1 DO_NOT_TRACK=1
exec /workspace/nipras/qwen-venv/bin/vllm serve "$(cat /workspace/nipras/model-path)" --served-model-name qwen3.5-9b --host 127.0.0.1 --port 8000 --api-key "$(cat /workspace/nipras/api-key)" --dtype bfloat16 --max-model-len 4096 --max-num-seqs 1 --max-num-batched-tokens 512 --gpu-memory-utilization 0.85 --enforce-eager --language-model-only --reasoning-parser qwen3
SH
chmod 700 /workspace/nipras/{provision-qwen,run-qwen}.sh
/venv/main/bin/python - <<'PY'
import pathlib,secrets
p=pathlib.Path('/workspace/nipras/api-key')
if not p.exists(): p.write_text(secrets.token_urlsafe(48))
p.chmod(0o600)
PY
for job in provision download; do
  if [ "$job" = provision ]; then command=/workspace/nipras/provision-qwen.sh; else command='/venv/main/bin/python /workspace/nipras/download-qwen.py'; fi
  cat > "/etc/supervisor/conf.d/nipras-qwen-$job.conf" <<CONF
[program:nipras-qwen-$job]
command=$command
autostart=false
autorestart=false
startsecs=0
redirect_stderr=true
stdout_logfile=/workspace/nipras/logs/$job.log
stdout_logfile_maxbytes=10485760
CONF
done
cat > /etc/supervisor/conf.d/nipras-qwen.conf <<'CONF'
[program:nipras-qwen]
command=/workspace/nipras/run-qwen.sh
autostart=true
autorestart=unexpected
startsecs=20
startretries=0
stopasgroup=true
killasgroup=true
stopwaitsecs=40
redirect_stderr=true
stdout_logfile=/workspace/nipras/logs/qwen.log
stdout_logfile_maxbytes=10485760
stdout_logfile_backups=2
CONF
# Start Qwen only after installation and the model verification have completed.
# Temporarily suppress autostart during initial provisioning.
sed -i 's/autostart=true/autostart=false/' /etc/supervisor/conf.d/nipras-qwen.conf
supervisorctl reread
supervisorctl update
supervisorctl start nipras-qwen-provision
supervisorctl start nipras-qwen-download
