# Gemini delegation implementation plan

Goal: Codex delegates focused NIPRAS tasks to exactly Gemini 4 Argon through agy, then reviews the actual changes.

Architecture: a Python standard-library runner creates detached Git worktrees, overlays only explicit current task/context files, captures JSON results and usage, and produces a patch without applying it. AGENTS.md persists ownership and approval rules.

Constraints: medium by default; high requires a reason; no fallback models, permission bypass, automatic retries, feature changes, merge, push, or deployment. Existing dirty work must be preserved.

- [x] Verify installed CLI, model catalog, authentication, and a real headless response before implementation.
- [x] Test failure handling, scope enforcement, dirty-file isolation, patch generation, and failed checks in disposable repositories.
- [x] Implement scripts/delegate_gemini.py and a small task configuration and context file.
- [x] Run a real read-only delegation through the runner; independently check its answer and unchanged features.
- [x] Review runner and tests: 12 offline tests passed; independent review findings corrected and rechecked.
- [ ] Graph refresh: `graphify update .` launched; full extraction completed, relationship resolution still running at handover.

Live evidence: Antigravity CLI 1.5.6, authenticated `gemini-4-argon-medium`; direct connectivity and isolated read-only manifest delegation succeeded. Codex verified all three returned facts and an empty patch. Gemini reported 22,176 total_tokens across those two calls (cache_read_tokens separately reported: 9,139); Codex token usage is not available here. No production features, merges, pushes or deployments were changed during setup.

Review focus: timeouts must terminate child processes; exit zero alone must not pass; unexpected/staged changes must be visible; current dirty context must reach the worktree; failed checks or changed source during a run must block application. Runtime artifacts stay ignored, with no credentials copied into prompts or project configuration.

Ruling: implement the small runner in the current checkout, touching only new orchestration files and appended rules; delegated tasks always use isolated worktrees. No commits are needed for setup and no user changes are staged in the main checkout.
