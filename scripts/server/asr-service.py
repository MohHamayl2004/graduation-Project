"""Private CPU-only Qwen3-ASR adapter; no user-provided URLs or code execution."""
import asyncio
import hmac
import os
import subprocess
import tempfile
from pathlib import Path
from contextlib import asynccontextmanager

import numpy as np
import torch
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from qwen_asr import Qwen3ASRModel

model = None
lock = asyncio.Lock()
key = Path('/workspace/nipras/api-key').read_text().strip()
torch.set_num_threads(8)

@asynccontextmanager
async def lifespan(_app):
    global model
    model = Qwen3ASRModel.from_pretrained('Qwen/Qwen3-ASR-0.6B', dtype=torch.float32,
        device_map='cpu', max_inference_batch_size=1, max_new_tokens=256)
    yield

app = FastAPI(lifespan=lifespan)

def authenticate(authorization):
    if not hmac.compare_digest(authorization or '', 'Bearer ' + key):
        raise HTTPException(401, 'Unauthorized')

@app.get('/health')
def health(authorization: str = Header(default='')):
    authenticate(authorization)
    return {'ready': model is not None, 'model': 'Qwen/Qwen3-ASR-0.6B', 'device': 'cpu'}

def recognize(audio):
    # Decode using fixed arguments and a locally created temporary file only.
    with tempfile.NamedTemporaryFile(suffix='.audio') as clip:
        clip.write(audio)
        clip.flush()
        try:
            decoded = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', clip.name,
                '-t', '46', '-f', 'f32le', '-ac', '1', '-ar', '16000', 'pipe:1'],
                capture_output=True, timeout=15, check=True).stdout
        except (subprocess.SubprocessError, OSError):
            raise HTTPException(422, 'Invalid audio')
    samples = np.frombuffer(decoded, dtype=np.float32)
    if not 1600 <= len(samples) <= 45 * 16000:
        raise HTTPException(422, 'Audio must contain 0.1–45 seconds')
    if not np.isfinite(samples).all() or float(np.max(np.abs(samples))) < .0001:
        raise HTTPException(422, 'No usable speech')
    result = model.transcribe(audio=(samples, 16000), language='Arabic')[0]
    if not result.text.strip() or len(result.text) > 2000:
        raise HTTPException(422, 'No usable speech')
    return {'text': result.text.strip()}

@app.post('/v1/audio/transcriptions')
async def transcribe(file: UploadFile = File(...), authorization: str = Header(default='')):
    authenticate(authorization)
    audio = await file.read(6 * 1024 * 1024 + 1)
    await file.close()
    if not audio or len(audio) > 6 * 1024 * 1024:
        raise HTTPException(413, 'Audio exceeds limit')
    if lock.locked():
        raise HTTPException(429, 'Speech recognition busy')
    async with lock:
        return await asyncio.to_thread(recognize, audio)
