// @ts-nocheck
/* eslint-disable */
// Built from src/serverlessDeath.ts so plain node can run the kit. Do not edit.
import {
  noteKitReduced,
  kitShouldReduce
} from "./kitFootprint.js";
const DEATH_SLICE_MS = 400;
const MEMORY_NEAR_KILL_PCT = 90;
const MEMORY_WATCH_PCT = 70;
const MEMORY_SAMPLE_MS = 250;
const MEMORY_SAMPLE_COARSE_MS = 500;
const WAITING_UNKNOWN = 0;
const WAITING_NETWORK = 1;
const WAITING_DISK = 2;
const WAITING_TIMER = 3;
const WAITING_CHILD_PROCESS = 4;
const WAITING_OWN_CODE = 5;
const WAITING_TEXT = {
  [WAITING_UNKNOWN]: "something this runtime will not name",
  [WAITING_NETWORK]: "a network call that had not come back",
  [WAITING_DISK]: "a file it was reading or writing",
  [WAITING_TIMER]: "a timer it was sleeping on",
  [WAITING_CHILD_PROCESS]: "another process it had started",
  [WAITING_OWN_CODE]: "nothing — it was busy in its own code"
};
function waitingText(c) {
  return WAITING_TEXT[c] ?? WAITING_TEXT[WAITING_UNKNOWN];
}
function classifyWaiting() {
  let names;
  try {
    const fn = process.getActiveResourcesInfo;
    if (typeof fn !== "function") return WAITING_UNKNOWN;
    names = fn.call(process) ?? [];
  } catch {
    return WAITING_UNKNOWN;
  }
  let network = 0;
  let disk = 0;
  let timer = 0;
  let child = 0;
  for (const raw of names) {
    const n = String(raw);
    if (n.includes("TCP") || n.includes("Socket") || n.includes("UDP") || n.includes("TLS")) {
      network++;
    } else if (n.includes("FS") || n.includes("File")) {
      disk++;
    } else if (n.includes("Timeout") || n.includes("Interval") || n.includes("Immediate")) {
      timer++;
    } else if (n.includes("Process") || n.includes("Pipe")) {
      child++;
    }
  }
  if (network > 0) return WAITING_NETWORK;
  if (disk > 0) return WAITING_DISK;
  if (child > 0) return WAITING_CHILD_PROCESS;
  if (timer > 0) return WAITING_TIMER;
  return WAITING_OWN_CODE;
}
const DEATH_BY_TIME = 1;
const DEATH_BY_MEMORY = 2;
let reporter = null;
let timeTimer = null;
let memTimer = null;
let runActive = false;
let reportedThisRun = false;
let timeNearKills = 0;
let memoryNearKills = 0;
let warnedSurvived = 0;
let pendingCause = null;
let pendingDeadlineAtMs = null;
let runDeadlineAtMs = null;
let timeDeaths = 0;
let memoryDeaths = 0;
let peakRssMbThisRun = 0;
const waitingTally = /* @__PURE__ */ new Map();
let lastReport = null;
const said = /* @__PURE__ */ new Set();
function setDeathReporter(fn) {
  reporter = fn;
}
function say(line) {
  try {
    if (said.has(line)) return;
    said.add(line);
    console.error(line);
  } catch {
  }
}
function unref(t) {
  try {
    t?.unref?.();
  } catch {
  }
}
function rssMb() {
  try {
    return Math.round(process.memoryUsage().rss / (1024 * 1024));
  } catch {
    return 0;
  }
}
function report(cause, remainingMs, limitMb) {
  if (reportedThisRun) return;
  reportedThisRun = true;
  const waitingOn = classifyWaiting();
  const used = rssMb();
  if (cause === DEATH_BY_TIME) timeNearKills++;
  else memoryNearKills++;
  pendingCause = cause;
  pendingDeadlineAtMs = runDeadlineAtMs;
  waitingTally.set(waitingOn, (waitingTally.get(waitingOn) ?? 0) + 1);
  lastReport = {
    cause,
    waitingOn,
    remainingMs: Math.max(0, Math.round(remainingMs)),
    usedMb: used > 0 ? used : null,
    limitMb
  };
  say(
    cause === DEATH_BY_TIME ? `Boosthis: this run is about to be stopped for running out of time — about ${Math.max(0, Math.round(remainingMs))}ms left, waiting on ${waitingText(waitingOn)}. Reporting it now, because a stopped run cannot report itself.` : `Boosthis: this run is close to its memory ceiling — ${used}MB of ${limitMb ?? "?"}MB, waiting on ${waitingText(waitingOn)}. Reporting it now, because a run killed for memory cannot report itself.`
  );
  try {
    void reporter?.()?.catch?.(() => {
    });
  } catch {
  }
}
function startMemorySampler(limitMb, hot) {
  if (memTimer) {
    clearInterval(memTimer);
    memTimer = null;
  }
  memTimer = setInterval(
    () => {
      if (!runActive) return;
      const used = rssMb();
      if (used > peakRssMbThisRun) peakRssMbThisRun = used;
      const pct = used / limitMb * 100;
      if (pct >= MEMORY_NEAR_KILL_PCT) {
        report(DEATH_BY_MEMORY, 0, limitMb);
        return;
      }
      if (!hot && pct >= MEMORY_WATCH_PCT) startMemorySampler(limitMb, true);
    },
    hot ? MEMORY_SAMPLE_MS : MEMORY_SAMPLE_COARSE_MS
  );
  unref(memTimer);
}
function armDeathWatch(remainingMs, memoryLimitMb) {
  try {
    runActive = true;
    reportedThisRun = false;
    runDeadlineAtMs = remainingMs !== null && Number.isFinite(remainingMs) ? Date.now() + Math.max(0, Math.round(remainingMs)) : null;
    if (remainingMs !== null && Number.isFinite(remainingMs)) {
      const fireIn = Math.round(remainingMs) - DEATH_SLICE_MS;
      if (fireIn <= 0) {
        report(DEATH_BY_TIME, remainingMs, memoryLimitMb);
      } else {
        timeTimer = setTimeout(() => {
          if (runActive) report(DEATH_BY_TIME, DEATH_SLICE_MS, memoryLimitMb);
        }, fireIn);
        unref(timeTimer);
      }
    }
    if (memoryLimitMb !== null && memoryLimitMb > 0) {
      if (kitShouldReduce()) {
        noteKitReduced();
      } else {
        const startedAt = rssMb();
        if (startedAt > peakRssMbThisRun) peakRssMbThisRun = startedAt;
        const hot = peakRssMbThisRun / memoryLimitMb * 100 >= MEMORY_WATCH_PCT;
        startMemorySampler(memoryLimitMb, hot);
      }
    }
  } catch {
  }
}
function settleWarnedRunAtNewRun() {
  try {
    if (pendingCause === null) return false;
    if (pendingDeadlineAtMs === null || Date.now() < pendingDeadlineAtMs) {
      return false;
    }
    if (pendingCause === DEATH_BY_TIME) timeDeaths++;
    else memoryDeaths++;
    pendingCause = null;
    pendingDeadlineAtMs = null;
    return true;
  } catch {
    return false;
  }
}
function disarmDeathWatch(memoryLimitMb) {
  try {
    runActive = false;
    if (pendingCause !== null) {
      warnedSurvived++;
      pendingCause = null;
      pendingDeadlineAtMs = null;
    }
    runDeadlineAtMs = null;
    if (timeTimer) {
      clearTimeout(timeTimer);
      timeTimer = null;
    }
    if (memTimer) {
      clearInterval(memTimer);
      memTimer = null;
    }
    const used = rssMb();
    if (used > peakRssMbThisRun) peakRssMbThisRun = used;
    void memoryLimitMb;
  } catch {
  }
}
function deathCounters() {
  let worst = null;
  let worstN = 0;
  for (const [k, n] of waitingTally) {
    if (n > worstN) {
      worstN = n;
      worst = k;
    }
  }
  return {
    timeNearKills,
    memoryNearKills,
    warnedSurvived,
    warnedUnconfirmed: pendingCause === null ? 0 : 1,
    timeDeaths,
    memoryDeaths,
    worstWaitingOn: worst,
    lastReport
  };
}
function _resetDeathWatchForTests() {
  if (timeTimer) clearTimeout(timeTimer);
  if (memTimer) clearInterval(memTimer);
  timeTimer = null;
  memTimer = null;
  runActive = false;
  reportedThisRun = false;
  timeNearKills = 0;
  memoryNearKills = 0;
  warnedSurvived = 0;
  pendingCause = null;
  timeDeaths = 0;
  memoryDeaths = 0;
  peakRssMbThisRun = 0;
  waitingTally.clear();
  lastReport = null;
  reporter = null;
  said.clear();
}
const _deathWatchInternals = {
  setPeakRssMb(mb) {
    peakRssMbThisRun = mb;
  },
  peakRssMb() {
    return peakRssMbThisRun;
  }
};
export {
  DEATH_BY_MEMORY,
  DEATH_BY_TIME,
  DEATH_SLICE_MS,
  MEMORY_NEAR_KILL_PCT,
  MEMORY_WATCH_PCT,
  WAITING_CHILD_PROCESS,
  WAITING_DISK,
  WAITING_NETWORK,
  WAITING_OWN_CODE,
  WAITING_TIMER,
  WAITING_UNKNOWN,
  _deathWatchInternals,
  _resetDeathWatchForTests,
  armDeathWatch,
  classifyWaiting,
  deathCounters,
  disarmDeathWatch,
  setDeathReporter,
  settleWarnedRunAtNewRun,
  waitingText
};
