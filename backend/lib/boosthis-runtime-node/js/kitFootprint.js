// @ts-nocheck
/* eslint-disable */
// Built from src/kitFootprint.ts so plain node can run the kit. Do not edit.
const KIT_COLD_START_CEILING_MS = 40;
const KIT_PER_RUN_CEILING_MS = 5;
const KIT_CEILING_WARN_PCT = 90;
const now = () => {
  try {
    return performance.now();
  } catch {
    return Date.now();
  }
};
const cpuMs = () => {
  try {
    const u = process.cpuUsage();
    const total = (u.user + u.system) / 1e3;
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
};
let suspendProbe = null;
function setKitFootprintSuspendProbe(fn) {
  suspendProbe = fn;
}
function hostStoppedRunningUs(interval) {
  if (!suspendProbe) return false;
  try {
    return suspendProbe(interval) === true;
  } catch {
    return false;
  }
}
const KIT_EVAL_START = now();
const KIT_EVAL_START_UPTIME_MS = (() => {
  try {
    return Math.max(0, process.uptime() * 1e3);
  } catch {
    return 0;
  }
})();
let moduleEvalMs = null;
let setupMs = 0;
let runOverheadTotalMs = 0;
let runOverheadWorstMs = 0;
let runsMeasured = 0;
let reducedSteps = 0;
let firstRunMs = null;
let steadyRuns = 0;
let runsOverRunCeiling = 0;
let suspendDiscounts = 0;
let suspendWorstMs = 0;
function noteKitModuleEvalDone() {
  if (moduleEvalMs !== null) return;
  moduleEvalMs = Math.max(0, now() - KIT_EVAL_START);
}
function noteKitSetupCost(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  setupMs += ms;
}
function noteKitRunOverhead(ms) {
  if (!Number.isFinite(ms) || ms < 0) return;
  runsMeasured++;
  if (firstRunMs === null) {
    firstRunMs = ms;
    return;
  }
  steadyRuns++;
  runOverheadTotalMs += ms;
  if (ms > runOverheadWorstMs) runOverheadWorstMs = ms;
  if (ms > KIT_PER_RUN_CEILING_MS) runsOverRunCeiling++;
}
function noteKitRunDiscounted(ms) {
  suspendDiscounts++;
  if (Number.isFinite(ms) && ms > suspendWorstMs) suspendWorstMs = ms;
}
function noteKitReduced() {
  reducedSteps++;
}
const round2 = (ms) => Math.round(ms * 100) / 100;
function readKitFootprint() {
  const modEval = moduleEvalMs ?? 0;
  const first = firstRunMs ?? 0;
  const coldAdd = modEval + setupMs + first;
  const runAvg = steadyRuns > 0 ? runOverheadTotalMs / steadyRuns : null;
  const coldUsePct = coldAdd / KIT_COLD_START_CEILING_MS * 100;
  const runUsePct = runAvg === null ? null : runAvg / KIT_PER_RUN_CEILING_MS * 100;
  const usePct = runUsePct === null ? coldUsePct : Math.max(coldUsePct, runUsePct);
  const over = coldAdd > KIT_COLD_START_CEILING_MS || runAvg !== null && runAvg > KIT_PER_RUN_CEILING_MS;
  return {
    coldAddMs: round2(coldAdd),
    moduleEvalMs: round2(modEval),
    setupMs: round2(setupMs),
    startedAtUptimeMs: Math.round(KIT_EVAL_START_UPTIME_MS),
    firstRunMs: firstRunMs === null ? null : round2(firstRunMs),
    runAddAvgMs: runAvg === null ? null : round2(runAvg),
    runAddWorstMs: steadyRuns > 0 ? round2(runOverheadWorstMs) : null,
    runsMeasured,
    runsOverRunCeiling,
    reducedSteps,
    suspendDiscounts,
    suspendWorstMs: suspendDiscounts > 0 ? round2(suspendWorstMs) : null,
    overCeiling: over,
    ceilingUsePct: Math.round(usePct * 10) / 10,
    // Approaching is a state of its own, and it is only approaching while it
    // is not yet a breach — the two must never both be true, or a surface has
    // to guess which one to say.
    nearCeiling: !over && usePct >= KIT_CEILING_WARN_PCT
  };
}
function kitShouldReduce() {
  const f = readKitFootprint();
  if (f.overCeiling) return true;
  return f.runAddAvgMs !== null && f.runAddAvgMs / KIT_PER_RUN_CEILING_MS * 100 >= KIT_CEILING_WARN_PCT;
}
function openKitRun() {
  return { ms: 0, filed: false, suspendTouched: false };
}
let looseRun = null;
function targetRun(run) {
  if (run) return run;
  if (!looseRun) looseRun = openKitRun();
  return looseRun;
}
function chargeRunOverhead(fn, run) {
  const target = targetRun(run);
  const open = openKitInterval();
  try {
    return fn();
  } finally {
    chargeKitInterval(open, target);
  }
}
function openKitInterval() {
  const cpu0 = cpuMs();
  return { cpu0, t0: now() };
}
function chargeKitInterval(interval, run) {
  const t1 = now();
  const cpu1 = cpuMs();
  const target = targetRun(run);
  const wallMs = Math.max(0, t1 - interval.t0);
  const consumed = interval.cpu0 !== null && cpu1 !== null ? Math.max(0, cpu1 - interval.cpu0) : null;
  if (hostStoppedRunningUs({
    endedAtMs: Date.now(),
    wallMs,
    cpuMs: consumed
  })) {
    target.suspendTouched = true;
  }
  target.ms += wallMs;
}
function addRunOverheadMs(ms, run) {
  if (!Number.isFinite(ms) || ms < 0) return;
  const target = targetRun(run);
  if (hostStoppedRunningUs({ endedAtMs: Date.now(), wallMs: ms, cpuMs: null })) {
    target.suspendTouched = true;
  }
  target.ms += ms;
}
function closeRunOverhead(run) {
  const target = run ?? looseRun;
  if (!target || target.filed) return;
  target.filed = true;
  if (target.suspendTouched) noteKitRunDiscounted(target.ms);
  else noteKitRunOverhead(target.ms);
  target.ms = 0;
  target.suspendTouched = false;
  if (target === looseRun) looseRun = null;
}
function _resetKitFootprintForTests() {
  moduleEvalMs = null;
  setupMs = 0;
  runOverheadTotalMs = 0;
  runOverheadWorstMs = 0;
  runsMeasured = 0;
  runsOverRunCeiling = 0;
  reducedSteps = 0;
  firstRunMs = null;
  steadyRuns = 0;
  suspendDiscounts = 0;
  suspendWorstMs = 0;
  looseRun = null;
}
export {
  KIT_CEILING_WARN_PCT,
  KIT_COLD_START_CEILING_MS,
  KIT_PER_RUN_CEILING_MS,
  _resetKitFootprintForTests,
  addRunOverheadMs,
  chargeKitInterval,
  chargeRunOverhead,
  closeRunOverhead,
  kitShouldReduce,
  noteKitModuleEvalDone,
  noteKitReduced,
  noteKitRunDiscounted,
  noteKitRunOverhead,
  noteKitSetupCost,
  openKitInterval,
  openKitRun,
  readKitFootprint,
  setKitFootprintSuspendProbe
};
