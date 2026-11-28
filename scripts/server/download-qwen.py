"""Download one official checkpoint and verify every repository file's size."""
from huggingface_hub import HfApi, snapshot_download
from pathlib import Path
import json

root = Path('/workspace/nipras')
repo = 'Qwen/Qwen3.5-9B'
info = HfApi().model_info(repo, files_metadata=True)
path = snapshot_download(repo, revision=info.sha, cache_dir='/workspace/.hf_home/hub', max_workers=4)
for file in info.siblings:
    target = Path(path) / file.rfilename
    if file.size is not None and (not target.is_file() or target.stat().st_size != file.size):
        raise RuntimeError('Incomplete checkpoint file: ' + file.rfilename)
root.joinpath('model-path').write_text(path)
root.joinpath('model-manifest.json').write_text(json.dumps({
    'repo': repo, 'revision': info.sha, 'files': len(info.siblings),
    'bytes': sum(file.size or 0 for file in info.siblings),
}, indent=2))
print('MODEL_VERIFIED', path, flush=True)
