// @ts-nocheck
/* eslint-disable */
// Built from src/serverMeters.ts so plain node can run the kit. Do not edit.
import { isBoosthisDisabled } from "./runtimeFlags.js";
import {
  IDLE_MIN_WALL_MS,
  LATENCY_FLOOR_WINDOW_MS
} from "./meterAxes.js";
import { inSuspendWakeWindow, SUSPEND_UNIT } from "./suspendSensor.js";
import { settledFromMs } from "./settleRule.js";
const IDLE_GAP_MS = 3e3;
const IDLE_LONG_TASK_MS = 1e3;
const IDLE_MAX_WALL_MS = 36e5;
let idleWallMs = 0;
let idleCpuMs = 0;
let idleLongTaskCount = 0;
let idleCpuMark = null;
let idleSince = 0;
function cpuAvailable() {
  return typeof process?.cpuUsage === "function";
}
function noteIdleStart() {
  if (isBoosthisDisabled()) return;
  idleSince = Date.now();
  if (cpuAvailable()) {
    try {
      idleCpuMark = process.cpuUsage();
    } catch {
      idleCpuMark = null;
    }
  }
}
function noteIdleEnd() {
  if (isBoosthisDisabled()) return;
  if (idleSince <= 0 || !idleCpuMark || !cpuAvailable()) {
    idleSince = 0;
    idleCpuMark = null;
    return;
  }
  const startedAt = idleSince;
  const wall = Date.now() - idleSince;
  idleSince = 0;
  const mark = idleCpuMark;
  idleCpuMark = null;
  if (wall < IDLE_GAP_MS) return;
  if (startedAt < settledFromMs("peakRate")) return;
  try {
    const delta = process.cpuUsage(mark);
    const cpuMs = (delta.user + delta.system) / 1e3;
    idleWallMs += wall;
    idleCpuMs += cpuMs;
    if (cpuMs >= IDLE_LONG_TASK_MS) idleLongTaskCount++;
    if (idleWallMs > IDLE_MAX_WALL_MS) {
      idleWallMs /= 2;
      idleCpuMs /= 2;
    }
  } catch {
  }
}
function getIdleStats() {
  return {
    idleWallMs: Math.round(idleWallMs),
    idleCpuMs: Math.round(idleCpuMs),
    idleLongTaskCount
  };
}
const LATENCY_FLOOR_MAX_WINDOWS = 4320;
let curWindowStart = -1;
let curWindow = [];
let closedP95s = [];
let worstWindowP95 = 0;
let suspendSamplesDiscounted = 0;
let suspendWorstSampleMs = 0;
const MAX_FLOOR_KEYS = 1e4;
const seenFloorKeys = /* @__PURE__ */ new Set();
let settledFloorSamples = 0;
function getLatencyFloorSettledSamples() {
  return settledFloorSamples;
}
function windowStartOf(now) {
  return Math.floor(now / LATENCY_FLOOR_WINDOW_MS) * LATENCY_FLOOR_WINDOW_MS;
}
function p95(values) {
  if (values.length === 0) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1));
  return s[idx];
}
function closeCurrentWindow() {
  if (curWindow.length > 0) {
    const val = p95(curWindow);
    closedP95s.push(val);
    if (closedP95s.length > LATENCY_FLOOR_MAX_WINDOWS) closedP95s.shift();
    if (val > worstWindowP95) worstWindowP95 = val;
  }
  curWindow = [];
}
function recordLatencySample(durationMs, routeKey) {
  if (isBoosthisDisabled()) return;
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  const now = Date.now();
  if (routeKey && !seenFloorKeys.has(routeKey)) {
    if (seenFloorKeys.size < MAX_FLOOR_KEYS) seenFloorKeys.add(routeKey);
    return;
  }
  if (now < settledFromMs("latencyTail")) return;
  if (inSuspendWakeWindow(now)) {
    suspendSamplesDiscounted++;
    if (durationMs > suspendWorstSampleMs) {
      suspendWorstSampleMs = Math.round(durationMs);
    }
    return;
  }
  const start = windowStartOf(now);
  if (curWindowStart < 0) {
    curWindowStart = start;
  } else if (start > curWindowStart) {
    closeCurrentWindow();
    if (closedP95s.length > 0) {
      worstWindowP95 = Math.max(...closedP95s);
    }
    curWindowStart = start;
  }
  curWindow.push(durationMs);
  settledFloorSamples++;
}
function getLatencyFloorStats() {
  return {
    worstMs: worstWindowP95,
    windowCount: closedP95s.length
  };
}
function getLatencyFloorSuspendStats() {
  return {
    suspendDiscounts: suspendSamplesDiscounted,
    suspendWorstMs: suspendWorstSampleMs,
    suspendUnit: SUSPEND_UNIT.SAMPLES
  };
}
function clearServerMeters() {
  idleWallMs = 0;
  idleCpuMs = 0;
  idleLongTaskCount = 0;
  idleCpuMark = null;
  idleSince = 0;
  curWindowStart = -1;
  curWindow = [];
  closedP95s = [];
  worstWindowP95 = 0;
  seenFloorKeys.clear();
  settledFloorSamples = 0;
  suspendSamplesDiscounted = 0;
  suspendWorstSampleMs = 0;
}
const _serverMetersInternals = {
  IDLE_GAP_MS,
  IDLE_MIN_WALL_MS,
  LATENCY_FLOOR_WINDOW_MS,
  reset() {
    clearServerMeters();
  },
  /** Directly fold an idle window (for hermetic tests without wall/CPU I/O). */
  addIdleWindowForTests(wallMs, cpuMs) {
    if (wallMs < IDLE_GAP_MS) return;
    idleWallMs += wallMs;
    idleCpuMs += cpuMs;
    if (cpuMs >= IDLE_LONG_TASK_MS) idleLongTaskCount++;
  },
  /** Directly close a window with a given p95 (for hermetic tests). */
  addClosedWindowForTests(p95Ms) {
    settledFloorSamples += 10;
    closedP95s.push(p95Ms);
    if (p95Ms > worstWindowP95) worstWindowP95 = p95Ms;
  }
};
export {
  _serverMetersInternals,
  clearServerMeters,
  getIdleStats,
  getLatencyFloorSettledSamples,
  getLatencyFloorStats,
  getLatencyFloorSuspendStats,
  noteIdleEnd,
  noteIdleStart,
  recordLatencySample
};
