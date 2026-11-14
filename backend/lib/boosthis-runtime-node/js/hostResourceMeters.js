// @ts-nocheck
/* eslint-disable */
// Built from src/hostResourceMeters.ts so plain node can run the kit. Do not edit.
import {
  closeSync,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  readdirSync,
  statfsSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { availableParallelism, cpus, loadavg, uptime } from "node:os";
import { join } from "node:path";
import { linearScore, ratingFor } from "./healthAxes.js";
import { REASON_BLOCKED_BY_ENVIRONMENT } from "./axisReasons.js";
import { windowMinOf, windowPhrase } from "./rateHonesty.js";
import { hostPlatform, systemUnavailableReading } from "./systemLimits.js";
import {
  SETTLE_FAMILIES,
  isSettling,
  markSettled,
  settledFromMs,
  settlingReading,
  spanJudgeable
} from "./settleRule.js";
const DISK_USED_PCT_GOOD = 75;
const DISK_USED_PCT_POOR = 95;
const IO_GOOD_MB_PER_SEC = 2;
const IO_POOR_MB_PER_SEC = 100;
const FAULT_GOOD_PER_MIN = 1;
const FAULT_POOR_PER_MIN = 100;
const FDMIX_SOCK_PCT_GOOD = 70;
const FDMIX_SOCK_PCT_POOR = 95;
const FDMIX_MIN_FDS = 20;
const FDMIX_SCAN_CAP = 4096;
const SYSTEM_LOAD_GOOD = 0.7;
const SYSTEM_LOAD_POOR = 2;
const HOST_RATE_MIN_SPAN_MS = SETTLE_FAMILIES.peakRate.minSpanSec * 1e3;
const HOST_RATE_WINDOW_MS = 30 * 6e4;
const IO_STALL_PCT_GOOD = 2;
const IO_STALL_PCT_POOR = 25;
const STORAGE_LATENCY_GOOD_MS = 8;
const STORAGE_LATENCY_POOR_MS = 120;
const STORAGE_FAILURE_GOOD_PCT = 1;
const STORAGE_FAILURE_POOR_PCT = 10;
const STORAGE_MIN_OPERATIONS = 5;
const STORAGE_RING_CAP = 200;
const STORAGE_LATENCY_MIN_SETTLED = SETTLE_FAMILIES.latencyTail.minSamples;
const MB = 1024 * 1024;
let samples = [];
let storageDurations = [];
let storageAttempts = 0;
let storageFailures = 0;
let storageSuccesses = 0;
let containerCache;
let statfsOverride = null;
let loadOverride = null;
let psiOverride = null;
function r1(n) {
  return Math.round(n * 10) / 10;
}
function r2(n) {
  return Math.round(n * 100) / 100;
}
function hostVolumeScopeCode() {
  if (containerCache !== void 0) return containerCache ? 2 : 3;
  let boxed = false;
  try {
    boxed = existsSync("/.dockerenv");
  } catch {
    boxed = false;
  }
  if (!boxed) {
    try {
      const cgroup = readFileSync("/proc/self/cgroup", "utf8");
      boxed = /docker|kubepods|containerd|lxc/.test(cgroup);
    } catch {
      boxed = false;
    }
  }
  containerCache = boxed;
  return boxed ? 2 : 3;
}
function scored(value, good, poor) {
  const score = linearScore(value, good, poor);
  return { score, rating: ratingFor(score) };
}
function readCounters(now) {
  if (hostPlatform() !== "linux") return;
  let read = null;
  let written = null;
  let major = null;
  try {
    let r = -1, w = -1;
    for (const line of readFileSync("/proc/self/io", "utf8").split("\n")) {
      if (line.startsWith("read_bytes:")) r = Number(line.slice(11).trim());
      if (line.startsWith("write_bytes:")) w = Number(line.slice(12).trim());
    }
    if (r >= 0 && w >= 0) {
      read = r;
      written = w;
    }
  } catch {
  }
  try {
    const raw = readFileSync("/proc/self/stat", "utf8");
    const fields = raw.slice(raw.lastIndexOf(") ") + 2).trim().split(/\s+/);
    const m = Number(fields[9]);
    if (Number.isFinite(m)) major = m;
  } catch {
  }
  if (read === null && major === null) return;
  pushCounterSample({ at: now, read, written, major });
}
function pushCounterSample(sample) {
  samples.push(sample);
  if (samples.length > 240) samples = samples.slice(-240);
}
function counterWindow(has) {
  const newest = samples[samples.length - 1];
  if (!newest) return null;
  const from = Math.max(settledFromMs("peakRate"), newest.at - HOST_RATE_WINDOW_MS);
  const usable = samples.filter((s) => s.at >= from && has(s));
  if (usable.length < 2) return null;
  const a = usable[0], b = usable[usable.length - 1];
  const span = b.at - a.at;
  return spanJudgeable(span, "peakRate") ? { a, b, span } : null;
}
function counterSettling(has) {
  const newest = samples[samples.length - 1];
  if (!newest || !samples.some(has) || !isSettling("peakRate", newest.at)) return null;
  return settlingReading({ score: null, scopeCode: 1 });
}
function readStatfs() {
  if (statfsOverride) return statfsOverride();
  const dir = process.env.BOOSTHIS_STATE_DIR || process.cwd();
  const s = statfsSync(dir, { bigint: true });
  return { totalBytes: Number(s.blocks * s.bsize), freeBytes: Number(s.bavail * s.bsize) };
}
function diskPressure(now = Date.now()) {
  try {
    const fs = readStatfs();
    if (!fs) return null;
    const total = fs.totalBytes;
    const free = fs.freeBytes;
    if (!(total > 0) || free < 0) return null;
    const usedPct = r1(100 * (total - free) / total);
    const scopeCode = hostVolumeScopeCode();
    if (isSettling("peakRate", now)) return settlingReading({ score: null, scopeCode });
    return markSettled({
      ...scored(usedPct, DISK_USED_PCT_GOOD, DISK_USED_PCT_POOR),
      usedPct,
      freeMb: Math.round(free / MB),
      totalMb: Math.round(total / MB),
      scopeCode,
      caption: `${usedPct}% used`
    });
  } catch {
    return null;
  }
}
function readIoPsi() {
  const sources = [];
  if (psiOverride !== null) {
    if (psiOverride === "unavailable") return null;
    sources.push([psiOverride, "system"]);
  } else {
    if (hostPlatform() !== "linux") return null;
    for (const [path, code] of [
      ["/sys/fs/cgroup/io.pressure", "cgroup2"],
      ["/proc/pressure/io", "system"]
    ]) {
      try {
        sources.push([readFileSync(path, "utf8"), code]);
        break;
      } catch {
      }
    }
  }
  for (const [text, code] of sources) {
    for (const line of text.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] !== "some") continue;
      for (const field of parts.slice(1)) {
        if (!field.startsWith("avg60=")) continue;
        const v = Number(field.slice(6));
        return Number.isFinite(v) ? { pct: Math.max(0, v), source: code } : null;
      }
    }
  }
  return null;
}
function ioPressure() {
  const lacking = systemUnavailableReading("ioPressure", { scopeCode: 1 });
  if (lacking) return lacking;
  const has = (s) => s.read !== null && s.written !== null;
  const win = counterWindow(has);
  if (!win) return counterSettling(has);
  const { a, b, span } = win;
  const windowMin = windowMinOf(span);
  const readBytes = Math.max(0, b.read - a.read);
  const writtenBytes = Math.max(0, b.written - a.written);
  const rate = (readBytes + writtenBytes) / MB / (span / 1e3);
  const psi = readIoPsi();
  const stallPct = psi === null ? null : r2(psi.pct);
  const stall = psi === null ? {
    score: null,
    rating: "pending",
    measurable: 0,
    reasonCode: REASON_BLOCKED_BY_ENVIRONMENT,
    stallPct: null
  } : {
    ...scored(psi.pct, IO_STALL_PCT_GOOD, IO_STALL_PCT_POOR),
    measurable: 1,
    stallPct,
    stallSourceCode: psi.source
  };
  return markSettled({
    ...stall,
    mbPerSec: r2(rate),
    readMb: Math.round(readBytes / MB),
    writtenMb: Math.round(writtenBytes / MB),
    windowMin,
    scopeCode: 1,
    caption: `${r2(rate)} MB/s storage I/O` + (stallPct === null ? "" : ` · ${stallPct}% stalled`) + ` · ${windowPhrase(windowMin)}`
  });
}
function pageFaults() {
  const lacking = systemUnavailableReading("pageFaults", { scopeCode: 1 });
  if (lacking) return lacking;
  const has = (s) => s.major !== null;
  const win = counterWindow(has);
  if (!win) return counterSettling(has);
  const { a, b, span } = win;
  const windowMin = windowMinOf(span);
  const majorFaults = Math.max(0, b.major - a.major);
  const rate = majorFaults / (span / 6e4);
  return markSettled({
    ...scored(rate, FAULT_GOOD_PER_MIN, FAULT_POOR_PER_MIN),
    majorFaults,
    majorPerMin: r1(rate),
    windowMin,
    scopeCode: 1,
    caption: `${r1(rate)} major faults/min · ${windowPhrase(windowMin)}`
  });
}
function descriptorMix() {
  const lacking = systemUnavailableReading("descriptorMix", { scopeCode: 1 });
  if (lacking) return lacking;
  if (hostPlatform() !== "linux") return null;
  try {
    let sockets = 0, pipes = 0, files = 0, otherFds = 0;
    for (const name of readdirSync("/proc/self/fd").slice(0, FDMIX_SCAN_CAP)) {
      try {
        const s = fstatSync(Number(name));
        if (s.isSocket()) sockets++;
        else if (s.isFIFO()) pipes++;
        else if (s.isFile()) files++;
        else otherFds++;
      } catch {
      }
    }
    const total = sockets + pipes + files + otherFds;
    if (total < FDMIX_MIN_FDS) return null;
    const socketsPct = Math.round(100 * sockets / total);
    return {
      score: null,
      rating: "not-scored",
      sockets,
      pipes,
      files,
      otherFds,
      socketsPct,
      scopeCode: 1,
      caption: `${sockets} sockets · ${files} files · ${pipes} pipes · ${otherFds} other`
    };
  } catch {
    return null;
  }
}
function systemLoad(now = Date.now()) {
  const lacking = systemUnavailableReading("systemLoad", { scopeCode: 3 });
  if (lacking) return lacking;
  try {
    const host = loadOverride ?? {
      load: loadavg()[0],
      cpus: typeof availableParallelism === "function" ? availableParallelism() : cpus().length,
      uptimeSec: uptime()
    };
    if (host.uptimeSec < 60) return null;
    const load = host.load;
    const count = host.cpus;
    if (!Number.isFinite(load) || count <= 0) return null;
    if (isSettling("peakRate", now)) return settlingReading({ score: null, scopeCode: 3 });
    const loadPerCpu = r2(load / count);
    return markSettled({
      ...scored(loadPerCpu, SYSTEM_LOAD_GOOD, SYSTEM_LOAD_POOR),
      loadPerCpu,
      load: r2(load),
      cpus: count,
      scopeCode: 3,
      caption: `${loadPerCpu} load per CPU`
    });
  } catch {
    return null;
  }
}
function takeStorageProbe() {
  const dir = process.env.BOOSTHIS_STATE_DIR;
  if (!dir) return;
  storageAttempts++;
  const path = join(dir, `.boosthis-storage-probe-${process.pid}`);
  const started = performance.now();
  let fd;
  try {
    fd = openSync(path, "w");
    writeFileSync(fd, "1");
    closeSync(fd);
    fd = void 0;
    readFileSync(path);
    unlinkSync(path);
    fileStorageDuration(Date.now(), Math.max(0, performance.now() - started));
  } catch {
    storageFailures++;
    if (fd !== void 0) try {
      closeSync(fd);
    } catch {
    }
    try {
      unlinkSync(path);
    } catch {
    }
  }
}
function fileStorageDuration(at, ms) {
  storageSuccesses++;
  if (storageSuccesses === 1) return;
  if (at < settledFromMs("latencyTail")) return;
  storageDurations.push(ms);
  if (storageDurations.length > STORAGE_RING_CAP) storageDurations.shift();
}
function storagePair() {
  if (!process.env.BOOSTHIS_STATE_DIR || storageAttempts < STORAGE_MIN_OPERATIONS) return {};
  const scopeCode = hostVolumeScopeCode();
  const failPct = r1(100 * storageFailures / storageAttempts);
  const out = {
    storageFailures: {
      ...scored(failPct, STORAGE_FAILURE_GOOD_PCT, STORAGE_FAILURE_POOR_PCT),
      failPct,
      failCount: storageFailures,
      opCount: storageAttempts,
      scopeCode,
      caption: `${failPct}% failed`
    }
  };
  if (storageDurations.length >= STORAGE_LATENCY_MIN_SETTLED) {
    const sorted = [...storageDurations].sort((a, b) => a - b);
    const p75Ms = r1(sorted[Math.ceil(sorted.length * 0.75) - 1]);
    const worstMs = r1(sorted[sorted.length - 1]);
    out.storageLatency = markSettled({
      ...scored(p75Ms, STORAGE_LATENCY_GOOD_MS, STORAGE_LATENCY_POOR_MS),
      p75Ms,
      worstMs,
      opCount: storageAttempts,
      scopeCode,
      caption: `${p75Ms} ms p75`
    });
  } else if (storageSuccesses === 0) {
    out.storageLatency = {
      score: null,
      rating: "pending",
      present: 1,
      measurable: 0,
      reasonCode: 8,
      scopeCode
    };
  } else if (isSettling("latencyTail")) {
    out.storageLatency = settlingReading({ score: null, opCount: storageAttempts, scopeCode });
  }
  return out;
}
function readHostResourceMeters(now = Date.now()) {
  readCounters(now);
  takeStorageProbe();
  const out = { ...storagePair() };
  const put = (key, value) => {
    if (value) out[key] = value;
  };
  put("diskPressure", diskPressure(now));
  put("ioPressure", ioPressure());
  put("pageFaults", pageFaults());
  put("descriptorMix", descriptorMix());
  put("systemLoad", systemLoad(now));
  return out;
}
function clearHostResourceMeters() {
  samples = [];
  storageDurations = [];
  storageAttempts = 0;
  storageFailures = 0;
  storageSuccesses = 0;
  containerCache = void 0;
  statfsOverride = null;
  loadOverride = null;
  psiOverride = null;
}
const _hostResourceInternals = {
  diskPressure,
  ioPressure,
  pageFaults,
  descriptorMix,
  systemLoad,
  storagePair,
  takeStorageProbe,
  setSamples(value) {
    samples = value;
  },
  pushCounterSample,
  setStorage(attempts, failures, durations) {
    storageAttempts = attempts;
    storageFailures = failures;
    storageSuccesses = attempts - failures;
    storageDurations = durations.slice(-STORAGE_RING_CAP);
  },
  /** File one probe as the real probe does: an attempt, then its duration. */
  fileStorageProbe(at, ms) {
    storageAttempts++;
    fileStorageDuration(at, ms);
  },
  setStatfsForTests(fn) {
    statfsOverride = fn;
  },
  setLoadForTests(value) {
    loadOverride = value;
  },
  /** Pressure-stall text to read instead of the host's ("unavailable" = none). */
  setPsiForTests(text) {
    psiOverride = text;
  }
};
export {
  DISK_USED_PCT_GOOD,
  DISK_USED_PCT_POOR,
  FAULT_GOOD_PER_MIN,
  FAULT_POOR_PER_MIN,
  FDMIX_MIN_FDS,
  FDMIX_SCAN_CAP,
  FDMIX_SOCK_PCT_GOOD,
  FDMIX_SOCK_PCT_POOR,
  HOST_RATE_MIN_SPAN_MS,
  HOST_RATE_WINDOW_MS,
  IO_GOOD_MB_PER_SEC,
  IO_POOR_MB_PER_SEC,
  IO_STALL_PCT_GOOD,
  IO_STALL_PCT_POOR,
  STORAGE_FAILURE_GOOD_PCT,
  STORAGE_FAILURE_POOR_PCT,
  STORAGE_LATENCY_GOOD_MS,
  STORAGE_LATENCY_MIN_SETTLED,
  STORAGE_LATENCY_POOR_MS,
  STORAGE_MIN_OPERATIONS,
  STORAGE_RING_CAP,
  SYSTEM_LOAD_GOOD,
  SYSTEM_LOAD_POOR,
  _hostResourceInternals,
  clearHostResourceMeters,
  hostVolumeScopeCode,
  readHostResourceMeters
};
