// @ts-nocheck
/* eslint-disable */
// Built from src/runtimeSafetyMeters.ts so plain node can run the kit. Do not edit.
import { linearScore, ratingFor } from "./healthAxes.js";
import { REASON_BLOCKED_BY_ENVIRONMENT } from "./axisReasons.js";
import { windowMinOf } from "./rateHonesty.js";
import { isSettling, markSettled, settledFromMs, settlingReading } from "./settleRule.js";
const ERROR_GOOD_PER_HOUR = 0;
const ERROR_POOR_PER_HOUR = 5;
const MIN_ERROR_WINDOW_MS = 5 * 6e4;
const TIMER_GOOD_PER_MIN = 1;
const TIMER_POOR_PER_MIN = 30;
const MIN_TIMER_SAMPLES = 12;
const MIN_TIMER_SPAN_MS = 6e4;
const SAMPLE_EVERY_MS = 5e3;
const RING_CAP = 240;
let startedAt = 0;
let errorCount = 0;
let errorInstalled = false;
let errorInstallFailed = false;
let errorMonitor = null;
let timersInstalled = false;
let outstanding = 0;
let unwatchedTimers = 1;
let sampler = null;
const samples = [];
const timeoutHandles = /* @__PURE__ */ new Set();
const intervalHandles = /* @__PURE__ */ new Set();
const immediateHandles = /* @__PURE__ */ new Set();
let origSetTimeout = null;
let origSetInterval = null;
let origSetImmediate = null;
let origClearTimeout = null;
let origClearInterval = null;
let origClearImmediate = null;
let wrappedSetTimeout = null;
let wrappedSetInterval = null;
let wrappedSetImmediate = null;
let wrappedClearTimeout = null;
let wrappedClearInterval = null;
let wrappedClearImmediate = null;
function r1(value) {
  return Math.round(value * 10) / 10;
}
function sample(now = Date.now()) {
  if (!timersInstalled) return;
  samples.push({ t: now, count: outstanding });
  if (samples.length > RING_CAP) samples.shift();
}
function dec(set, handle) {
  try {
    if (set.delete(handle) && outstanding > 0) outstanding--;
  } catch {
  }
}
function countPreexistingTimers() {
  try {
    const handles = process._getActiveHandles?.() ?? [];
    return handles.filter((handle) => {
      const name = handle?.constructor?.name;
      return name === "Timeout" || name === "Immediate" || name === "Timer";
    }).length;
  } catch {
    return 0;
  }
}
function startRuntimeSafetyMeters() {
  if (startedAt > 0) return;
  startedAt = Date.now();
  try {
    errorMonitor = () => {
      try {
        errorCount++;
      } catch {
      }
    };
    process.on("uncaughtExceptionMonitor", errorMonitor);
    errorInstalled = true;
  } catch {
    errorMonitor = null;
    errorInstallFailed = true;
  }
  try {
    const g = globalThis;
    if (typeof g.setTimeout !== "function" || typeof g.setInterval !== "function" || typeof g.setImmediate !== "function" || typeof g.clearTimeout !== "function" || typeof g.clearInterval !== "function" || typeof g.clearImmediate !== "function") return;
    origSetTimeout = g.setTimeout;
    origSetInterval = g.setInterval;
    origSetImmediate = g.setImmediate;
    origClearTimeout = g.clearTimeout;
    origClearInterval = g.clearInterval;
    origClearImmediate = g.clearImmediate;
    unwatchedTimers = 1 + countPreexistingTimers();
    wrappedSetTimeout = function(callback, delay, ...args) {
      let handle;
      const wrapped = function(...callbackArgs) {
        dec(timeoutHandles, handle);
        return callback.apply(this, callbackArgs);
      };
      handle = origSetTimeout(wrapped, delay, ...args);
      try {
        timeoutHandles.add(handle);
        outstanding++;
      } catch {
      }
      return handle;
    };
    wrappedSetInterval = function(callback, delay, ...args) {
      const handle = origSetInterval(callback, delay, ...args);
      try {
        intervalHandles.add(handle);
        outstanding++;
      } catch {
      }
      return handle;
    };
    wrappedSetImmediate = function(callback, ...args) {
      let handle;
      const wrapped = function(...callbackArgs) {
        dec(immediateHandles, handle);
        return callback.apply(this, callbackArgs);
      };
      handle = origSetImmediate(wrapped, ...args);
      try {
        immediateHandles.add(handle);
        outstanding++;
      } catch {
      }
      return handle;
    };
    wrappedClearTimeout = (handle) => {
      dec(timeoutHandles, handle);
      dec(intervalHandles, handle);
      origClearTimeout(handle);
    };
    wrappedClearInterval = (handle) => {
      dec(intervalHandles, handle);
      dec(timeoutHandles, handle);
      origClearInterval(handle);
    };
    wrappedClearImmediate = (handle) => {
      dec(immediateHandles, handle);
      origClearImmediate(handle);
    };
    g.setTimeout = wrappedSetTimeout;
    g.setInterval = wrappedSetInterval;
    g.setImmediate = wrappedSetImmediate;
    g.clearTimeout = wrappedClearTimeout;
    g.clearInterval = wrappedClearInterval;
    g.clearImmediate = wrappedClearImmediate;
    timersInstalled = true;
    sample();
    sampler = origSetInterval(() => sample(), SAMPLE_EVERY_MS);
    sampler?.unref?.();
  } catch {
    clearTimerTracking();
  }
}
function readUnhandledErrors(now = Date.now()) {
  const windowMs = Math.max(0, now - startedAt);
  const windowMin = windowMinOf(windowMs);
  if (!errorInstalled) {
    const unavailable = {
      score: null,
      rating: "pending",
      count: null,
      windowMin,
      perHour: null
    };
    if (errorInstallFailed) {
      unavailable.measurable = 0;
      unavailable.reasonCode = REASON_BLOCKED_BY_ENVIRONMENT;
    }
    return unavailable;
  }
  if (windowMs < MIN_ERROR_WINDOW_MS) {
    return {
      score: null,
      rating: "pending",
      count: errorCount === 0 ? null : errorCount,
      windowMin,
      perHour: null
    };
  }
  const perHour = r1(errorCount / (windowMs / 36e5));
  const score = linearScore(perHour, ERROR_GOOD_PER_HOUR, ERROR_POOR_PER_HOUR);
  return { score, rating: ratingFor(score), count: errorCount, windowMin, perHour };
}
function slopePerMin(points) {
  const n = points.length;
  const t0 = points[0].t;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const point of points) {
    const x = (point.t - t0) / 6e4;
    sx += x;
    sy += point.count;
    sxx += x * x;
    sxy += x * point.count;
  }
  const denominator = n * sxx - sx * sx;
  return denominator === 0 ? 0 : (n * sxy - sx * sy) / denominator;
}
function everyThirdSlopePerMin(points) {
  const t0 = points[0].t;
  const span = points[points.length - 1].t - t0;
  let slowest = Infinity;
  for (let k = 0; k < 3; k++) {
    const lo = t0 + span * k / 3;
    const hi = t0 + span * (k + 1) / 3;
    const slice = points.filter((p) => p.t >= lo && (k === 2 ? p.t <= hi : p.t < hi));
    slowest = Math.min(slowest, slice.length < 2 ? 0 : slopePerMin(slice));
  }
  return slowest;
}
function readTimerHealth() {
  const now = Date.now();
  const from = settledFromMs("startupEvent");
  const settled = samples.filter((s) => s.t >= from);
  if (!timersInstalled || settled.length < MIN_TIMER_SAMPLES || settled[settled.length - 1].t - settled[0].t < MIN_TIMER_SPAN_MS) {
    const pending = {
      score: null,
      rating: "pending",
      timers: null,
      growthPerMin: null,
      sampleCount: settled.length,
      unwatchedTimers
    };
    return timersInstalled && isSettling("startupEvent", now) ? settlingReading(pending) : pending;
  }
  const growthPerMin = r1(everyThirdSlopePerMin(settled)) || 0;
  const score = linearScore(
    Math.max(0, growthPerMin),
    TIMER_GOOD_PER_MIN,
    TIMER_POOR_PER_MIN
  );
  return markSettled({
    score,
    rating: ratingFor(score),
    timers: settled[settled.length - 1].count,
    growthPerMin,
    sampleCount: settled.length,
    unwatchedTimers
  });
}
function clearTimerTracking() {
  try {
    if (sampler != null && origClearInterval) origClearInterval(sampler);
    const g = globalThis;
    if (g.setTimeout === wrappedSetTimeout && origSetTimeout) g.setTimeout = origSetTimeout;
    if (g.setInterval === wrappedSetInterval && origSetInterval) g.setInterval = origSetInterval;
    if (g.setImmediate === wrappedSetImmediate && origSetImmediate) g.setImmediate = origSetImmediate;
    if (g.clearTimeout === wrappedClearTimeout && origClearTimeout) g.clearTimeout = origClearTimeout;
    if (g.clearInterval === wrappedClearInterval && origClearInterval) g.clearInterval = origClearInterval;
    if (g.clearImmediate === wrappedClearImmediate && origClearImmediate) g.clearImmediate = origClearImmediate;
  } catch {
  }
  timersInstalled = false;
  sampler = null;
  outstanding = 0;
  samples.length = 0;
  timeoutHandles.clear();
  intervalHandles.clear();
  immediateHandles.clear();
}
function clearRuntimeSafetyMeters() {
  try {
    if (errorMonitor) process.removeListener("uncaughtExceptionMonitor", errorMonitor);
  } catch {
  }
  errorMonitor = null;
  errorInstalled = false;
  errorInstallFailed = false;
  errorCount = 0;
  clearTimerTracking();
  startedAt = 0;
}
const _runtimeSafetyInternals = {
  MIN_ERROR_WINDOW_MS,
  MIN_TIMER_SAMPLES,
  MIN_TIMER_SPAN_MS,
  forceStartedAt(value) {
    startedAt = value;
  },
  setErrorInstalled(value) {
    errorInstalled = value;
  },
  addErrors(value) {
    errorCount += value;
  },
  setTimersInstalled(value) {
    timersInstalled = value;
  },
  pushTimerSample(t, count) {
    samples.push({ t, count });
  }
};
export {
  _runtimeSafetyInternals,
  clearRuntimeSafetyMeters,
  readTimerHealth,
  readUnhandledErrors,
  startRuntimeSafetyMeters
};
