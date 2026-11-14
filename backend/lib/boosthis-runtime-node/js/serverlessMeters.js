// @ts-nocheck
/* eslint-disable */
// Built from src/serverlessMeters.ts so plain node can run the kit. Do not edit.
import { linearScore, ratingFor } from "./healthAxes.js";
import {
  PLATFORM_UNKNOWN,
  hasPerRunCostReadings,
  isPerRunBilled,
  serverlessHost
} from "./serverless.js";
import {
  availabilityOf,
  capabilitiesFor,
  hostKindFor,
  REASON_NOTHING_TO_COMPARE,
  REASON_PLATFORM_DOES_NOT_EXPOSE
} from "./serverlessPlatform.js";
import {
  KIT_CEILING_WARN_PCT,
  KIT_COLD_START_CEILING_MS,
  KIT_PER_RUN_CEILING_MS,
  readKitFootprint
} from "./kitFootprint.js";
import { deathCounters } from "./serverlessDeath.js";
import {
  getSuspendWakeCount,
  SUSPEND_UNIT,
  suspendTouchedInterval
} from "./suspendSensor.js";
import { noteUndeliveredRows } from "./dropReport.js";
import {
  SETTLE_FAMILIES,
  isSettling,
  markSettled,
  settledFromMs,
  settlingReading
} from "./settleRule.js";
let invocations = 0;
let addedMsTotal = 0;
let addedMsWorst = 0;
let visitorMsWorst = 0;
let flushesTimed = 0;
let deferredFlushes = 0;
let platformDeferredFlushes = 0;
let blockingFlushes = 0;
let lostRows = 0;
let strandedRows = 0;
let strandedFlushes = 0;
let outstandingStranded = 0;
let deliveredRows = 0;
let worstTimeUsedPct = null;
let worstRemainingMs = null;
let timeLimitMs = null;
let timedRuns = 0;
let peakRssMb = 0;
let settledRuns = 0;
let settledPeakRssMb = 0;
const settledTimeRing = [];
const KIT_FOOTPRINT_MIN_WARM_RUNS = 5;
function settledInvocation(beginSeq, startedAtMs) {
  return beginSeq > 1 && startedAtMs >= settledFromMs("peakRate");
}
let initMs = null;
let firstRunMs = null;
let warmRunTotalMs = 0;
let warmRuns = 0;
let runWallTotalMs = 0;
let runCpuTotalMs = 0;
let runsCounted = 0;
let failedRuns = 0;
let onwardCallsWorst = 0;
let onwardCallsSampled = false;
let cpuMsWorst = 0;
let cpuRunsCounted = 0;
let runsOpen = 0;
let runsBegun = 0;
let runsOverlapped = false;
let instanceBusyMs = 0;
let instanceBusyCpuMs = 0;
let busyStartWallMs = null;
let busyStartCpuUs = null;
let napBilledMs = 0;
let napWindows = 0;
let billedWindows = 0;
const DIST_CAP = 128;
function pushSample(ring, v) {
  if (!Number.isFinite(v)) return;
  ring.push(v);
  if (ring.length > DIST_CAP) ring.shift();
}
function percentile(ring, p) {
  if (ring.length === 0) return null;
  const sorted = [...ring].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p / 100 * sorted.length) - 1)
  );
  return Math.round(sorted[idx]);
}
const timeUsedPctRing = [];
const memUsedPctRing = [];
const runWallRing = [];
function cpuUsageUs() {
  try {
    const u = process.cpuUsage();
    return u.user + u.system;
  } catch {
    return null;
  }
}
function noteInvocation() {
  invocations++;
  try {
    const rssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    if (rssMb > peakRssMb) peakRssMb = rssMb;
  } catch {
  }
  try {
    if (initMs === null) initMs = Math.max(0, Math.round(process.uptime() * 1e3));
  } catch {
  }
  const now = Date.now();
  const cpuNow = cpuUsageUs();
  const overlappedAtStart = runsOpen > 0;
  if (overlappedAtStart) runsOverlapped = true;
  if (runsOpen === 0) {
    busyStartWallMs = now;
    busyStartCpuUs = cpuNow;
  }
  runsOpen++;
  runsBegun++;
  if (settledInvocation(runsBegun, now)) {
    try {
      const rssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      if (rssMb > settledPeakRssMb) settledPeakRssMb = rssMb;
    } catch {
    }
  }
  return {
    wallStartMs: now,
    cpuStartUs: cpuNow,
    overlappedAtStart,
    beginSeq: runsBegun,
    ended: false
  };
}
function noteRunEnd(mark, failed) {
  try {
    if (!mark || mark.ended) return;
    mark.ended = true;
    const endedAt = Date.now();
    const wall = Math.max(0, endedAt - mark.wallStartMs);
    const settledRun = settledInvocation(mark.beginSeq, mark.wallStartMs);
    const cpuNow = cpuUsageUs();
    const sharedInstance = mark.overlappedAtStart || runsBegun !== mark.beginSeq;
    const cpuMs = !sharedInstance && mark.cpuStartUs !== null && cpuNow !== null ? Math.max(0, (cpuNow - mark.cpuStartUs) / 1e3) : null;
    runsOpen = Math.max(0, runsOpen - 1);
    if (runsOpen === 0 && busyStartWallMs !== null) {
      const windowWallMs = Math.max(0, endedAt - busyStartWallMs);
      const windowCpuMs = busyStartCpuUs !== null && cpuNow !== null ? Math.max(0, (cpuNow - busyStartCpuUs) / 1e3) : null;
      instanceBusyMs += windowWallMs;
      if (windowCpuMs !== null) instanceBusyCpuMs += windowCpuMs;
      billedWindows++;
      if (windowCpuMs !== null && suspendTouchedInterval({
        endedAtMs: endedAt,
        wallMs: windowWallMs,
        cpuMs: windowCpuMs
      })) {
        napWindows++;
        napBilledMs += Math.max(0, windowWallMs - windowCpuMs);
      }
      busyStartWallMs = null;
      busyStartCpuUs = null;
    }
    runsCounted++;
    runWallTotalMs += wall;
    if (settledRun) {
      settledRuns++;
      pushSample(runWallRing, wall);
    }
    if (failed) failedRuns++;
    if (cpuMs !== null) {
      runCpuTotalMs += cpuMs;
      cpuRunsCounted++;
      if (cpuMs > cpuMsWorst) cpuMsWorst = cpuMs;
    }
    if (firstRunMs === null) firstRunMs = wall;
    else {
      warmRunTotalMs += wall;
      warmRuns++;
    }
    const rssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    if (rssMb > peakRssMb) peakRssMb = rssMb;
    if (settledRun && rssMb > settledPeakRssMb) settledPeakRssMb = rssMb;
    const limit = serverlessHost().memoryLimitMb;
    if (settledRun && limit && limit > 0) {
      pushSample(memUsedPctRing, Math.min(100, Math.round(rssMb / limit * 100)));
    }
  } catch {
  }
}
function noteRunLimits(onwardCalls) {
  if (!Number.isFinite(onwardCalls)) return;
  onwardCallsSampled = true;
  if (onwardCalls > onwardCallsWorst) onwardCallsWorst = Math.round(onwardCalls);
}
function noteFlushCost(ms, placement) {
  const v = Math.max(0, Math.round(ms));
  addedMsTotal += v;
  flushesTimed++;
  if (v > addedMsWorst) addedMsWorst = v;
  if (placement === "blocking") {
    blockingFlushes++;
    if (v > visitorMsWorst) visitorMsWorst = v;
  } else {
    deferredFlushes++;
    if (placement === "platform") platformDeferredFlushes++;
  }
  warnIfOverStatedDelay();
}
const FLUSH_ADDED_MS_CEILING = 50;
const FLUSH_CEILING_MIN_SAMPLES = 20;
let warnedOverStatedDelay = false;
function warnIfOverStatedDelay() {
  if (warnedOverStatedDelay) return;
  if (flushesTimed < FLUSH_CEILING_MIN_SAMPLES) return;
  const avg = Math.round(addedMsTotal / flushesTimed);
  if (avg <= FLUSH_ADDED_MS_CEILING) return;
  warnedOverStatedDelay = true;
  try {
    console.warn(
      `[boosthis] Boosthis is adding ${avg}ms to the average request, past the ${FLUSH_ADDED_MS_CEILING}ms it publishes. Uploads are taking far longer than one small batch should — check this app's network path to Boosthis.`
    );
  } catch {
  }
}
function noteRowsDiscarded(rows, cause = "bufferFull") {
  if (rows <= 0) return;
  lostRows += rows;
  if (outstandingStranded > 0) {
    outstandingStranded = Math.max(0, outstandingStranded - rows);
  }
  try {
    noteUndeliveredRows(cause, rows);
  } catch {
  }
}
function noteRowsDelivered(rows) {
  if (rows <= 0) return;
  deliveredRows += rows;
  if (outstandingStranded > 0) {
    outstandingStranded = Math.max(0, outstandingStranded - rows);
  }
}
function noteStranded(rowsHeldNow) {
  if (rowsHeldNow <= 0) return;
  const newlyStranded = Math.max(0, rowsHeldNow - outstandingStranded);
  strandedRows += newlyStranded;
  strandedFlushes++;
  outstandingStranded = rowsHeldNow;
}
function outstandingStrandedRows() {
  return outstandingStranded;
}
function noteTimeRemaining(remainingMs, limitMs) {
  if (!Number.isFinite(remainingMs) || !Number.isFinite(limitMs)) return;
  if (limitMs <= 0) return;
  const remaining = Math.max(0, Math.round(remainingMs));
  const usedPct = Math.min(
    100,
    Math.max(0, Math.round((limitMs - remaining) / limitMs * 100))
  );
  const settledTimed = timedRuns > 0 && Date.now() >= settledFromMs("latencyTail");
  timedRuns++;
  timeLimitMs = Math.round(limitMs);
  if (settledTimed) {
    pushSample(timeUsedPctRing, usedPct);
    settledTimeRing.push({ pct: usedPct, remainingMs: remaining });
    if (settledTimeRing.length > DIST_CAP) settledTimeRing.shift();
  }
  if (worstTimeUsedPct === null || usedPct > worstTimeUsedPct) {
    worstTimeUsedPct = usedPct;
    worstRemainingMs = remaining;
  }
}
function serverlessCounters() {
  return {
    invocations,
    addedMsWorst,
    addedMsAvg: flushesTimed > 0 ? Math.round(addedMsTotal / flushesTimed) : 0,
    visitorMsWorst,
    deferredFlushes,
    blockingFlushes,
    lostRows,
    strandedRows
  };
}
function hostFactObservations() {
  const out = {};
  try {
    const host = serverlessHost();
    if (host.platform === PLATFORM_UNKNOWN) return out;
    if (timedRuns > 0) {
      out.liveCountdown = 1;
      if (timeLimitMs !== null) out.timeLimitReadable = 1;
    }
    out.memoryLimitReadable = host.memoryLimitMb === null ? 0 : 1;
    if (host.memoryLimitMb !== null && host.memoryLimitMb > 0) {
      out.memoryCeilingMb = Math.round(host.memoryLimitMb);
    }
    if (cpuRunsCounted > 0) {
      out.cpuClockReadable = cpuMsWorst > 0 ? 1 : 0;
    }
    if (platformDeferredFlushes > 0) out.afterResponseWork = 1;
  } catch {
  }
  return out;
}
function deliveryScore(delivered, lost) {
  const total = delivered + lost;
  if (total <= 0) return 100;
  const lostPct = lost / total * 100;
  return linearScore(lostPct, 0, 10);
}
function hostKindNow() {
  return hostKindFor(serverlessHost().platform);
}
function readServerlessAxis() {
  const host = serverlessHost();
  if (!hasPerRunCostReadings()) return null;
  const minRuns = SETTLE_FAMILIES.peakRate.minSamples;
  const timeP95 = timeUsedPctRing.length >= minRuns ? percentile(timeUsedPctRing, 95) : null;
  const memP95 = memUsedPctRing.length >= minRuns ? percentile(memUsedPctRing, 95) : null;
  const scores = [];
  if (timeP95 !== null) scores.push(linearScore(timeP95, 40, 90));
  if (memP95 !== null) scores.push(linearScore(memP95, 60, 95));
  const knowsALimit = timeLimitMs !== null || (host.memoryLimitMb ?? 0) > 0;
  const score = scores.length > 0 ? Math.min(...scores) : null;
  const reading = {
    score,
    // A platform that states neither limit leaves nothing to measure against:
    // that is a fact about the HOST ("not available here", like
    // timeoutHeadroom without a context), never a per-axis decision not to
    // grade, so it is not the never-scored word.
    rating: score !== null ? ratingFor(score) : "pending",
    // Closed numeric vocabulary — the server owns the platform's name.
    // Named platformCode, not platform: the snapshot already has a top-level
    // `platform` string ("node"/"web"/…) and two different meanings under one
    // name is how a sanitizer starts enforcing the wrong type.
    platformCode: host.platform,
    // A real function, or a container billed like one whose processor freezes
    // when it answers? Both are billed by the run and both are measured here,
    // but they are not the same thing to a reader: one has hard per-run
    // ceilings, the other has a bill and no cliffs. Stated by the kit because
    // the kit is the only thing that knows which host it woke up on.
    isServerless: host.serverless ? 1 : 0,
    hostKind: hostKindNow(),
    // One process = one cold start, by definition. The server sums these across
    // instances to get the project's cold-start count for the day.
    coldStarts: 1,
    invocations,
    // Billed cost (what the customer pays their platform for our work) and
    // visitor cost (what a page load actually waited for). They differ exactly
    // where the platform lets us work after the response has been sent.
    addedMsWorst,
    addedMsAvg: flushesTimed > 0 ? Math.round(addedMsTotal / flushesTimed) : 0,
    visitorMsWorst,
    deferredFlushes,
    blockingFlushes,
    lostRows,
    strandedRows,
    strandedFlushes,
    measurable: knowsALimit ? 1 : 0,
    ...knowsALimit ? {} : { reasonCode: REASON_PLATFORM_DOES_NOT_EXPOSE }
  };
  if (score !== null) return markSettled(reading);
  return knowsALimit && isSettling("peakRate") ? settlingReading(reading) : reading;
}
function readTimeoutHeadroomAxis() {
  if (!hasPerRunCostReadings()) return null;
  if (timeLimitMs === null || worstTimeUsedPct === null) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      reasonCode: REASON_PLATFORM_DOES_NOT_EXPOSE,
      hostKind: hostKindNow(),
      runs: timedRuns
    };
  }
  if (settledTimeRing.length < SETTLE_FAMILIES.latencyTail.minSamples) {
    const pending = {
      score: null,
      rating: "pending",
      measurable: 1,
      hostKind: hostKindNow(),
      limitMs: timeLimitMs,
      runs: timedRuns
    };
    return isSettling("latencyTail") ? settlingReading(pending) : pending;
  }
  const sorted = [...settledTimeRing].sort((a, b) => a.pct - b.pct);
  const tailAt = sorted.length < 100 ? sorted.length - 1 : Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.99) - 1);
  const tail = sorted[tailAt];
  const score = linearScore(tail.pct, 40, 90);
  return markSettled({
    score,
    rating: ratingFor(score),
    measurable: 1,
    hostKind: hostKindNow(),
    usedPct: tail.pct,
    remainingMs: tail.remainingMs,
    limitMs: timeLimitMs,
    runs: timedRuns,
    // The shape of the runs, not just the unluckiest one. A project whose
    // MIDDLE run sits at 70% of its limit is in a different situation from one
    // whose worst run touched 70% once, and only a distribution tells them
    // apart. Absent until there is something to describe.
    p50UsedPct: percentile(timeUsedPctRing, 50),
    p95UsedPct: percentile(timeUsedPctRing, 95)
  });
}
function readFunctionMemoryAxis() {
  const host = serverlessHost();
  if (!hasPerRunCostReadings()) return null;
  const limit = host.memoryLimitMb;
  if (limit === null || limit <= 0) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      reasonCode: REASON_PLATFORM_DOES_NOT_EXPOSE,
      hostKind: hostKindNow()
    };
  }
  if (settledRuns < SETTLE_FAMILIES.peakRate.minSamples || settledPeakRssMb <= 0) {
    const pending = {
      score: null,
      rating: "pending",
      measurable: 1,
      hostKind: hostKindNow(),
      limitMb: limit
    };
    return isSettling("peakRate") ? settlingReading(pending) : pending;
  }
  const usedPct = Math.min(100, Math.round(settledPeakRssMb / limit * 100));
  const score = linearScore(usedPct, 60, 95);
  return markSettled({
    score,
    rating: ratingFor(score),
    measurable: 1,
    hostKind: hostKindNow(),
    usedMb: settledPeakRssMb,
    limitMb: limit,
    usedPct,
    p50UsedPct: percentile(memUsedPctRing, 50),
    p95UsedPct: percentile(memUsedPctRing, 95),
    // Runs that came close enough to the ceiling that the kit spent their last
    // moments saying so. Warnings, not kills — a run can touch the line and
    // still answer. Zero here is a real zero: the watch was armed.
    nearKills: deathCounters().memoryNearKills
  });
}
function readColdStartCostAxis() {
  if (!isPerRunBilled()) return null;
  if (initMs === null || firstRunMs === null) {
    return {
      score: null,
      rating: "pending",
      measurable: 1,
      hostKind: hostKindNow(),
      runsServed: invocations
    };
  }
  const amortizeFromMs = settledFromMs("peakRate") + SETTLE_FAMILIES.peakRate.minSpanSec * 1e3;
  if (warmRuns < SETTLE_FAMILIES.peakRate.minSamples || Date.now() < amortizeFromMs) {
    return {
      score: null,
      rating: "pending",
      measurable: 1,
      hostKind: hostKindNow(),
      runsServed: invocations
    };
  }
  const warmAvg = warmRuns > 0 ? Math.round(warmRunTotalMs / warmRuns) : null;
  const coldPenaltyMs = warmAvg === null ? null : Math.max(0, Math.round(firstRunMs - warmAvg));
  const totalLifeMs = initMs + firstRunMs + warmRunTotalMs;
  const setupSharePct = totalLifeMs > 0 ? Math.round(initMs / totalLifeMs * 100) : 0;
  const score = linearScore(setupSharePct, 15, 60);
  return markSettled({
    score,
    rating: ratingFor(score),
    measurable: 1,
    hostKind: hostKindNow(),
    coldStarts: 1,
    runsServed: invocations,
    initMs,
    firstRunMs: Math.round(firstRunMs),
    warmRunAvgMs: warmAvg,
    coldPenaltyMs,
    setupSharePct
  });
}
function readFunctionCpuAxis() {
  if (!isPerRunBilled()) return null;
  const host = serverlessHost();
  const avail = availabilityOf(host.platform, "cpuTimeHeadroom");
  const measured = cpuRunsCounted > 0 ? {
    cpuMsAvg: Math.round(runCpuTotalMs / cpuRunsCounted),
    cpuMsWorst: Math.round(cpuMsWorst),
    runs: cpuRunsCounted
  } : { cpuMsAvg: null, cpuMsWorst: null, runs: 0 };
  if (!avail.measurable) {
    return {
      score: null,
      // Not a wait. This platform cannot be asked the question, so no score is
      // coming on this install however long anyone leaves it running — which
      // is exactly what the paragraph above promises the customer will read.
      // `measurable: 0` and the reason code still ride along, so a server that
      // does not know this label reads the state exactly as it always has.
      rating: "not-available",
      measurable: 0,
      reasonCode: avail.reasonCode ?? REASON_PLATFORM_DOES_NOT_EXPOSE,
      hostKind: hostKindNow(),
      ...measured
    };
  }
  return {
    score: null,
    rating: "pending",
    measurable: 1,
    hostKind: hostKindNow(),
    ...measured
  };
}
function readFunctionLimitsAxis() {
  if (!isPerRunBilled()) return null;
  const host = serverlessHost();
  const caps = capabilitiesFor(host.platform);
  const onward = availabilityOf(host.platform, "onwardCallHeadroom");
  const conns = availabilityOf(host.platform, "openConnectionHeadroom");
  const measured = {
    // Null, not zero, until a run has actually been looked at.
    onwardCallsWorst: onwardCallsSampled ? onwardCallsWorst : null,
    // Never measured on this runtime. The one platform that caps simultaneous
    // connections is an isolate runtime this kit does not run on, and counting
    // sockets process-wide would answer a different question from the one the
    // cap asks. Null says so; a zero would have claimed we looked.
    openConnectionsWorst: null
  };
  if (!onward.measurable && !conns.measurable) {
    return {
      score: null,
      // Neither limit can be read here, so this is a "not available" and not a
      // "not yet" — see the note on the computing-time axis above.
      rating: "not-available",
      measurable: 0,
      // Both silences are the same kind here or the tile could not speak with
      // one voice; where they ever differ, the harsher one (a limit exists and
      // is hidden) wins, because that is the one a customer can be surprised by.
      reasonCode: onward.reasonCode === REASON_PLATFORM_DOES_NOT_EXPOSE || conns.reasonCode === REASON_PLATFORM_DOES_NOT_EXPOSE ? REASON_PLATFORM_DOES_NOT_EXPOSE : REASON_NOTHING_TO_COMPARE,
      hostKind: hostKindNow(),
      ...measured
    };
  }
  return {
    score: null,
    rating: "pending",
    measurable: 1,
    hostKind: hostKindNow(),
    ...measured,
    openConnectionLimit: caps.openConnectionLimit,
    openConnectionsUsedPct: null
  };
}
function billedWindow() {
  let billedMs = instanceBusyMs;
  let computeMs = instanceBusyCpuMs;
  if (busyStartWallMs !== null) {
    billedMs += Math.max(0, Date.now() - busyStartWallMs);
    const cpuNow = cpuUsageUs();
    if (busyStartCpuUs !== null && cpuNow !== null) {
      computeMs += Math.max(0, (cpuNow - busyStartCpuUs) / 1e3);
    }
  }
  return { billedMs, computeMs };
}
function readFunctionCostAxis() {
  if (!isPerRunBilled()) return null;
  const host = serverlessHost();
  const kind = hostKindFor(host.platform);
  const avail = availabilityOf(host.platform, "perRunCost");
  if (!avail.measurable) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      reasonCode: avail.reasonCode ?? REASON_NOTHING_TO_COMPARE,
      hostKind: kind,
      runs: runsCounted
    };
  }
  if (runsCounted === 0) {
    return {
      score: null,
      rating: "pending",
      measurable: 1,
      hostKind: kind,
      runs: 0
    };
  }
  const grantedMb = host.memoryLimitMb;
  const { billedMs, computeMs } = billedWindow();
  const gbMs = grantedMb && grantedMb > 0 ? Math.round(billedMs * (grantedMb / 1024)) : null;
  const waitingMs = Math.max(0, Math.round(billedMs - computeMs));
  const waitingPct = billedMs > 0 ? Math.round(waitingMs / billedMs * 100) : 0;
  const napMs = Math.min(waitingMs, Math.round(napBilledMs));
  const judgedBilledMs = Math.max(0, billedMs - napMs);
  const appWaitingMs = Math.max(0, waitingMs - napMs);
  const appWaitingPct = judgedBilledMs > 0 ? Math.round(appWaitingMs / judgedBilledMs * 100) : 0;
  const nothingLeftToJudge = napWindows > 0 && judgedBilledMs <= 0;
  const score = null;
  return markSettled({
    score,
    // Every window on this instance happening to be a nap is a condition of
    // the instance: the warming word, and the reason says why nothing was left.
    rating: nothingLeftToJudge ? "pending" : "not-scored",
    measurable: nothingLeftToJudge ? 0 : 1,
    ...nothingLeftToJudge ? { reasonCode: REASON_NOTHING_TO_COMPARE } : {},
    // WHICH KIND of host this verdict is about. A function's bill and a frozen
    // container's bill are not the same claim — one has hard per-run ceilings,
    // the other has a bill and no cliffs — and a score with no host named is
    // how this tile came to read as a function verdict on a container.
    hostKind: kind,
    runs: runsCounted,
    failedRuns,
    billedMs: Math.round(billedMs),
    computeMs: Math.round(computeMs),
    waitingMs,
    waitingPct,
    // The split. `napMs` is time inside billed windows the host was witnessed
    // stopping us in; `appWaitingPct` is what is left, and is the number the
    // verdict is about. Both are zero on a host that never suspends, where the
    // two percentages are the same figure and nothing on the tile changes.
    napMs,
    napWindows,
    billedWindows,
    appWaitingMs,
    appWaitingPct,
    // Did this instance ever serve two runs at once? It changes what every
    // number above MEANS — billed time is the instance's, not one request's —
    // and the server says so in words rather than leaving a reader to assume
    // a per-request figure. A real function is always 0 here.
    concurrentRuns: runsOverlapped ? 1 : 0,
    // The sum of the runs, kept beside the billed figure rather than instead of
    // it: on an overlapping host the gap between the two IS the saving the
    // customer gets from serving several at once, and hiding one of them turns
    // an explainable difference into an argument about whose number is wrong.
    runWallSumMs: Math.round(runWallTotalMs),
    grantedMb: grantedMb ?? null,
    gbMs,
    // The startup phase, kept beside the request figures rather than folded
    // into them. It happens ONCE per instance, not once per run, and on a
    // platform that bills it (Lambda has billed the init phase since 1 Aug
    // 2025) leaving it out understates the bill by a whole cold start per
    // instance. Attribution stays clean: `billedMs` above is request time,
    // this is startup time, and the server adds them before pricing.
    initMs,
    initGbMs: initMs !== null && grantedMb && grantedMb > 0 ? Math.round(initMs * (grantedMb / 1024)) : null,
    p50RunMs: percentile(runWallRing, 50),
    p95RunMs: percentile(runWallRing, 95),
    // The always-on look-alike, told apart from a real function. Shape says
    // the host freezes between requests; the witness count says we have
    // actually SEEN it happen. A customer paying to keep the processor awake
    // is shaped like this and never freezes, so the claim rides the witness.
    frozenHost: host.frozenBetweenRequests ? 1 : 0,
    freezeWitnessed: host.frozenBetweenRequests ? getSuspendWakeCount() : 0,
    // How long this instance has been alive, so the server can turn the totals
    // above into a rate and a rate into a monthly figure. Sent rather than
    // inferred: a snapshot's timestamps say when it was UPLOADED, and an
    // instance that sat frozen for an hour between two requests would look
    // like an hour of billed time to anyone measuring from outside.
    instanceAgeMs: Math.max(0, Math.round(process.uptime() * 1e3))
  });
}
function readFunctionKillsAxis() {
  if (!isPerRunBilled()) return null;
  const host = serverlessHost();
  const avail = availabilityOf(host.platform, "imminentKillWarning");
  const caps = capabilitiesFor(host.platform);
  const d = deathCounters();
  const refusals = {
    refusalsKnown: null,
    refusalsReasonCode: REASON_PLATFORM_DOES_NOT_EXPOSE,
    // Read straight off the capability table: where the platform keeps these
    // in its own invocation records, the honest answer is "your platform knows,
    // we do not", which is a different sentence from "nobody can know".
    refusalsPublishedByPlatform: caps.publishedAfterTheRun ? 1 : 0
  };
  if (!avail.measurable) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      reasonCode: avail.reasonCode ?? REASON_PLATFORM_DOES_NOT_EXPOSE,
      hostKind: hostKindNow(),
      ...refusals
    };
  }
  const deaths = d.timeDeaths + d.memoryDeaths;
  const pct = runsCounted > 0 ? deaths / runsCounted * 100 : 0;
  const score = linearScore(pct, 0, 5);
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    hostKind: hostKindNow(),
    runs: runsCounted,
    timeNearKills: d.timeNearKills,
    memoryNearKills: d.memoryNearKills,
    warnedSurvived: d.warnedSurvived,
    warnedUnconfirmed: d.warnedUnconfirmed,
    timeDeaths: d.timeDeaths,
    memoryDeaths: d.memoryDeaths,
    // The class of thing warned runs were blocked on. A code, never a name — a
    // hostname is the customer's data and never leaves their process.
    worstWaitingOn: d.worstWaitingOn ?? null,
    ...refusals
  };
}
function readKitFootprintAxis() {
  if (!isPerRunBilled()) return null;
  const host = serverlessHost();
  const kind = hostKindFor(host.platform);
  const avail = availabilityOf(host.platform, "kitCost");
  if (!avail.measurable) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      reasonCode: avail.reasonCode ?? REASON_NOTHING_TO_COMPARE,
      hostKind: kind
    };
  }
  const f = readKitFootprint();
  if (f.coldAddMs <= 0 || f.runAddAvgMs === null || // runsMeasured counts the warm-up run, which is charged to the cold start.
  f.runsMeasured - 1 < KIT_FOOTPRINT_MIN_WARM_RUNS) {
    return {
      score: null,
      rating: "pending",
      measurable: 1,
      hostKind: kind
    };
  }
  const runPct = Math.round(f.runAddAvgMs / KIT_PER_RUN_CEILING_MS * 100);
  const score = linearScore(runPct, 50, 100);
  return markSettled({
    score,
    rating: ratingFor(score),
    measurable: 1,
    hostKind: kind,
    coldAddMs: f.coldAddMs,
    moduleEvalMs: f.moduleEvalMs,
    setupMs: f.setupMs,
    // Published as its own line inside the cold-start figure, so a reader can
    // see which part of what we cost was paid once and which part repeats.
    firstRunMs: f.firstRunMs,
    runAddAvgMs: f.runAddAvgMs,
    runAddWorstMs: f.runAddWorstMs,
    runsMeasured: f.runsMeasured,
    // How often the worst case happens. `runAddWorstMs` on our own server read
    // 97.46 ms against a 5 ms per-run ceiling — nineteen times over — with an
    // average of 3.81 ms, and a worst with no frequency beside it cannot be
    // told from a cost we pay all the time. This is the number that says which
    // it is, and it is why the ceiling stays stated against the average.
    runsOverRunCeiling: f.runsOverRunCeiling,
    coldCeilingMs: KIT_COLD_START_CEILING_MS,
    runCeilingMs: KIT_PER_RUN_CEILING_MS,
    overCeiling: f.overCeiling ? 1 : 0,
    // How much of the nearest ceiling this reading uses, the cold-start one
    // included, so a surface can say "99.9% of the way to our stated ceiling"
    // instead of printing a zero beside "0 over ceiling". The score is the
    // per-run share alone (the start-up rule): this figure is the warning
    // about a number we publish, not the grade.
    ceilingUsePct: f.ceilingUsePct,
    // Approaching, and not yet over. The state that had no name, and the whole
    // of the warning a maintainer gets before we breach a number we publish.
    nearCeiling: f.nearCeiling ? 1 : 0,
    ceilingWarnPct: KIT_CEILING_WARN_PCT,
    // How many times the kit gave up its own optional work to stay under the
    // ceiling. Published because a ceiling held by quietly doing less is only
    // honest when the doing-less is visible.
    reducedSteps: f.reducedSteps,
    // Runs the HOST suspended in the middle of, thrown away rather than charged
    // to us. Published beside the cost, exactly the way event-loop lag, worst
    // freeze, latency floor and CPU throttling publish theirs, so a reader can
    // tell a discounted reading from an untouched one — and so the server can
    // put the discount into words rather than quietly showing a smaller number.
    // Omitted entirely when nothing was discounted, which is every reading on
    // a host that never suspends.
    ...f.suspendDiscounts > 0 ? {
      suspendDiscounts: f.suspendDiscounts,
      // One discount here is one whole measured RUN thrown away, which is
      // not the same thing as the latency floor's dropped sample or the
      // freeze histogram's thrown-away record — the three counts are
      // comparable only once each says what it is counting.
      suspendUnit: SUSPEND_UNIT.RUNS,
      suspendWorstMs: f.suspendWorstMs
    } : {}
  });
}
function readServerlessMeters() {
  const axes = {};
  const s = readServerlessAxis();
  if (s) axes.serverless = s;
  const t = readTimeoutHeadroomAxis();
  if (t) axes.timeoutHeadroom = t;
  const m = readFunctionMemoryAxis();
  if (m) axes.functionMemory = m;
  const cs = readColdStartCostAxis();
  if (cs) axes.coldStartCost = cs;
  const cpu = readFunctionCpuAxis();
  if (cpu) axes.functionCpu = cpu;
  const lim = readFunctionLimitsAxis();
  if (lim) axes.functionLimits = lim;
  const cost = readFunctionCostAxis();
  if (cost) axes.functionCost = cost;
  const kills = readFunctionKillsAxis();
  if (kills) axes.functionKills = kills;
  const foot = readKitFootprintAxis();
  if (foot) axes.kitFootprint = foot;
  return axes;
}
function _resetServerlessMetersForTests() {
  invocations = 0;
  addedMsTotal = 0;
  addedMsWorst = 0;
  visitorMsWorst = 0;
  flushesTimed = 0;
  warnedOverStatedDelay = false;
  deferredFlushes = 0;
  platformDeferredFlushes = 0;
  blockingFlushes = 0;
  lostRows = 0;
  strandedRows = 0;
  strandedFlushes = 0;
  outstandingStranded = 0;
  deliveredRows = 0;
  worstTimeUsedPct = null;
  worstRemainingMs = null;
  timeLimitMs = null;
  timedRuns = 0;
  peakRssMb = 0;
  initMs = null;
  firstRunMs = null;
  warmRunTotalMs = 0;
  warmRuns = 0;
  runWallTotalMs = 0;
  runCpuTotalMs = 0;
  runsCounted = 0;
  failedRuns = 0;
  onwardCallsWorst = 0;
  onwardCallsSampled = false;
  cpuMsWorst = 0;
  cpuRunsCounted = 0;
  runsOpen = 0;
  runsBegun = 0;
  runsOverlapped = false;
  napBilledMs = 0;
  napWindows = 0;
  billedWindows = 0;
  instanceBusyMs = 0;
  instanceBusyCpuMs = 0;
  busyStartWallMs = null;
  busyStartCpuUs = null;
  timeUsedPctRing.length = 0;
  memUsedPctRing.length = 0;
  runWallRing.length = 0;
  settledRuns = 0;
  settledPeakRssMb = 0;
  settledTimeRing.length = 0;
}
export {
  FLUSH_ADDED_MS_CEILING,
  _resetServerlessMetersForTests,
  hostFactObservations,
  noteFlushCost,
  noteInvocation,
  noteRowsDelivered,
  noteRowsDiscarded,
  noteRunEnd,
  noteRunLimits,
  noteStranded,
  noteTimeRemaining,
  outstandingStrandedRows,
  readColdStartCostAxis,
  readFunctionCostAxis,
  readFunctionCpuAxis,
  readFunctionKillsAxis,
  readFunctionLimitsAxis,
  readFunctionMemoryAxis,
  readKitFootprintAxis,
  readServerlessAxis,
  readServerlessMeters,
  readTimeoutHeadroomAxis,
  serverlessCounters
};
