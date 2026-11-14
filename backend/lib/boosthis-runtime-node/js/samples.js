// @ts-nocheck
/* eslint-disable */
// Built from src/samples.ts so plain node can run the kit. Do not edit.
import { settledFromMs } from "./settleRule.js";
import { isKitLocked } from "./killSwitch.js";
const MAX_SAMPLES = 1e3;
let buffer = [];
let observer = null;
function setSampleObserver(fn) {
  observer = fn;
}
const ROUTE_HEAD_SAMPLES = 25;
const MAX_TRACKED_ROUTES = 128;
let routeHeads = /* @__PURE__ */ new Map();
let routesDropped = 0;
function noteArrival(s) {
  const settledNow = s.timestamp_ms >= settledFromMs("latencyTail");
  const existing = routeHeads.get(s.name);
  if (existing) {
    existing.total++;
    existing.lastSeenMs = s.timestamp_ms;
    if (settledNow && existing.head.length < ROUTE_HEAD_SAMPLES) existing.head.push(s);
    return;
  }
  if (routeHeads.size >= MAX_TRACKED_ROUTES) {
    let oldestName = null;
    let oldestSeen = Infinity;
    for (const [name, rec] of routeHeads) {
      if (rec.lastSeenMs < oldestSeen) {
        oldestSeen = rec.lastSeenMs;
        oldestName = name;
      }
    }
    if (oldestName === null) return;
    routeHeads.delete(oldestName);
    routesDropped++;
  }
  routeHeads.set(s.name, { total: 1, head: settledNow ? [s] : [], lastSeenMs: s.timestamp_ms });
}
function routeHead(name) {
  return routeHeads.get(name) ?? null;
}
function trackedRoutes() {
  return [...routeHeads.keys()];
}
function droppedRouteCount() {
  return routesDropped;
}
function record(name, durationMs, rating) {
  return recordSample(name, durationMs, rating, null);
}
const doorWords = /* @__PURE__ */ new WeakMap();
function recordWithDoor(name, durationMs, rating, door) {
  return recordSample(name, durationMs, rating, door);
}
function doorWordOf(s) {
  return doorWords.get(s) ?? null;
}
function recordSample(name, durationMs, rating, door) {
  const s = {
    name,
    duration_ms: Math.round(durationMs),
    rating,
    timestamp_ms: Date.now()
  };
  if (isKitLocked()) return s;
  if (door !== null) doorWords.set(s, door);
  noteRouteFirst(s);
  buffer.push(s);
  if (buffer.length > MAX_SAMPLES) buffer.shift();
  noteArrival(s);
  if (observer) {
    try {
      observer(s);
    } catch {
    }
  }
  return s;
}
function recent(opts = {}) {
  const { limit = 100, name } = opts;
  const snap = buffer.slice();
  const out = [];
  for (let i = snap.length - 1; i >= 0 && out.length < limit; i--) {
    const s = snap[i];
    if (name && s.name !== name) continue;
    out.push(s);
  }
  return out;
}
function pct(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}
const ORDER = { good: 0, "needs-work": 1, poor: 2 };
const MAX_FIRST_TRACKED = 1e4;
const seenRoutes = /* @__PURE__ */ new Set();
const firstOfRoute = /* @__PURE__ */ new WeakSet();
function noteRouteFirst(s) {
  if (seenRoutes.has(s.name)) return;
  if (seenRoutes.size < MAX_FIRST_TRACKED) seenRoutes.add(s.name);
  firstOfRoute.add(s);
}
function isRouteFirst(s) {
  return firstOfRoute.has(s);
}
function settledSamples() {
  const from = settledFromMs("latencyTail");
  return buffer.filter((s) => s.timestamp_ms >= from && !firstOfRoute.has(s));
}
function settledSummary() {
  return summarize(settledSamples());
}
function summary() {
  return summarize(buffer.slice());
}
function summarize(snap) {
  if (snap.length === 0) {
    return {
      total: 0,
      good: 0,
      needsWork: 0,
      poor: 0,
      p50_ms: null,
      p75_ms: null,
      p95_ms: null,
      p99_ms: null,
      byRoute: {}
    };
  }
  const durations = snap.map((s) => s.duration_ms).sort((a, b) => a - b);
  let good = 0, needsWork = 0, poor = 0;
  const byRoute = {};
  for (const s of snap) {
    if (s.rating === "good") good++;
    else if (s.rating === "needs-work") needsWork++;
    else poor++;
    const r = byRoute[s.name] ?? { count: 0, max_ms: 0, worst_rating: "good" };
    r.count++;
    if (s.duration_ms > r.max_ms) r.max_ms = s.duration_ms;
    if (ORDER[s.rating] > ORDER[r.worst_rating]) r.worst_rating = s.rating;
    byRoute[s.name] = r;
  }
  return {
    total: snap.length,
    good,
    needsWork,
    poor,
    p50_ms: pct(durations, 0.5),
    p75_ms: pct(durations, 0.75),
    p95_ms: pct(durations, 0.95),
    p99_ms: pct(durations, 0.99),
    byRoute
  };
}
let generation = 0;
function epoch() {
  return generation;
}
function clear() {
  seenRoutes.clear();
  buffer = [];
  routeHeads = /* @__PURE__ */ new Map();
  routesDropped = 0;
  generation++;
}
const CIRCUIT_LOOP_MIN_HITS = 8;
const CIRCUIT_LOOP_WINDOW_MS = 3e4;
const CIRCUIT_LOOP_MAX_MEDIAN_GAP_MS = 2e3;
const CIRCUIT_BURST_WINDOW_MS = 1e3;
const CIRCUIT_BURST_MIN = 6;
const CIRCUIT_MAX_LOOP_SUSPECTS = 5;
function medianOf(sorted) {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}
function circuitSummary() {
  const snap = buffer.slice();
  const out = {
    loop_suspects: [],
    burst_max_1s: 0,
    burst_route_count: 0,
    related_rules: []
  };
  if (snap.length === 0) return out;
  const byRoute = /* @__PURE__ */ new Map();
  for (const s of snap) {
    const arr = byRoute.get(s.name);
    if (arr) arr.push(s.timestamp_ms);
    else byRoute.set(s.name, [s.timestamp_ms]);
  }
  for (const [route, tsRaw] of byRoute) {
    const ts = tsRaw.slice().sort((a, b) => a - b);
    if (ts.length < CIRCUIT_LOOP_MIN_HITS) continue;
    let bestStart = 0;
    let bestCount = 0;
    let lo = 0;
    for (let hi = 0; hi < ts.length; hi++) {
      while (ts[hi] - ts[lo] > CIRCUIT_LOOP_WINDOW_MS) lo++;
      const count = hi - lo + 1;
      if (count > bestCount) {
        bestCount = count;
        bestStart = lo;
      }
    }
    if (bestCount < CIRCUIT_LOOP_MIN_HITS) continue;
    const windowTs = ts.slice(bestStart, bestStart + bestCount);
    const gaps = [];
    for (let i = 1; i < windowTs.length; i++) gaps.push(windowTs[i] - windowTs[i - 1]);
    gaps.sort((a, b) => a - b);
    const medianGap = medianOf(gaps);
    if (medianGap > CIRCUIT_LOOP_MAX_MEDIAN_GAP_MS) continue;
    out.loop_suspects.push({
      route,
      hits: bestCount,
      window_s: Math.max(1, Math.round((windowTs[windowTs.length - 1] - windowTs[0]) / 1e3)),
      median_gap_ms: medianGap
    });
  }
  out.loop_suspects.sort((a, b) => b.hits - a.hits);
  if (out.loop_suspects.length > CIRCUIT_MAX_LOOP_SUSPECTS) {
    out.loop_suspects.length = CIRCUIT_MAX_LOOP_SUSPECTS;
  }
  const allTs = snap.map((s) => ({ ts: s.timestamp_ms, route: s.name })).sort((a, b) => a.ts - b.ts);
  let burstMax = 0;
  let burstLo = 0;
  let burstHiIdx = 0;
  let lo2 = 0;
  for (let hi = 0; hi < allTs.length; hi++) {
    while (allTs[hi].ts - allTs[lo2].ts > CIRCUIT_BURST_WINDOW_MS) lo2++;
    const count = hi - lo2 + 1;
    if (count > burstMax) {
      burstMax = count;
      burstLo = lo2;
      burstHiIdx = hi;
    }
  }
  out.burst_max_1s = burstMax;
  if (burstMax > 0) {
    const routes = /* @__PURE__ */ new Set();
    for (let i = burstLo; i <= burstHiIdx; i++) routes.add(allTs[i].route);
    out.burst_route_count = routes.size;
  }
  if (out.loop_suspects.length > 0) out.related_rules.push("node-retry-redirect-loop");
  if (out.burst_max_1s >= CIRCUIT_BURST_MIN) out.related_rules.push("node-fanout-overload");
  return out;
}
export {
  MAX_TRACKED_ROUTES,
  ROUTE_HEAD_SAMPLES,
  circuitSummary,
  clear,
  doorWordOf,
  droppedRouteCount,
  epoch,
  isRouteFirst,
  recent,
  record,
  recordWithDoor,
  routeHead,
  setSampleObserver,
  settledSamples,
  settledSummary,
  summary,
  trackedRoutes
};
