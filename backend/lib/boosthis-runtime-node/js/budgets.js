// @ts-nocheck
/* eslint-disable */
// Built from src/budgets.ts so plain node can run the kit. Do not edit.
import * as samples from "./samples.js";
const BUDGET_WARMUP_N = 5;
const BUDGET_BASELINE_N = 20;
const BUDGET_RECENT_N = 20;
const REGRESSION_FACTOR = 1.5;
const IMPROVEMENT_FACTOR = 0.66;
const BUDGET_REGRESSION_FLOOR_MS = 100;
const BUDGET_SAMPLES_FOR_VERDICT = BUDGET_WARMUP_N + BUDGET_BASELINE_N + BUDGET_RECENT_N;
const BUDGET_RING_LIMIT = 1e3;
const BASELINE_N = BUDGET_BASELINE_N;
const RECENT_N = BUDGET_RECENT_N;
const BUDGET_ALGORITHM = "device-ring-frozen-baseline";
const JUDGED_STATES = /* @__PURE__ */ new Set([
  "stable",
  "regressed",
  "improved"
]);
function isJudgedBudget(b) {
  return JUDGED_STATES.has(b.state);
}
function percentile(values, p) {
  if (values.length === 0) return 0;
  const s = values.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}
function baselineFor(name) {
  const rec = samples.routeHead(name);
  if (!rec) return null;
  if (rec.head.length < BUDGET_WARMUP_N + BUDGET_BASELINE_N) return null;
  const slice = rec.head.slice(
    BUDGET_WARMUP_N,
    BUDGET_WARMUP_N + BUDGET_BASELINE_N
  );
  return {
    p95Ms: percentile(
      slice.map((s) => s.duration_ms),
      0.95
    ),
    samples: slice.length,
    fromMs: slice[0].timestamp_ms,
    toMs: slice[slice.length - 1].timestamp_ms,
    warmupExcluded: BUDGET_WARMUP_N
  };
}
function windowOf(slice, p95) {
  return {
    samples: slice.length,
    from_ms: slice[0].timestamp_ms,
    to_ms: slice[slice.length - 1].timestamp_ms,
    p95_ms: p95
  };
}
const LEARNING_NO_BASELINE = `Still learning — a baseline needs ${BUDGET_WARMUP_N} warm-up samples of this route followed by ${BUDGET_BASELINE_N} more, and a verdict needs ${BUDGET_RECENT_N} taken after that baseline closes (${BUDGET_SAMPLES_FOR_VERDICT} in the ring at once). More traffic on this route is all it takes.`;
const LEARNING_AWAITING_RECENT = `Baseline frozen and closed; still learning — a verdict needs ${BUDGET_RECENT_N} samples taken strictly after it, so the two windows share none. More traffic on this route is all it takes.`;
const EVICTED = `Not judged — this route's samples were dropped from the ${BUDGET_RING_LIMIT}-sample ring, shared by every route, before a verdict could be drawn. It is judged again once ${BUDGET_SAMPLES_FOR_VERDICT} of its samples sit in the ring at once: a larger share of this app's traffic, or a quieter app.`;
function judgedExplanation(base, recent) {
  return `Baseline p95 ${base.p95Ms}ms from ${base.samples} samples, against ${recent.p95_ms}ms from ${recent.samples} taken strictly after that baseline closed — the two windows share no sample. The route's first ${base.warmupExcluded} samples are warm-up and are not in the baseline. Regression at ${REGRESSION_FACTOR}× the baseline once the recent p95 is ${BUDGET_REGRESSION_FLOOR_MS}ms or more, improvement at ${IMPROVEMENT_FACTOR}×. Both windows are settled samples: nothing from the process's first minute.`;
}
function statusFor(name) {
  const history = samples.recent({ limit: BUDGET_RING_LIMIT, name });
  const ordered = history.slice().reverse();
  const base = baselineFor(name);
  const arrived = samples.routeHead(name)?.total ?? 0;
  const lostHistory = arrived > history.length;
  if (!base) {
    return {
      route: name,
      state: lostHistory ? "evicted" : "learning",
      algorithm: BUDGET_ALGORITHM,
      explanation: lostHistory ? EVICTED : LEARNING_NO_BASELINE,
      samples_seen: history.length,
      samples_needed: BUDGET_SAMPLES_FOR_VERDICT,
      warmup_excluded: BUDGET_WARMUP_N
    };
  }
  const after = ordered.filter((s) => s.timestamp_ms > base.toMs);
  if (after.length < BUDGET_RECENT_N) {
    return {
      route: name,
      state: lostHistory ? "evicted" : "learning",
      algorithm: BUDGET_ALGORITHM,
      explanation: lostHistory ? EVICTED : LEARNING_AWAITING_RECENT,
      baseline_p95_ms: base.p95Ms,
      baseline_window: {
        samples: base.samples,
        from_ms: base.fromMs,
        to_ms: base.toMs,
        p95_ms: base.p95Ms
      },
      samples_seen: history.length,
      samples_needed: BUDGET_SAMPLES_FOR_VERDICT,
      warmup_excluded: base.warmupExcluded
    };
  }
  const recentSlice = after.slice(-BUDGET_RECENT_N);
  const recentP95 = percentile(
    recentSlice.map((s) => s.duration_ms),
    0.95
  );
  const recentWindow = windowOf(recentSlice, recentP95);
  const baselineP95 = base.p95Ms;
  let state = "stable";
  if (baselineP95 === 0) state = "stable";
  else if (recentP95 >= baselineP95 * REGRESSION_FACTOR && recentP95 >= BUDGET_REGRESSION_FLOOR_MS)
    state = "regressed";
  else if (recentP95 <= baselineP95 * IMPROVEMENT_FACTOR) state = "improved";
  return {
    route: name,
    state,
    algorithm: BUDGET_ALGORITHM,
    explanation: judgedExplanation(base, recentWindow),
    baseline_p95_ms: baselineP95,
    recent_p95_ms: recentP95,
    baseline_window: {
      samples: base.samples,
      from_ms: base.fromMs,
      to_ms: base.toMs,
      p95_ms: baselineP95
    },
    recent_window: recentWindow,
    samples_seen: history.length,
    warmup_excluded: base.warmupExcluded
  };
}
function allStatuses() {
  const seen = new Set(samples.trackedRoutes());
  for (const s of samples.recent({ limit: BUDGET_RING_LIMIT })) seen.add(s.name);
  return [...seen].sort().map(statusFor);
}
function regressions() {
  return allStatuses().filter((b) => b.state === "regressed");
}
function resetBaselines() {
  samples.clear();
}
export {
  BASELINE_N,
  BUDGET_ALGORITHM,
  BUDGET_BASELINE_N,
  BUDGET_RECENT_N,
  BUDGET_REGRESSION_FLOOR_MS,
  BUDGET_RING_LIMIT,
  BUDGET_SAMPLES_FOR_VERDICT,
  BUDGET_WARMUP_N,
  IMPROVEMENT_FACTOR,
  RECENT_N,
  REGRESSION_FACTOR,
  allStatuses,
  isJudgedBudget,
  regressions,
  resetBaselines,
  statusFor
};
