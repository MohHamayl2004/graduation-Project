// @ts-nocheck
/* eslint-disable */
// Built from src/extraMeters.ts so plain node can run the kit. Do not edit.
import { createHook } from "node:async_hooks";
import cluster from "node:cluster";
import { url as inspectorUrl } from "node:inspector";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { getHeldOpenStats } from "./heldOpen.js";
import { createHash, randomBytes } from "node:crypto";
import { EMAIL_RE } from "./no-pii.js";
import { linearScore, ratingFor } from "./healthAxes.js";
import { SCORE_THRESHOLDS } from "./thresholds.js";
import { REASON_NOTHING_TO_COMPARE, REASON_PLATFORM_DOES_NOT_EXPOSE } from "./axisReasons.js";
import {
  SETTLE_FAMILIES,
  isSettling,
  markSettled,
  settledFromMs,
  settlingReading,
  spanJudgeable
} from "./settleRule.js";
import {
  MIN_RATE_WINDOW_MIN,
  MIN_RATE_WINDOW_MS,
  earnedPerHour,
  overWords,
  windowMinOf,
  windowPhrase
} from "./rateHonesty.js";
import {
  startLiveConnections,
  readLiveConnections,
  clearLiveConnections
} from "./liveConnections.js";
import {
  startProcessMeters,
  readProcessMeters,
  clearProcessMeters,
  sampleProcessMeters
} from "./processMeters.js";
import { clearHostResourceMeters, readHostResourceMeters } from "./hostResourceMeters.js";
import {
  clearRuntimeSafetyMeters,
  readTimerHealth,
  readUnhandledErrors,
  startRuntimeSafetyMeters
} from "./runtimeSafetyMeters.js";
const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;
let started = false;
let startedAt = 0;
const CHURN_GOOD_PER_MIN = 300;
const CHURN_POOR_PER_MIN = 3e3;
const CHURN_WINDOW_MS = 5 * 6e4;
const MIN_CHURN_ELAPSED_MS = 6e4;
const CHURN_BUCKET_MS = 1e4;
const CHURN_BUCKET_CAP = Math.ceil(CHURN_WINDOW_MS / CHURN_BUCKET_MS) + 1;
const HANDLE_TYPES = /* @__PURE__ */ new Set([
  "TCPWRAP",
  "TCPSERVERWRAP",
  "PIPEWRAP",
  "PIPESERVERWRAP",
  "UDPWRAP",
  "TTYWRAP",
  "Timeout",
  "Immediate",
  "FSEVENTWRAP",
  "SIGNALWRAP",
  "PROCESSWRAP",
  "ZLIB",
  "HTTPCLIENTREQUEST",
  "HTTPINCOMINGMESSAGE"
]);
const churnBuckets = [];
let churnHook = null;
function bumpChurn(now) {
  const bucketT = Math.floor(now / CHURN_BUCKET_MS) * CHURN_BUCKET_MS;
  const last = churnBuckets[churnBuckets.length - 1];
  if (last && last.t === bucketT) {
    last.count++;
    return;
  }
  churnBuckets.push({ t: bucketT, count: 1 });
  if (churnBuckets.length > CHURN_BUCKET_CAP) churnBuckets.shift();
}
function startHandleChurn() {
  if (churnHook) return;
  try {
    const hook = createHook({
      init(_id, type) {
        try {
          if (HANDLE_TYPES.has(type)) bumpChurn(Date.now());
        } catch {
        }
      }
    });
    hook.enable();
    churnHook = hook;
  } catch {
    churnHook = null;
  }
}
function readHandleChurn() {
  if (isBoosthisDisabled() || !started || !churnHook) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) return settlingReading({ score: null });
    const from = Math.max(now - CHURN_WINDOW_MS, settledFromMs("peakRate"), startedAt);
    const windowMs = now - from;
    if (!spanJudgeable(windowMs, "peakRate")) return null;
    let created = 0;
    for (const b of churnBuckets) if (b.t >= from) created += b.count;
    const createdPerMin = r1(created / Math.max(windowMs / 6e4, 1 / 60));
    const score = linearScore(createdPerMin, CHURN_GOOD_PER_MIN, CHURN_POOR_PER_MIN);
    return markSettled({
      score,
      rating: ratingFor(score),
      createdPerMin,
      sampleCount: created,
      windowMin: windowMinOf(windowMs),
      caption: `${createdPerMin} handles created/min`
    });
  } catch {
    return null;
  }
}
const REJECT_RATE_GOOD = 1;
const REJECT_RATE_POOR = 30;
const REJECT_MIN_WINDOW_MIN = MIN_RATE_WINDOW_MIN;
let lateHandledCount = 0;
let unhandledWarningCount = 0;
let rejectionHandledListener = null;
let rejectionSettlingCount = 0;
function noteStrayRejection(kind) {
  if (isSettling("peakRate")) {
    rejectionSettlingCount++;
    return;
  }
  if (kind === "late") lateHandledCount++;
  else unhandledWarningCount++;
}
let warningListener = null;
function startRejectionPressure() {
  if (rejectionHandledListener) return;
  try {
    rejectionHandledListener = () => {
      noteStrayRejection("late");
    };
    process.on("rejectionHandled", rejectionHandledListener);
    warningListener = (w) => {
      try {
        const name = String(w?.name ?? "");
        if (name.startsWith("UnhandledPromiseRejection")) noteStrayRejection("unhandled");
      } catch {
      }
    };
    process.on("warning", warningListener);
  } catch {
    rejectionHandledListener = null;
    warningListener = null;
  }
}
function readRejectionPressure() {
  if (isBoosthisDisabled() || !started || !rejectionHandledListener) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) {
      return rejectionSettlingCount > 0 ? settlingReading({ score: null }) : null;
    }
    const windowMs = now - Math.max(startedAt, settledFromMs("peakRate"));
    const windowMin = windowMinOf(windowMs);
    const total = lateHandledCount + unhandledWarningCount;
    const perHour = earnedPerHour(total, windowMs);
    if (perHour === null) {
      if (total === 0) return null;
      return {
        score: null,
        rating: "pending",
        lateHandled: lateHandledCount,
        unhandled: unhandledWarningCount,
        perHour: null,
        windowMin,
        settleRule: 1,
        caption: `${total} stray rejection${total === 1 ? "" : "s"} · ${windowPhrase(windowMin, "observed so far")}`
      };
    }
    const score = linearScore(perHour, REJECT_RATE_GOOD, REJECT_RATE_POOR);
    return markSettled({
      score,
      rating: ratingFor(score),
      lateHandled: lateHandledCount,
      unhandled: unhandledWarningCount,
      perHour,
      windowMin,
      caption: total === 0 ? `no stray rejections · ${windowPhrase(windowMin)}` : `${total} stray rejection${total === 1 ? "" : "s"} · ${perHour}/hour over ${overWords(windowMin)}`
    });
  } catch {
    return null;
  }
}
function readPromiseRejections() {
  const windowMs = Math.max(0, Date.now() - startedAt);
  const perHour = earnedPerHour(unhandledWarningCount, windowMs);
  if (perHour === null) {
    return {
      score: null,
      rating: "pending",
      count: unhandledWarningCount === 0 ? null : unhandledWarningCount,
      windowMin: windowMinOf(windowMs),
      perHour: null
    };
  }
  const score = linearScore(perHour, 0, 5);
  return {
    score,
    rating: ratingFor(score),
    count: unhandledWarningCount,
    windowMin: windowMinOf(windowMs),
    perHour
  };
}
const BP_PCT_GOOD = 1;
const BP_PCT_POOR = 20;
const MIN_BP_RESPONSES = 50;
let bpTotal = 0;
let bpBackpressured = 0;
const BP_HELD_FLOOR_MS = 100;
const BP_BUCKET_MS = 6e4;
const BP_WINDOW_MS = 10 * 6e4;
const bpBuckets = [];
let bpSettling = 0;
function addBpBucket(now, total, held) {
  const t = Math.floor(now / BP_BUCKET_MS) * BP_BUCKET_MS;
  const last = bpBuckets[bpBuckets.length - 1];
  if (last && last.t === t) {
    last.total += total;
    last.held += held;
  } else {
    bpBuckets.push({ t, total, held });
    if (bpBuckets.length > BP_WINDOW_MS / BP_BUCKET_MS + 1) bpBuckets.shift();
  }
}
function noteResponseBackpressure(sawBackpressure, durationMs = 0) {
  if (isBoosthisDisabled() || !started) return;
  const now = Date.now();
  const dur = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
  if (now - dur < settledFromMs("peakRate")) {
    bpSettling++;
  } else {
    const held = sawBackpressure && dur >= BP_HELD_FLOOR_MS ? 1 : 0;
    bpTotal++;
    bpBackpressured += held;
    addBpBucket(now, 1, held);
  }
  try {
    sampleProcessMeters();
  } catch {
  }
}
function readBackpressure() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) return bpSettling > 0 ? settlingReading({ score: null }) : null;
    const from = Math.max(now - BP_WINDOW_MS, settledFromMs("peakRate"), startedAt);
    if (!spanJudgeable(now - from, "peakRate")) return null;
    let total = 0;
    let held = 0;
    for (const b of bpBuckets) {
      if (b.t + BP_BUCKET_MS <= from) continue;
      total += b.total;
      held += b.held;
    }
    if (total < MIN_BP_RESPONSES) return null;
    const backpressuredPct = r1(100 * held / total);
    const score = linearScore(backpressuredPct, BP_PCT_GOOD, BP_PCT_POOR);
    return markSettled({
      score,
      rating: ratingFor(score),
      backpressuredPct,
      backpressuredCount: held,
      total,
      caption: `${backpressuredPct}% of responses waited ${BP_HELD_FLOOR_MS} ms or more on a full write buffer`
    });
  } catch {
    return null;
  }
}
const IMBALANCE_GOOD_RATIO = 1.5;
const IMBALANCE_POOR_RATIO = 3;
const MIN_IMBALANCE_REQUESTS = 50;
const MIN_IMBALANCE_WORKERS = 2;
const WORKER_SEND_THROTTLE_MS = 15e3;
const IMBALANCE_WINDOW_MS = 10 * 6e4;
const WORKER_MSG_KEY = "__boosthis";
const WORKER_MSG_KIND = "reqCount";
let workerPendingCount = 0;
let workerLastSentAt = 0;
const workerCounts = /* @__PURE__ */ new Map();
const workerBornAt = /* @__PURE__ */ new Map();
let clusterListener = null;
let clusterOnlineListener = null;
let clusterExitListener = null;
function workerIdOf(worker) {
  const id = worker?.id;
  return typeof id === "number" ? id : null;
}
function noteWorkerOnline(id, at) {
  if (!workerBornAt.has(id)) workerBornAt.set(id, at);
  if (!workerCounts.has(id)) workerCounts.set(id, []);
}
function noteWorkerExit(id) {
  workerBornAt.delete(id);
  workerCounts.delete(id);
}
function noteWorkerBatch(id, n, at) {
  if (!workerBornAt.has(id)) workerBornAt.set(id, at);
  let ring = workerCounts.get(id);
  if (!ring) {
    ring = [];
    workerCounts.set(id, ring);
  }
  ring.push({ t: at, n: Math.min(n, 1e6) });
  if (ring.length > 512) ring.shift();
}
let isClusterPrimary = false;
let isClusterWorker = false;
function startWorkerBalance() {
  try {
    isClusterPrimary = cluster.isPrimary === true;
    isClusterWorker = cluster.isWorker === true;
    if (isClusterPrimary && !clusterListener) {
      clusterListener = (worker, msg) => {
        try {
          const m = msg;
          if (!m || m[WORKER_MSG_KEY] !== WORKER_MSG_KIND) return;
          const n = m.n;
          if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return;
          const id = workerIdOf(worker);
          if (id === null) return;
          noteWorkerBatch(id, n, Date.now());
        } catch {
        }
      };
      cluster.on("message", clusterListener);
      clusterOnlineListener = (worker) => {
        try {
          const id = workerIdOf(worker);
          if (id !== null) noteWorkerOnline(id, Date.now());
        } catch {
        }
      };
      clusterExitListener = (worker) => {
        try {
          const id = workerIdOf(worker);
          if (id !== null) noteWorkerExit(id);
        } catch {
        }
      };
      cluster.on("online", clusterOnlineListener);
      cluster.on("exit", clusterExitListener);
    }
  } catch {
  }
}
function noteWorkerRequest() {
  if (isBoosthisDisabled() || !started || !isClusterWorker) return;
  try {
    workerPendingCount++;
    const now = Date.now();
    if (now - workerLastSentAt < WORKER_SEND_THROTTLE_MS) return;
    if (typeof process.send !== "function") return;
    const n = workerPendingCount;
    workerPendingCount = 0;
    workerLastSentAt = now;
    process.send({ [WORKER_MSG_KEY]: WORKER_MSG_KIND, n });
  } catch {
  }
}
function readWorkerImbalance() {
  if (isBoosthisDisabled() || !started || !isClusterPrimary) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) return workerCounts.size > 0 ? settlingReading({ score: null }) : null;
    const settleMs = SETTLE_FAMILIES.peakRate.settleSec * 1e3;
    const windowStart = Math.max(now - IMBALANCE_WINDOW_MS, settledFromMs("peakRate"), startedAt);
    if (!spanJudgeable(now - windowStart, "peakRate")) return null;
    const rates = [];
    let total = 0;
    for (const [id, ring] of workerCounts) {
      const born = workerBornAt.get(id) ?? windowStart;
      const from = Math.max(windowStart, born + settleMs);
      const lifeMs = now - from;
      if (lifeMs < settleMs) continue;
      let sum = 0;
      for (const c of ring) if (c.t >= from) sum += c.n;
      rates.push(sum / (lifeMs / 6e4));
      total += sum;
    }
    if (rates.length < MIN_IMBALANCE_WORKERS) return null;
    if (total < MIN_IMBALANCE_REQUESTS) return null;
    const rateSum = rates.reduce((a, b) => a + b, 0);
    if (rateSum <= 0) return null;
    const maxShare = Math.max(...rates) / rateSum;
    const ratio = maxShare * rates.length;
    const score = linearScore(ratio, IMBALANCE_GOOD_RATIO, IMBALANCE_POOR_RATIO);
    const maxSharePct = r1(100 * maxShare);
    return markSettled({
      score,
      rating: ratingFor(score),
      workers: rates.length,
      maxSharePct,
      total,
      caption: `busiest of ${rates.length} workers took ${maxSharePct}% of requests per minute of life`
    });
  } catch {
    return null;
  }
}
const DEFLECTION_SCORE_GOOD_RATIO = 1.2;
const DEFLECTION_SCORE_POOR_RATIO = 4;
const DEFLECTION_RATIO_GOOD = 1.5;
const DEFLECTION_RATIO_POOR = 3;
const DEFLECTION_MIN_SAMPLES = 20;
const DEFLECTION_MIN_BUCKET_SAMPLES = 20;
const DEFLECTION_BUSY_FLOOR_MS = 100;
let deflectionSettling = 0;
const DEFLECTION_MIN_PEAK = 2;
const DEFLECTION_BUCKET_CAP = 512;
const DEFLECTION_MIN_LOADED = 10;
const DEFLECTION_MAX_MS = 12e4;
const DEFLECTION_POOR_LATENCY_MS = SCORE_THRESHOLDS.tti.poor;
const DEFLECTION_BUCKETS = [
  { floor: 1, max: 1 },
  { floor: 2, max: 2 },
  { floor: 3, max: 4 },
  { floor: 5, max: 8 },
  { floor: 9, max: 16 },
  { floor: 17, max: Infinity }
];
let deflectionInFlight = 0;
let deflectionPeak = 0;
let deflectionInFlightSum = 0;
let deflectionSamples = 0;
const deflectionDurations = DEFLECTION_BUCKETS.map(() => []);
let deflectionSoloCount = 0;
let deflectionSoloTotalMs = 0;
let deflectionLoadedCount = 0;
let deflectionSumX = 0;
let deflectionSumY = 0;
let deflectionSumXY = 0;
let deflectionSumX2 = 0;
function deflectionBucketIndex(inFlight) {
  for (let i = 0; i < DEFLECTION_BUCKETS.length; i++) {
    if (inFlight <= DEFLECTION_BUCKETS[i].max) return i;
  }
  return DEFLECTION_BUCKETS.length - 1;
}
const DEFLECTION_NOT_COUNTED = 0;
function noteDeflectionStart() {
  if (isBoosthisDisabled() || !started) return DEFLECTION_NOT_COUNTED;
  deflectionInFlight++;
  if (deflectionInFlight > deflectionPeak) deflectionPeak = deflectionInFlight;
  return deflectionInFlight;
}
function noteDeflectionEnd(startInFlight, durationMs, heldOpen = false) {
  if (startInFlight === DEFLECTION_NOT_COUNTED) return;
  if (deflectionInFlight > 0) deflectionInFlight--;
  try {
    if (isBoosthisDisabled() || !started) return;
    if (heldOpen) return;
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    if (!Number.isFinite(startInFlight) || startInFlight < 1) return;
    if (Date.now() - durationMs < settledFromMs("latencyTail")) {
      deflectionSettling++;
      return;
    }
    const ring = deflectionDurations[deflectionBucketIndex(startInFlight)];
    ring.push(durationMs);
    if (ring.length > DEFLECTION_BUCKET_CAP) ring.shift();
    deflectionInFlightSum += startInFlight;
    deflectionSamples++;
    const y = Math.min(DEFLECTION_MAX_MS, Math.max(0, durationMs));
    const x = startInFlight;
    if (x === 1) {
      deflectionSoloCount++;
      deflectionSoloTotalMs += y;
    } else if (x >= 2) {
      deflectionLoadedCount++;
    }
    deflectionSumX += x;
    deflectionSumY += y;
    deflectionSumXY += x * y;
    deflectionSumX2 += x * x;
  } catch {
  }
}
function deflectionP75(values) {
  const s = values.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.ceil(0.75 * s.length) - 1));
  return s[idx];
}
function readLoadDeflection() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (isSettling("latencyTail")) {
      return deflectionSettling > 0 || deflectionSamples > 0 ? settlingReading({ score: null }) : null;
    }
    if (deflectionSamples < DEFLECTION_MIN_SAMPLES) return null;
    if (deflectionPeak < DEFLECTION_MIN_PEAK) return null;
    let lowIdx = -1;
    let highIdx = -1;
    for (let i = 0; i < DEFLECTION_BUCKETS.length; i++) {
      if (deflectionDurations[i].length >= DEFLECTION_MIN_BUCKET_SAMPLES) {
        if (lowIdx < 0) lowIdx = i;
        highIdx = i;
      }
    }
    if (lowIdx < 0 || highIdx < 0 || lowIdx === highIdx) return null;
    const lowMs = r0(deflectionP75(deflectionDurations[lowIdx]));
    const highMs = r0(deflectionP75(deflectionDurations[highIdx]));
    if (lowMs <= 0) return null;
    const ratio = Math.round(highMs / lowMs * 100) / 100;
    let score = linearScore(
      ratio,
      DEFLECTION_SCORE_GOOD_RATIO,
      DEFLECTION_SCORE_POOR_RATIO
    );
    let rating;
    if (ratio <= DEFLECTION_RATIO_GOOD) rating = "good";
    else if (ratio >= DEFLECTION_RATIO_POOR) rating = "poor";
    else rating = "needs-work";
    if (highMs <= DEFLECTION_BUSY_FLOOR_MS) {
      score = 100;
      rating = "good";
    }
    let strainAtInFlight = null;
    for (let i = 0; i < DEFLECTION_BUCKETS.length; i++) {
      if (deflectionDurations[i].length < DEFLECTION_MIN_BUCKET_SAMPLES) continue;
      if (deflectionP75(deflectionDurations[i]) > DEFLECTION_POOR_LATENCY_MS) {
        strainAtInFlight = DEFLECTION_BUCKETS[i].floor;
        break;
      }
    }
    const meanInFlight = deflectionSamples > 0 ? r1(deflectionInFlightSum / deflectionSamples) : 0;
    const soloMeanMs = deflectionSoloCount > 0 ? r0(deflectionSoloTotalMs / deflectionSoloCount) : null;
    let deflectionMsPerReq = null;
    if (deflectionLoadedCount >= DEFLECTION_MIN_LOADED && deflectionSoloCount > 0) {
      const n = deflectionSamples;
      const denom = n * deflectionSumX2 - deflectionSumX * deflectionSumX;
      if (denom > 0) {
        const slope = (n * deflectionSumXY - deflectionSumX * deflectionSumY) / denom;
        deflectionMsPerReq = r0(Math.max(0, slope));
      }
    }
    const axis = markSettled({
      score,
      rating,
      peakInFlight: deflectionPeak,
      meanInFlight,
      lowMs,
      highMs,
      ratio,
      strainAtInFlight,
      samples: deflectionSamples,
      soloMeanMs,
      deflectionMsPerReq
    });
    const held = getHeldOpenStats();
    if (held.heldOpenExcluded > 0) {
      axis.heldOpenExcluded = held.heldOpenExcluded;
      axis.heldOpenWorstMs = held.heldOpenWorstMs;
    }
    return axis;
  } catch {
    return null;
  }
}
const SWALLOWED_GOOD_PER_HOUR = 1;
const SWALLOWED_POOR_PER_HOUR = 60;
const SWALLOWED_MIN_WINDOW_MS = MIN_RATE_WINDOW_MS;
const SWALLOWED_WINDOW_MS = 60 * 6e4;
const SWALLOWED_RING_CAP = 400;
const swallowedTs = [];
let swallowedArmed = false;
let origConsoleError = null;
let ourConsoleError = null;
let swallowedInOurLog = false;
const SWALLOWED_STACK_FRAME_RE = /\n\s+at\s/;
const SWALLOWED_ARG_SCAN_MAX = 8;
const SWALLOWED_TEXT_SCAN_MAX = 4096;
let swallowedSettling = 0;
function argsCarryException(args) {
  const n = Math.min(args.length, SWALLOWED_ARG_SCAN_MAX);
  for (let i = 0; i < n; i++) {
    const a = args[i];
    if (a instanceof Error) return true;
    if (a !== null && typeof a === "object") {
      if (Object.prototype.toString.call(a) === "[object Error]") return true;
    } else if (typeof a === "string" && SWALLOWED_STACK_FRAME_RE.test(a.slice(0, SWALLOWED_TEXT_SCAN_MAX))) {
      return true;
    }
  }
  return false;
}
function noteSwallowedError(args) {
  try {
    if (isBoosthisDisabled() || !started) return;
    if (swallowedInOurLog) return;
    if (!argsCarryException(args)) return;
    if (isSettling("startupEvent")) {
      swallowedSettling++;
      return;
    }
    swallowedTs.push(Date.now());
    if (swallowedTs.length > SWALLOWED_RING_CAP) {
      swallowedTs.splice(0, swallowedTs.length - SWALLOWED_RING_CAP);
    }
  } catch {
  }
}
function startSwallowedErrors() {
  if (swallowedArmed) return;
  try {
    const orig = console.error?.bind(console);
    if (typeof orig !== "function") return;
    origConsoleError = orig;
    const wrapper = function boosthisConsoleError(...args) {
      const result = orig(...args);
      noteSwallowedError(args);
      noteLeakFromLog(args);
      return result;
    };
    ourConsoleError = wrapper;
    console.error = wrapper;
    swallowedArmed = true;
  } catch {
    origConsoleError = null;
    ourConsoleError = null;
    swallowedArmed = false;
  }
}
function restoreSwallowedErrors() {
  try {
    if (ourConsoleError && origConsoleError && console.error === ourConsoleError) {
      console.error = origConsoleError;
    }
  } catch {
  }
  origConsoleError = null;
  ourConsoleError = null;
  swallowedArmed = false;
}
function readSwallowedErrors() {
  if (isBoosthisDisabled() || !started || !swallowedArmed) return null;
  try {
    const now = Date.now();
    if (isSettling("startupEvent", now)) {
      return swallowedSettling > 0 ? settlingReading({ score: null }) : null;
    }
    const from = Math.max(now - SWALLOWED_WINDOW_MS, startedAt, settledFromMs("startupEvent"));
    const windowMs = now - from;
    if (windowMs < SWALLOWED_MIN_WINDOW_MS) return null;
    let count = 0;
    for (const t of swallowedTs) if (t >= from) count++;
    const perHour = earnedPerHour(count, windowMs) ?? 0;
    const score = linearScore(perHour, SWALLOWED_GOOD_PER_HOUR, SWALLOWED_POOR_PER_HOUR);
    return markSettled({
      score,
      rating: ratingFor(score),
      count,
      perHour,
      windowMin: windowMinOf(windowMs),
      caption: count === 0 ? `no logged errors · ${r0(windowMs / 6e4)} min watched` : `${count} error${count !== 1 ? "s" : ""} logged, app survived`
    });
  } catch {
    return null;
  }
}
const LEAK_MIN_WINDOW_MS = MIN_RATE_WINDOW_MS;
const LEAK_WINDOW_MS = 60 * 6e4;
const LEAK_RING_CAP = 200;
const LEAK_LOG_SCAN_MAX = 4096;
const LEAK_BODY_SCAN_MAX = 8192;
const LEAK_SURFACE_LOG = 1;
const LEAK_STACK_RE = /\bat .{1,200}\(.{1,200}:\d+:\d+\)/;
const LEAK_ERROR_AT_RE = /Error:[\s\S]{0,200}\n\s{4}at /;
const LEAK_JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
const LEAK_BEARER_RE = /bearer\s+(\S{8,})/gi;
const LEAK_AKIA_RE = /AKIA[0-9A-Z]{16}/;
const LEAK_PEM_RE = /-----BEGIN [\s\S]{0,64}PRIVATE KEY/;
const LEAK_KV_SECRET_RE = /(?:api[_-]?key|secret|token)["']?\s*[:=]\s*["']?([A-Za-z0-9_\-]{16,})/gi;
const LEAK_PLACEHOLDER_VALUE_RE = /^(?:<[^>]*>|\{\{[^}]*\}\}|\$\{[^}]*\}|\*{3,}|[xX]{3,}|\.{3,}|\u2026|(?:YOUR|EXAMPLE|SAMPLE|PLACEHOLDER|REPLACE|INSERT)[A-Z0-9_-]*)[^A-Za-z0-9_-]*$/;
function classifyLeak(text) {
  try {
    if (LEAK_JWT_RE.test(text)) return { cat: "secret", shape: LEAK_SHAPE_JWT };
    if (hasRealValue(LEAK_BEARER_RE, text)) {
      return { cat: "secret", shape: LEAK_SHAPE_BEARER };
    }
    if (LEAK_AKIA_RE.test(text)) {
      return { cat: "secret", shape: LEAK_SHAPE_AWS_KEY_ID };
    }
    if (LEAK_PEM_RE.test(text)) {
      return { cat: "secret", shape: LEAK_SHAPE_PRIVATE_KEY };
    }
    if (hasRealValue(LEAK_KV_SECRET_RE, text)) {
      return { cat: "secret", shape: LEAK_SHAPE_NAMED_VALUE };
    }
    if (EMAIL_RE.test(text)) return { cat: "pii", shape: LEAK_SHAPE_EMAIL };
    if (LEAK_STACK_RE.test(text) || LEAK_ERROR_AT_RE.test(text)) {
      return { cat: "stack", shape: LEAK_SHAPE_STACK_FRAME };
    }
    return null;
  } catch {
    return null;
  }
}
const leakEvents = [];
const leakRouteClasses = /* @__PURE__ */ new Set();
function recordLeak(klass, surf, routeClass) {
  try {
    if (isBoosthisDisabled() || !started) return;
    leakEvents.push({
      t: Date.now(),
      cat: klass.cat,
      surf,
      shape: klass.shape
    });
    if (leakEvents.length > LEAK_RING_CAP) {
      leakEvents.splice(0, leakEvents.length - LEAK_RING_CAP);
    }
    if (routeClass) leakRouteClasses.add(routeClass);
  } catch {
  }
}
function noteLeakFromLog(args) {
  try {
    if (isBoosthisDisabled() || !started) return;
    if (swallowedInOurLog) return;
    let text = "";
    for (const a of args) {
      if (text.length >= LEAK_LOG_SCAN_MAX) break;
      text += (typeof a === "string" ? a : safeStringify(a)) + " ";
    }
    text = text.slice(0, LEAK_LOG_SCAN_MAX);
    const klass = classifyLeak(text);
    if (klass && (klass.cat === "secret" || klass.cat === "pii")) {
      recordLeak(klass, LEAK_SURFACE_LOG);
    }
  } catch {
  }
}
function safeStringify(v) {
  try {
    if (v == null) return String(v);
    if (typeof v === "object") {
      if (v instanceof Error) {
        return `${v.name}: ${v.message}
${v.stack ?? ""}`.slice(
          0,
          LEAK_LOG_SCAN_MAX
        );
      }
      return JSON.stringify(v).slice(0, LEAK_LOG_SCAN_MAX);
    }
    return String(v);
  } catch {
    return "";
  }
}
const LEAK_ASSET_EXT_RE = /\.(?:js|mjs|cjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|map|json|txt|xml|pdf|mp4|webm|wasm)$/i;
function leakRouteClass(path, accept) {
  try {
    const p = (path || "").split("?")[0];
    const acceptsJson = typeof accept === "string" && accept.toLowerCase().includes("json");
    if (p.startsWith("/api/") || p === "/api" || acceptsJson) return "api";
    if (LEAK_ASSET_EXT_RE.test(p)) return "asset";
    if (p) return "page";
    return "other";
  } catch {
    return "other";
  }
}
const LEAK_TEXT_ENCODER = typeof TextEncoder === "function" ? new TextEncoder() : null;
function utf8BytePrefix(text, maxBytes) {
  if (maxBytes <= 0 || text === "") return "";
  if (LEAK_TEXT_ENCODER === null) {
    const units = Math.floor(maxBytes / 3);
    return text.length > units ? text.slice(0, units) : text;
  }
  const room = Math.min(maxBytes, text.length * 3);
  const out = new Uint8Array(room);
  const written = LEAK_TEXT_ENCODER.encodeInto(text, out).written ?? 0;
  if (written === 0) return "";
  return Buffer.from(out.buffer, out.byteOffset, written).toString("utf8");
}
function noteLeakFromResponse(body, routeClass) {
  try {
    if (isBoosthisDisabled() || !started) return;
    const text = utf8BytePrefix(body, LEAK_BODY_SCAN_MAX);
    const klass = classifyLeak(text);
    if (klass) recordLeak(klass, LEAK_SURFACE_REPLY, routeClass);
  } catch {
  }
}
function leakSurfacePhrase(fromLogCount, fromReplyCount) {
  if (fromReplyCount === 0) return "all in your app's log output";
  if (fromLogCount === 0) return "all in error replies your app sent";
  return `${fromReplyCount} in error replies your app sent, ${fromLogCount} in log output`;
}
function readLeakWatch() {
  if (isBoosthisDisabled() || !started || !swallowedArmed) return null;
  try {
    const now = Date.now();
    const windowMs = Math.min(now - startedAt, LEAK_WINDOW_MS);
    if (windowMs < LEAK_MIN_WINDOW_MS) return null;
    const cutoff = now - windowMs;
    let count = 0;
    let stackCount = 0;
    let secretCount = 0;
    let piiCount = 0;
    let fromLogCount = 0;
    let fromReplyCount = 0;
    let shapeMask = 0;
    for (const e of leakEvents) {
      if (e.t < cutoff) continue;
      count++;
      if (e.cat === "secret") secretCount++;
      else if (e.cat === "pii") piiCount++;
      else stackCount++;
      if (e.surf === LEAK_SURFACE_REPLY) fromReplyCount++;
      else fromLogCount++;
      shapeMask |= e.shape;
    }
    const perHour = earnedPerHour(count, windowMs) ?? 0;
    const routeClassCount = leakRouteClasses.size;
    let caption;
    if (count === 0) {
      caption = "no leaks observed in this window";
    } else {
      const parts = [];
      if (secretCount > 0) parts.push(`${secretCount} secret-like`);
      if (piiCount > 0) parts.push(`${piiCount} personal-detail`);
      if (stackCount > 0) parts.push(`${stackCount} stack trace`);
      caption = `${count} possible leak${count === 1 ? "" : "s"} observed (${parts.join(", ")}) · ${leakSurfacePhrase(fromLogCount, fromReplyCount)} · ${leakShapePhrase(shapeMask)}`;
    }
    return markSettled({
      // The shared decision (leakWatch): a text SHAPE in a body or a log is a
      // suspicion, not an established disclosure (a public support address
      // matches the e-mail shape), so the counts ride and nothing is graded.
      score: null,
      rating: "not-scored",
      count,
      perHour,
      windowMin: windowMinOf(windowMs),
      stackCount,
      secretCount,
      piiCount,
      routeClassCount,
      fromLogCount,
      fromReplyCount,
      shapeMask,
      caption
    });
  } catch {
    return null;
  }
}
function startExtraMeters() {
  if (isBoosthisDisabled() || started) return;
  started = true;
  startedAt = Date.now();
  try {
    startHandleChurn();
  } catch {
  }
  try {
    startRejectionPressure();
  } catch {
  }
  try {
    startRuntimeSafetyMeters();
  } catch {
  }
  try {
    startWorkerBalance();
  } catch {
  }
  try {
    startSwallowedErrors();
  } catch {
  }
  try {
    startProcessMeters();
  } catch {
  }
  try {
    startLiveConnections();
  } catch {
  }
}
const COOKIE_MAX_BYTES = 4096;
const COOKIE_PER_RESPONSE_MAX = 20;
const COOKIE_ATTR_SCAN_MAX = 2048;
const COOKIE_ATTR_SEGMENT_MAX = 20;
const COOKIE_COUNT_MAX = 1e9;
let cookieSetCount = 0;
let cookieResponses = 0;
let cookieNoSecure = 0;
let cookieNoHttpOnly = 0;
let cookieNoSameSite = 0;
let cookieNoneWithoutSecure = 0;
let cookieOversize = 0;
const bumpCookie = (n) => n >= COOKIE_COUNT_MAX ? COOKIE_COUNT_MAX : n + 1;
const COOKIE_NEVER_CREDENTIAL = ["csrf", "xsrf"];
const COOKIE_CREDENTIAL_PARTS = [
  "session",
  "sessid",
  "token",
  "jwt",
  "login",
  "remember",
  "refresh",
  "credential"
];
const COOKIE_CREDENTIAL_WORDS = /* @__PURE__ */ new Set(["sid", "sess", "auth", "authorization"]);
const COOKIE_NAME_SCAN_MAX = 1024;
function cookieIsCredential(raw) {
  try {
    const limit = Math.min(raw.length, COOKIE_NAME_SCAN_MAX + 1);
    let end = -1;
    for (let i = 0; i < limit; i++) {
      const c = raw.charCodeAt(i);
      if (c === 61 || c === 59) {
        end = i;
        break;
      }
    }
    if (end < 0) {
      if (raw.length > COOKIE_NAME_SCAN_MAX) return true;
      end = raw.length;
    }
    const name = raw.slice(0, end).trim().toLowerCase();
    if (name === "") return true;
    if (COOKIE_NEVER_CREDENTIAL.some((w) => name.includes(w))) return false;
    if (COOKIE_CREDENTIAL_PARTS.some((p) => name.includes(p))) return true;
    for (const word of name.split(/[^a-z0-9]+/)) {
      if (COOKIE_CREDENTIAL_WORDS.has(word)) return true;
      if (word.startsWith("auth") && !word.startsWith("author")) return true;
    }
    return false;
  } catch {
    return true;
  }
}
function noteOneCookie(raw) {
  cookieSetCount = bumpCookie(cookieSetCount);
  let hasSecure = false;
  let hasHttpOnly = false;
  let sameSite = null;
  const firstSemi = raw.indexOf(";");
  if (firstSemi >= 0) {
    const tail = raw.slice(firstSemi + 1, firstSemi + 1 + COOKIE_ATTR_SCAN_MAX);
    const segments = tail.split(";");
    const limit = Math.min(segments.length, COOKIE_ATTR_SEGMENT_MAX);
    for (let i = 0; i < limit; i++) {
      const seg = segments[i];
      const eq = seg.indexOf("=");
      const name = (eq >= 0 ? seg.slice(0, eq) : seg).trim().toLowerCase();
      if (name === "secure") hasSecure = true;
      else if (name === "httponly") hasHttpOnly = true;
      else if (name === "samesite" && eq >= 0) {
        sameSite = seg.slice(eq + 1).trim().toLowerCase();
      }
    }
  }
  if (!hasSecure) cookieNoSecure = bumpCookie(cookieNoSecure);
  if (!hasHttpOnly && cookieIsCredential(raw)) {
    cookieNoHttpOnly = bumpCookie(cookieNoHttpOnly);
  }
  if (sameSite === null) cookieNoSameSite = bumpCookie(cookieNoSameSite);
  if (sameSite === "none" && !hasSecure) {
    cookieNoneWithoutSecure = bumpCookie(cookieNoneWithoutSecure);
  }
  if (raw.length > COOKIE_MAX_BYTES || Buffer.byteLength(raw, "utf8") > COOKIE_MAX_BYTES) {
    cookieOversize = bumpCookie(cookieOversize);
  }
}
function noteCookiesFromResponse(header) {
  try {
    if (isBoosthisDisabled() || !started) return;
    if (header === void 0 || header === null) return;
    const list = Array.isArray(header) ? header : [String(header)];
    let seen = 0;
    for (const entry of list) {
      if (seen >= COOKIE_PER_RESPONSE_MAX) break;
      if (typeof entry !== "string" || entry === "") continue;
      seen++;
      noteOneCookie(entry);
    }
    if (seen > 0) cookieResponses = bumpCookie(cookieResponses);
  } catch {
  }
}
const AP_BUCKET_MS = 6e4;
const AP_MAX_MINUTES = 240;
const AP_MIN_TOTAL_FOR_RATING = 50;
const AP_MIN_BASELINE_MINUTES = 10;
const AP_SURGE_MIN_PEAK = 30;
const AP_SURGE_MIN_MEDIAN = 5;
const AP_SURGE_WARN = 3;
const AP_SURGE_POOR = 8;
const AP_SHARE_WARN = 0.2;
const AP_SHARE_POOR = 0.5;
const AP_SURGE_CAP = 999;
const AP_COUNT_MAX = 1e9;
const bumpAp = (n) => n >= AP_COUNT_MAX ? AP_COUNT_MAX : n + 1;
let apTotal = 0;
let apUnauth = 0;
let apForbidden = 0;
let apLimited = 0;
let apNotFound = 0;
let apServerError = 0;
let apProtocolAnswers = 0;
let apUnattributed = 0;
let apBucketStart = 0;
let apCurReq = 0;
let apCurRej = 0;
let apReqMinutes = [];
let apPeakReq = 0;
let apSettling = 0;
let apPeakRej = 0;
let apSketch = 0n;
let apSaltDay = "";
let apSalt = "";
let apNow = Date.now;
function apDailySalt() {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  if (day !== apSaltDay || apSalt === "") {
    apSaltDay = day;
    apSalt = randomBytes(16).toString("hex");
  }
  return apSalt;
}
function apRollBuckets(now) {
  if (apBucketStart === 0) {
    apBucketStart = now;
    return;
  }
  let gap = Math.floor((now - apBucketStart) / AP_BUCKET_MS);
  if (gap <= 0) return;
  apReqMinutes.push(apCurReq);
  apCurReq = 0;
  apCurRej = 0;
  const zeros = Math.min(gap - 1, AP_MAX_MINUTES);
  for (let i = 0; i < zeros; i++) apReqMinutes.push(0);
  if (apReqMinutes.length > AP_MAX_MINUTES) {
    apReqMinutes = apReqMinutes.slice(apReqMinutes.length - AP_MAX_MINUTES);
  }
  apBucketStart += gap * AP_BUCKET_MS;
}
function noteAccessOutcome(status, clientAddr, routeMatched) {
  try {
    if (isBoosthisDisabled() || !started) return;
    if (typeof status !== "number" || !Number.isFinite(status)) return;
    if (status < 100 || status > 599) return;
    const now = apNow();
    if (now < settledFromMs("peakRate")) {
      apSettling = bumpAp(apSettling);
      return;
    }
    apRollBuckets(now);
    apTotal = bumpAp(apTotal);
    apCurReq++;
    if (apCurReq > apPeakReq) apPeakReq = apCurReq;
    const chosenByApp = routeMatched === true;
    const cannotTell = routeMatched !== true && routeMatched !== false;
    let rejection = false;
    if (status === 401) {
      apUnauth = bumpAp(apUnauth);
      rejection = true;
    } else if (status === 403) {
      apForbidden = bumpAp(apForbidden);
      rejection = !chosenByApp;
    } else if (status === 429) {
      apLimited = bumpAp(apLimited);
      rejection = true;
    } else if (status === 404) {
      apNotFound = bumpAp(apNotFound);
      rejection = !chosenByApp;
    } else if (status >= 500) {
      apServerError = bumpAp(apServerError);
    }
    if ((status === 403 || status === 404) && chosenByApp) {
      apProtocolAnswers = bumpAp(apProtocolAnswers);
    }
    if (rejection && cannotTell && (status === 403 || status === 404)) {
      apUnattributed = bumpAp(apUnattributed);
    }
    if (!rejection) return;
    apCurRej++;
    if (apCurRej > apPeakRej) apPeakRej = apCurRej;
    if (typeof clientAddr === "string" && clientAddr !== "") {
      const digest = createHash("sha256").update(apDailySalt() + clientAddr).digest();
      const pos = digest.readUInt32BE(0) % 63;
      apSketch |= 1n << BigInt(pos);
    }
  } catch {
  }
}
function apMedianRate() {
  const sorted = [...apReqMinutes].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}
