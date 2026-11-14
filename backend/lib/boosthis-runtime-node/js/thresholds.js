// @ts-nocheck
/* eslint-disable */
// Built from src/thresholds.ts so plain node can run the kit. Do not edit.
const SCORE_THRESHOLDS = {
  ttff: { good: 300, poor: 800 },
  tti: { good: 500, poor: 1500 },
  fid: { good: 50, poor: 150 }
};
const RUNTIME_VERSION = "1.0.0-alpha.233";
const EDGE_CACHE_THRESHOLDS = { good: 70, poor: 20 };
const RESILIENCE_TAIL_FLOOR_MS = 50;
function rateDuration(durationMs) {
  if (durationMs <= SCORE_THRESHOLDS.tti.good) return "good";
  if (durationMs >= SCORE_THRESHOLDS.tti.poor) return "poor";
  return "needs-work";
}
const RESILIENCE_MIN_TAIL_SAMPLES = 20;
function readResilienceTail(p50Ms, p99Ms, sampleCount) {
  if (sampleCount < RESILIENCE_MIN_TAIL_SAMPLES || p50Ms == null || p99Ms == null || !Number.isFinite(p50Ms) || !Number.isFinite(p99Ms)) {
    return { state: "insufficient" };
  }
  const measurableMedian = p50Ms >= RESILIENCE_MIN_MEDIAN_MS;
  if (p99Ms <= RESILIENCE_TAIL_FLOOR_MS) {
    return { state: "flat", ratio: measurableMedian ? p99Ms / p50Ms : null };
  }
  if (!measurableMedian) return { state: "unmeasurable" };
  return { state: "rated", ratio: p99Ms / p50Ms };
}
const RESILIENCE_MIN_MEDIAN_MS = 1;
export {
  EDGE_CACHE_THRESHOLDS,
  RESILIENCE_MIN_MEDIAN_MS,
  RESILIENCE_MIN_TAIL_SAMPLES,
  RESILIENCE_TAIL_FLOOR_MS,
  RUNTIME_VERSION,
  SCORE_THRESHOLDS,
  rateDuration,
  readResilienceTail
};
