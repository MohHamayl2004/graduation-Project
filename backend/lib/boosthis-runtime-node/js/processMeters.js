// @ts-nocheck
/* eslint-disable */
// Built from src/processMeters.ts so plain node can run the kit. Do not edit.
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { createHook } from "node:async_hooks";
import { subscribe, unsubscribe } from "node:diagnostics_channel";
import { monitorEventLoopDelay } from "node:perf_hooks";
import { getHeapCodeStatistics, getHeapSpaceStatistics } from "node:v8";
import { linearScore, ratingFor } from "./healthAxes.js";
import {
  REASON_NOTHING_TO_COMPARE
} from "./serverlessPlatform.js";
import { judgeTrend } from "./trendVerdict.js";
import {
  isSettling,
  markSettled,
  persistentGrowthPerMin,
  settledFromMs,
  settledSlope,
  settledSpanMs,
  settlingReading,
  spanJudgeable
} from "./settleRule.js";
import {
  earnedPerHour,
  earnedPerMin,
  minuteText,
  overWords,
  windowMinOf,
  windowPhrase
} from "./rateHonesty.js";
const r1 = (n) => Math.round(n * 10) / 10;
let started = false;
let startedAt = 0;
function envTrue(name) {
  try {
    const v = process.env[name];
    return v === "1" || v === "true" || v === "yes" || v === "on";
  } catch {
    return false;
  }
}
const SAMPLE_MIN_MS = 5e3;
const TURBO_SAMPLE_MIN_MS = 1e3;
const TURBO_SAMPLE_WINDOW_MS = 18e4;
function sampleThrottleMs(now) {
  let turboOff = false;
  try {
    turboOff = process.env.BOOSTHIS_TURBO === "0";
  } catch {
    turboOff = false;
  }
  if (turboOff || startedAt === 0) return SAMPLE_MIN_MS;
  return now - startedAt < TURBO_SAMPLE_WINDOW_MS ? TURBO_SAMPLE_MIN_MS : SAMPLE_MIN_MS;
}
const RING_CAP = 240;
let lastSampledAt = 0;
const samples = [];
let worstSpacePct = null;
let spaceCount = 0;
let spaceSkipped = 0;
let spaceSamples = 0;
let codeCacheMb = null;
let codeCacheSamples = 0;
let driftMs = 0;
let uptimeSupported = true;
let perfEntriesEnabled = false;
const perfEntrySamples = [];
function readMemoryUsage() {
  try {
    const mu = process.memoryUsage();
    if (!mu || typeof mu.rss !== "number") return null;
    return {
      rss: mu.rss,
      external: typeof mu.external === "number" ? mu.external : 0,
      arrayBuffers: typeof mu.arrayBuffers === "number" ? mu.arrayBuffers : 0,
      heapTotal: typeof mu.heapTotal === "number" ? mu.heapTotal : 0
    };
  } catch {
    return null;
  }
}
const MB = 1024 * 1024;
function sampleProcessMeters(now = Date.now()) {
  if (isBoosthisDisabled() || !started) return;
  if (now - lastSampledAt < sampleThrottleMs(now)) return;
  lastSampledAt = now;
  try {
    const mu = readMemoryUsage();
    let cpuMs = null;
    try {
      const ru = process.resourceUsage?.();
      if (ru && typeof ru.userCPUTime === "number") {
        cpuMs = (ru.userCPUTime + ru.systemCPUTime) / 1e3;
      }
    } catch {
      cpuMs = null;
    }
    let uptimeSec = null;
    try {
      const u = process.uptime();
      if (typeof u === "number" && Number.isFinite(u)) uptimeSec = u;
    } catch {
      uptimeSupported = false;
    }
    const prev = samples[samples.length - 1];
    if (prev && uptimeSec !== null && prev.uptimeSec !== null) {
      const wallDelta = now - prev.t;
      const upDelta = (uptimeSec - prev.uptimeSec) * 1e3;
      const gap = wallDelta - upDelta;
      if (Number.isFinite(gap) && gap > 250) driftMs += gap;
    }
    samples.push({
      t: now,
      rssMb: mu ? mu.rss / MB : null,
      externalMb: mu ? mu.external / MB : null,
      arrayBufferMb: mu ? mu.arrayBuffers / MB : null,
      heapTotalMb: mu ? mu.heapTotal / MB : null,
      uptimeSec,
      cpuMs
    });
    if (samples.length > RING_CAP) samples.shift();
    try {
      const spaces = getHeapSpaceStatistics();
      if (Array.isArray(spaces)) {
        let worst = 0;
        let counted = 0;
        let skipped = 0;
        for (const s of spaces) {
          if (!s || typeof s.space_size !== "number" || s.space_size <= 0) continue;
          if (!spaceCanShowPressure(s.space_name)) {
            skipped++;
            continue;
          }
          counted++;
          const pct = 100 * s.space_used_size / s.space_size;
          if (pct > worst) worst = pct;
        }
        if (counted > 0) {
          worstSpacePct = worst;
          spaceCount = counted;
          spaceSkipped = skipped;
          spaceSamples++;
        }
      }
    } catch {
    }
    try {
      const code = getHeapCodeStatistics();
      if (code && typeof code.code_and_metadata_size === "number") {
        codeCacheMb = (code.code_and_metadata_size + (code.bytecode_and_metadata_size || 0)) / MB;
        codeCacheSamples++;
      }
    } catch {
    }
    if (perfEntriesEnabled) {
      try {
        const perf = globalThis.performance;
        const n = perf?.getEntries?.().length;
        if (typeof n === "number" && Number.isFinite(n)) {
          perfEntrySamples.push({ t: now, n });
          if (perfEntrySamples.length > RING_CAP) perfEntrySamples.shift();
        }
      } catch {
      }
    }
  } catch {
  }
}
function series(pick) {
  const out = [];
  for (const s of samples) {
    const v = pick(s);
    if (v !== null && Number.isFinite(v)) out.push({ t: s.t, v });
  }
  return out;
}
function spanMs(pts) {
  return pts.length < 2 ? 0 : pts[pts.length - 1].t - pts[0].t;
}
const CPU_GOOD_PCT = 70;
const CPU_POOR_PCT = 100;
const MIN_CPU_SAMPLES = 3;
function readCpuConsumption() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const all = series((s) => s.cpuMs);
    if (all.length === 0) return null;
    const now = Date.now();
    if (isSettling("peakRate", now)) return settlingReading({ score: null });
    const from = settledFromMs("peakRate");
    const pts = all.filter((p) => p.t >= from);
    if (pts.length < MIN_CPU_SAMPLES) return null;
    const wall = spanMs(pts);
    if (!spanJudgeable(wall)) return null;
    const cpu = pts[pts.length - 1].v - pts[0].v;
    const cpuPct = r1(Math.max(0, 100 * cpu / wall));
    const score = linearScore(cpuPct, CPU_GOOD_PCT, CPU_POOR_PCT);
    return markSettled({
      score,
      rating: ratingFor(score),
      cpuPct,
      sampleCount: pts.length,
      caption: `${cpuPct}% of one CPU over the window`
    });
  } catch {
    return null;
  }
}
const RESIDENT_GROWTH_GOOD_MB_MIN = 0.5;
const RESIDENT_GROWTH_POOR_MB_MIN = 5;
const MIN_TREND_SAMPLES = 12;
const MIN_TREND_SPAN_MS = 3e5;
const TREND_WARMUP_MS = 6e4;
const RESIDENT_GROWTH_RISE_FLOOR_MB = 30;
const RESIDENT_GROWTH_FLOOR_BUCKET_MS = 15e3;
function readResidentGrowth() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const pts = series((s) => s.rssMb);
    const trend = judgeTrend(pts, {
      good: RESIDENT_GROWTH_GOOD_MB_MIN,
      poor: RESIDENT_GROWTH_POOR_MB_MIN,
      minSamples: MIN_TREND_SAMPLES,
      minSpanMs: MIN_TREND_SPAN_MS,
      warmupMs: TREND_WARMUP_MS,
      startedAt,
      riseFloor: RESIDENT_GROWTH_RISE_FLOOR_MB,
      floorBucketMs: RESIDENT_GROWTH_FLOOR_BUCKET_MS,
      minFloorBuckets: 6,
      abstainAroundZero: true
    });
    if (!trend) return null;
    const growthMbPerMin = r1(trend.perMin);
    const slopeSeMbPerMin = r1(trend.slopeSePerMin);
    const rssMb = r1(trend.judged[trend.judged.length - 1].v);
    const windowMin = windowMinOf(trend.spanMs);
    if (trend.score === null) {
      return {
        score: null,
        // One word for one silence, shared with its three siblings: a
        // withheld trend verdict is a wait for a calmer window, and the
        // server writes "could not tell" from the reason code. "not-scored"
        // means never graded by design, which this is not.
        rating: "pending",
        reasonCode: trend.reasonCode,
        growthMbPerMin,
        slopeSeMbPerMin,
        rssMb,
        windowMin,
        sampleCount: trend.sampleCount,
        caption: `resident memory ${rssMb} MB · moves too much over ${overWords(windowMin)} to call a trend`
      };
    }
    const riseMb = r1(trend.rise);
    if (trend.score >= 100 && growthMbPerMin > 0) {
      return {
        score: trend.score,
        rating: ratingFor(trend.score),
        growthMbPerMin,
        slopeSeMbPerMin,
        rssMb,
        windowMin,
        sampleCount: trend.sampleCount,
        caption: `resident memory ${rssMb} MB · +${growthMbPerMin} MB/min is ${riseMb} MB over ${overWords(windowMin)}, too little to call a climb`
      };
    }
    const score = trend.score;
    return {
      score,
      rating: ratingFor(score),
      growthMbPerMin,
      slopeSeMbPerMin,
      rssMb,
      windowMin,
      sampleCount: trend.sampleCount,
      caption: growthMbPerMin <= 0 ? `resident memory flat at ${rssMb} MB` : `resident memory climbing ${growthMbPerMin} MB/min`
    };
  } catch {
    return null;
  }
}
const MIN_MIX_SAMPLES = 5;
function readNativeMemoryMix() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const pts = samples.filter(
      (s) => s.rssMb !== null && s.rssMb > 0 && s.externalMb !== null
    );
    if (pts.length < MIN_MIX_SAMPLES) return null;
    const last = pts[pts.length - 1];
    const externalMb = r1(last.externalMb);
    const arrayBufferMb = r1(last.arrayBufferMb ?? 0);
    const nativePct = r1(Math.min(100, 100 * last.externalMb / last.rssMb));
    return {
      score: null,
      rating: "not-scored",
      nativePct,
      externalMb,
      arrayBufferMb,
      caption: `${nativePct}% of resident memory is external (buffers and add-ons)`
    };
  } catch {
    return null;
  }
}
const DRIFT_QUIET_PCT = 1;
const MIN_UPTIME_OBSERVED_MS = 5 * 6e4;
function readUptimeStability() {
  if (isBoosthisDisabled() || !started || !uptimeSupported) return null;
  try {
    const pts = series((s) => s.uptimeSec);
    if (pts.length < 2) return null;
    const observed = spanMs(pts);
    if (observed < MIN_UPTIME_OBSERVED_MS) return null;
    const uptimeMin = r1(pts[pts.length - 1].v / 60);
    const observedMin = windowMinOf(observed);
    const driftPct = r1(Math.min(100, 100 * driftMs / observed));
    return markSettled({
      score: null,
      rating: "not-scored",
      uptimeMin,
      observedMin,
      driftPct,
      caption: driftPct <= DRIFT_QUIET_PCT ? `continuously alive · ${windowPhrase(observedMin)}` : `the wall clock moved ${driftPct}% apart from the process clock`
    });
  } catch {
    return null;
  }
}
const MIN_SPACE_SAMPLES = 5;
function spaceCanShowPressure(name) {
  if (typeof name !== "string") return false;
  if (name === "read_only_space") return false;
  if (name === "new_space") return false;
  if (name.endsWith("large_object_space")) return false;
  return true;
}
function readHeapSpacePressure() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (spaceSamples < MIN_SPACE_SAMPLES || worstSpacePct === null) return null;
    const worst = r1(worstSpacePct);
    const judged = `${spaceCount} growable heap ${spaceCount === 1 ? "space" : "spaces"}`;
    const skipped = spaceSkipped > 0 ? `, ${spaceSkipped} fixed/on-demand ${spaceSkipped === 1 ? "space" : "spaces"} not judged` : "";
    return {
      // A WITHHELD VERDICT, NOT AN UNTAKEN READING.
      //
      // This sent `pending` + `measurable: 0` + "the platform does not expose
      // this" while publishing `worstSpacePct` — a number it demonstrably
      // has, taken from a reading the platform demonstrably does expose. On
      // our own server that abstention hid a space at 92.1% full. The
      // abstention itself is right, and the reason was wrong: V8 hands us
      // every one of these figures, and what is missing is a ceiling to
      // judge them against, which is `nothing to compare`. Same shape as
      // refusalHonesty: measured, published, deliberately unscored.
      score: null,
      rating: "not-scored",
      measurable: 1,
      reasonCode: REASON_NOTHING_TO_COMPARE,
      worstSpacePct: worst,
      spaceCount,
      skippedSpaces: spaceSkipped,
      caption: `fullest of ${judged} is at ${worst}%${skipped} · not rated: V8 commits space on demand, so this is not a ceiling — see Heap Headroom`
    };
  } catch {
    return null;
  }
}
const MIN_CODE_SAMPLES = 5;
function readCodeCachePressure() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (codeCacheSamples < MIN_CODE_SAMPLES || codeCacheMb === null) return null;
    const usedMb = r1(codeCacheMb);
    return {
      // Same correction as its neighbour above: the size IS exposed and IS
      // published here. What V8 does not give is a code-cache ceiling to
      // measure it against, which is a missing comparison, not a missing
      // reading — and a reading we hold must never be cited as one we cannot
      // get.
      score: null,
      rating: "not-scored",
      measurable: 1,
      reasonCode: REASON_NOTHING_TO_COMPARE,
      usedMb,
      caption: `${usedMb} MB of compiled code · not rated: V8 has no code-cache ceiling to measure this against`
    };
  } catch {
    return null;
  }
}
const AB_GOOD_MB_MIN = 0.5;
const AB_POOR_MB_MIN = 10;
const AB_RISE_FLOOR_MB = 8;
const AB_FLOOR_WINDOW_MS = 10 * 6e4;
const AB_FLOOR_WINDOW_MIN = AB_FLOOR_WINDOW_MS / 6e4;
function readArrayBufferRetention() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    const pts = series((s) => s.arrayBufferMb);
    const trend = judgeTrend(pts, {
      good: AB_GOOD_MB_MIN,
      poor: AB_POOR_MB_MIN,
      minSamples: MIN_TREND_SAMPLES,
      minSpanMs: MIN_TREND_SPAN_MS,
      warmupMs: TREND_WARMUP_MS,
      startedAt,
      riseFloor: AB_RISE_FLOOR_MB
    });
    if (!trend) return null;
    const now = Date.now();
    const newest = pts[pts.length - 1];
    const recent = pts.filter((p) => p.t >= now - AB_FLOOR_WINDOW_MS);
    const windowMin = recent.length >= 2 ? windowMinOf(spanMs(recent)) : 0;
    const floorPts = windowMin > 0 ? recent : [newest];
    let floor = Infinity;
    for (const p of floorPts) if (p.v < floor) floor = p.v;
    if (!Number.isFinite(floor)) return null;
    const retainedMb = r1(floor);
    const growthMbPerMin = r1(trend.perMin);
    const ageMin = windowMinOf(Math.max(0, now - newest.t));
    const stale = ageMin >= AB_FLOOR_WINDOW_MIN;
    if (trend.score === null) {
      return {
        score: null,
        rating: "pending",
        reasonCode: trend.reasonCode,
        retainedMb,
        growthMbPerMin,
        windowMin,
        ageMin,
        caption: `${retainedMb} MB of buffers · moves too much over ${overWords(windowMinOf(trend.spanMs))} to call a trend`
      };
    }
    const score = trend.score;
    return {
      score,
      rating: ratingFor(score),
      retainedMb,
      growthMbPerMin,
      windowMin,
      ageMin,
      caption: stale ? `${retainedMb} MB of buffers when last measured ${minuteText(ageMin)} ago · ${growthMbPerMin > 0 ? `was climbing ${growthMbPerMin} MB/min` : "not growing"}` : (
        // A rate the floor has not let cost anything must say so beside the
        // green tile, or the reader is left with a positive number and a
        // good rating and no way to tell which one the score believed.
        growthMbPerMin > 0 && score >= 100 ? `buffer memory +${growthMbPerMin} MB/min is ${r1(trend.rise)} MB over ${overWords(windowMinOf(trend.spanMs))}, too little to call a climb` : growthMbPerMin > 0 ? `buffer memory climbing ${growthMbPerMin} MB/min` : windowMin >= 1 ? `${retainedMb} MB of buffers held throughout the last ${minuteText(windowMin)} · not growing` : windowMin > 0 ? `${retainedMb} MB of buffers held throughout under a minute of samples · not growing` : `${retainedMb} MB of buffers at the latest reading · not growing`
      )
    };
  } catch {
    return null;
  }
}
const ELD_WINDOW_MS = 6e4;
const MIN_ELD_WINDOWS = 3;
const ELD_P99_GOOD_MS = 20;
const ELD_P99_POOR_MS = 200;
const ELD_MAX_GOOD_MS = 50;
const ELD_MAX_POOR_MS = 1e3;
let eldEnabled = false;
let eldHistogram = null;
let eldWindowStart = 0;
const eldWindows = [];
function startEventLoopDelay() {
  if (!envTrue("BOOSTHIS_EVENT_LOOP_HISTOGRAM") || eldHistogram) return;
  try {
    const h = monitorEventLoopDelay({ resolution: 20 });
    h.enable();
    eldHistogram = h;
    eldEnabled = true;
    eldWindowStart = Date.now();
  } catch {
    eldHistogram = null;
  }
}
function rollEldWindow(now) {
  if (!eldHistogram || now - eldWindowStart < ELD_WINDOW_MS) return;
  try {
    const NS = 1e6;
    const p95Ms = eldHistogram.percentile(95) / NS;
    const p99Ms = eldHistogram.percentile(99) / NS;
    const maxMs = eldHistogram.max / NS;
    if (Number.isFinite(p99Ms) && p99Ms >= 0) {
      eldWindows.push({ p95Ms, p99Ms, maxMs, startMs: eldWindowStart });
      if (eldWindows.length > RING_CAP) eldWindows.shift();
    }
    eldHistogram.reset();
    eldWindowStart = now;
  } catch {
  }
}
function readEventLoopDelayTail() {
  if (isBoosthisDisabled() || !started || !eldEnabled) return null;
  try {
    if (isSettling("latencyTail", Date.now())) return settlingReading({ score: null });
    const from = settledFromMs("latencyTail");
    const settled = eldWindows.filter((w) => w.startMs >= from);
    if (settled.length < MIN_ELD_WINDOWS) return null;
    let p95 = 0, p99 = 0;
    for (const w of settled) {
      if (w.p95Ms > p95) p95 = w.p95Ms;
      if (w.p99Ms > p99) p99 = w.p99Ms;
    }
    const p95Ms = r1(p95);
    const p99Ms = r1(p99);
    const score = linearScore(p99Ms, ELD_P99_GOOD_MS, ELD_P99_POOR_MS);
    return markSettled({
      score,
      rating: ratingFor(score),
      p95Ms,
      p99Ms,
      windowCount: settled.length,
      caption: `p99 timer delay ${p99Ms}ms across ${settled.length} windows`
    });
  } catch {
    return null;
  }
}
function readEventLoopDelayMax() {
  if (isBoosthisDisabled() || !started || !eldEnabled) return null;
  try {
    if (isSettling("peakRate", Date.now())) return settlingReading({ score: null });
    const from = settledFromMs("peakRate");
    const settled = eldWindows.filter((w) => w.startMs >= from);
    if (settled.length < MIN_ELD_WINDOWS || !spanJudgeable(settled.length * ELD_WINDOW_MS)) return null;
    let worst = 0;
    for (const w of settled) if (w.maxMs > worst) worst = w.maxMs;
    const worstMs = r1(worst);
    const score = linearScore(worstMs, ELD_MAX_GOOD_MS, ELD_MAX_POOR_MS);
    return markSettled({
      score,
      rating: ratingFor(score),
      worstMs,
      windowCount: settled.length,
      caption: `worst observed delay ${worstMs}ms`
    });
  } catch {
    return null;
  }
}
const PERF_GROWTH_GOOD_PER_MIN = 1;
const PERF_GROWTH_POOR_PER_MIN = 50;
const MIN_PERF_SAMPLES = 5;
function readPerfEntryBacklog() {
  if (isBoosthisDisabled() || !started || !perfEntriesEnabled) return null;
  try {
    if (perfEntrySamples.length === 0) return null;
    if (isSettling("growthSlope", Date.now())) return settlingReading({ score: null });
    if (perfEntrySamples.length < MIN_PERF_SAMPLES) return null;
    const fit = settledSlope(
      perfEntrySamples.map((s) => ({ t: s.t, v: s.n })),
      "growthSlope"
    );
    if (!fit) return null;
    const last = perfEntrySamples[perfEntrySamples.length - 1];
    const entryCount = Math.round(last.n);
    const growthPerMin = r1(persistentGrowthPerMin(fit));
    const score = linearScore(growthPerMin, PERF_GROWTH_GOOD_PER_MIN, PERF_GROWTH_POOR_PER_MIN);
    return markSettled({
      score,
      rating: ratingFor(score),
      entryCount,
      growthPerMin,
      windowMin: windowMinOf(fit.spanMs),
      caption: growthPerMin > 0 ? `${entryCount} performance entries held · growing ${growthPerMin}/min` : `${entryCount} performance entries held · not growing`
    });
  } catch {
    return null;
  }
}
const MIN_DIVERSITY_ELAPSED_MS = 6e4;
const DIVERSITY_TYPE_CAP = 64;
let diversityHook = null;
const diversityTypes = /* @__PURE__ */ new Set();
let diversityInits = 0;
function startAsyncDiversity() {
  if (!envTrue("BOOSTHIS_ASYNC_RESOURCE_TYPES") || diversityHook) return;
  try {
    const hook = createHook({
      init(_id, type) {
        try {
          diversityInits++;
          if (diversityTypes.size < DIVERSITY_TYPE_CAP) diversityTypes.add(type);
        } catch {
        }
      }
    });
    hook.enable();
    diversityHook = hook;
  } catch {
    diversityHook = null;
  }
}
function readAsyncResourceDiversity() {
  if (isBoosthisDisabled() || !started || !diversityHook) return null;
  try {
    if (Date.now() - startedAt < MIN_DIVERSITY_ELAPSED_MS) return null;
    const typeCount = diversityTypes.size;
    return {
      score: null,
      rating: "not-scored",
      typeCount,
      sampleCount: Math.min(diversityInits, 1e9),
      caption: `${typeCount} async resource types created since start`
    };
  } catch {
    return null;
  }
}
const DIAG_ERR_GOOD_PER_HOUR = 1;
const DIAG_ERR_POOR_PER_HOUR = 60;
const MIN_DIAG_EVENTS = 5;
const DIAG_MAX_CHANNELS = 16;
const DIAG_ACTIVE_WINDOW_MS = 10 * 6e4;
function payloadCarriesError(msg) {
  if (msg instanceof Error) return true;
  if (typeof msg !== "object" || msg === null) return false;
  const error = msg.error;
  return error !== void 0 && error !== null && error !== false;
}
function noteDiagMessage(entry, msg) {
  const now = Date.now();
  const settled = now >= settledFromMs("startupEvent");
  entry.count++;
  if (settled) entry.settledCount++;
  if (payloadCarriesError(msg)) {
    entry.errors++;
    if (settled) entry.settledErrors++;
  }
  entry.lastAt = now;
}
const diagChannels = /* @__PURE__ */ new Map();
function startDiagnostics() {
  if (!envTrue("BOOSTHIS_DIAGNOSTICS") || diagChannels.size > 0) return;
  try {
    const raw = process.env.BOOSTHIS_DIAGNOSTICS_CHANNELS || "";
    const names = raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0 && s.length <= 64).slice(0, DIAG_MAX_CHANNELS);
    if (names.length === 0) return;
    for (const name of names) {
      const entry = {
        count: 0,
        settledCount: 0,
        errors: 0,
        settledErrors: 0,
        lastAt: 0,
        unsubscribe: null
      };
      const cb = (msg) => {
        try {
          noteDiagMessage(entry, msg);
        } catch {
        }
      };
      try {
        subscribe(name, cb);
        entry.unsubscribe = () => unsubscribe(name, cb);
        diagChannels.set(name, entry);
      } catch {
      }
    }
  } catch {
    diagChannels.clear();
  }
}
function readDiagnosticErrorVolume() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (diagChannels.size === 0) return null;
    let errCount = 0;
    for (const c of diagChannels.values()) errCount += c.settledErrors;
    const now = Date.now();
    if (isSettling("startupEvent", now)) return settlingReading({ score: null });
    const windowMs = settledSpanMs(startedAt, now, "startupEvent");
    const windowMin = windowMinOf(windowMs);
    const perHour = earnedPerHour(errCount, windowMs);
    if (perHour === null) {
      if (errCount === 0) return null;
      return markSettled({
        score: null,
        rating: "pending",
        count: errCount,
        perHour: null,
        windowMin,
        caption: `${errCount} subsystem error${errCount === 1 ? "" : "s"} · ${windowPhrase(windowMin, "observed so far")}`
      });
    }
    const score = linearScore(perHour, DIAG_ERR_GOOD_PER_HOUR, DIAG_ERR_POOR_PER_HOUR);
    return markSettled({
      score,
      rating: ratingFor(score),
      count: errCount,
      perHour,
      windowMin,
      caption: errCount === 0 ? `no subsystem errors · ${windowPhrase(windowMin)}` : `${errCount} subsystem errors · ${perHour}/hour over ${overWords(windowMin)}`
    });
  } catch {
    return null;
  }
}
function readDiagnosticActivity() {
  if (isBoosthisDisabled() || !started) return null;
  try {
    if (diagChannels.size === 0) return null;
    const now = Date.now();
    if (isSettling("startupEvent", now)) return settlingReading({ score: null });
    let total = 0;
    let active = 0;
    for (const c of diagChannels.values()) {
      total += c.settledCount;
      if (c.settledCount > 0 && c.lastAt > 0 && now - c.lastAt <= DIAG_ACTIVE_WINDOW_MS) active++;
    }
    if (total < MIN_DIAG_EVENTS) return null;
    const elapsed = settledSpanMs(startedAt, now, "startupEvent");
    const windowMin = windowMinOf(elapsed);
    const channelCount = diagChannels.size;
    const perMin = earnedPerMin(total, elapsed);
    return markSettled({
      score: null,
      rating: "not-scored",
      channelCount,
      count: total,
      perMin,
      windowMin,
      caption: perMin === null ? `${active} of ${channelCount} watched subsystems active · ${total} event${total === 1 ? "" : "s"} in ${windowPhrase(windowMin, "")}` : `${active} of ${channelCount} watched subsystems active · ${perMin} events/min over ${overWords(windowMin)}`
    });
  } catch {
    return null;
  }
}
function startProcessMeters() {
  if (isBoosthisDisabled() || started) return;
  started = true;
  startedAt = Date.now();
  perfEntriesEnabled = envTrue("BOOSTHIS_PERF_ENTRIES");
  try {
    startEventLoopDelay();
  } catch {
  }
  try {
    startAsyncDiversity();
  } catch {
  }
  try {
    startDiagnostics();
  } catch {
  }
}
function readProcessMeters() {
  const axes = {};
  if (isBoosthisDisabled() || !started) return axes;
  try {
    const now = Date.now();
    sampleProcessMeters(now);
    rollEldWindow(now);
  } catch {
  }
  const put = (key, ax) => {
    if (ax) axes[key] = ax;
  };
  put("cpuConsumption", readCpuConsumption());
  put("residentGrowth", readResidentGrowth());
  put("nativeMemoryMix", readNativeMemoryMix());
  put("uptimeStability", readUptimeStability());
  put("heapSpacePressure", readHeapSpacePressure());
  put("arrayBufferRetention", readArrayBufferRetention());
  put("eventLoopDelayTail", readEventLoopDelayTail());
  put("eventLoopDelayMax", readEventLoopDelayMax());
  put("perfEntryBacklog", readPerfEntryBacklog());
  put("asyncResourceDiversity", readAsyncResourceDiversity());
  put("diagnosticErrorVolume", readDiagnosticErrorVolume());
  put("diagnosticActivity", readDiagnosticActivity());
  return axes;
}
function clearProcessMeters() {
  started = false;
  startedAt = 0;
  lastSampledAt = 0;
  samples.length = 0;
  worstSpacePct = null;
  spaceCount = 0;
  spaceSkipped = 0;
  spaceSamples = 0;
  codeCacheMb = null;
  codeCacheSamples = 0;
  driftMs = 0;
  uptimeSupported = true;
  perfEntriesEnabled = false;
  perfEntrySamples.length = 0;
  try {
    if (eldHistogram) eldHistogram.disable();
  } catch {
  }
  eldHistogram = null;
  eldEnabled = false;
  eldWindows.length = 0;
  eldWindowStart = 0;
  try {
    if (diversityHook) diversityHook.disable();
  } catch {
  }
  diversityHook = null;
  diversityTypes.clear();
  diversityInits = 0;
  for (const c of diagChannels.values()) {
    try {
      c.unsubscribe?.();
    } catch {
    }
  }
  diagChannels.clear();
}
const _processMetersInternals = {
  SAMPLE_MIN_MS,
  MIN_TREND_SAMPLES,
  MIN_TREND_SPAN_MS,
  TREND_WARMUP_MS,
  RESIDENT_GROWTH_RISE_FLOOR_MB,
  AB_RISE_FLOOR_MB,
  CPU_GOOD_PCT,
  CPU_POOR_PCT,
  RESIDENT_GROWTH_GOOD_MB_MIN,
  RESIDENT_GROWTH_POOR_MB_MIN,
  DRIFT_QUIET_PCT,
  PERF_GROWTH_GOOD_PER_MIN,
  PERF_GROWTH_POOR_PER_MIN,
  spaceCanShowPressure,
  MIN_ELD_WINDOWS,
  MIN_DIAG_EVENTS,
  get isRunning() {
    return started;
  },
  reset() {
    clearProcessMeters();
  },
  /** Force started (+backdate) without env hooks for hermetic unit tests. */
  forceStart(at) {
    started = true;
    startedAt = at;
  },
  pushSample(s) {
    samples.push(s);
  },
  setSpaceStats(worstPct, count, sampleN, skipped = 0) {
    worstSpacePct = worstPct;
    spaceCount = count;
    spaceSkipped = skipped;
    spaceSamples = sampleN;
  },
  setCodeCache(mb, sampleN) {
    codeCacheMb = mb;
    codeCacheSamples = sampleN;
  },
  addDrift(ms) {
    driftMs += ms;
  },
  enableEldForTest() {
    eldEnabled = true;
  },
  /** A closed delay window; one with no stated start opened a minute ago. */
  pushEldWindow(w) {
    eldWindows.push({ ...w, startMs: w.startMs ?? Date.now() - ELD_WINDOW_MS });
  },
  enablePerfEntriesForTest() {
    perfEntriesEnabled = true;
  },
  pushPerfEntrySample(t, n) {
    perfEntrySamples.push({ t, n });
  },
  enableDiversityForTest(types, inits) {
    diversityHook = { disable() {
    } };
    for (const t of types) diversityTypes.add(t);
    diversityInits = inits;
  },
  /** A watched channel that has seen `count` settled messages, every one of
   *  them carrying an error payload when `isError`. */
  setDiagChannelForTest(name, isError, count, lastAt) {
    const errors = isError ? count : 0;
    diagChannels.set(name, {
      count,
      settledCount: count,
      errors,
      settledErrors: errors,
      lastAt,
      unsubscribe: null
    });
  },
  /** Deliver one message to a watched channel's own filing path. */
  publishDiagForTest(name, msg) {
    const entry = diagChannels.get(name);
    if (entry) noteDiagMessage(entry, msg);
  }
};
export {
  _processMetersInternals,
  clearProcessMeters,
  readArrayBufferRetention,
  readAsyncResourceDiversity,
  readCodeCachePressure,
  readCpuConsumption,
  readDiagnosticActivity,
  readDiagnosticErrorVolume,
  readEventLoopDelayMax,
  readEventLoopDelayTail,
  readHeapSpacePressure,
  readNativeMemoryMix,
  readPerfEntryBacklog,
  readProcessMeters,
  readResidentGrowth,
  readUptimeStability,
  sampleProcessMeters,
  startProcessMeters
};
