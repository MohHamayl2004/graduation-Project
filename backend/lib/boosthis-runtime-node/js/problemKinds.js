// @ts-nocheck
/* eslint-disable */
// Built from src/problemKinds.ts so plain node can run the kit. Do not edit.
const PROBLEM_KINDS = [
  "ai-cache-cold",
  "ai-duplicate-prompt",
  "ai-no-timeout",
  "ai-retry-no-backoff",
  "ai-serial-calls",
  "ai-stream-usage-missing",
  "api-thundering-herd",
  "budget-regression",
  "cache-headers-missing",
  "cache-never-store",
  "cache-no-revalidator",
  "connection-leak",
  "connection-stalled",
  "eager-list-mount",
  "failing-api",
  "ghost-mount",
  "idle-burn",
  "post-commit-effect-storm",
  "rage-tap",
  "reconnect-per-screen",
  "reconnect-storm",
  "regression",
  "remount-storm-global",
  "render-monolith",
  "render-storm",
  "retry-storm",
  "slow-api",
  "slow-nav",
  "slow-press-handler",
  "slow-route",
  "stranded-interval"
];
const KNOWN = new Set(PROBLEM_KINDS);
function isProblemKind(kind) {
  return KNOWN.has(kind);
}
const PROBLEM_KIND_FOLD = {
  "slow-route": "slow-api",
  "budget-regression": "regression"
};
export {
  PROBLEM_KINDS,
  PROBLEM_KIND_FOLD,
  isProblemKind
};
