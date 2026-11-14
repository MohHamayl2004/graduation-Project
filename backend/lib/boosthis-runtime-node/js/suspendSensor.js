// @ts-nocheck
/* eslint-disable */
// Built from src/suspendSensor.ts so plain node can run the kit. Do not edit.
import { setKitFootprintSuspendProbe } from "./kitFootprint.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
const SUSPEND_GAP_MS = 1e4;
const WAKE_WINDOW_MS = 6e4;
const STALLED_WALL_WITHOUT_CPU_MS = 100;
const SUSPEND_UNIT = {
  /** Individual measurements dropped from the reading before it was taken. */
  SAMPLES: 1,
  /** Whole measured runs thrown away rather than charged to the thing
   *  being measured. */
  RUNS: 2,
  /** The recorded worst thrown away and the recording restarted — one
   *  discount can cover any number of samples, which is why this number is
   *  small beside a per-sample one over the same window. */
  RECORD_RESETS: 3,
  /** Accounting periods the host reported while it was asleep. */
  PERIODS: 4,
  /** Whole billed windows the host was witnessed suspending us through. */
  BILLED_WINDOWS: 5
};
let lastActivityMs = 0;
let wakeUntilMs = 0;
let wakeCount = 0;
const idleStartListeners = [];
const wakeListeners = [];
const activityListeners = [];
function fire(list, gapMs) {
  for (const fn of list) {
    try {
      fn(gapMs);
    } catch {
    }
  }
}
function noteSuspendActivity() {
  if (isBoosthisDisabled()) return;
  const now = Date.now();
  if (lastActivityMs > 0) {
    const gap = now - lastActivityMs;
    if (gap >= SUSPEND_GAP_MS) {
      wakeCount++;
      wakeUntilMs = now + WAKE_WINDOW_MS;
      fire(wakeListeners, gap);
    }
  }
  lastActivityMs = now;
  fire(activityListeners, 0);
}
function noteSuspendIdleStart() {
  if (isBoosthisDisabled()) return;
  lastActivityMs = Date.now();
  fire(idleStartListeners, 0);
}
function inSuspendWakeWindow(nowMs) {
  const now = nowMs ?? Date.now();
  return wakeUntilMs > 0 && now <= wakeUntilMs;
}
function getSuspendWakeCount() {
  return wakeCount;
}
function hostHasSuspended() {
  return wakeCount > 0;
}
function suspendTouchedInterval(interval) {
  const { endedAtMs, wallMs, cpuMs } = interval;
  if (!Number.isFinite(endedAtMs) || !Number.isFinite(wallMs) || wallMs < 0) {
    return false;
  }
  if (inSuspendWakeWindow(endedAtMs) || inSuspendWakeWindow(endedAtMs - wallMs)) {
    return true;
  }
  if (wallMs >= SUSPEND_GAP_MS) return true;
  if (hostHasSuspended() && cpuMs !== null && Number.isFinite(cpuMs) && wallMs - Math.max(0, cpuMs) >= STALLED_WALL_WITHOUT_CPU_MS) {
    return true;
  }
  return false;
}
function onSuspendIdleStart(fn) {
  idleStartListeners.push(fn);
}
function onSuspendWake(fn) {
  wakeListeners.push(fn);
}
function onSuspendActivity(fn) {
  activityListeners.push(fn);
}
function clearSuspendSensor() {
  lastActivityMs = 0;
  wakeUntilMs = 0;
  wakeCount = 0;
}
setKitFootprintSuspendProbe(suspendTouchedInterval);
const _suspendSensorInternals = {
  SUSPEND_GAP_MS,
  WAKE_WINDOW_MS,
  STALLED_WALL_WITHOUT_CPU_MS,
  reset() {
    clearSuspendSensor();
  },
  /** Pretend the host has been caught suspending, so the processor clause of
   *  `suspendTouchedInterval` is live without staging a real idle gap. */
  setWakeCountForTest(count) {
    wakeCount = count;
  },
  /** Force the sensor into (or out of) a wake window without wall-clock games. */
  setWakeWindowForTest(untilMs) {
    wakeUntilMs = untilMs;
  },
  /** Backdate the last-activity mark so the next activity registers a gap. */
  setLastActivityForTest(ms) {
    lastActivityMs = ms;
  }
};
export {
  STALLED_WALL_WITHOUT_CPU_MS,
  SUSPEND_GAP_MS,
  SUSPEND_UNIT,
  WAKE_WINDOW_MS,
  _suspendSensorInternals,
  clearSuspendSensor,
  getSuspendWakeCount,
  hostHasSuspended,
  inSuspendWakeWindow,
  noteSuspendActivity,
  noteSuspendIdleStart,
  onSuspendActivity,
  onSuspendIdleStart,
  onSuspendWake,
  suspendTouchedInterval
};
