"""Run the existing RAG service with Qwen's OpenAI transport injected.

The reviewed pages, FAISS retrieval, symbolic calculator, scope checks,
history-aware prompts, and contract-v1 event stream remain in rag.*.
"""
import json
import os
import time
from pathlib import Path

os.environ.setdefault('NIPRAS_TUTOR_MODEL', 'qwen3.5-9b')
os.environ.setdefault('NIPRAS_SERVICE_KEY', Path('/workspace/nipras/api-key').read_text().strip())
os.environ.setdefault('CUDA_VISIBLE_DEVICES', '')
os.environ.setdefault('OMP_NUM_THREADS', '8')

import requests
from rag.tutor import Tutor
import rag.service as service

URL = 'http://127.0.0.1:8000'
KEY = os.environ['NIPRAS_SERVICE_KEY']

def payload(prompt, model=None, temperature=None, stream=False, format=None, **_kwargs):
    body = {'model': model or 'qwen3.5-9b', 'messages': [
        {'role': 'system', 'content': 'أنت معلم نبراس. التزم بالمادة المرجعية والحسابات الموثقة في الطلب، وأجب بالعربية باختصار دون عرض التفكير الداخلي.'},
        {'role': 'user', 'content': prompt}], 'temperature': .6 if temperature is None else temperature,
        'max_tokens': 768, 'stream': stream, 'chat_template_kwargs': {'enable_thinking': False}}
    if format is not None:
        body['response_format'] = {'type': 'json_schema', 'json_schema': {'name': 'rag_result', 'strict': True, 'schema': format}}
    return body

def generate(prompt, model=None, temperature=None, timeout=None, **kwargs):
    started = time.monotonic()
    with requests.post(URL + '/v1/chat/completions', headers={'Authorization': 'Bearer ' + KEY},
        json=payload(prompt, model, temperature, **kwargs), timeout=(10, timeout or 180)) as response:
        response.raise_for_status()
        answer = response.json()['choices'][0]['message']['content']
    return answer, round(time.monotonic()-started, 1)

def generate_stream(prompt, model=None, temperature=None, timeout=None, **kwargs):
    finished = False
    with requests.post(URL + '/v1/chat/completions', headers={'Authorization': 'Bearer ' + KEY},
        json=payload(prompt, model, temperature, stream=True, **kwargs), stream=True,
        timeout=(10, timeout or 180)) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            if not line.startswith(b'data:'): continue
            data = line[5:].strip()
            if data == b'[DONE]': break
            event = json.loads(data)
            if event.get('error'): raise RuntimeError('Qwen generation failed')
            choice = (event.get('choices') or [{}])[0]
            if choice.get('finish_reason'):
                if choice['finish_reason'] != 'stop': raise RuntimeError('Qwen output was truncated')
                finished = True
            piece = choice.get('delta', {}).get('content')
            if piece: yield piece
    if not finished: raise RuntimeError('Qwen stream incomplete')

def model_reachable():
    try:
        return requests.get(URL+'/v1/models', headers={'Authorization':'Bearer '+KEY}, timeout=3).ok
    except requests.RequestException:
        return False

service._tutor = Tutor(model='qwen3.5-9b', generate_fn=generate, stream_fn=generate_stream)
service.ollama_reachable = model_reachable
service.warm()

# Keep stream/queue handlers; accurately describe the replacement transport.
service.app.router.routes = [r for r in service.app.router.routes
    if getattr(r, 'path', '') not in ('/v1/health', '/health')]

@service.app.get('/v1/health', dependencies=[service.Depends(service.require_service_key)])
@service.app.get('/health', dependencies=[service.Depends(service.require_service_key)])
def health():
    pipeline = service._tutor.pipeline
    return {'status': 'ok', 'contract': 'v1', 'model': service._tutor.model,
        'transport': 'vllm', 'generation_reachable': model_reachable(),
        'index_loaded': True, 'chunks': len(pipeline.chunks),
        'vectors': pipeline.index.ntotal, 'embedding_device': 'cpu'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(service.app, host='127.0.0.1', port=8002)
