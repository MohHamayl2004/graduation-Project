"""Read-only integrity and optional semantic checks for a recovered FAISS pair.

No ingestion, downloads, or writes are performed.
"""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--directory", type=Path, default=Path("Nipras_Ai_Models/vector_db"))
parser.add_argument("--embedding-cache", type=Path)
args = parser.parse_args()
index_path = args.directory / "nipras.index"
metadata_path = args.directory / "metadata.json"
missing = [str(p) for p in (index_path, metadata_path) if not p.is_file()]
if missing:
    raise SystemExit("Missing original index artifacts: " + ", ".join(missing))

import faiss
import numpy as np
index = faiss.read_index(str(index_path))
chunks = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
if not isinstance(chunks, list) or index.ntotal != len(chunks):
    raise SystemExit("Index and metadata counts do not match.")
print(json.dumps({
    "vectors": index.ntotal, "dimensions": index.d,
    "index_type": type(index).__name__,
    "metadata_keys": sorted({k for chunk in chunks for k in chunk}),
    "missing_grade": sum(not chunk.get("grade") for chunk in chunks),
    "missing_subject": sum(not chunk.get("subject") for chunk in chunks),
}, ensure_ascii=False))
if args.embedding_cache:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(str(args.embedding_cache), local_files_only=True)
    if model.get_sentence_embedding_dimension() != index.d:
        raise SystemExit("Embedding dimensions do not match.")
    for question in ["ما متوسط التغير في الاقتران؟", "ما مشتقة الاقتران الثابت؟", "ما مشتقة جيب سين؟"]:
        vector = model.encode(["query: " + question], normalize_embeddings=True)
        scores, positions = index.search(np.asarray(vector, dtype="float32"), min(3,index.ntotal))
        print(json.dumps({"question":question, "results":[
            {"score":float(score), "chunk":chunks[int(position)]}
            for score,position in zip(scores[0],positions[0]) if position >= 0
        ]}, ensure_ascii=False))
