// @ts-nocheck
/* eslint-disable */
// Built from src/runtimeVitals.ts so plain node can run the kit. Do not edit.
import { PerformanceObserver, performance, constants } from "node:perf_hooks";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { linearScore, ratingFor } from "./healthAxes.js";
import {
  getHeapSpaceStatistics,
  getHeapStatistics
} from "node:v8";
import { readFileSync, readdirSync } from "node:fs";
import { crashCount } from "./crashReporter.js";
import { crashHistoryWindow, crashReportingVerdict } from "./crashDelivery.js";
import {
  MEASURED_TO_KIT_ENABLE,
  MEASURED_TO_SERVING,
  clearReadyMark,
  readyToServeMs
} from "./readyToServe.js";
import {
  onSuspendIdleStart,
  onSuspendWake,
  SUSPEND_UNIT
} from "./suspendSensor.js";
import { systemUnavailableReading } from "./systemLimits.js";
import {
  MIN_RATE_WINDOW_MIN,
  earnedPerHour,
  earnedPerMin,
  overWords,
  windowMinOf,
  windowPhrase
} from "./rateHonesty.js";
import { judgeTrend, medianOf } from "./trendVerdict.js";
import {
  SETTLE_FAMILIES,
  isSettling,
  markSettled,
  percentileOf,
  persistentGrowthPerMin,
  settledFromMs,
  settledSlope,
  settledSpanMs,
  settledTailValues,
  settlingReading,
  spanJudgeable
} from "./settleRule.js";
const GC_CONSTS = constants;
const GC_KIND_MAJOR = GC_CONSTS.NODE_PERFORMANCE_GC_MAJOR ?? 4;
const GC_KIND_MINOR = GC_CONSTS.NODE_PERFORMANCE_GC_MINOR ?? 1;
const MEM_GROWTH_GOOD = 2;
const MEM_GROWTH_POOR = 25;
const MIN_MEM_SAMPLES = 12;
const MIN_MEM_SPAN_MS = 3e5;
const MEM_TREND_WARMUP_MS = 6e4;
const MEM_TREND_FLOOR_BUCKET_MS = 15e3;
const MEM_RISE_FLOOR_MB = 30;
const MEM_THROTTLE_MS = 1e3;
const MEM_RING_CAP = 240;
const GC_PCT_GOOD = 1;
const GC_PCT_POOR = 10;
const MIN_GC_ELAPSED_MS = 5e3;
const GC_TAX_GOOD_PCT = 1;
const GC_TAX_POOR_PCT = 10;
const GC_TAX_MIN_WINDOW_MS = 6e4;
const GC_TAX_WINDOW_MS = 10 * 6e4;
const MEMORY_PER_REQUEST_GOOD_KB = 4;
const MEMORY_PER_REQUEST_POOR_KB = 128;
const MIN_MEMORY_REQUESTS = 50;
const ERR_PCT_GOOD = 1;
const ERR_PCT_POOR = 20;
const MIN_REQ_FOR_RELIABILITY = 10;
const SERVER_ERROR_STATUS = 500;
const CRASHFREE_RATE_GOOD = 0;
const CRASHFREE_RATE_POOR = 3;
const CRASHFREE_MAX_SCORE_AFTER_CRASH = 84;
const CRASHFREE_MIN_WINDOW_MIN = MIN_RATE_WINDOW_MIN;
const ELU_PCT_GOOD = 70;
const ELU_PCT_POOR = 90;
const MIN_ELU_SAMPLES = 3;
const ELU_RING_CAP = 240;
const FRAG_PCT_GOOD = 5;
const FRAG_PCT_POOR = 25;
const MIN_FRAG_ELAPSED_MS = 1e4;
const HANDLE_GROWTH_GOOD = 1;
const HANDLE_GROWTH_POOR = 10;
const MIN_HANDLE_SAMPLES = 12;
const MIN_HANDLE_SPAN_MS = 18e4;
const HANDLE_WARMUP_MS = 6e4;
const HANDLE_FLOOR_BUCKET_MS = 15e3;
const MIN_HANDLE_FLOOR_BUCKETS = 6;
const HANDLE_RISE_FLOOR = 8;
const HANDLE_RING_CAP = 240;
const GC_PAUSE_P99_GOOD = 5;
const GC_PAUSE_P99_POOR = 100;
const MIN_GC_PAUSE_SAMPLES = 20;
const GC_PAUSE_RING_CAP = 512;
const GEN_RATIO_GOOD = 0.01;
const GEN_RATIO_POOR = 0.1;
const MIN_YOUNG_GCS = 50;
const GEN_BALANCE_GC_PCT_FLOOR = 1;
const HEAP_USED_GOOD = 60;
const HEAP_USED_POOR = 90;
const MIN_HEAP_ELAPSED_MS = 5e3;
const CONTAINER_PCT_GOOD = 75;
const CONTAINER_PCT_POOR = 95;
const CGROUP_V1_UNLIMITED = 8070450532247929e3;
const CPU_THROTTLE_PCT_GOOD = 1;
const CPU_THROTTLE_PCT_POOR = 25;
const FD_USED_GOOD = 70;
const FD_USED_POOR = 90;
const GC_TREND_WINDOW_MS = 10 * 6e4;
const GC_TREND_GROWTH_GOOD = 0.5;
const GC_TREND_GROWTH_POOR = 5;
const GC_TREND_FIT_MINUTES = 60;
const GC_EVENT_RING_CAP = 2048;
const HEAP_WALL_GOOD_HOURS = 24;
const HEAP_WALL_POOR_HOURS = 1;
const HEAP_WALL_MIN_GROWTH = 0.05;
const HEAP_WALL_MAX_HOURS = 999;
const STARTUP_IMPORT_MS_GOOD = 1500;
const STARTUP_IMPORT_MS_POOR = 15e3;
const STARTUP_IMPORT_MAX_MS = 6e5;
const COLDSTART_MS_GOOD = 5e3;
const COLDSTART_MS_POOR = 3e4;
const COLDSTART_MAX_MS = 6e5;
let started = false;
let startedAt = 0;
const memSamples = [];
const liveSetSamples = [];
let lastMemSampleAt = 0;
let gcObserver = null;
let gcMs = 0;
let gcCount = 0;
const gcPauseRing = [];
let fullGcCount = 0;
let youngGcCount = 0;
let heapStatsOverride = null;
let cgroupOverride = null;
let cpuThrottleOverride = null;
let cpuIdleBaseline = null;
let suspendPeriodsDiscounted = 0;
let suspendThrottledDiscounted = 0;
let suspendThrottleWakes = 0;
let fdOverride = null;
const gcEvents = [];
let settledGcMs = 0;
let settledGcCount = 0;
let settledYoungGcs = 0;
let settledFullGcs = 0;
const gcPauseTimed = [];
const gcMinuteMs = [];
const GC_MINUTE_CAP = 90;
const retainedPoints = [];
const RETAINED_BUCKET_MS = 15e3;
const RETAINED_POINT_CAP = 240;
let settledRequestCount = 0;
function noteGcMinute(t, ms) {
  const minute = Math.floor(t / 6e4) * 6e4;
  for (let i = gcMinuteMs.length - 1; i >= 0; i--) {
    const bucket = gcMinuteMs[i];
    if (bucket.t === minute) {
      bucket.ms += ms;
      return;
    }
    if (bucket.t < minute) break;
    if (i === 0) return;
  }
  const at = gcMinuteMs.findIndex((bucket) => bucket.t > minute);
  if (at === -1) gcMinuteMs.push({ t: minute, ms });
  else gcMinuteMs.splice(at, 0, { t: minute, ms });
  if (gcMinuteMs.length > GC_MINUTE_CAP) gcMinuteMs.shift();
}
function noteGcEvent(t, ms, young, major) {
  gcMs += ms;
  gcCount += 1;
  gcPauseRing.push(ms);
  if (gcPauseRing.length > GC_PAUSE_RING_CAP) gcPauseRing.shift();
  if (major) fullGcCount += 1;
  else if (young) youngGcCount += 1;
  gcEvents.push({ t, young, major, ms });
  if (gcEvents.length > GC_EVENT_RING_CAP) gcEvents.shift();
  gcPauseTimed.push({ t, v: ms });
  if (gcPauseTimed.length > GC_PAUSE_RING_CAP) gcPauseTimed.shift();
  noteGcMinute(t, ms);
  if (t >= settledFromMs("peakRate")) {
    settledGcMs += ms;
    settledGcCount += 1;
    if (major) settledFullGcs += 1;
    else if (young) settledYoungGcs += 1;
  }
}
function liveSetMbOf(mem) {
  const external = typeof mem.external === "number" && Number.isFinite(mem.external) && mem.external > 0 ? mem.external : 0;
  return (mem.heapUsed + external) / BYTES_PER_MB;
}
function noteLiveSet(t, heapMb) {
  if (!Number.isFinite(heapMb)) return;
  const bucket = Math.floor(t / RETAINED_BUCKET_MS);
  const last = retainedPoints[retainedPoints.length - 1];
  if (last && Math.floor(last.t / RETAINED_BUCKET_MS) === bucket) {
    if (heapMb < last.heapMb) {
      last.t = t;
      last.heapMb = heapMb;
      last.reqs = settledRequestCount;
    }
    return;
  }
  retainedPoints.push({ t, heapMb, reqs: settledRequestCount });
  if (retainedPoints.length > RETAINED_POINT_CAP) retainedPoints.shift();
}
function settlingAxis() {
  return settlingReading({ score: null });
}
let startupImportMs = null;
let startupBootMs = null;
let startupReaderOverride = null;
let coldStartMs = null;
let coldStartReaderOverride = null;
let reqTotal = 0;
let reqErrors = 0;
let firstReqAt = 0;
let lastReqAt = 0;
let lastELU = null;
const eluSamples = [];
let lastEluAt = 0;
const ELU_INTERVAL_MS = 15e3;
const ELU_WINDOW_MS = 10 * 6e4;
function noteEluInterval(t, idle, active) {
  if (!Number.isFinite(idle) || !Number.isFinite(active) || idle < 0 || active < 0) return;
  if (idle + active <= 0) return;
  eluSamples.push({ t, idle, active });
  if (eluSamples.length > ELU_RING_CAP) eluSamples.shift();
}
const handleSamples = [];
const BYTES_PER_MB = 1024 * 1024;
const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const signed = (n) => n >= 0 ? `+${r1(n)}` : `${r1(n)}`;
function startVitals() {
  if (isBoosthisDisabled() || started) return;
  started = true;
  startedAt = Date.now();
  try {
    if (typeof PerformanceObserver !== "function") return;
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry;
        const kind = e.detail?.kind ?? e.kind;
        noteGcEvent(Date.now(), entry.duration, kind === GC_KIND_MINOR, kind === GC_KIND_MAJOR);
        try {
          const mem = process.memoryUsage();
          liveSetSamples.push({
            t: Date.now(),
            heapMb: mem.heapUsed / BYTES_PER_MB,
            rssMb: mem.rss / BYTES_PER_MB
          });
          if (liveSetSamples.length > MEM_RING_CAP) liveSetSamples.shift();
          noteLiveSet(Date.now(), liveSetMbOf(mem));
        } catch {
        }
      }
    });
    obs.observe({ entryTypes: ["gc"] });
    gcObserver = obs;
  } catch {
    gcObserver = null;
  }
}
function readProcessAgeMs() {
  if (coldStartReaderOverride) return coldStartReaderOverride();
  return Math.round(process.uptime() * 1e3);
}
function captureColdStart() {
  if (coldStartMs !== null) return;
  try {
    const age = readProcessAgeMs();
    if (typeof age === "number" && Number.isFinite(age)) {
      coldStartMs = Math.round(age);
    }
  } catch {
  }
}
function captureStartupImport() {
  if (startupImportMs !== null) return;
  try {
    if (startupReaderOverride) {
      const r = startupReaderOverride();
      startupImportMs = Math.round(r.importMs);
      startupBootMs = Math.round(r.bootMs);
      return;
    }
    const nt = performance.nodeTiming;
    const boot = nt?.bootstrapComplete;
    if (typeof boot !== "number" || !Number.isFinite(boot) || boot < 0) return;
    const importMs = performance.now() - boot;
    if (!Number.isFinite(importMs)) return;
    startupImportMs = Math.round(importMs);
    startupBootMs = Math.round(boot);
  } catch {
  }
}
function noteRequest(statusCode) {
  if (isBoosthisDisabled() || !started) return;
  try {
    const ts = Date.now();
    reqTotal += 1;
    if (typeof statusCode === "number" && statusCode >= SERVER_ERROR_STATUS) {
      reqErrors += 1;
    }
    if (firstReqAt === 0) firstReqAt = ts;
    lastReqAt = ts;
    if (ts >= settledFromMs("perRequestMemory") && reqTotal > SETTLE_FAMILIES.perRequestMemory.skipFirstRequests) {
      settledRequestCount += 1;
    }
    sampleMemory(ts);
  } catch {
  }
}
function sampleMemory(ts) {
  if (ts - lastMemSampleAt < MEM_THROTTLE_MS) return;
  lastMemSampleAt = ts;
  const mem = process.memoryUsage();
  memSamples.push({
    t: ts,
    heapMb: mem.heapUsed / BYTES_PER_MB,
    rssMb: mem.rss / BYTES_PER_MB
  });
  if (memSamples.length > MEM_RING_CAP) memSamples.shift();
  try {
    if (typeof performance.eventLoopUtilization === "function" && ts - lastEluAt >= ELU_INTERVAL_MS) {
      const cur = performance.eventLoopUtilization();
      if (lastELU) {
        const d = performance.eventLoopUtilization(cur, lastELU);
        noteEluInterval(ts, d.idle, d.active);
      }
      lastELU = cur;
      lastEluAt = ts;
    }
  } catch {
  }
  try {
    const g = process.getActiveResourcesInfo;
    if (typeof g === "function") {
      handleSamples.push({ t: ts, count: g.call(process).length });
      if (handleSamples.length > HANDLE_RING_CAP) handleSamples.shift();
    }
  } catch {
  }
}
function heapSlopePerMin(samples) {
  const n = samples.length;
  const t0 = samples[0].t;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const s of samples) {
    const x = (s.t - t0) / 6e4;
    const y = s.heapMb;
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}
function readMemoryStability() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const last = liveSetSamples[liveSetSamples.length - 1];
    const trend = judgeTrend(
      liveSetSamples.map((s) => ({ t: s.t, v: s.heapMb })),
      {
        good: MEM_GROWTH_GOOD,
        poor: MEM_GROWTH_POOR,
        minSamples: MIN_MEM_SAMPLES,
        minSpanMs: MIN_MEM_SPAN_MS,
        warmupMs: MEM_TREND_WARMUP_MS,
        startedAt,
        floorBucketMs: MEM_TREND_FLOOR_BUCKET_MS,
        minFloorBuckets: 6,
        riseFloor: MEM_RISE_FLOOR_MB,
        abstainAroundZero: true
      }
    );
    if (!trend) return null;
    const growth = trend.perMin;
    const heapMb = r0(last.heapMb);
    const rssMb = r0(last.rssMb);
    const mins = windowMinOf(trend.spanMs);
    if (trend.score === null) {
      return {
        score: null,
        // The SAME word its three siblings use for the same silence
        // (handleLeak, residentGrowth, arrayBufferRetention): a withheld trend
        // verdict is temporary — a calmer window produces a score — and the
        // server turns `reasonCode` into "could not tell" on every surface.
        // "not-scored" is this codebase's word for a reading deliberately
        // never graded at all, so using it here would file a wait as a
        // permanent decision.
        rating: "pending",
        reasonCode: trend.reasonCode,
        heapMb,
        rssMb,
        growthMbPerMin: r1(growth),
        slopeSeMbPerMin: r1(trend.slopeSePerMin),
        sampleCount: trend.sampleCount,
        windowMin: mins,
        caption: `heap ${heapMb} MB · moves too much over ${overWords(mins)} to call a trend`
      };
    }
    const score = trend.score;
    return {
      score,
      rating: ratingFor(score),
      heapMb,
      rssMb,
      growthMbPerMin: r1(growth),
      slopeSeMbPerMin: r1(trend.slopeSePerMin),
      sampleCount: trend.sampleCount,
      windowMin: mins,
      caption: `heap ${heapMb} MB · ${signed(growth)} MB/min over ${overWords(mins)}`
    };
  } catch {
    return null;
  }
}
function readGcPressure() {
  if (isBoosthisDisabled() || !started || !gcObserver) return null;
  try {
    if (gcCount < 1) return null;
    const now = Date.now();
    if (isSettling("peakRate", now)) return settlingAxis();
    const elapsed = settledSpanMs(startedAt, now);
    if (elapsed < MIN_GC_ELAPSED_MS || !spanJudgeable(elapsed)) return null;
    const gcPct = 100 * settledGcMs / elapsed;
    const score = linearScore(gcPct, GC_PCT_GOOD, GC_PCT_POOR);
    return markSettled({
      score,
      rating: ratingFor(score),
      gcMs: r0(settledGcMs),
      gcCount: settledGcCount,
      gcPct: r2(gcPct),
      windowMin: windowMinOf(elapsed),
      caption: `${r2(gcPct)}% time in GC · ${settledGcCount} collections`
    });
  } catch {
    return null;
  }
}
function readGcTax() {
  if (isBoosthisDisabled() || !started || !gcObserver) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) return gcCount > 0 ? settlingAxis() : null;
    let windowStart = Math.max(startedAt, settledFromMs("peakRate"), now - GC_TAX_WINDOW_MS);
    if (gcEvents.length >= GC_EVENT_RING_CAP) windowStart = Math.max(windowStart, gcEvents[0].t);
    const windowMs = now - windowStart;
    if (windowMs < GC_TAX_MIN_WINDOW_MS || !spanJudgeable(windowMs)) return null;
    const recent = gcEvents.filter((event) => event.t >= windowStart);
    if (recent.length === 0) return null;
    const gcMs2 = recent.reduce((sum, event) => sum + event.ms, 0);
    const gcPct = 100 * gcMs2 / windowMs;
    const score = linearScore(gcPct, GC_TAX_GOOD_PCT, GC_TAX_POOR_PCT);
    return markSettled({
      score,
      rating: ratingFor(score),
      gcPct: r2(gcPct),
      gcCount: recent.length,
      windowMin: windowMinOf(windowMs),
      caption: `${r2(gcPct)}% time in recent GC · ${recent.length} collections`
    });
  } catch {
    return null;
  }
}
function readMemoryPerRequest() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const now = Date.now();
    if (settledRequestCount === 0) {
      return isSettling("perRequestMemory", now) && reqTotal > 0 && retainedPoints.length > 0 ? settlingAxis() : null;
    }
    const pts = retainedPoints.filter((point) => point.reqs > 0);
    if (pts.length < 3) return null;
    const first = pts[0];
    const last = pts[pts.length - 1];
    const requests = last.reqs - first.reqs;
    if (requests < MIN_MEMORY_REQUESTS) return null;
    const fit = perRequestFit(pts);
    if (!fit) return null;
    const avgKb = Math.max(0, fit.slopeMb - 2 * fit.seMb) * 1024;
    const score = linearScore(avgKb, MEMORY_PER_REQUEST_GOOD_KB, MEMORY_PER_REQUEST_POOR_KB);
    return markSettled({
      score,
      rating: ratingFor(score),
      avgKb: r1(avgKb),
      requestCount: requests,
      windowMin: windowMinOf(last.t - first.t),
      caption: `${r1(avgKb)} KB retained per request`
    });
  } catch {
    return null;
  }
}
function perRequestFit(pts) {
  const n = pts.length;
  let mx = 0;
  let my = 0;
  for (const p of pts) {
    mx += p.reqs;
    my += p.heapMb;
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    sxx += (p.reqs - mx) ** 2;
    sxy += (p.reqs - mx) * (p.heapMb - my);
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  let sse = 0;
  for (const p of pts) sse += (p.heapMb - (my + slope * (p.reqs - mx))) ** 2;
  const se = n > 2 ? Math.sqrt(sse / (n - 2) / sxx) : 0;
  return { slopeMb: slope, seMb: se };
}
function readPeakRss() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const current = process.memoryUsage().rss / BYTES_PER_MB;
    try {
      const status = readFileSync("/proc/self/status", "utf8");
      const match = /^VmHWM:\s+(\d+)\s+kB$/m.exec(status);
      if (match) {
        const peakRssMb = Number(match[1]) / 1024;
        if (Number.isFinite(peakRssMb)) {
          return {
            score: null,
            rating: "not-scored",
            peakRssMb: r1(peakRssMb),
            rssMb: r1(current),
            sampleCount: 1,
            exact: 1,
            caption: `${r1(peakRssMb)} MB peak resident memory`
          };
        }
      }
    } catch {
    }
    const observed = memSamples.map((sample) => sample.rssMb);
    observed.push(current);
    if (observed.length === 0) return null;
    return {
      score: null,
      rating: "not-scored",
      peakRssMb: r1(Math.max(...observed)),
      rssMb: r1(current),
      sampleCount: observed.length,
      exact: 0,
      caption: `${r1(Math.max(...observed))} MB sampled peak resident memory`
    };
  } catch {
    return null;
  }
}
function readReliability() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (reqTotal < MIN_REQ_FOR_RELIABILITY) return null;
    const errorPct = 100 * reqErrors / reqTotal;
    const score = linearScore(errorPct, ERR_PCT_GOOD, ERR_PCT_POOR);
    const spanMs = Math.max(0, lastReqAt - firstReqAt);
    const spanMin = windowMinOf(spanMs);
    const rpm = earnedPerMin(reqTotal, spanMs);
    return {
      score,
      rating: ratingFor(score),
      total: reqTotal,
      errors: reqErrors,
      errorRate: r2(errorPct / 100),
      errorPct: r1(errorPct),
      ...rpm === null ? {} : { rpm },
      windowMin: spanMin,
      // WHICH requests. This counter is bumped once per RESPONSE at the
      // middleware's finish boundary, while the panel headline counts every
      // timed unit of work in the sample ring — hand-marked spans and work
      // outside an HTTP response included. A capture showed "429 requests
      // measured" in the headline over "10 requests" here, which reads as
      // the kit having missed 419 of them. Each names what it counted.
      caption: rpm === null ? `${r1(errorPct)}% errors · ${reqTotal} responses · ${windowPhrase(spanMin)}` : `${r1(errorPct)}% errors · ${reqTotal} responses · ${rpm}/min over ${overWords(spanMin)}`
    };
  } catch {
    return null;
  }
}
function readCrashFree() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const history = crashHistoryWindow();
    const uptimeMs = Date.now() - startedAt;
    const windowMs = Math.min(
      history.windowMs,
      Math.max(uptimeMs, history.observedMs)
    );
    const windowMin = windowMinOf(windowMs);
    const ownInWindow = !history.recorded ? crashCount() : uptimeMs <= history.windowMs ? Math.max(history.own, crashCount()) : history.own;
    const crashes = ownInWindow + history.carried;
    const countWord = history.carriedAtLeast ? "at least " : "";
    const runsTail = history.runs > 1 ? ` · ${history.runsAtLeast ? "at least " : ""}${history.runs} runs in the last 24h` : "";
    const reportingVerdict = crashReportingVerdict();
    if (crashes === 0 && reportingVerdict !== "reporting") {
      return {
        score: null,
        rating: "pending",
        measurable: 0,
        // 8 = "where this app runs blocks the reading"
        // (AXIS_NOT_AVAILABLE_REASON.BLOCKED_BY_ENVIRONMENT, server-side).
        reasonCode: 8,
        windowMin
      };
    }
    const perHour = earnedPerHour(crashes, windowMs);
    if (perHour === null) {
      if (crashes === 0) return null;
      return {
        score: null,
        rating: "pending",
        crashes,
        windowMin,
        ...history.runs > 1 ? { runsInWindow: history.runs } : {},
        caption: `${countWord}${crashes} crash${crashes === 1 ? "" : "es"} · ${windowPhrase(windowMin, "observed so far")}${runsTail}`
      };
    }
    const exactPerHour = earnedPerHour(crashes, windowMs, 4) ?? perHour;
    const rateScore = linearScore(
      exactPerHour,
      CRASHFREE_RATE_GOOD,
      CRASHFREE_RATE_POOR
    );
    const score = crashes > 0 ? Math.min(rateScore, CRASHFREE_MAX_SCORE_AFTER_CRASH) : rateScore;
    return {
      score,
      rating: ratingFor(score),
      crashes,
      windowMin,
      ...history.runs > 1 ? { runsInWindow: history.runs } : {},
      caption: crashes === 0 ? `crash-free · ${windowPhrase(windowMin)}${runsTail}` : (
        // A rate that rounded to zero is not spoken at all: "1 crash ·
        // 0/hour over 24h" reads as a rounding artefact arguing with the
        // count beside it. The count and the window are both measured.
        perHour === 0 ? `${countWord}${crashes} crash${crashes === 1 ? "" : "es"} · ${windowPhrase(windowMin)}${runsTail}` : `${countWord}${crashes} crash${crashes === 1 ? "" : "es"} · ${perHour}/hour over ${overWords(windowMin)}${runsTail}`
      )
    };
  } catch {
    return null;
  }
}
function readEventLoopUtilization() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) return eluSamples.length > 0 ? settlingAxis() : null;
    const from = Math.max(settledFromMs("peakRate"), now - ELU_WINDOW_MS);
    let idle = 0;
    let active = 0;
    let n = 0;
    let firstStart = Infinity;
    for (const sample of eluSamples) {
      const begin = sample.t - (sample.idle + sample.active);
      if (begin < from) continue;
      idle += sample.idle;
      active += sample.active;
      n += 1;
      if (begin < firstStart) firstStart = begin;
    }
    if (n < MIN_ELU_SAMPLES || idle + active <= 0) return null;
    const windowMs = now - firstStart;
    if (!spanJudgeable(windowMs)) return null;
    const utilPct = r1(100 * active / (idle + active));
    const score = linearScore(utilPct, ELU_PCT_GOOD, ELU_PCT_POOR);
    return markSettled({
      score,
      rating: ratingFor(score),
      utilPct,
      windowMin: windowMinOf(windowMs),
      caption: `${utilPct}% loop utilization`
    });
  } catch {
    return null;
  }
}
function fragmentableSpace(name) {
  if (typeof name !== "string" || name === "") return false;
  if (name === "read_only_space" || name === "new_space") return false;
  return !name.endsWith("large_object_space");
}
function readHeapFragmentation() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (Date.now() - startedAt < MIN_FRAG_ELAPSED_MS) return null;
    const s = getHeapStatistics();
    const total = s.total_heap_size;
    const limit = s.heap_size_limit;
    if (!Number.isFinite(total) || total <= 0) return null;
    if (!Number.isFinite(limit) || limit <= 0) return null;
    const spaces = getHeapSpaceStatistics();
    if (!Array.isArray(spaces) || spaces.length === 0) return null;
    const { stranded, counted } = strandedHeapBytes(spaces);
    if (counted === 0) return null;
    const strandedMb = r1(stranded / BYTES_PER_MB);
    const fragPct = r1(100 * stranded / limit);
    const heapMb = r0(total / BYTES_PER_MB);
    const maxMb = r0(limit / BYTES_PER_MB);
    const score = linearScore(fragPct, FRAG_PCT_GOOD, FRAG_PCT_POOR);
    return {
      score,
      rating: ratingFor(score),
      fragmentationPct: fragPct,
      fragPct,
      strandedMb,
      limitMb: maxMb,
      heapMb,
      maxMb,
      elapsedMs: Date.now() - startedAt,
      caption: `${strandedMb} MB of committed heap holds nothing · ${fragPct}% of the ${maxMb} MB heap ceiling`
    };
  } catch {
    return null;
  }
}
function readHandleLeak() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const trend = judgeTrend(
      handleSamples.map((s) => ({ t: s.t, v: s.count })),
      {
        good: HANDLE_GROWTH_GOOD,
        poor: HANDLE_GROWTH_POOR,
        minSamples: MIN_HANDLE_SAMPLES,
        minSpanMs: MIN_HANDLE_SPAN_MS,
        warmupMs: HANDLE_WARMUP_MS,
        startedAt,
        floorBucketMs: HANDLE_FLOOR_BUCKET_MS,
        minFloorBuckets: MIN_HANDLE_FLOOR_BUCKETS,
        riseFloor: HANDLE_RISE_FLOOR
      }
    );
    if (!trend) return null;
    const handles = Math.round(medianOf(trend.judged.map((p) => p.v)) ?? 0);
    const growth = trend.perMin;
    const mins = windowMinOf(trend.spanMs);
    if (trend.score === null) {
      return {
        score: null,
        rating: "pending",
        reasonCode: trend.reasonCode,
        handles,
        growthPerMin: r1(growth),
        windowMin: mins,
        sampleCount: trend.sampleCount,
        caption: `${handles} handles · moves too much over ${overWords(mins)} to call a trend`
      };
    }
    const score = trend.score;
    return {
      score,
      rating: ratingFor(score),
      handles,
      growthPerMin: r1(growth),
      windowMin: mins,
      sampleCount: trend.sampleCount,
      caption: score >= 100 && growth > 0 ? `${handles} handles · ${signed(growth)}/min is ${Math.round(trend.rise)} over ${overWords(mins)}, too few to call a leak` : `${handles} handles · ${signed(growth)}/min over ${overWords(mins)}`
    };
  } catch {
    return null;
  }
}
function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.ceil(p / 100 * sortedAsc.length) - 1;
  return sortedAsc[Math.max(0, Math.min(sortedAsc.length - 1, idx))];
}
function readGcPauseTail() {
  if (isBoosthisDisabled() || !started || !gcObserver) return null;
  try {
    const now = Date.now();
    if (isSettling("latencyTail", now)) return gcCount > 0 ? settlingAxis() : null;
    const values = settledTailValues(gcPauseTimed, "latencyTail");
    if (values.length < Math.max(MIN_GC_PAUSE_SAMPLES, SETTLE_FAMILIES.latencyTail.minSamples)) {
      return null;
    }
    const p99 = percentileOf(values, 99) ?? 0;
    const maxMs = Math.max(...values);
    const score = linearScore(p99, GC_PAUSE_P99_GOOD, GC_PAUSE_P99_POOR);
    return markSettled({
      score,
      rating: ratingFor(score),
      p99Ms: r1(p99),
      maxMs: r1(maxMs),
      pauseCount: values.length,
      caption: `${r1(p99)}ms p99 pause · ${values.length} GCs`
    });
  } catch {
    return null;
  }
}
function readGcGenerationBalance() {
  if (isBoosthisDisabled() || !started || !gcObserver) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) return gcCount > 0 ? settlingAxis() : null;
    if (settledYoungGcs < MIN_YOUNG_GCS) return null;
    const spanMs = settledSpanMs(startedAt, now);
    if (!spanJudgeable(spanMs)) return null;
    const ratio = settledFullGcs / Math.max(1, settledYoungGcs);
    const gcPct = 100 * settledGcMs / spanMs;
    const score = gcPct <= GEN_BALANCE_GC_PCT_FLOOR ? 100 : linearScore(ratio, GEN_RATIO_GOOD, GEN_RATIO_POOR);
    return markSettled({
      score,
      rating: ratingFor(score),
      fullCount: settledFullGcs,
      youngCount: settledYoungGcs,
      fullRatio: r2(ratio),
      gcPct: r2(gcPct),
      caption: `${settledFullGcs} full GCs · ${settledYoungGcs} young`
    });
  } catch {
    return null;
  }
}
function readHeapHeadroom() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (Date.now() - startedAt < MIN_HEAP_ELAPSED_MS) return null;
    const stats = heapStatsOverride ?? getHeapStatistics();
    const limit = stats.heap_size_limit;
    const used = stats.used_heap_size;
    if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used)) return null;
    const usedMb = r0(used / BYTES_PER_MB);
    const maxMb = r0(limit / BYTES_PER_MB);
    const usedPct = r1(100 * used / limit);
    const score = linearScore(usedPct, HEAP_USED_GOOD, HEAP_USED_POOR);
    if (isSettling("peakRate", Date.now())) return settlingAxis();
    return markSettled({
      score,
      rating: ratingFor(score),
      usedMb,
      limitMb: maxMb,
      maxMb,
      usedPct,
      // WHICH heap, and against WHAT. This axis and Heap Space Pressure sit
      // next to each other on the panel and can read 100/good beside a space
      // at 99.8% full, which looks like two verdicts on one resource. They
      // are not: this is the whole heap against the ceiling it may not pass,
      // and that one is the fullest individual V8 space, which V8 grows on
      // demand (it says so in its own caption, and points back here).
      caption: `${usedMb} MB of ${maxMb} MB heap (${usedPct}%) · whole heap against its ceiling, not one V8 space`,
      elapsedMs: Date.now() - startedAt
    });
  } catch {
    return null;
  }
}
function readCgroupMem() {
  if (cgroupOverride === "unavailable") return null;
  if (cgroupOverride) return cgroupOverride;
  try {
    const maxRaw = readFileSync("/sys/fs/cgroup/memory.max", "utf8").trim();
    if (maxRaw !== "max") {
      const maxBytes = Number(maxRaw);
      const usedBytes = Number(
        readFileSync("/sys/fs/cgroup/memory.current", "utf8").trim()
      );
      if (Number.isFinite(maxBytes) && maxBytes > 0 && maxBytes < CGROUP_V1_UNLIMITED && Number.isFinite(usedBytes) && usedBytes >= 0) {
        return { usedBytes, maxBytes };
      }
    }
  } catch {
  }
  try {
    const maxBytes = Number(
      readFileSync("/sys/fs/cgroup/memory/memory.limit_in_bytes", "utf8").trim()
    );
    const usedBytes = Number(
      readFileSync("/sys/fs/cgroup/memory/memory.usage_in_bytes", "utf8").trim()
    );
    if (Number.isFinite(maxBytes) && maxBytes > 0 && maxBytes < CGROUP_V1_UNLIMITED && Number.isFinite(usedBytes) && usedBytes >= 0) {
      return { usedBytes, maxBytes };
    }
  } catch {
  }
  return null;
}
function readContainerPressure() {
  if (isBoosthisDisabled() || !started) return null;
  const lacking = systemUnavailableReading("containerPressure");
  if (lacking) return lacking;
  try {
    const mem = readCgroupMem();
    if (!mem) return null;
    const { usedBytes: used, maxBytes: limit } = mem;
    if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(used) || used < 0) {
      return null;
    }
    const usedMb = r0(used / BYTES_PER_MB);
    const maxMb = r0(limit / BYTES_PER_MB);
    const usedPct = r1(100 * used / limit);
    const score = linearScore(usedPct, CONTAINER_PCT_GOOD, CONTAINER_PCT_POOR);
    if (isSettling("peakRate", Date.now())) return settlingAxis();
    return markSettled({
      score,
      rating: ratingFor(score),
      usedMb,
      maxMb,
      usedPct,
      caption: `${usedMb} MB of ${maxMb} MB container limit (${usedPct}%)`
    });
  } catch {
    return null;
  }
}
function readCgroupCpu() {
  if (cpuThrottleOverride === "unavailable") return null;
  if (cpuThrottleOverride) return cpuThrottleOverride;
  try {
    const quotaRaw = readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim();
    if (quotaRaw.split(/\s+/)[0] !== "max") {
      const stat = readFileSync("/sys/fs/cgroup/cpu.stat", "utf8");
      const periods = readStatLine(stat, "nr_periods");
      const throttled = readStatLine(stat, "nr_throttled");
      if (periods !== null && Number.isFinite(periods) && periods >= 0 && throttled !== null && Number.isFinite(throttled) && throttled >= 0) {
        return { periods, throttled };
      }
    }
  } catch {
  }
  try {
    const quota = Number(
      readFileSync("/sys/fs/cgroup/cpu/cpu.cfs_quota_us", "utf8").trim()
    );
    if (Number.isFinite(quota) && quota > 0) {
      const stat = readFileSync("/sys/fs/cgroup/cpu/cpu.stat", "utf8");
      const periods = readStatLine(stat, "nr_periods");
      const throttled = readStatLine(stat, "nr_throttled");
      if (periods !== null && Number.isFinite(periods) && periods >= 0 && throttled !== null && Number.isFinite(throttled) && throttled >= 0) {
        return { periods, throttled };
      }
    }
  } catch {
  }
  return null;
}
function readStatLine(stat, key) {
  for (const line of stat.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === key) {
      const n = Number(parts[1]);
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}
const CPU_THROTTLE_MIN_WINDOW_MS = SETTLE_FAMILIES.peakRate.minSpanSec * 1e3;
let cpuThrottleAnchor = null;
let cpuThrottleLast = null;
function readCpuThrottling() {
  if (isBoosthisDisabled() || !started) return null;
  const lacking = systemUnavailableReading("cpuThrottling");
  if (lacking) return lacking;
  try {
    const cpu = readCgroupCpu();
    if (!cpu) return null;
    const { periods, throttled } = cpu;
    if (!Number.isFinite(periods) || periods < 0) return null;
    if (!Number.isFinite(throttled) || throttled < 0) return null;
    const now = Date.now();
    if (isSettling("peakRate", now)) {
      cpuThrottleAnchor = null;
      cpuThrottleLast = null;
      return settlingAxis();
    }
    const anchor = cpuThrottleAnchor;
    if (anchor === null || periods < anchor.periods || throttled < anchor.throttled) {
      cpuThrottleAnchor = {
        periods,
        throttled,
        suspendPeriods: suspendPeriodsDiscounted,
        suspendThrottled: suspendThrottledDiscounted,
        atMs: now
      };
      cpuThrottleLast = null;
      return null;
    }
    const elapsed = now - anchor.atMs;
    if (elapsed < CPU_THROTTLE_MIN_WINDOW_MS) return cpuThrottleLast;
    const suspendPeriods = Math.max(
      0,
      suspendPeriodsDiscounted - anchor.suspendPeriods
    );
    const suspendThrottled = Math.max(
      0,
      suspendThrottledDiscounted - anchor.suspendThrottled
    );
    const windowPeriods = Math.max(
      0,
      periods - anchor.periods - suspendPeriods
    );
    const windowThrottled = Math.min(
      Math.max(0, throttled - anchor.throttled - suspendThrottled),
      windowPeriods
    );
    if (windowPeriods <= 0) return null;
    const throttledPct = r1(100 * windowThrottled / windowPeriods);
    const score = linearScore(
      throttledPct,
      CPU_THROTTLE_PCT_GOOD,
      CPU_THROTTLE_PCT_POOR
    );
    const windowMin = windowMinOf(elapsed);
    const axis = {
      score,
      rating: ratingFor(score),
      throttledPct,
      throttledPeriods: windowThrottled,
      periods: windowPeriods,
      windowMin,
      caption: suspendThrottled > 0 ? `${throttledPct}% of CPU periods throttled during traffic (${windowThrottled}/${windowPeriods}) · ${windowPhrase(windowMin, "observed")} · ${suspendThrottled} idle-suspend throttles discounted` : `${throttledPct}% of CPU periods throttled (${windowThrottled}/${windowPeriods}) · ${windowPhrase(windowMin, "observed")}`
    };
    if (suspendThrottled > 0) {
      axis.suspendDiscounts = suspendThrottled;
      axis.suspendUnit = SUSPEND_UNIT.PERIODS;
    }
    cpuThrottleAnchor = {
      periods,
      throttled,
      suspendPeriods: suspendPeriodsDiscounted,
      suspendThrottled: suspendThrottledDiscounted,
      atMs: now
    };
    markSettled(axis);
    cpuThrottleLast = axis;
    return axis;
  } catch {
    return null;
  }
}
function cpuThrottleIdleStart() {
  if (isBoosthisDisabled() || !started) return;
  try {
    cpuIdleBaseline = readCgroupCpu();
  } catch {
    cpuIdleBaseline = null;
  }
}
function cpuThrottleSuspendWake() {
  if (isBoosthisDisabled() || !started) return;
  const base = cpuIdleBaseline;
  cpuIdleBaseline = null;
  if (!base) return;
  try {
    const cur = readCgroupCpu();
    if (!cur) return;
    const dPeriods = Math.max(0, cur.periods - base.periods);
    const dThrottled = Math.max(0, cur.throttled - base.throttled);
    if (dPeriods > 0 || dThrottled > 0) {
      suspendPeriodsDiscounted += dPeriods;
      suspendThrottledDiscounted += Math.min(dThrottled, dPeriods);
      suspendThrottleWakes++;
    }
  } catch {
  }
}
onSuspendIdleStart(cpuThrottleIdleStart);
onSuspendWake(cpuThrottleSuspendWake);
function readFdCounts() {
  if (fdOverride === "unavailable") return null;
  if (fdOverride) return fdOverride;
  try {
    const open = readdirSync("/proc/self/fd").length;
    const limits = readFileSync("/proc/self/limits", "utf8");
    let max = null;
    for (const line of limits.split("\n")) {
      if (line.startsWith("Max open files")) {
        const soft = line.slice("Max open files".length).trim().split(/\s+/)[0];
        if (soft === "unlimited") return null;
        const n = Number(soft);
        if (Number.isFinite(n)) max = n;
        break;
      }
    }
    if (max === null || !Number.isFinite(max) || max <= 0) return null;
    if (!Number.isFinite(open) || open < 0) return null;
    return { open, max };
  } catch {
    return null;
  }
}
function readFdSaturation() {
  if (isBoosthisDisabled() || !started) return null;
  const lacking = systemUnavailableReading("fdSaturation", { scopeCode: 1 });
  if (lacking) return lacking;
  try {
    const fds = readFdCounts();
    if (!fds) return null;
    const { open: openFds, max: maxFds } = fds;
    if (!Number.isFinite(maxFds) || maxFds <= 0) return null;
    if (!Number.isFinite(openFds) || openFds < 0) return null;
    const usedPct = r1(100 * openFds / maxFds);
    const score = linearScore(usedPct, FD_USED_GOOD, FD_USED_POOR);
    if (isSettling("peakRate", Date.now())) return settlingAxis();
    return markSettled({
      score,
      rating: ratingFor(score),
      openFds,
      maxFds,
      usedPct,
      scopeCode: 1,
      caption: `${openFds} of ${maxFds} file descriptors (${usedPct}%)`
    });
  } catch {
    return null;
  }
}
function readColdStart() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const usable = (v) => {
      if (v === null) return null;
      const ms = Math.round(v);
      if (!Number.isFinite(ms) || ms <= 0) return null;
      if (ms > COLDSTART_MAX_MS) return null;
      return ms;
    };
    const ready = usable(readyToServeMs());
    if (ready === null) {
      const enable = usable(coldStartMs);
      if (enable === null) return null;
      return {
        score: null,
        rating: "pending",
        startupMs: enable,
        measuredTo: MEASURED_TO_KIT_ENABLE
      };
    }
    const score = linearScore(ready, COLDSTART_MS_GOOD, COLDSTART_MS_POOR);
    return {
      score,
      rating: ratingFor(score),
      startupMs: ready,
      measuredTo: MEASURED_TO_SERVING
    };
  } catch {
    return null;
  }
}
function readGcTrend() {
  if (isBoosthisDisabled() || !started || !gcObserver) return null;
  try {
    const now = Date.now();
    if (isSettling("growthSlope", now)) return gcCount > 0 ? settlingAxis() : null;
    const from = Math.max(settledFromMs("growthSlope"), startedAt);
    const firstMinute = Math.ceil(from / 6e4) * 6e4;
    const lastMinute = Math.floor(now / 6e4) * 6e4 - 6e4;
    if (lastMinute < firstMinute) return null;
    const oldestHeld = gcMinuteMs.length >= GC_MINUTE_CAP ? gcMinuteMs[0].t : -Infinity;
    const byMinute = new Map(gcMinuteMs.map((bucket) => [bucket.t, bucket.ms]));
    const points = [];
    const startMinute = Math.max(firstMinute, oldestHeld, lastMinute - (GC_TREND_FIT_MINUTES - 1) * 6e4);
    for (let m = startMinute; m <= lastMinute; m += 6e4) {
      points.push({ t: m, v: byMinute.get(m) ?? 0 });
    }
    const fit = settledSlope(points, "growthSlope");
    if (!fit) return null;
    const growthPtsPerHour = r2(persistentGrowthPerMin(fit) / 10);
    const gcMsPerMin = r1(points.reduce((sum, point) => sum + point.v, 0) / points.length);
    const windowMs = Math.min(now - from, GC_TREND_WINDOW_MS);
    const windowStart = now - windowMs;
    const recent = gcEvents.filter((e) => e.t >= windowStart);
    const young = recent.filter((e) => e.young).length;
    const youngPerMin = r1(young / Math.max(windowMs / 6e4, 1 / 60));
    let worstMajorMs = 0;
    for (const e of recent) {
      if (e.major && e.ms > worstMajorMs) worstMajorMs = e.ms;
    }
    worstMajorMs = r1(worstMajorMs);
    const score = linearScore(growthPtsPerHour, GC_TREND_GROWTH_GOOD, GC_TREND_GROWTH_POOR);
    return markSettled({
      score,
      rating: ratingFor(score),
      gcGrowthPctPerHour: growthPtsPerHour,
      gcMsPerMin,
      youngPerMin,
      worstMajorMs,
      windowMin: windowMinOf(fit.spanMs),
      caption: `GC time ${signed(growthPtsPerHour)} pts/h · ${gcMsPerMin} ms/min · worst major pause ${worstMajorMs}ms`
    });
  } catch {
    return null;
  }
}
function readHeapWall() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const now = Date.now();
    if (isSettling("peakRate", now)) return memSamples.length > 0 ? settlingAxis() : null;
    const from = settledFromMs("peakRate");
    const settled = memSamples.filter((sample) => sample.t >= from);
    if (settled.length < MIN_MEM_SAMPLES) return null;
    const last = settled[settled.length - 1];
    if (last.t - settled[0].t < MIN_MEM_SPAN_MS) return null;
    const fit = settledSlope(
      settled.map((sample) => ({ t: sample.t, v: sample.heapMb })),
      "peakRate"
    );
    if (!fit) return null;
    const stats = heapStatsOverride ?? getHeapStatistics();
    const limit = stats.heap_size_limit;
    if (!Number.isFinite(limit) || limit <= 0) return null;
    const limitMb = limit / BYTES_PER_MB;
    const headroomMb = Math.max(0, limitMb - last.heapMb);
    const growth = persistentGrowthPerMin(fit);
    let hoursToWall;
    if (growth < HEAP_WALL_MIN_GROWTH) {
      hoursToWall = HEAP_WALL_MAX_HOURS;
    } else {
      hoursToWall = Math.min(HEAP_WALL_MAX_HOURS, headroomMb / growth / 60);
    }
    const span = HEAP_WALL_GOOD_HOURS - HEAP_WALL_POOR_HOURS;
    const score = hoursToWall >= HEAP_WALL_GOOD_HOURS ? 100 : hoursToWall <= HEAP_WALL_POOR_HOURS ? 0 : Math.round(100 * (hoursToWall - HEAP_WALL_POOR_HOURS) / span);
    return markSettled({
      score,
      rating: ratingFor(score),
      hoursToWall: r1(hoursToWall),
      headroomMb: r0(headroomMb),
      growthMbPerMin: r1(growth),
      caption: hoursToWall >= HEAP_WALL_MAX_HOURS ? `no heap wall in sight · ${r0(headroomMb)} MB headroom` : `hits heap limit in ~${r1(hoursToWall)}h at ${signed(growth)} MB/min`
    });
  } catch {
    return null;
  }
}
function readStartupImport() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (startupImportMs === null) return null;
    const importMs = Math.round(startupImportMs);
    if (!Number.isFinite(importMs) || importMs <= 0) return null;
    if (importMs > STARTUP_IMPORT_MAX_MS) return null;
    const bootMs = Math.max(0, Math.round(startupBootMs ?? 0));
    const score = linearScore(importMs, STARTUP_IMPORT_MS_GOOD, STARTUP_IMPORT_MS_POOR);
    return {
      score,
      rating: ratingFor(score),
      importMs,
      bootMs
    };
  } catch {
    return null;
  }
}
function readVitals() {
  const axes = {};
  const peak = readPeakRss();
  if (peak) axes.peakRss = peak;
  const mem = readMemoryStability();
  if (mem) axes.memoryStability = mem;
  const gc = readGcPressure();
  if (gc) axes.gcPressure = gc;
  const tax = readGcTax();
  if (tax) axes.gcTax = tax;
  const mpr = readMemoryPerRequest();
  if (mpr) axes.memoryPerRequest = mpr;
  const rel = readReliability();
  if (rel) axes.reliability = rel;
  const cf = readCrashFree();
  if (cf) axes.crashFree = cf;
  const elu = readEventLoopUtilization();
  if (elu) axes.eventLoopUtilization = elu;
  const frag = readHeapFragmentation();
  if (frag) axes.heapFragmentation = frag;
  const hl = readHandleLeak();
  if (hl) axes.handleLeak = hl;
  const gpt = readGcPauseTail();
  if (gpt) axes.gcPauseTail = gpt;
  const ggb = readGcGenerationBalance();
  if (ggb) axes.gcGenerationBalance = ggb;
  const hh = readHeapHeadroom();
  if (hh) axes.heapHeadroom = hh;
  const cp = readContainerPressure();
  if (cp) axes.containerPressure = cp;
  const ct = readCpuThrottling();
  if (ct) axes.cpuThrottling = ct;
  const fd = readFdSaturation();
  if (fd) axes.fdSaturation = fd;
  const cs = readColdStart();
  if (cs) axes.coldStart = cs;
  const gt = readGcTrend();
  if (gt) axes.gcTrend = gt;
  const hw = readHeapWall();
  if (hw) axes.heapWall = hw;
  const si = readStartupImport();
  if (si) axes.startupImport = si;
  return axes;
}
function clearVitals() {
  if (gcObserver) {
    try {
      gcObserver.disconnect();
    } catch {
    }
    gcObserver = null;
  }
  started = false;
  startedAt = 0;
  memSamples.length = 0;
  liveSetSamples.length = 0;
  retainedPoints.length = 0;
  settledRequestCount = 0;
  lastMemSampleAt = 0;
  gcMs = 0;
  gcCount = 0;
  reqTotal = 0;
  reqErrors = 0;
  firstReqAt = 0;
  lastReqAt = 0;
  lastELU = null;
  lastEluAt = 0;
  eluSamples.length = 0;
  settledGcMs = 0;
  settledGcCount = 0;
  settledYoungGcs = 0;
  settledFullGcs = 0;
  gcPauseTimed.length = 0;
  gcMinuteMs.length = 0;
  handleSamples.length = 0;
  gcPauseRing.length = 0;
  fullGcCount = 0;
  youngGcCount = 0;
  heapStatsOverride = null;
  cgroupOverride = null;
  cpuThrottleOverride = null;
  cpuIdleBaseline = null;
  cpuThrottleAnchor = null;
  cpuThrottleLast = null;
  suspendPeriodsDiscounted = 0;
  suspendThrottledDiscounted = 0;
  suspendThrottleWakes = 0;
  fdOverride = null;
  coldStartMs = null;
  coldStartReaderOverride = null;
  clearReadyMark();
  gcEvents.length = 0;
  startupImportMs = null;
  startupBootMs = null;
  startupReaderOverride = null;
}
const _vitalsInternals = {
  MEM_GROWTH_GOOD,
  MEM_GROWTH_POOR,
  MIN_MEM_SAMPLES,
  MIN_MEM_SPAN_MS,
  MEM_THROTTLE_MS,
  MEM_RING_CAP,
  MEM_TREND_WARMUP_MS,
  MEM_TREND_FLOOR_BUCKET_MS,
  MEM_RISE_FLOOR_MB,
  GC_PCT_GOOD,
  GC_PCT_POOR,
  MIN_GC_ELAPSED_MS,
  GC_TAX_GOOD_PCT,
  GC_TAX_POOR_PCT,
  GC_TAX_MIN_WINDOW_MS,
  GC_TAX_WINDOW_MS,
  MEMORY_PER_REQUEST_GOOD_KB,
  MEMORY_PER_REQUEST_POOR_KB,
  MIN_MEMORY_REQUESTS,
  ERR_PCT_GOOD,
  ERR_PCT_POOR,
  MIN_REQ_FOR_RELIABILITY,
  SERVER_ERROR_STATUS,
  CRASHFREE_RATE_POOR,
  CRASHFREE_MIN_WINDOW_MIN,
  ELU_PCT_GOOD,
  ELU_PCT_POOR,
  MIN_ELU_SAMPLES,
  FRAG_PCT_GOOD,
  FRAG_PCT_POOR,
  MIN_FRAG_ELAPSED_MS,
  strandedHeapBytes,
  HANDLE_GROWTH_GOOD,
  HANDLE_GROWTH_POOR,
  MIN_HANDLE_SAMPLES,
  MIN_HANDLE_SPAN_MS,
  HANDLE_WARMUP_MS,
  HANDLE_FLOOR_BUCKET_MS,
  MIN_HANDLE_FLOOR_BUCKETS,
  HANDLE_RISE_FLOOR,
  GC_PAUSE_P99_GOOD,
  GC_PAUSE_P99_POOR,
  MIN_GC_PAUSE_SAMPLES,
  GC_PAUSE_RING_CAP,
  GEN_RATIO_GOOD,
  GEN_RATIO_POOR,
  MIN_YOUNG_GCS,
  HEAP_USED_GOOD,
  HEAP_USED_POOR,
  MIN_HEAP_ELAPSED_MS,
  CPU_THROTTLE_PCT_GOOD,
  CPU_THROTTLE_PCT_POOR,
  FD_USED_GOOD,
  FD_USED_POOR,
  COLDSTART_MS_GOOD,
  COLDSTART_MS_POOR,
  COLDSTART_MAX_MS,
  HEAP_WALL_GOOD_HOURS,
  HEAP_WALL_POOR_HOURS,
  HEAP_WALL_MIN_GROWTH,
  HEAP_WALL_MAX_HOURS,
  STARTUP_IMPORT_MS_GOOD,
  STARTUP_IMPORT_MS_POOR,
  STARTUP_IMPORT_MAX_MS,
  /** Push a synthetic timestamped GC event (gcTrend tests). */
  pushGcEvent(t, young, major, ms) {
    noteGcEvent(t, ms, young, major);
  },
  /** A collection that left `heapMb` live, at time `t`. */
  pushLiveSet(t, heapMb) {
    noteLiveSet(t, heapMb);
  },
  /** The live set the collection observer records for a memory reading. */
  liveSetMbOf,
  /** Inject the startup-import reader (tests). */
  setStartupReader(fn) {
    startupReaderOverride = fn;
    startupImportMs = null;
    startupBootMs = null;
  },
  get isRunning() {
    return started;
  },
  reset() {
    clearVitals();
  },
  /** Force the started flag without a GC observer (deterministic unit tests). */
  forceStart(at) {
    started = true;
    startedAt = at;
  },
  setStartedAt(at) {
    startedAt = at;
  },
  /** Install a no-op GC observer sentinel so readGcPressure's observer guard
   *  passes deterministically (no dependence on a real collection firing). */
  enableGcForTest() {
    gcObserver = { disconnect() {
    } };
  },
  /** Push a synthetic memory sample, bypassing throttle + process.memoryUsage. */
  pushMemSample(t, heapMb, rssMb) {
    const sample = { t, heapMb, rssMb };
    memSamples.push(sample);
    liveSetSamples.push(sample);
    if (memSamples.length > MEM_RING_CAP) memSamples.shift();
    if (liveSetSamples.length > MEM_RING_CAP) liveSetSamples.shift();
  },
  /** Push a synthetic ELU sample (utilization fraction 0..1). */
  /** One loop interval ending at `t`: `idle` and `active` ms. */
  pushEluInterval(t, idle, active) {
    noteEluInterval(t, idle, active);
  },
  /** Push a synthetic active-handle count sample. */
  pushHandleSample(t, count) {
    handleSamples.push({ t, count });
    if (handleSamples.length > HANDLE_RING_CAP) handleSamples.shift();
  },
  /** Record synthetic GC time. */
  addGc(ms) {
    noteGcEvent(Date.now(), ms, false, false);
  },
  /** Record a synthetic collection driving all GC axes (pause ring + kind
   *  counters), mirroring the PerformanceObserver path. */
  recordGc(durationMs, kind) {
    noteGcEvent(Date.now(), durationMs, kind === "young", kind === "full");
  },
  /** Inject synthetic V8 heap statistics for heapHeadroom (bytes). */
  setHeapStatsForTest(usedBytes, limitBytes) {
    heapStatsOverride = { used_heap_size: usedBytes, heap_size_limit: limitBytes };
  },
  /** Inject synthetic cgroup memory numbers for containerPressure (bytes), or
   *  "unavailable" to force the no-cgroup path. */
  setCgroupForTest(v) {
    cgroupOverride = v;
  },
  /** Inject synthetic cgroup CPU throttle counters for cpuThrottling, or
   *  "unavailable" to force the no-cgroup / unlimited-quota path. */
  setCpuThrottleForTest(v) {
    cpuThrottleOverride = v;
  },
  /** Drive the cpuThrottling suspend boundaries directly (idle baseline snap /
   *  wake delta attribution) without wall-clock games. */
  cpuThrottleIdleStartForTest() {
    cpuThrottleIdleStart();
  },
  cpuThrottleSuspendWakeForTest() {
    cpuThrottleSuspendWake();
  },
  getCpuSuspendStateForTest() {
    return {
      suspendPeriodsDiscounted,
      suspendThrottledDiscounted,
      suspendThrottleWakes
    };
  },
  /** Age the cpuThrottling window anchor by `ms` so a test can cross the
   *  minimum window without wall-clock games. No-op before the first read. */
  advanceCpuThrottleWindowForTest(ms) {
    if (cpuThrottleAnchor) cpuThrottleAnchor.atMs -= ms;
  },
  /** Inject synthetic open-fd count + soft limit for fdSaturation, or
   *  "unavailable" to force the no-count / unlimited-limit path. */
  setFdForTest(v) {
    fdOverride = v;
  },
  /** Inject a fake process-age reader (ms) for coldStart so tests never depend
   *  on the live value; the reader may also throw to exercise the omit path.
   *  null restores the live process.uptime() reader. */
  setColdStartReaderForTest(reader) {
    coldStartReaderOverride = reader;
  },
  /** Trigger the ONCE-only, frozen cold-start capture (same call
   *  `enableTelemetry` makes). A second call after a value is stored is a no-op
   *  (freeze semantics). */
  captureColdStart() {
    captureColdStart();
  },
  /** The frozen captured value (ms), or null if never captured. */
  get coldStartMs() {
    return coldStartMs;
  },
  /** Record a synthetic request outcome (drives reliability without a server). */
  noteReq(statusCode, at) {
    reqTotal += 1;
    if (statusCode >= SERVER_ERROR_STATUS) reqErrors += 1;
    if (firstReqAt === 0) firstReqAt = at;
    lastReqAt = at;
  },
  get memCount() {
    return memSamples.length;
  },
  get reqTotal() {
    return reqTotal;
  }
};
function strandedHeapBytes(spaces) {
  let stranded = 0;
  let counted = 0;
  for (const sp of spaces) {
    if (!sp || typeof sp.space_size !== "number" || sp.space_size <= 0) continue;
    if (!fragmentableSpace(sp.space_name)) continue;
    counted++;
    const live = typeof sp.space_used_size === "number" ? sp.space_used_size : 0;
    const free = typeof sp.space_available_size === "number" ? sp.space_available_size : 0;
    const dead = sp.space_size - live - free;
    if (dead > 0) stranded += dead;
  }
  return { stranded, counted };
}
export {
  _vitalsInternals,
  captureColdStart,
  captureStartupImport,
  clearVitals,
  noteRequest,
  readColdStart,
  readContainerPressure,
  readCpuThrottling,
  readCrashFree,
  readEventLoopUtilization,
  readFdSaturation,
  readGcGenerationBalance,
  readGcPauseTail,
  readGcPressure,
  readGcTax,
  readGcTrend,
  readHandleLeak,
  readHeapFragmentation,
  readHeapHeadroom,
  readHeapWall,
  readMemoryPerRequest,
  readMemoryStability,
  readPeakRss,
  readReliability,
  readStartupImport,
  readVitals,
  startVitals
};