function apReachEstimate() {
  let v = apSketch;
  let count = 0;
  while (v > 0n) {
    if (v & 1n) count++;
    v >>= 1n;
  }
  return count;
}
function readAccessPressure() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (isSettling("peakRate", apNow())) {
      return apSettling > 0 ? settlingReading({ score: null }) : null;
    }
    if (apTotal <= 0) return null;
    if (apTotal < AP_MIN_TOTAL_FOR_RATING) return null;
    if (apReqMinutes.length < AP_MIN_BASELINE_MINUTES) return null;
    const rejections = apUnauth + apLimited + apForbidden + apNotFound - apProtocolAnswers;
    const rejShare = Math.max(0, rejections) / apTotal;
    const median = apMedianRate();
    const haveBaseline = median >= AP_SURGE_MIN_MEDIAN;
    const surgeRatio = haveBaseline ? r1(Math.min(AP_SURGE_CAP, apPeakReq / median)) : null;
    const surging = apPeakReq >= AP_SURGE_MIN_PEAK && surgeRatio !== null;
    const rating = rejShare >= AP_SHARE_POOR || surging && surgeRatio >= AP_SURGE_POOR ? "poor" : rejShare >= AP_SHARE_WARN || surging && surgeRatio >= AP_SURGE_WARN ? "needs-work" : "good";
    const surgePenalty = surging ? Math.min(1, Math.max(0, surgeRatio - 1) / (AP_SURGE_POOR - 1)) : 0;
    const score = Math.max(
      0,
      Math.min(
        100,
        r0(100 - 70 * Math.min(1, rejShare / AP_SHARE_POOR) - 30 * surgePenalty)
      )
    );
    const reach = apReachEstimate();
    const parts = [];
    if (rejections > 0) {
      parts.push(
        `${rejections} of ${apTotal} responses were refusals this app's own routing did not choose (${r0(rejShare * 100)}%)`
      );
      if (apPeakRej > 0) parts.push(`peak ${apPeakRej} rejections/min`);
      if (reach > 0) {
        parts.push(
          reach >= 10 ? "≈10+ sources" : reach >= 2 ? "≈2–9 sources" : "≈1 source"
        );
      }
    }
    if (apProtocolAnswers > 0) {
      parts.push(
        `${apProtocolAnswers} more were answers from routes this app serves — not counted as pressure`
      );
    }
    if (apUnattributed > 0) {
      parts.push(
        `${apUnattributed} could not be attributed to a route on this host and are counted as pressure`
      );
    }
    if (surging && surgeRatio >= AP_SURGE_WARN) {
      parts.push(`traffic peaked at ${surgeRatio}× the quiet baseline`);
    } else if (!haveBaseline && apPeakReq >= AP_SURGE_MIN_PEAK) {
      parts.push(
        `busiest minute ${apPeakReq} requests, with no quiet baseline to be a multiple of — no surge verdict`
      );
    }
    const caption = parts.length === 0 ? `no rejection pressure across ${apTotal} responses` : parts.join(", ");
    return markSettled({
      score,
      rating,
      unauth: apUnauth,
      forbidden: apForbidden,
      limited: apLimited,
      notFound: apNotFound,
      serverError: apServerError,
      // Of the forbidden + not-found counts above, how many came back out of a
      // route this app registered. Subtracted from the band, published so the
      // two numbers on the tile add up in the open.
      protocolAnswers: apProtocolAnswers,
      // Refusals on a host that gave the kit no route table to ask. Counted as
      // pressure (nothing better is available) and said out loud.
      unattributedRefusals: apUnattributed,
      // What the band actually divided: the refusals left after the app's own
      // answers came out. Named so no reader has to do the subtraction.
      breakInRefusals: Math.max(0, rejections),
      total: apTotal,
      burstPeak60s: apPeakRej,
      // Null, never a fabricated multiple, when the session has no quiet
      // minute to compare the peak against.
      surgeRatio,
      baselineRate: r1(median),
      reachEstimate: reach,
      caption
    });
  } catch {
    return null;
  }
}
function resetAccessPressure() {
  apTotal = 0;
  apSettling = 0;
  apUnauth = 0;
  apForbidden = 0;
  apLimited = 0;
  apNotFound = 0;
  apServerError = 0;
  apProtocolAnswers = 0;
  apUnattributed = 0;
  apBucketStart = 0;
  apCurReq = 0;
  apCurRej = 0;
  apReqMinutes = [];
  apPeakReq = 0;
  apPeakRej = 0;
  apSketch = 0n;
  apSaltDay = "";
  apSalt = "";
}
function _rollAccessBucketsForTests(now) {
  apRollBuckets(now);
}
function _setAccessBucketStartForTests(ts) {
  apBucketStart = ts;
}
function _setAccessClockForTests(fn) {
  apNow = fn ?? Date.now;
}
function _resetAccessPressureForTests() {
  resetAccessPressure();
  apNow = Date.now;
}
const REFUSAL_MIN_WINDOW_MS = 10 * 60 * 1e3;
let refusalStartedAt = 0;
let refusalRefusals = 0;
let refusalChallenged = 0;
let refusalCredentialed = 0;
let refusalCredChallenged = 0;
let refusalMeasurable = 1;
let refusalNow = Date.now;
function noteRefusalHonesty(status, authorizationPresent, challengePresent, measurable = true) {
  try {
    if (isBoosthisDisabled() || !started) return;
    const now = refusalNow();
    if (refusalStartedAt === 0) refusalStartedAt = now;
    if (!measurable) {
      refusalMeasurable = 0;
      refusalRefusals = refusalChallenged = refusalCredentialed = refusalCredChallenged = 0;
      return;
    }
    if (refusalMeasurable === 0) return;
    if (status !== 401 && status !== 403) return;
    refusalRefusals = bumpAp(refusalRefusals);
    if (challengePresent) refusalChallenged = bumpAp(refusalChallenged);
    if (authorizationPresent) refusalCredentialed = bumpAp(refusalCredentialed);
    if (status === 401 && challengePresent && authorizationPresent) {
      refusalCredChallenged = bumpAp(refusalCredChallenged);
    }
  } catch {
  }
}
function readRefusalHonesty() {
  if (isBoosthisDisabled() || !started || refusalStartedAt === 0) return null;
  try {
    const elapsed = Math.max(0, refusalNow() - refusalStartedAt);
    if (elapsed < REFUSAL_MIN_WINDOW_MS) return null;
    const windowMin = windowMinOf(elapsed);
    if (refusalMeasurable === 0) {
      return {
        score: null,
        // Not the same silence as the branch below. This host cannot take the
        // reading at all; that one takes it and declines to grade it. Both
        // used to say "pending", so the two were indistinguishable from the
        // rating alone even inside this one axis. `measurable: 0` still rides
        // along, so a server that does not know this label reads the state
        // exactly as it always has.
        rating: "not-available",
        refusals: 0,
        challenged: 0,
        credentialed: 0,
        credentialedChallenged: 0,
        sharePct: 0,
        windowMin,
        measurable: 0,
        caption: "not measurable — this host does not expose response headers"
      };
    }
    const sharePct = refusalRefusals === 0 ? 0 : Math.round(refusalCredChallenged / refusalRefusals * 100);
    return {
      // No score and no rating, deliberately: see the note above the counters.
      // Header PRESENCE cannot tell a wrongly-refused caller from a correctly
      // refused one, so this axis reports what it saw and stops there.
      score: null,
      // Permanently unscored, said in the rating itself rather than left for a
      // reader to infer from a null score. The counts are real and keep
      // rendering (measurable stays 1) — only the VERDICT is absent, and it is
      // absent for good.
      rating: "not-scored",
      refusals: refusalRefusals,
      challenged: refusalChallenged,
      credentialed: refusalCredentialed,
      credentialedChallenged: refusalCredChallenged,
      sharePct,
      windowMin,
      measurable: 1,
      // WHY there is no verdict, from the shared closed vocabulary, for a
      // server too old to know the "not-scored" rating: header presence cannot
      // tell a wrongly-refused caller from a correctly refused one, so this
      // axis reports what it saw and stops. Kept alongside the rating, never
      // replaced by it — dropping it would make this reading render as a bare
      // "warming up" on every server that has not been updated.
      reasonCode: REASON_NOTHING_TO_COMPARE,
      caption: refusalRefusals === 0 ? `no refusals observed · ${windowPhrase(windowMin)}` : `${refusalCredChallenged} of ${refusalRefusals} refusals challenged a caller who had already sent a credential (${sharePct}%) — an observation, not a fault`
    };
  } catch {
    return null;
  }
}
function resetRefusalHonesty() {
  refusalStartedAt = 0;
  refusalRefusals = 0;
  refusalChallenged = 0;
  refusalCredentialed = 0;
  refusalCredChallenged = 0;
  refusalMeasurable = 1;
}
function _setRefusalClockForTests(fn) {
  refusalNow = fn ?? Date.now;
}
function _resetRefusalHonestyForTests() {
  resetRefusalHonesty();
  refusalNow = Date.now;
}
function readCookieExposure() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (cookieSetCount <= 0) return null;
    const unsafeShare = (cookieNoSecure + cookieNoneWithoutSecure) / cookieSetCount;
    const weakShare = (cookieNoHttpOnly + cookieNoSameSite + cookieOversize) / (cookieSetCount * 3);
    const score = Math.max(
      0,
      Math.min(100, r0(100 - 70 * unsafeShare - 30 * weakShare))
    );
    const rating = cookieNoSecure > 0 || cookieNoneWithoutSecure > 0 ? "poor" : cookieNoHttpOnly > 0 || cookieNoSameSite > 0 || cookieOversize > 0 ? "needs-work" : "good";
    const missing = [];
    if (cookieNoSecure > 0) missing.push(`${cookieNoSecure} without Secure`);
    if (cookieNoneWithoutSecure > 0) {
      missing.push(`${cookieNoneWithoutSecure} SameSite=None without Secure`);
    }
    if (cookieNoHttpOnly > 0) {
      missing.push(`${cookieNoHttpOnly} session or auth cookie${cookieNoHttpOnly === 1 ? "" : "s"} without HttpOnly`);
    }
    if (cookieNoSameSite > 0) {
      missing.push(`${cookieNoSameSite} without SameSite`);
    }
    if (cookieOversize > 0) missing.push(`${cookieOversize} over 4 KB`);
    const caption = missing.length === 0 ? `no unsafe flags on ${cookieSetCount} cookie${cookieSetCount === 1 ? "" : "s"} we watched` : `${missing.join(", ")} of ${cookieSetCount} cookie${cookieSetCount === 1 ? "" : "s"} set`;
    return {
      score,
      rating,
      setCount: cookieSetCount,
      responses: cookieResponses,
      noSecure: cookieNoSecure,
      noHttpOnly: cookieNoHttpOnly,
      noSameSite: cookieNoSameSite,
      noneWithoutSecure: cookieNoneWithoutSecure,
      oversize: cookieOversize,
      caption
    };
  } catch {
    return null;
  }
}
function resetCookieExposure() {
  cookieSetCount = 0;
  cookieResponses = 0;
  cookieNoSecure = 0;
  cookieNoHttpOnly = 0;
  cookieNoSameSite = 0;
  cookieNoneWithoutSecure = 0;
  cookieOversize = 0;
}
const CORS_VALUE_SCAN_MAX = 512;
function firstHeaderValue(v) {
  const first = Array.isArray(v) ? v[0] : v;
  if (typeof first === "number" && Number.isFinite(first)) return String(first);
  if (typeof first !== "string") return "";
  return first.length > CORS_VALUE_SCAN_MAX ? "" : first.trim();
}
function classifyCorsAnswer(requestOrigin, allowOrigin, allowCredentials) {
  const origin = firstHeaderValue(requestOrigin);
  const acao = firstHeaderValue(allowOrigin);
  const acac = firstHeaderValue(allowCredentials).toLowerCase();
  const anyOrigin = acao === "*";
  return {
    originSent: origin !== "",
    anyOrigin,
    reflected: origin !== "" && acao !== "" && !anyOrigin && acao.toLowerCase() === origin.toLowerCase(),
    wildcardCredentials: anyOrigin && acac === "true"
  };
}
let corsStartedAt = 0;
let corsResponses = 0;
let corsOriginRequests = 0;
let corsAnyOrigin = 0;
let corsReflected = 0;
let corsWildcardCredentials = 0;
let corsMeasurable = 1;
let corsNow = Date.now;
function noteCorsAnswer(shape) {
  try {
    if (isBoosthisDisabled() || !started) return;
    if (corsStartedAt === 0) corsStartedAt = corsNow();
    if (shape === null) {
      if (corsResponses === 0) corsMeasurable = 0;
      return;
    }
    corsMeasurable = 1;
    corsResponses = bumpCookie(corsResponses);
    if (shape.originSent) corsOriginRequests = bumpCookie(corsOriginRequests);
    if (shape.anyOrigin) corsAnyOrigin = bumpCookie(corsAnyOrigin);
    if (shape.reflected) corsReflected = bumpCookie(corsReflected);
    if (shape.wildcardCredentials) {
      corsWildcardCredentials = bumpCookie(corsWildcardCredentials);
    }
  } catch {
  }
}
function readCorsExposure() {
  if (isBoosthisDisabled() || !started || corsStartedAt === 0) return null;
  try {
    const windowMs = Math.max(0, corsNow() - corsStartedAt);
    if (corsResponses === 0) {
      if (corsMeasurable !== 0) return null;
      return {
        score: null,
        rating: "not-available",
        responses: 0,
        windowMs,
        measurable: 0,
        reasonCode: REASON_PLATFORM_DOES_NOT_EXPOSE,
        caption: "not measurable — this host does not expose response headers"
      };
    }
    const parts = [];
    if (corsAnyOrigin > 0) parts.push(`${corsAnyOrigin} answered any origin`);
    if (corsReflected > 0) {
      parts.push(`${corsReflected} echoed back the origin that asked (an allowlist does this too)`);
    }
    if (corsWildcardCredentials > 0) {
      parts.push(`${corsWildcardCredentials} paired a wildcard with credentials`);
    }
    const watched = `${corsResponses} response${corsResponses === 1 ? "" : "s"}`;
    return {
      // Never scored, by design: see the note above classifyCorsAnswer.
      score: null,
      rating: "not-scored",
      responses: corsResponses,
      originRequests: corsOriginRequests,
      anyOrigin: corsAnyOrigin,
      reflected: corsReflected,
      wildcardCredentials: corsWildcardCredentials,
      windowMs,
      measurable: 1,
      reasonCode: REASON_NOTHING_TO_COMPARE,
      caption: parts.length === 0 ? `none of the ${watched} watched answered any origin, echoed the origin that asked, or paired a wildcard with credentials · ${windowPhrase(windowMinOf(windowMs))}` : `${parts.join(", ")} — of ${watched} watched`
    };
  } catch {
    return null;
  }
}
function resetCorsExposure() {
  corsStartedAt = 0;
  corsResponses = 0;
  corsOriginRequests = 0;
  corsAnyOrigin = 0;
  corsReflected = 0;
  corsWildcardCredentials = 0;
  corsMeasurable = 1;
}
function readExtraMeters() {
  const axes = {};
  const hc = readHandleChurn();
  if (hc) axes.handleChurn = hc;
  const rp = readRejectionPressure();
  if (rp) axes.rejectionPressure = rp;
  if (started) {
    axes.promiseRejections = readPromiseRejections();
    axes.unhandledErrors = readUnhandledErrors();
    axes.timerHealth = readTimerHealth();
  }
  const bp = readBackpressure();
  if (bp) axes.backpressure = bp;
  const wi = readWorkerImbalance();
  if (wi) axes.workerImbalance = wi;
  const ld = readLoadDeflection();
  if (ld) axes.loadDeflection = ld;
  const se = readSwallowedErrors();
  if (se) axes.swallowedErrors = se;
  const lw = readLeakWatch();
  if (lw) axes.leakWatch = lw;
  const ce = readCookieExposure();
  if (ce) axes.cookieExposure = ce;
  const co = readCorsExposure();
  if (co) axes.corsExposure = co;
  const ap = readAccessPressure();
  if (ap) axes.accessPressure = ap;
  const rh = readRefusalHonesty();
  if (rh) axes.refusalHonesty = rh;
  const dp = readDevPosture();
  if (dp) axes.devPosture = dp;
  const lc = readLiveConnections();
  if (lc) axes.liveConnections = lc;
  Object.assign(axes, readProcessMeters());
  if (started) {
    const host = readHostResourceMeters();
    if (host.diskPressure) axes.diskPressure = host.diskPressure;
    if (host.storageLatency) axes.storageLatency = host.storageLatency;
    if (host.storageFailures) axes.storageFailures = host.storageFailures;
    if (host.ioPressure) axes.ioPressure = host.ioPressure;
    if (host.pageFaults) axes.pageFaults = host.pageFaults;
    if (host.descriptorMix) axes.descriptorMix = host.descriptorMix;
    if (host.systemLoad) axes.systemLoad = host.systemLoad;
  }
  return axes;
}
function clearExtraMeters() {
  started = false;
  startedAt = 0;
  clearHostResourceMeters();
  clearRuntimeSafetyMeters();
  resetCookieExposure();
  resetCorsExposure();
  resetAccessPressure();
  resetRefusalHonesty();
  resetDevPosture();
  try {
    clearProcessMeters();
  } catch {
  }
  try {
    if (churnHook) churnHook.disable();
  } catch {
  }
  churnHook = null;
  churnBuckets.length = 0;
  try {
    if (rejectionHandledListener) {
      process.removeListener(
        "rejectionHandled",
        rejectionHandledListener
      );
    }
    if (warningListener) {
      process.removeListener("warning", warningListener);
    }
  } catch {
  }
  rejectionHandledListener = null;
  warningListener = null;
  lateHandledCount = 0;
  unhandledWarningCount = 0;
  rejectionSettlingCount = 0;
  bpTotal = 0;
  bpBackpressured = 0;
  bpBuckets.length = 0;
  bpSettling = 0;
  try {
    if (clusterListener) cluster.removeListener("message", clusterListener);
  } catch {
  }
  clusterListener = null;
  try {
    if (clusterOnlineListener) cluster.removeListener("online", clusterOnlineListener);
    if (clusterExitListener) cluster.removeListener("exit", clusterExitListener);
  } catch {
  }
  clusterOnlineListener = null;
  clusterExitListener = null;
  workerCounts.clear();
  workerBornAt.clear();
  workerPendingCount = 0;
  workerLastSentAt = 0;
  isClusterPrimary = false;
  isClusterWorker = false;
  deflectionInFlight = 0;
  deflectionPeak = 0;
  deflectionInFlightSum = 0;
  deflectionSamples = 0;
  deflectionSoloCount = 0;
  deflectionSoloTotalMs = 0;
  deflectionLoadedCount = 0;
  deflectionSumX = 0;
  deflectionSumY = 0;
  deflectionSumXY = 0;
  deflectionSumX2 = 0;
  for (const ring of deflectionDurations) ring.length = 0;
  try {
    restoreSwallowedErrors();
  } catch {
  }
  swallowedTs.length = 0;
  swallowedSettling = 0;
  swallowedInOurLog = false;
  deflectionSettling = 0;
  leakEvents.length = 0;
  leakRouteClasses.clear();
  try {
    clearLiveConnections();
  } catch {
  }
}
const _extraMetersInternals = {
  CHURN_GOOD_PER_MIN,
  CHURN_POOR_PER_MIN,
  MIN_CHURN_ELAPSED_MS,
  REJECT_RATE_GOOD,
  REJECT_RATE_POOR,
  REJECT_MIN_WINDOW_MIN,
  BP_PCT_GOOD,
  BP_PCT_POOR,
  MIN_BP_RESPONSES,
  IMBALANCE_GOOD_RATIO,
  IMBALANCE_POOR_RATIO,
  MIN_IMBALANCE_REQUESTS,
  MIN_IMBALANCE_WORKERS,
  DEFLECTION_SCORE_GOOD_RATIO,
  DEFLECTION_SCORE_POOR_RATIO,
  DEFLECTION_RATIO_GOOD,
  DEFLECTION_RATIO_POOR,
  DEFLECTION_MIN_SAMPLES,
  DEFLECTION_MIN_BUCKET_SAMPLES,
  DEFLECTION_MIN_PEAK,
  DEFLECTION_MIN_LOADED,
  DEFLECTION_MAX_MS,
  DEFLECTION_POOR_LATENCY_MS,
  SWALLOWED_GOOD_PER_HOUR,
  SWALLOWED_POOR_PER_HOUR,
  SWALLOWED_MIN_WINDOW_MS,
  SWALLOWED_WINDOW_MS,
  SWALLOWED_RING_CAP,
  get isRunning() {
    return started;
  },
  reset() {
    clearExtraMeters();
  },
  /** Force started (+backdate) without real hooks for hermetic unit tests. */
  forceStart(at) {
    started = true;
    startedAt = at;
  },
  /** Install a sentinel churn hook + push synthetic creation buckets. */
  enableChurnForTest() {
    churnHook = { disable() {
    } };
  },
  pushChurnBucket(t, count) {
    churnBuckets.push({ t, count });
  },
  /** File `n` handle creations through the hook's own bucket path, now. */
  noteHandlesForTests(n) {
    const now = Date.now();
    for (let i = 0; i < n; i++) bumpChurn(now);
  },
  /** Install a sentinel rejection listener + set synthetic counters. */
  enableRejectionsForTest(late, unhandled) {
    rejectionHandledListener = () => {
    };
    lateHandledCount = late;
    unhandledWarningCount = unhandled;
  },
  /** Directly fold synthetic SETTLED responses (each held on a full buffer
   *  past the floor when counted as backpressured) into the current minute. */
  addResponsesForTests(total, backpressured) {
    bpTotal += total;
    bpBackpressured += backpressured;
    addBpBucket(Date.now(), total, backpressured);
  },
  BP_HELD_FLOOR_MS,
  /** Feed one stray rejection through the listeners' own path. */
  noteStrayRejectionForTests(kind) {
    noteStrayRejection(kind);
  },
  /** Cluster primary paths, hermetically: a worker coming online, a batch of
   *  its counts arriving, and the worker exiting. */
  workerOnlineForTests(id, at) {
    isClusterPrimary = true;
    noteWorkerOnline(id, at);
  },
  workerBatchForTests(id, n, at) {
    isClusterPrimary = true;
    noteWorkerBatch(id, n, at);
  },
  workerExitForTests(id) {
    noteWorkerExit(id);
  },
  /** Force primary mode + inject synthetic worker counts. */
  setWorkerCountsForTests(counts) {
    isClusterPrimary = true;
    const now = Date.now();
    workerCounts.clear();
    workerBornAt.clear();
    for (const [id, n] of Object.entries(counts)) {
      workerCounts.set(Number(id), [{ t: now, n }]);
      workerBornAt.set(Number(id), 0);
    }
  },
  /** Drive the load-deflection collector through the real start/end path. */
  noteDeflection(startInFlight, durationMs) {
    noteDeflectionEnd(startInFlight, durationMs);
  },
  /** Directly seed a bucket (by its in-flight floor) with durations, folding
   *  the seeded samples into BOTH the sample count and the meanInFlight
   *  numerator (each seeded sample counts as in-flight-at-start == floor) so
   *  the hermetic state stays consistent with the real record path. */
  seedDeflectionBucket(floor, durationsMs) {
    const idx = deflectionBucketIndex(floor);
    for (const d of durationsMs) {
      deflectionDurations[idx].push(d);
      const y = Math.min(DEFLECTION_MAX_MS, Math.max(0, d));
      const x = floor;
      if (x === 1) {
        deflectionSoloCount++;
        deflectionSoloTotalMs += y;
      } else if (x >= 2) {
        deflectionLoadedCount++;
      }
      deflectionSumX += x;
      deflectionSumY += y;
      deflectionSumXY += x * y;
      deflectionSumX2 += x * x;
    }
    deflectionSamples += durationsMs.length;
    deflectionInFlightSum += floor * durationsMs.length;
  },
  setDeflectionPeakForTests(peak) {
    deflectionPeak = peak;
  },
  bumpDeflectionInFlight() {
    return noteDeflectionStart();
  },
  get deflectionInFlight() {
    return deflectionInFlight;
  },
  get deflectionPeak() {
    return deflectionPeak;
  },
  get deflectionSamples() {
    return deflectionSamples;
  },
  /** Arm/fire/read the swallowed-errors hook hermetically. */
  armSwallowedForTests() {
    swallowedArmed = true;
  },
  fireSwallowedError() {
    noteSwallowedError([new Error("boosthis test")]);
  },
  /** Feed console.error arguments through the counting path as logged. */
  fireSwallowedLogForTests(...args) {
    noteSwallowedError(args);
  },
  pushSwallowedTs(t) {
    swallowedTs.push(t);
  },
  get swallowedCount() {
    return swallowedTs.length;
  },
  /** Run a function while marked as "our own" logging (self-exclusion test). */
  withOurLog(fn) {
    swallowedInOurLog = true;
    try {
      fn();
    } finally {
      swallowedInOurLog = false;
    }
  },
  startSwallowed() {
    startSwallowedErrors();
  },
  restoreSwallowed() {
    restoreSwallowedErrors();
  },
  /* ── Leak Watch test seams ─────────────────────────────────────────────*/
  LEAK_MIN_WINDOW_MS,
  LEAK_WINDOW_MS,
  LEAK_RING_CAP,
  LEAK_LOG_SCAN_MAX,
  LEAK_BODY_SCAN_MAX,
  /** Arm the leak-watch reader hermetically (it shares swallowedArmed). */
  armLeakForTests() {
    swallowedArmed = true;
  },
  /** Classify a text slice → category enum only (no substring escapes). */
  classifyLeakForTests(text) {
    return classifyLeak(text)?.cat ?? null;
  },
  /** Classify a text slice → the closed numeric SHAPE code only. */
  classifyLeakShapeForTests(text) {
    return classifyLeak(text)?.shape ?? null;
  },
  /** Drive hook 1 (log/console output) through the real scan+record path. */
  noteLeakFromLogForTests(args) {
    noteLeakFromLog(args);
  },
  /** Drive hook 2 (response body) through the real scan+record path. */
  noteLeakFromResponseForTests(body, routeClass) {
    noteLeakFromResponse(body, routeClass);
  },
  /** Compute the coarse route class (closed {api,page,asset,other}). */
  leakRouteClassForTests(path, accept) {
    return leakRouteClass(path, accept);
  },
  /** Push a synthetic event directly into the ring. Surface/shape default to
   *  the log surface and the stack-frame shape so older callers still work. */
  pushLeakEventForTests(t, cat, surf = LEAK_SURFACE_LOG, shape = LEAK_SHAPE_STACK_FRAME) {
    leakEvents.push({ t, cat, surf, shape });
  },
  /** Add a synthetic distinct route class to the observed set. */
  addLeakRouteClassForTests(routeClass) {
    leakRouteClasses.add(routeClass);
  },
  get leakEventCount() {
    return leakEvents.length;
  },
  get leakRouteClassCount() {
    return leakRouteClasses.size;
  },
  _resetLeakForTests() {
    leakEvents.length = 0;
    leakRouteClasses.clear();
  },
  /** Drive the cookie-exposure collector through its REAL parse path. */
  noteCookiesForTests(header) {
    noteCookiesFromResponse(header);
  },
  /** Read the cookie-exposure axis exactly as the snapshot would. */
  readCookieExposureForTests() {
    return readCookieExposure();
  },
  _resetCookieExposureForTests() {
    resetCookieExposure();
  },
  /** Drive the cross-origin collector through its REAL classify path. */
  noteCorsForTests(requestOrigin, allowOrigin, allowCredentials) {
    noteCorsAnswer(classifyCorsAnswer(requestOrigin, allowOrigin, allowCredentials));
  },
  _setCorsClockForTests(fn) {
    corsNow = fn ?? Date.now;
  },
  _resetCorsExposureForTests() {
    resetCorsExposure();
    corsNow = Date.now;
  },
  /* ── Dev Posture test seams ────────────────────────────────────────────*/
  /** Read the dev-posture axis exactly as the snapshot would (freezes the
   *  snapshot on first call after start, like the real read). */
  readDevPostureForTests() {
    return readDevPosture();
  },
  /** Override the dev-posture checks with synthetic ones so bands / omission
   *  cases can be driven without touching the live process/env. Pass a
   *  partial: keys present become readable flags (0/1), absent keys stay
   *  UNREADABLE (their wire flag is omitted).
   *
   *  `profilingOpen` is the LIVE check, so its override is held separately and
   *  applies to every later read; pass `null` to pin "could not look". */
  _setDevPostureForTests(snap) {
    const { profilingOpen, ...frozen } = snap;
    devPostureFrozen = { ...frozen };
    devPostureProfilingOverride = "profilingOpen" in snap ? profilingOpen ?? null : null;
  },
  /** Let the LIVE inspector check read the real process again, after
   *  `_setDevPostureForTests` pinned it. */
  _clearDevPostureProfilingOverrideForTests() {
    devPostureProfilingOverride = void 0;
  },
  /** Drop the frozen dev-posture snapshot back to a clean (unread) state. */
  _resetDevPostureForTests() {
    resetDevPosture();
  },
  /** Fold one synthetic load-deflection sample (startInFlight, durationMs)
   *  through the SAME start/end path the finalizer uses — drive the in-flight
   *  counter up to `startInFlight` via repeated starts, record once via the
   *  end, then unwind the residual counter to 0 — so the merged wire math
   *  (bucket p75 + solo mean + least-squares slope) is exercised end-to-end. */
  addDeflectionSampleForTests(startInFlight, durationMs) {
    let token = 0;
    for (let i = 0; i < startInFlight; i++) token = noteDeflectionStart();
    noteDeflectionEnd(token, durationMs);
    while (deflectionInFlight > 0) deflectionInFlight--;
  }
};
function readDevPostureSnapshot() {
  const snap = {};
  try {
    const nodeEnv = typeof process !== "undefined" && process.env ? process.env.NODE_ENV || "development" : "development";
    snap.debugFlag = nodeEnv !== "production" ? 1 : 0;
  } catch {
  }
  try {
    const dbg = typeof process !== "undefined" && process.env ? process.env.DEBUG : void 0;
    snap.verboseErrors = typeof dbg === "string" && dbg !== "" ? 1 : 0;
  } catch {
  }
  try {
    const isFlag = (a) => typeof a === "string" && (a === "--enable-source-maps" || a.startsWith("--enable-source-maps="));
    let on = false;
    if (Array.isArray(process.execArgv)) on = process.execArgv.some(isFlag);
    if (!on && process.env && typeof process.env.NODE_OPTIONS === "string") {
      on = process.env.NODE_OPTIONS.split(/\s+/).some(isFlag);
    }
    snap.sourceMapTraces = on ? 1 : 0;
  } catch {
  }
  return snap;
}
function readProfilingOpen() {
  if (devPostureProfilingOverride !== void 0) {
    return devPostureProfilingOverride ?? void 0;
  }
  try {
    return inspectorUrl() ? 1 : 0;
  } catch {
    return void 0;
  }
}
function readDevPosture() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const snap = frozenDevPosture();
    const profilingOpen = readProfilingOpen();
    const present = [];
    if (snap.debugFlag !== void 0) present.push(["debugFlag", snap.debugFlag]);
    if (snap.verboseErrors !== void 0) {
      present.push(["verboseErrors", snap.verboseErrors]);
    }
    if (snap.sourceMapTraces !== void 0) {
      present.push(["sourceMapTraces", snap.sourceMapTraces]);
    }
    if (profilingOpen !== void 0) {
      present.push(["profilingOpen", profilingOpen]);
    }
    if (present.length === 0) return null;
    const checks = present.length;
    const findings = present.reduce((n, [, v]) => n + (v === 1 ? 1 : 0), 0);
    const debugOn = snap.debugFlag === 1;
    let score = 100;
    if (debugOn) score -= 60;
    for (const [name, v] of present) {
      if (v === 1 && name !== "debugFlag") score -= 20;
    }
    score = Math.max(0, Math.min(100, score));
    const rating = debugOn ? "poor" : findings > 0 ? "needs-work" : "good";
    let caption;
    if (findings === 0) {
      caption = `none of the ${checks} development settings we can read were on`;
    } else {
      const on = [];
      if (snap.debugFlag === 1) on.push("debug mode on");
      if (snap.verboseErrors === 1) on.push("verbose error pages on");
      if (snap.sourceMapTraces === 1) {
        on.push("source-map stack traces on (--enable-source-maps)");
      }
      if (profilingOpen === 1) on.push("profiling port open");
      caption = on.join(", ");
    }
    const axis = {
      score,
      rating,
      caption,
      findings,
      checks,
      measurable: 1
    };
    for (const [name, v] of present) axis[name] = v;
    return axis;
  } catch {
    return null;
  }
}
function resetDevPosture() {
  devPostureFrozen = null;
  devPostureProfilingOverride = void 0;
}
let devPostureFrozen = null;
let devPostureProfilingOverride;
function frozenDevPosture() {
  if (devPostureFrozen === null) devPostureFrozen = readDevPostureSnapshot();
  return devPostureFrozen;
}
const LEAK_SHAPE_JWT = 1;
const LEAK_SHAPE_BEARER = 2;
const LEAK_SHAPE_AWS_KEY_ID = 4;
const LEAK_SHAPE_PRIVATE_KEY = 8;
const LEAK_SHAPE_NAMED_VALUE = 16;
const LEAK_SHAPE_EMAIL = 32;
const LEAK_SHAPE_STACK_FRAME = 64;
const LEAK_SHAPE_WORDS = [
  { bit: LEAK_SHAPE_JWT, word: "a JSON Web Token" },
  { bit: LEAK_SHAPE_BEARER, word: "a bearer credential" },
  { bit: LEAK_SHAPE_AWS_KEY_ID, word: "an AWS access-key id" },
  { bit: LEAK_SHAPE_PRIVATE_KEY, word: "a private-key header" },
  { bit: LEAK_SHAPE_NAMED_VALUE, word: "a named api-key/secret/token value" },
  { bit: LEAK_SHAPE_EMAIL, word: "an email address" },
  { bit: LEAK_SHAPE_STACK_FRAME, word: "a stack frame" }
];
function isLeakPlaceholder(value) {
  try {
    const v = value.replace(LEAK_VALUE_LTRIM_RE, "");
    return v.length > 0 && LEAK_PLACEHOLDER_VALUE_RE.test(v);
  } catch {
    return false;
  }
}
const LEAK_MAX_MATCHES_PER_SHAPE = 16;
const LEAK_VALUE_LTRIM_RE = /^[("'`[]+/;
function leakShapePhrase(shapeMask) {
  const words = LEAK_SHAPE_WORDS.filter((s) => (shapeMask & s.bit) !== 0).map(
    (s) => s.word
  );
  if (words.length === 0) return "shape not recorded";
  return `matched ${words.join(", ")}`;
}
const LEAK_SURFACE_REPLY = 2;
function hasRealValue(re, text) {
  try {
    re.lastIndex = 0;
    for (let i = 0; i < LEAK_MAX_MATCHES_PER_SHAPE; i++) {
      const m = re.exec(text);
      if (!m) break;
      if (!isLeakPlaceholder(m[1] ?? "")) return true;
      if (m[0].length === 0) re.lastIndex += 1;
    }
    return false;
  } catch {
    return false;
  } finally {
    re.lastIndex = 0;
  }
}
export {
  LEAK_SHAPE_AWS_KEY_ID,
  LEAK_SHAPE_BEARER,
  LEAK_SHAPE_EMAIL,
  LEAK_SHAPE_JWT,
  LEAK_SHAPE_NAMED_VALUE,
  LEAK_SHAPE_PRIVATE_KEY,
  LEAK_SHAPE_STACK_FRAME,
  REFUSAL_MIN_WINDOW_MS,
  _extraMetersInternals,
  _resetAccessPressureForTests,
  _resetRefusalHonestyForTests,
  _rollAccessBucketsForTests,
  _setAccessBucketStartForTests,
  _setAccessClockForTests,
  _setRefusalClockForTests,
  classifyCorsAnswer,
  clearExtraMeters,
  leakRouteClass,
  noteAccessOutcome,
  noteCookiesFromResponse,
  noteCorsAnswer,
  noteDeflectionEnd,
  noteDeflectionStart,
  noteLeakFromResponse,
  noteRefusalHonesty,
  noteResponseBackpressure,
  noteWorkerRequest,
  readAccessPressure,
  readBackpressure,
  readCookieExposure,
  readCorsExposure,
  readDevPosture,
  readExtraMeters,
  readHandleChurn,
  readLeakWatch,
  readLoadDeflection,
  readPromiseRejections,
  readRefusalHonesty,
  readRejectionPressure,
  readSwallowedErrors,
  readWorkerImbalance,
  startExtraMeters,
  utf8BytePrefix
};
