// @ts-nocheck
/* eslint-disable */
// Built from src/settleRule.ts so plain node can run the kit. Do not edit.
const SETTLE_RULE = 1;
const SETTLE_FAMILIES = {
  latencyTail: { settleSec: 60, minSpanSec: 0, skipFirstRequests: 1, minSamples: 20 },
  growthSlope: { settleSec: 600, minSpanSec: 600, skipFirstRequests: 0, minSamples: 3 },
  peakRate: { settleSec: 60, minSpanSec: 300, skipFirstRequests: 0, minSamples: 2 },
  perRequestMemory: { settleSec: 60, minSpanSec: 0, skipFirstRequests: 20, minSamples: 20 },
  startupEvent: { settleSec: 120, minSpanSec: 0, skipFirstRequests: 0, minSamples: 1 }
};
const LOADED_START_MS = Date.now() - Math.round(process.uptime() * 1e3);
let startOverrideMs = null;
function processStartMs() {
  return startOverrideMs ?? LOADED_START_MS;
}
function __setProcessStartForTests(ms) {
  startOverrideMs = ms;
}
function processAgeMs(nowMs = Date.now()) {
  return Math.max(0, nowMs - processStartMs());
}
function settledFromMs(family) {
  return processStartMs() + SETTLE_FAMILIES[family].settleSec * 1e3;
}
function isSettling(family, nowMs = Date.now()) {
  return processAgeMs(nowMs) < SETTLE_FAMILIES[family].settleSec * 1e3;
}
function isSettledAt(family, tMs) {
  return tMs >= settledFromMs(family);
}
function settlingReading(extra) {
  return { ...extra ?? {}, rating: "pending", settleRule: SETTLE_RULE };
}
function markSettled(reading) {
  return Object.assign(reading, { settleRule: SETTLE_RULE });
}
function settledTailValues(samples, family = "latencyTail") {
  const from = settledFromMs(family);
  const skip = SETTLE_FAMILIES[family].skipFirstRequests;
  const seen = /* @__PURE__ */ new Map();
  const ordered = [...samples].sort((a, b) => a.t - b.t);
  const out = [];
  for (const s of ordered) {
    if (!Number.isFinite(s.v)) continue;
    const key = s.key ?? "";
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (n < skip) continue;
    if (s.t < from) continue;
    out.push(s.v);
  }
  return out;
}
function percentileOf(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p / 100 * sorted.length) - 1));
  return sorted[idx];
}
function settledTail(samples, p, family = "latencyTail") {
  const values = settledTailValues(samples, family);
  if (values.length < SETTLE_FAMILIES[family].minSamples) return null;
  const value = percentileOf(values, p);
  return value === null ? null : { value, n: values.length };
}
function settledSpanMs(windowStartMs, nowMs = Date.now(), family = "peakRate") {
  return Math.max(0, nowMs - Math.max(windowStartMs, settledFromMs(family)));
}
function spanJudgeable(spanMs, family = "peakRate") {
  return spanMs >= SETTLE_FAMILIES[family].minSpanSec * 1e3;
}
function settledRatePerMin(eventTimesMs, windowStartMs, nowMs = Date.now(), family = "peakRate") {
  const from = Math.max(windowStartMs, settledFromMs(family));
  const spanMs = Math.max(0, nowMs - from);
  if (!spanJudgeable(spanMs, family)) return null;
  let events = 0;
  for (const t of eventTimesMs) if (t >= from && t <= nowMs) events++;
  return { perMin: events / (spanMs / 6e4), events, spanMs };
}
function settledSlope(points, family = "growthSlope") {
  const from = settledFromMs(family);
  const pts = points.filter((p) => p.t >= from && Number.isFinite(p.v));
  const spec = SETTLE_FAMILIES[family];
  if (pts.length < spec.minSamples) return null;
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const p of pts) {
    if (p.t < tMin) tMin = p.t;
    if (p.t > tMax) tMax = p.t;
  }
  const spanMs = tMax - tMin;
  if (spanMs < spec.minSpanSec * 1e3 || spanMs <= 0) return null;
  const n = pts.length;
  const xs = pts.map((p) => (p.t - tMin) / 6e4);
  const ys = pts.map((p) => p.v);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (sxx <= 0) return null;
  const slope = sxy / sxx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i] - (my + slope * (xs[i] - mx))) ** 2;
  const se = n > 2 ? Math.sqrt(sse / (n - 2) / sxx) : 0;
  return { slopePerMin: slope, slopeStdErr: se, n, spanMs };
}
function persistentGrowthPerMin(fit) {
  return Math.max(0, fit.slopePerMin - 2 * fit.slopeStdErr);
}
export {
  SETTLE_FAMILIES,
  SETTLE_RULE,
  __setProcessStartForTests,
  isSettledAt,
  isSettling,
  markSettled,
  percentileOf,
  persistentGrowthPerMin,
  processAgeMs,
  processStartMs,
  settledFromMs,
  settledRatePerMin,
  settledSlope,
  settledSpanMs,
  settledTail,
  settledTailValues,
  settlingReading,
  spanJudgeable
};
