// @ts-nocheck
/* eslint-disable */
// Built from src/cpuSchedulingMeters.ts so plain node can run the kit. Do not edit.
import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { linearScore, ratingFor } from "./healthAxes.js";
import { judgeTrend } from "./trendVerdict.js";
import { windowMinOf } from "./rateHonesty.js";
import { hostPlatform, systemUnavailableReading } from "./systemLimits.js";
import {
  isSettling,
  markSettled,
  processStartMs,
  SETTLE_FAMILIES,
  settledFromMs,
  settlingReading
} from "./settleRule.js";
const CPU_ENTITLEMENT_GOOD_RATIO = 1;
const CPU_ENTITLEMENT_POOR_RATIO = 4;
const CONTEXT_INVOLUNTARY_GOOD_PCT = 10;
const CONTEXT_INVOLUNTARY_POOR_PCT = 60;
const CONTEXT_MIN_WINDOW_MS = 6e4;
const CONTEXT_MIN_SWITCHES = 500;
const CONTEXT_INVOLUNTARY_FLOOR_PER_SEC = 50;
const CONTEXT_WINDOW_MS = Math.max(
  CONTEXT_MIN_WINDOW_MS,
  SETTLE_FAMILIES.peakRate.minSpanSec * 1e3
);
const THREAD_GROWTH_GOOD_PER_MIN = 0.5;
const THREAD_GROWTH_POOR_PER_MIN = 5;
const THREAD_MIN_SAMPLES = 12;
const THREAD_MIN_SPAN_MS = 6e4;
const THREAD_STARTUP_EXCLUSION_MS = 6e4;
const THREAD_RING_CAP = 240;
const QUEUE_GOOD_MS = 10;
const QUEUE_POOR_MS = 250;
const QUEUE_MIN_SAMPLES = 20;
const QUEUE_RING_CAP = 240;
const FORK_GOOD_PER_MIN = 6;
const FORK_POOR_PER_MIN = 60;
const FORK_MIN_WINDOW_MS = 6e4;
let contextAnchor = null;
let threadSamples = [];
let queueSamples = [];
let forkStartedAt = 0;
let forkSettledTotal = 0;
let forkArmed = false;
let patchedChild = null;
const originalChildCalls = /* @__PURE__ */ new Map();
const r1 = (n) => Math.round(n * 10) / 10;
const scored = (value, good, poor) => {
  const score = linearScore(value, good, poor);
  return { score, rating: ratingFor(score) };
};
function readStatus() {
  if (hostPlatform() !== "linux") return null;
  try {
    const raw = readFileSync("/proc/self/status", "utf8");
    const voluntary = /^\s*voluntary_ctxt_switches:\s*(\d+)\s*$/m.exec(raw);
    const involuntary = /^\s*nonvoluntary_ctxt_switches:\s*(\d+)\s*$/m.exec(raw);
    const threads = /^\s*Threads:\s*(\d+)\s*$/m.exec(raw);
    if (!voluntary || !involuntary || !threads) return null;
    return {
      voluntary: Number(voluntary[1]),
      involuntary: Number(involuntary[1]),
      threads: Number(threads[1])
    };
  } catch {
    return null;
  }
}
function readQuota() {
  try {
    const [quotaWord, periodWord] = readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim().split(/\s+/);
    if (quotaWord !== "max") {
      const quota = Number(quotaWord);
      const period = Number(periodWord);
      if (quota > 0 && period > 0) {
        return { allowedCpus: quota / period, sourceCode: "cgroup2" };
      }
    }
  } catch {
  }
  try {
    const quota = Number(readFileSync("/sys/fs/cgroup/cpu/cpu.cfs_quota_us", "utf8").trim());
    const period = Number(readFileSync("/sys/fs/cgroup/cpu/cpu.cfs_period_us", "utf8").trim());
    if (quota > 0 && period > 0) {
      return { allowedCpus: quota / period, sourceCode: "cgroup1" };
    }
  } catch {
  }
  return null;
}
function cpuEntitlement(quota = readQuota(), visibleCpus = availableParallelism()) {
  if (!quota) return null;
  if (!(visibleCpus > 0) || !(quota.allowedCpus > 0)) return null;
  const mismatchRatio = visibleCpus / quota.allowedCpus;
  return {
    ...scored(mismatchRatio, CPU_ENTITLEMENT_GOOD_RATIO, CPU_ENTITLEMENT_POOR_RATIO),
    visibleCpus,
    allowedCpus: r1(quota.allowedCpus),
    mismatchRatio: r1(mismatchRatio),
    sourceCode: quota.sourceCode
  };
}
function contextSwitching(status, now) {
  const current = {
    at: now,
    voluntary: status.voluntary,
    involuntary: status.involuntary
  };
  if (isSettling("peakRate", now)) {
    contextAnchor = null;
    return settlingReading();
  }
  if (!contextAnchor || contextAnchor.at < settledFromMs("peakRate")) {
    contextAnchor = current;
    return null;
  }
  const voluntary = current.voluntary - contextAnchor.voluntary;
  const involuntary = current.involuntary - contextAnchor.involuntary;
  const span = current.at - contextAnchor.at;
  if (voluntary < 0 || involuntary < 0 || span <= 0) {
    contextAnchor = current;
    return null;
  }
  const switches = voluntary + involuntary;
  if (span < CONTEXT_WINDOW_MS || switches < CONTEXT_MIN_SWITCHES) return null;
  const involuntaryPct = 100 * involuntary / switches;
  const involuntaryPerSec = involuntary / (span / 1e3);
  contextAnchor = current;
  const score = involuntaryPerSec <= CONTEXT_INVOLUNTARY_FLOOR_PER_SEC ? 100 : linearScore(involuntaryPct, CONTEXT_INVOLUNTARY_GOOD_PCT, CONTEXT_INVOLUNTARY_POOR_PCT);
  return markSettled({
    score,
    rating: ratingFor(score),
    involuntaryPct: r1(involuntaryPct),
    involuntaryPerSec: r1(involuntaryPerSec),
    switchesPerSec: r1(switches / (span / 1e3)),
    windowMin: windowMinOf(span)
  });
}
function threadFootprint(status, now) {
  threadSamples.push({ t: now, v: status.threads });
  if (threadSamples.length > THREAD_RING_CAP) threadSamples.shift();
  const verdict = judgeTrend(threadSamples, {
    good: THREAD_GROWTH_GOOD_PER_MIN,
    poor: THREAD_GROWTH_POOR_PER_MIN,
    minSamples: THREAD_MIN_SAMPLES,
    minSpanMs: THREAD_MIN_SPAN_MS,
    warmupMs: THREAD_STARTUP_EXCLUSION_MS,
    startedAt: processStartMs(),
    abstainAroundZero: true
  });
  if (!verdict) return null;
  const peakThreads = Math.max(...verdict.judged.map((point) => point.v));
  return {
    score: verdict.score,
    rating: verdict.score === null ? "pending" : ratingFor(verdict.score),
    threads: status.threads,
    peakThreads,
    growthPerMin: r1(verdict.perMin),
    sampleCount: verdict.sampleCount,
    windowMin: verdict.windowMin
  };
}
function noteQueueStartHeader(value, handlerStartedAt = Date.now()) {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") return;
  const raw = first.trim().replace(/^t=/i, "");
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return;
  const n = Number(raw);
  const arrivalMs = n < 1e10 ? n * 1e3 : n;
  const wait = handlerStartedAt - arrivalMs;
  if (!Number.isFinite(wait) || wait < 0) return;
  queueSamples.push({ t: handlerStartedAt, v: wait });
  if (queueSamples.length > QUEUE_RING_CAP) queueSamples.shift();
}
function queueTime(now = Date.now()) {
  const settledFrom = settledFromMs("latencyTail");
  const settled = queueSamples.filter((s) => s.t >= settledFrom).map((s) => s.v);
  if (settled.length < QUEUE_MIN_SAMPLES) {
    return queueSamples.length > 0 && isSettling("latencyTail", now) ? settlingReading() : null;
  }
  const sorted = settled.sort((a, b) => a - b);
  const p75Ms = r1(sorted[Math.ceil(sorted.length * 0.75) - 1]);
  return markSettled({
    ...scored(p75Ms, QUEUE_GOOD_MS, QUEUE_POOR_MS),
    p75Ms,
    worstMs: r1(sorted[sorted.length - 1]),
    sampleCount: sorted.length
  });
}
function armForkChurn() {
  if (forkArmed) return;
  forkArmed = true;
  forkStartedAt = Date.now();
  try {
    const child = createRequire(import.meta.url)("node:child_process");
    patchedChild = child;
    for (const name of ["spawn", "fork", "exec"]) {
      const original = child[name];
      if (typeof original !== "function") continue;
      originalChildCalls.set(name, original);
      child[name] = function boosthisCountedChildCall(...args) {
        noteSpawn();
        return original.apply(this, args);
      };
    }
    syncBuiltinESMExports();
  } catch {
    forkArmed = false;
    forkStartedAt = 0;
  }
}
function noteSpawn(now = Date.now()) {
  if (now >= settledFromMs("startupEvent")) forkSettledTotal++;
}
function forkChurn(now) {
  if (!forkArmed) return null;
  if (isSettling("startupEvent", now)) return settlingReading();
  const span = now - Math.max(forkStartedAt, settledFromMs("startupEvent"));
  if (span < FORK_MIN_WINDOW_MS) return null;
  const spawnsPerMin = forkSettledTotal / (span / 6e4);
  return markSettled({
    ...scored(spawnsPerMin, FORK_GOOD_PER_MIN, FORK_POOR_PER_MIN),
    spawnsPerMin: r1(spawnsPerMin),
    total: forkSettledTotal,
    windowMin: windowMinOf(span)
  });
}
function readCpuSchedulingMeters(now = Date.now()) {
  const out = {};
  const entitlement = systemUnavailableReading("cpuEntitlement") ?? cpuEntitlement();
  if (entitlement) out.cpuEntitlement = entitlement;
  const contextLacking = systemUnavailableReading("contextSwitching");
  if (contextLacking) out.contextSwitching = contextLacking;
  const status = readStatus();
  if (status) {
    if (!contextLacking) {
      const context = contextSwitching(status, now);
      if (context) out.contextSwitching = context;
    }
    const footprint = threadFootprint(status, now);
    if (footprint) out.threadFootprint = footprint;
  }
  const queued = queueTime(now);
  if (queued) out.queueTime = queued;
  const forks = forkChurn(now);
  if (forks) out.forkChurn = forks;
  return out;
}
function clearCpuSchedulingMeters() {
  contextAnchor = null;
  threadSamples = [];
  queueSamples = [];
  forkSettledTotal = 0;
  if (patchedChild) {
    for (const [name, original] of originalChildCalls) patchedChild[name] = original;
    syncBuiltinESMExports();
  }
  originalChildCalls.clear();
  patchedChild = null;
  forkArmed = false;
  forkStartedAt = 0;
}
const _cpuSchedulingInternals = {
  cpuEntitlement,
  contextSwitching,
  threadFootprint,
  queueTime,
  forkChurn,
  setContextAnchor(value) {
    contextAnchor = value;
  },
  setThreadSamples(value) {
    threadSamples = value.slice();
  },
  /** Plain waits are stamped as taken after the process settled. */
  setQueueSamples(value) {
    queueSamples = value.map((v) => typeof v === "number" ? { t: Date.now(), v } : { ...v });
  },
  noteSpawn,
  /** `total` is the settled spawns the rate counts. */
  setForkState(startedAt, total, armed = true) {
    forkStartedAt = startedAt;
    forkSettledTotal = total;
    forkArmed = armed;
  }
};
export {
  CONTEXT_INVOLUNTARY_FLOOR_PER_SEC,
  CONTEXT_INVOLUNTARY_GOOD_PCT,
  CONTEXT_INVOLUNTARY_POOR_PCT,
  CONTEXT_MIN_SWITCHES,
  CONTEXT_MIN_WINDOW_MS,
  CPU_ENTITLEMENT_GOOD_RATIO,
  CPU_ENTITLEMENT_POOR_RATIO,
  FORK_GOOD_PER_MIN,
  FORK_MIN_WINDOW_MS,
  FORK_POOR_PER_MIN,
  QUEUE_GOOD_MS,
  QUEUE_MIN_SAMPLES,
  QUEUE_POOR_MS,
  QUEUE_RING_CAP,
  THREAD_GROWTH_GOOD_PER_MIN,
  THREAD_GROWTH_POOR_PER_MIN,
  THREAD_MIN_SAMPLES,
  THREAD_MIN_SPAN_MS,
  THREAD_RING_CAP,
  THREAD_STARTUP_EXCLUSION_MS,
  _cpuSchedulingInternals,
  armForkChurn,
  clearCpuSchedulingMeters,
  noteQueueStartHeader,
  readCpuSchedulingMeters
};
