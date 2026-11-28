# Qwen3.5 GPU deployment — 2026-11-16

## Running deployment

- Existing SSH server: `ssh -p 5017 root@82.67.158.138`. No instance was created, started, stopped, recycled or resized.
- GPU: NVIDIA GeForce RTX 3090, 24,576 MiB, compute capability 8.6; driver 595.71.05. Installed CUDA toolkit 13.2; Python 3.12.3. No system drivers or CUDA packages were changed.
- Exact official checkpoint: [Qwen/Qwen3.5-9B](https://huggingface.co/Qwen/Qwen3.5-9B), revision `c202236235762e1c871ad0ccb60c8ee5ba337b9a`. Original BF16 weights; no quantized replacement was necessary. Download size of safetensors: 19,306,310,880 bytes.
- Storage: `/workspace/.hf_home/hub/models--Qwen--Qwen3.5-9B/snapshots/c202236235762e1c871ad0ccb60c8ee5ba337b9a`. `/workspace/nipras/model-path` records it. Weights were downloaded only to the remote server and are reused from its cache.
- Dedicated environment: `/workspace/nipras/qwen-venv`; vLLM 0.33.0, PyTorch 2.14.0+cu132. BF16 support was checked on the actual GPU. Setup followed the official [vLLM installation guidance](https://docs.vllm.ai/en/latest/getting_started/installation/gpu/) and [Qwen serving recipe](https://docs.vllm.ai/projects/recipes/en/latest/Qwen/Qwen3.5.html).
- Serving configuration: text-only, BF16, context 4096, one concurrent sequence, batch-token limit 512, eager execution, GPU utilization budget 0.85, reasoning parser `qwen3`. NIPRAS disables thinking per request. No FP8 kernels or second model are used.
- Actual model weight allocation: 16.71 GiB. Observed total GPU allocation including cache/runtime: 20,558 MiB of 24,576 MiB.

## Private connection and service management

The API is bound only to remote `127.0.0.1:8000`. Model requests require a dedicated new server credential. Requests without it returned 401. The credential is stored in remote `/workspace/nipras/api-key` (mode 0600) and ignored local `backend/.env`; it is not included here or in frontend code. An earlier proposal to export the old local service key was rejected by automatic approval review; instead, a new deployment-specific key was generated on the server and configured locally.

Run this from the project directory to reconnect the private tunnel after Windows restarts:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/connect-qwen.ps1
```

It forwards local `127.0.0.1:18000` to remote `127.0.0.1:8000`, preserves other listeners, and records the tunnel PID/start time under ignored `.local/qwen-tunnel.json`. Jupyter's 8080 and the existing Fish configuration were left unchanged.

Backend settings remain `AI_SERVICE_PROVIDER=qwen`, `AI_MODEL_ID=qwen3.5-9b`, and `AI_SERVICE_URL=http://127.0.0.1:18000`. The existing nodemon-managed local backend was reloaded normally to pick up the new credential; watched source contents were unchanged.

After connecting with SSH, use:

```bash
supervisorctl start nipras-qwen
supervisorctl stop nipras-qwen
supervisorctl restart nipras-qwen
supervisorctl status nipras-qwen
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/health
nvidia-smi
tail -n 50 /workspace/nipras/logs/qwen.log
```

Launch wrapper: `/workspace/nipras/run-qwen.sh`. Supervisor configuration: `/etc/supervisor/conf.d/nipras-qwen.conf`. Logs are retained under `/workspace/nipras/logs/` and the image's portal logging mechanism. Supervisor owns the running process, so disconnecting SSH does not stop Qwen. Automatic retry loops are disabled. Start, stop and restart reuse the downloaded checkpoint.

**Future container-boot autostart is not enabled.** Automatic approval review rejected that persistent setting because of possible GPU resource/cost impact on future boots. The verified current process remains running. After a container reboot, manually start `nipras-qwen` until the user explicitly authorizes autostart.

The instance reports `workspace_is_volume=false`: container storage survives stop/start, but does not survive recycle or destroy. No persistent volume was available or purchased. Stopping Qwen frees its GPU memory; it does not stop the instance's rental billing.

## Real verification

1. Direct API: the requested Arabic question about quadratic equations returned a meaningful explanation and the quadratic formula. One direct answer used 131 output tokens, zero reasoning tokens, and took approximately 7.7 seconds.
2. Existing authenticated NIPRAS backend: the same question streamed a real Arabic explanation in 218 delta events, followed by validated `GREETING`/`happy` metadata. Reloaded history matched the generated answer.
3. Real frontend: the saved answer appeared through the actual API with no mocked responses; gesture metadata remained hidden.

One small integration fix was necessary: `vite.config.js` now excludes generated test profiles/artifacts from watching. Without that exclusion Windows `EBUSY` on Chrome's locked cookie database crashed the development frontend. Normal source watching and API proxy configuration remain intact.

Validation used a dedicated temporary student account and generated chat records, rather than a real student's credentials. Its records are removed after verification; screenshots and sanitized results remain in ignored `.agents/check-output/qwen-deployment*`. No commits, pushes, Gemini invocation or other agent delegation were performed. Textbook retrieval was not added: the existing direct-Qwen mode still reports `NO_BOOK_RETRIEVAL` and makes no verified textbook-citation claims.
