// @ts-nocheck
/* eslint-disable */
// Built from src/eventLoopLag.ts so plain node can run the kit. Do not edit.
import { monitorEventLoopDelay } from "node:perf_hooks";
import { isBunRuntime } from "./runtimeTag.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { SETTLE_RULE, isSettling, markSettled, settledFromMs } from "./settleRule.js";
import { linearScore, ratingFor } from "./healthAxes.js";
import { earnedPerMin, windowMinOf } from "./rateHonesty.js";
import {
  onSuspendActivity,
  onSuspendIdleStart,
  onSuspendWake,
  SUSPEND_UNIT
} from "./suspendSensor.js";
const RESOLUTION_MS = 20;
const LAG_GOOD_MS = 50;
const LAG_POOR_MS = 250;
const MIN_LAG_SAMPLES = 20;
const FREEZE_GOOD_MS = 100;
const FREEZE_POOR_MS = 1e3;
const FREEZE_COUNT_MS = 250;
const FREEZE_RATE_GOOD_PER_MIN = 1;
const FREEZE_RATE_POOR_PER_MIN = 12;
const BLOCKING_ASYNC_GOOD_PER_MIN = 0.5;
const BLOCKING_ASYNC_POOR_PER_MIN = 10;
const BLOCKING_ASYNC_MIN_WINDOW_MS = 6e4;
let histogram = null;
let trafficMaxNs = 0;
let carriedWorstMs = 0;
let carriedSamples = 0;
let carriedFreezeCount = 0;
let carriedObservedMs = 0;
let suspendPurges = 0;
let suspendWorstMs = 0;
let settleResetDone = false;
let blockingBase = null;
let histogramStartedMs = 0;
function settleIfDue(nowMs = Date.now()) {
  if (!histogram) return;
  if (!settleResetDone && histogramStartedMs >= settledFromMs("latencyTail")) settleResetDone = true;
  if (!blockingBase && histogramStartedMs >= settledFromMs("startupEvent")) {
    blockingBase = { count: 0, observedMs: 0 };
  }
  if (!settleResetDone && nowMs >= settledFromMs("latencyTail")) {
    settleResetDone = true;
    try {
      histogram.reset();
    } catch {
    }
    trafficMaxNs = 0;
    carriedWorstMs = 0;
    carriedSamples = 0;
    carriedFreezeCount = 0;
    carriedObservedMs = 0;
  }
  if (settleResetDone && !blockingBase && nowMs >= settledFromMs("startupEvent")) {
    blockingBase = {
      count: carriedFreezeCount + samplesAtOrAbove(histogram, FREEZE_COUNT_MS),
      observedMs: carriedObservedMs + observedMsFromHistogram(histogram)
    };
  }
}
function settlingLoop(count) {
  return { score: null, rating: "pending", sampleCount: count, settleRule: SETTLE_RULE };
}
function nsToMs(ns) {
  if (!Number.isFinite(ns) || ns <= 0) return 0;
  return Math.round(ns / 1e6);
}
function samplesAtOrAbove(h, thresholdMs) {
  const total = h.count ?? 0;
  if (total <= 0) return 0;
  if (nsToMs(h.max ?? 0) < thresholdMs) return 0;
  const valueAtRank = (k) => nsToMs(h.percentile(Math.min(100, 100 * k / total)));
  let lo = 1;
  let hi = total;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (valueAtRank(mid) >= thresholdMs) hi = mid;
    else lo = mid + 1;
  }
  return valueAtRank(lo) >= thresholdMs ? total - lo + 1 : 0;
}
function observedMsFromHistogram(h) {
  const count = h.count ?? 0;
  if (count <= 0) return 0;
  const meanNs = h.mean;
  const meanMs = Number.isFinite(meanNs) && meanNs > 0 ? meanNs / 1e6 : 0;
  if (isBunRuntime()) return 0;
  return Math.round(count * Math.max(meanMs, RESOLUTION_MS));
}
function markTrafficTime() {
  if (!histogram) return;
  try {
    const m = histogram.max ?? 0;
    if (m > trafficMaxNs) trafficMaxNs = m;
  } catch {
  }
}
function handleSuspendWake() {
  if (!histogram) return;
  try {
    const curMax = histogram.max ?? 0;
    if (nsToMs(curMax) > nsToMs(trafficMaxNs)) {
      suspendPurges++;
      suspendWorstMs = Math.max(suspendWorstMs, nsToMs(curMax));
      const cleanMaxMs = nsToMs(trafficMaxNs);
      carriedWorstMs = Math.max(carriedWorstMs, cleanMaxMs);
      carriedSamples += histogram.count ?? 0;
      carriedFreezeCount += Math.max(
        0,
        samplesAtOrAbove(histogram, FREEZE_COUNT_MS) - samplesAtOrAbove(histogram, cleanMaxMs + 1)
      );
      carriedObservedMs += (histogram.count ?? 0) * RESOLUTION_MS;
      histogram.reset();
      trafficMaxNs = 0;
    }
  } catch {
  }
}
onSuspendWake(handleSuspendWake);
onSuspendActivity(markTrafficTime);
onSuspendIdleStart(markTrafficTime);
function startEventLoopLag() {
  if (isBoosthisDisabled() || histogram) return;
  try {
    if (typeof monitorEventLoopDelay !== "function") return;
    const h = monitorEventLoopDelay({ resolution: RESOLUTION_MS });
    h.enable();
    histogram = h;
    histogramStartedMs = Date.now();
    for (const at of [settledFromMs("latencyTail"), settledFromMs("startupEvent")]) {
      const t = setTimeout(() => settleIfDue(), Math.max(0, at - Date.now()) + 5);
      if (typeof t.unref === "function") {
        t.unref();
      }
    }
  } catch {
    histogram = null;
  }
}
function readEventLoopLag() {
  if (isBoosthisDisabled() || !histogram) return null;
  try {
    settleIfDue();
    const count = (histogram.count ?? 0) + carriedSamples;
    if (!settleResetDone) return count > 0 && isSettling("latencyTail") ? settlingLoop(count) : null;
    if (count < MIN_LAG_SAMPLES) return null;
    const lagP50Ms = nsToMs(histogram.percentile(50));
    const lagP99Ms = nsToMs(histogram.percentile(99));
    const lagMaxMs = Math.max(nsToMs(histogram.max), carriedWorstMs);
    const score = linearScore(lagP99Ms, LAG_GOOD_MS, LAG_POOR_MS);
    const axis = {
      score,
      rating: ratingFor(score),
      lagP50Ms,
      lagP99Ms,
      lagMaxMs,
      sampleCount: count
    };
    markSettled(axis);
    if (suspendPurges > 0) {
      axis.suspendDiscounts = suspendPurges;
      axis.suspendUnit = SUSPEND_UNIT.RECORD_RESETS;
    }
    return axis;
  } catch {
    return null;
  }
}
function readWorstFreeze() {
  if (isBoosthisDisabled() || !histogram) return null;
  try {
    settleIfDue();
    const count = (histogram.count ?? 0) + carriedSamples;
    if (!settleResetDone) return count > 0 && isSettling("latencyTail") ? settlingLoop(count) : null;
    if (count < MIN_LAG_SAMPLES) return null;
    const worstMs = Math.max(nsToMs(histogram.max), carriedWorstMs);
    const severity = linearScore(worstMs, FREEZE_GOOD_MS, FREEZE_POOR_MS);
    const freezeCount = Math.max(
      carriedFreezeCount + samplesAtOrAbove(histogram, FREEZE_COUNT_MS),
      worstMs >= FREEZE_COUNT_MS ? 1 : 0
    );
    const observedMs = carriedObservedMs + observedMsFromHistogram(histogram);
    const freezesPerMin = earnedPerMin(freezeCount, observedMs);
    const score = freezesPerMin === null ? severity : Math.min(
      severity,
      linearScore(
        freezesPerMin,
        FREEZE_RATE_GOOD_PER_MIN,
        FREEZE_RATE_POOR_PER_MIN
      )
    );
    const axis = {
      score,
      rating: ratingFor(score),
      worstMs,
      freezeCount,
      windowMin: windowMinOf(observedMs),
      sampleCount: count
    };
    markSettled(axis);
    if (freezesPerMin !== null) axis.freezesPerMin = freezesPerMin;
    if (suspendPurges > 0) {
      axis.suspendDiscounts = suspendPurges;
      axis.suspendUnit = SUSPEND_UNIT.RECORD_RESETS;
      axis.suspendWorstMs = suspendWorstMs;
    }
    return axis;
  } catch {
    return null;
  }
}
function readBlockingAsync() {
  if (isBoosthisDisabled() || !histogram) return null;
  try {
    settleIfDue();
    if (!blockingBase) {
      if (isBunRuntime()) return null;
      const n = (histogram.count ?? 0) + carriedSamples;
      return n > 0 && isSettling("startupEvent") ? settlingLoop(n) : null;
    }
    const observedMs = Math.max(
      0,
      carriedObservedMs + observedMsFromHistogram(histogram) - blockingBase.observedMs
    );
    if (observedMs < BLOCKING_ASYNC_MIN_WINDOW_MS) return null;
    const worstMs = Math.max(nsToMs(histogram.max), carriedWorstMs);
    const count = Math.max(
      0,
      carriedFreezeCount + samplesAtOrAbove(histogram, FREEZE_COUNT_MS) - blockingBase.count
    );
    const perMin = earnedPerMin(count, observedMs);
    if (perMin === null) return null;
    const score = linearScore(
      perMin,
      BLOCKING_ASYNC_GOOD_PER_MIN,
      BLOCKING_ASYNC_POOR_PER_MIN
    );
    return markSettled({
      score,
      rating: ratingFor(score),
      count,
      perMin,
      worstMs,
      windowMin: windowMinOf(observedMs)
    });
  } catch {
    return null;
  }
}
const _lagInternals = {
  MIN_LAG_SAMPLES,
  FREEZE_GOOD_MS,
  FREEZE_POOR_MS,
  FREEZE_COUNT_MS,
  FREEZE_RATE_GOOD_PER_MIN,
  FREEZE_RATE_POOR_PER_MIN,
  RESOLUTION_MS,
  /** Swap in a fake histogram (worstFreeze / lag unit tests). */
  setHistogramForTest(h) {
    histogram = h;
    histogramStartedMs = Date.now();
    settleResetDone = false;
    blockingBase = null;
  },
  /** The two histogram derivations, exposed so a test can drive them against a
   *  REAL `monitorEventLoopDelay` rather than a double that models its own
   *  assumptions back at it. */
  observedMsForTest(h) {
    return observedMsFromHistogram(h);
  },
  samplesAtOrAboveForTest(h, thresholdMs) {
    return samplesAtOrAbove(h, thresholdMs);
  },
  /** Drive the suspend boundaries directly (no wall-clock games). */
  markTrafficTimeForTest() {
    markTrafficTime();
  },
  handleSuspendWakeForTest() {
    handleSuspendWake();
  },
  getSuspendStateForTest() {
    return {
      suspendPurges,
      suspendWorstMs,
      carriedWorstMs,
      carriedSamples,
      carriedFreezeCount,
      carriedObservedMs
    };
  }
};
function clearEventLoopLag() {
  if (histogram) {
    try {
      histogram.disable();
    } catch {
    }
    histogram = null;
  }
  trafficMaxNs = 0;
  carriedWorstMs = 0;
  carriedSamples = 0;
  carriedFreezeCount = 0;
  carriedObservedMs = 0;
  suspendPurges = 0;
  suspendWorstMs = 0;
  settleResetDone = false;
  blockingBase = null;
}
const _eventLoopLagInternals = {
  LAG_GOOD_MS,
  LAG_POOR_MS,
  MIN_LAG_SAMPLES,
  RESOLUTION_MS,
  get isRunning() {
    return histogram !== null;
  },
  reset() {
    clearEventLoopLag();
  }
};
export {
  BLOCKING_ASYNC_GOOD_PER_MIN,
  BLOCKING_ASYNC_MIN_WINDOW_MS,
  BLOCKING_ASYNC_POOR_PER_MIN,
  FREEZE_COUNT_MS,
  _eventLoopLagInternals,
  _lagInternals,
  clearEventLoopLag,
  readBlockingAsync,
  readEventLoopLag,
  readWorstFreeze,
  startEventLoopLag
};
