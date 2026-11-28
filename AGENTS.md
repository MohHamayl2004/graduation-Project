## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Codex-led Gemini development

- Codex is the lead architect, implementer for backend/contracts, reviewer and integrator. For future development requests, automatically delegate worthwhile focused frontend/React, CSS, responsive/RTL, GSAP, visual, interactive-book or frontend-performance subtasks to Gemini. Do trivial tasks locally. Workers never delegate further.
- Use `python scripts/delegate_gemini.py <task.json>`; see `docs/gemini-delegation.md` and concise shared context `.agents/project-context.md`. Only `gemini-4-argon-medium` by default; `gemini-4-argon-high` needs a complexity reason. Never silently substitute another model or use `--dangerously-skip-permissions`.
- Every task names exact files, current context, requirements, API contracts, acceptance criteria and checks. Include the graphify query-first rule in every code-exploration task. Use the isolated worktree, reserve Gemini's writable files until it returns, and avoid overlapping Codex edits. Existing uncommitted work must survive.
- Collect actual JSON status, usage, changed files, diff and checks. Exit zero and `needs_review` do not constitute acceptance. Codex must inspect the actual diff for scope, requirements, maintainability, imports/dependencies, API compatibility, real backend data, credentials/security and regressions, then run relevant build/tests and useful available visual checks. Verify again after applying a reviewed patch.
- Return one concise defect list for at most one correction cycle. Stop and report unresolved issues, authentication/permission failures, missing models or timeouts; no repeated paid retries. Optimize combined tokens: minimal scoped context, no duplicate solving, no repeated benchmarks. Record actual quality, reliability, time and tokens in ignored run artifacts to improve allocation.
- Preserve existing architecture and working features. Major visual changes need the user's design approval. Never merge into main, push or deploy without explicit user approval. Keep implementation summaries under 150 words when practical.
