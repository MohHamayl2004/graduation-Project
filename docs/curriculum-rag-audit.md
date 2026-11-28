# Curriculum RAG recovery audit

Inspected on 2026-11-24.

## Located material

- AI repository is `Nipras_Ai_Models`.
- Configured index is `Nipras_Ai_Models/vector_db/nipras.index`.
- Configured vector metadata is `Nipras_Ai_Models/vector_db/metadata.json`.
- Both configured files are absent.
- Original PDFs are `Nipras_Ai_Models/data/raw/math/math_book.pdf` and `math_solutions.pdf`.
- Processed JSON has 66 page records. Fifty reference textbook pages 6–55, fifteen reference solutions pages 2 and 6–19, and one references legacy `lesson1.pdf` page 1.
- Six extracted lesson JSON files cover lessons 1-1 through 1-6. These counts describe source artifacts, not indexed chunks.
- Available page metadata includes source, source_document, page_number, lesson, solves, blocks, and review information. Grade is absent from the observed page keys. Visual verification of the original PDF cover establishes grade 12, scientific and industrial streams. Unit 1 is حساب التفاضل. This identifies the source book, while per-vector grade metadata still requires inspection of the missing index metadata.
- The existing configuration specifies `intfloat/multilingual-e5-base`, normalized embeddings, `query: ` and `passage: ` prefixes. The index builder uses FAISS IndexFlatIP. Actual index dimensions and provenance require the saved index and its build records.

## Search scope and evidence

Checked the active checkout, deployment copy, NIPRAS backup under Documents, and local user folders excluding installed application/package directories. Inspected the local RAG tar archive and attempted the web deployment archive, which reports truncation.

The current GPU container was searched for FAISS/Chroma indexes and PDFs. Only software documentation PDFs were returned. No Docker CLI, Docker socket, or Docker volume directory is available inside this container. Host-side Docker storage remains outside the accessible container.

Historical retrieval reports exist in `Nipras_Ai_Models/data/eval/runs`. The 20260922-164217 retrieval report recorded 12 passes out of 22 questions. This is historical evidence only.

## Integration preparation

Reuse `rag.embedding_model.EmbeddingModel`, `rag.vector_store.load_vector_store`, `rag.retriever`, and `rag.tutor.Tutor`. Recover the original index and metadata pair before loading or searching. Validate vector count equals metadata count, dimensions match the original embedding model, and normalized vectors have sensible norms.

Establish an authoritative textbook catalog containing country, grade, subject, edition and source identity before permitting student access. The observed extraction metadata cannot establish full grade coverage. Require grade and subject scope from validated student context and reject unknown scope. Apply scope before retrieval, with no fallback across grades.

Run real Arabic retrieval checks against textbook pages and lessons, including average rate of change, differentiation rules and chain rule. Check both relevance and page identity, then evaluate out-of-scope refusal.

The current backend uses direct Qwen mode. It does not perform curriculum retrieval. The existing `scripts/server/rag-qwen-adapter.py` targets an earlier deployment and requires environment-driven endpoint/model/auth configuration before reuse with the current Ollama service. It must not be started as-is.

After retrieval validation, supply selected passages and source/page references to the existing tutor prompt, return its contract-v1 stream through Express, and verify unsupported questions produce a missing-evidence response. Preserve existing citations and scope checks.

## Blocking dependency

Recover `nipras.index` and its matching `metadata.json` from the original index host or backup. No index was rebuilt, no original PDFs were changed, and no service was deployed during this audit.
