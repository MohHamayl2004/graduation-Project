// @ts-nocheck
/* eslint-disable */
// Built from src/jobWork.ts so plain node can run the kit. Do not edit.
import { isSettledAt } from "./settleRule.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { record } from "./samples.js";
import { rateDuration } from "./thresholds.js";
import { jobNameHasPII } from "./no-pii.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import { isServerlessMode } from "./serverless.js";
import { beginInvocation, finishInvocation } from "./serverlessLifecycle.js";
import { reportJobError, useCrashJobStateReader } from "./crashReporter.js";
import {
  clearJobRhythmDeclarations,
  declareJobRhythm,
  MAX_JOB_NAME,
  MAX_STORABLE_EVERY_MS,
  MIN_STORABLE_EVERY_MS,
  noteJobNameRefused,
  reportJobRun,
  sayDeclarationOnce,
  sayJobNameRefusedOnce,
  sayRhythmRefusedOnce,
  setJobExpectationHandler
} from "./jobReporter.js";
import { JOB_WAIT_MS_THRESHOLDS } from "./meterAxes.js";
import {
  closeLinkedScope,
  linkedStepSpans,
  openLinkedScope,
  setJobLinkedScopeReader
} from "./linkedSteps.js";
import { enqueueJobRunSteps, rateSpanDuration } from "./spanEmitter.js";
import { newSpanId } from "./spanScope.js";
import { newTraceId } from "./trace.js";
import { MAX_PART_NAME } from "./routeInventory.js";
const JOB_PREFIX = "job:";
const MAX_JOB_NAMES = 20;
const JOB_OTHER_NAME = "other";
const MAX_JOB_NAME_LEN = MAX_JOB_NAME;
const MAX_FOLDED_NAMES = 500;
const DURATION_RING = 500;
const GAP_RING = 12;
const CADENCE_MIN_GAPS = 4;
const CADENCE_MAX_SPREAD = 0.25;
const MISSED_GAP_FACTOR = 1.5;
const MAX_ACTIVE_TRACKED = 512;
let capacityBucketMs = 5e3;
let capacityBuckets = 60;
const CAPACITY_BUSY_SHARE = 0.95;
const CAPACITY_MIN_WAIT_BUCKETS = 6;
const CAPACITY_GROWTH_T = 2;
function capSlot(ring, idx) {
  const len = capacityBuckets + 1;
  const at = (idx % len + len) % len;
  let slot = ring.buckets[at];
  if (!slot || slot.idx !== idx) {
    slot = { idx, finishes: 0, busyMs: 0, waitCount: 0, waitSumMs: 0 };
    ring.buckets[at] = slot;
  }
  return slot;
}
function capRing(tally, now) {
  if (!tally.cap) tally.cap = { buckets: [], firstSeenMs: now, busyFromMs: null };
  return tally.cap;
}
function capAccrue(ring, now) {
  const from = ring.busyFromMs;
  if (from === null || now <= from) return;
  let t = Math.max(from, now - capacityBucketMs * (capacityBuckets + 1));
  while (t < now) {
    const idx = Math.floor(t / capacityBucketMs);
    const end = Math.min(now, (idx + 1) * capacityBucketMs);
    capSlot(ring, idx).busyMs += end - t;
    t = end;
  }
  ring.busyFromMs = now;
}
function fittedRise(xs, ys) {
  const n = xs.length;
  if (n < CAPACITY_MIN_WAIT_BUCKETS || ys.length !== n) return null;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mx += xs[i];
    my += ys[i];
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    sxx += dx * dx;
    sxy += dx * (ys[i] - my);
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i] - (my + slope * (xs[i] - mx));
    sse += r * r;
  }
  const se = Math.sqrt(sse / (n - 2) / sxx);
  const t = se > 0 ? slope / se : slope > 0 ? Number.POSITIVE_INFINITY : 0;
  return { riseMs: slope * (xs[n - 1] - xs[0]), t };
}
function capacityOf(tally, now) {
  const ring = tally.cap;
  if (!ring) return null;
  capAccrue(ring, now);
  const len = capacityBuckets + 1;
  const endIdx = Math.floor(now / capacityBucketMs);
  const firstIdx = endIdx - capacityBuckets;
  if (ring.firstSeenMs > firstIdx * capacityBucketMs) return null;
  let finishes = 0;
  let busyMs = 0;
  let waitCount = 0;
  let waitSum = 0;
  const xs = [];
  const ys = [];
  for (let idx = firstIdx; idx < endIdx; idx++) {
    const slot = ring.buckets[(idx % len + len) % len];
    if (!slot || slot.idx !== idx) continue;
    finishes += slot.finishes;
    busyMs += slot.busyMs;
    if (slot.waitCount > 0) {
      waitCount += slot.waitCount;
      waitSum += slot.waitSumMs;
      xs.push(idx - firstIdx);
      ys.push(slot.waitSumMs / slot.waitCount);
    }
  }
  const windowMs = capacityBuckets * capacityBucketMs;
  const rise = fittedRise(xs, ys);
  return {
    finishes,
    windowMs,
    busy: busyMs >= CAPACITY_BUSY_SHARE * windowMs,
    // A rise smaller than the wait the meter already calls good could not
    // move the score, so it is not a backlog worth a sentence either.
    growing: rise !== null && rise.riseMs > JOB_WAIT_MS_THRESHOLDS.good && rise.t > CAPACITY_GROWTH_T,
    riseMs: rise?.riseMs ?? 0,
    meanWaitMs: waitCount > 0 ? waitSum / waitCount : null
  };
}
function capacityOutranks(a, b) {
  if (b === null) return true;
  const aBehind = a.busy && a.growing;
  const bBehind = b.busy && b.growing;
  if (aBehind !== bBehind) return aBehind;
  if (aBehind) return a.riseMs > b.riseMs;
  const aw = a.meanWaitMs ?? -1;
  const bw = b.meanWaitMs ?? -1;
  if (aw !== bw) return aw > bw;
  return a.finishes > b.finishes;
}
function emptyTally() {
  return {
    runs: 0,
    failed: 0,
    retried: 0,
    retryWorst: 1,
    worstMs: 0,
    active: 0,
    overlaps: 0,
    lastStartMs: null,
    gaps: [],
    statedEveryMs: null,
    statedAllowanceMs: null,
    requestedEveryMs: null,
    missed: 0,
    cap: null
  };
}
const tallies = /* @__PURE__ */ new Map();
const foldedNames = /* @__PURE__ */ new Set();
let durations = [];
let waits = [];
let waitRuns = 0;
let hostedRuns = 0;
const attachedSystems = /* @__PURE__ */ new Set();
const unattachedSystems = /* @__PURE__ */ new Set();
let manualRuns = 0;
function cleanName(name) {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_JOB_NAME_LEN) return null;
  if (jobNameHasPII(trimmed) !== null) return null;
  return trimmed;
}
function tallyFor(name) {
  const existing = tallies.get(name);
  if (existing) return { key: name, tally: existing };
  if (tallies.size >= MAX_JOB_NAMES) {
    if (foldedNames.size < MAX_FOLDED_NAMES) foldedNames.add(name);
    let other = tallies.get(JOB_OTHER_NAME);
    if (!other) {
      other = emptyTally();
      tallies.set(JOB_OTHER_NAME, other);
    }
    return { key: JOB_OTHER_NAME, tally: other };
  }
  const fresh = emptyTally();
  tallies.set(name, fresh);
  return { key: name, tally: fresh };
}
const NOOP_RUN = { done() {
}, failed() {
} };
function activeTotal() {
  let n = 0;
  for (const t of tallies.values()) n += t.active;
  return n;
}
function noteStart(tally, now) {
  if (tally.lastStartMs !== null) {
    const gap = now - tally.lastStartMs;
    if (gap > 0) {
      const cadence = cadenceOf(tally);
      const allowance = missedAfterMs(tally);
      if (cadence !== null && allowance !== null && gap > allowance) {
        const skipped = Math.round(gap / cadence) - 1;
        if (skipped > 0) tally.missed += skipped;
      }
      tally.gaps.push(gap);
      if (tally.gaps.length > GAP_RING) tally.gaps.shift();
    }
  }
  tally.lastStartMs = now;
}
function cadenceOf(tally) {
  if (tally.statedEveryMs !== null && tally.statedEveryMs > 0) {
    return tally.statedEveryMs;
  }
  const gaps = tally.gaps;
  if (gaps.length < CADENCE_MIN_GAPS) return null;
  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  if (median <= 0) return null;
  const spread = sorted[sorted.length - 1] - sorted[0];
  if (spread / median > CADENCE_MAX_SPREAD) return null;
  return median;
}
function missedAfterMs(tally) {
  const cadence = cadenceOf(tally);
  if (cadence === null) return null;
  if (tally.statedEveryMs !== null && tally.statedEveryMs > 0) {
    return tally.statedAllowanceMs !== null && tally.statedAllowanceMs > 0 ? tally.statedAllowanceMs : cadence * MISSED_GAP_FACTOR;
  }
  return cadence * MISSED_GAP_FACTOR;
}
function expectEvery(name, intervalMs) {
  try {
    const shown = shownJobName(name);
    if (isBoosthisDisabled()) {
      sayDeclarationOnce(
        "disabled",
        `[boosthis] Boosthis is switched off in this process, so the rhythm declared for ${shown} was not sent and that job is NOT being watched. Nothing here is broken — unset BOOSTHIS_DISABLED and the declaration travels with the next upload.`
      );
      return;
    }
    const clean = cleanName(name);
    if (clean === null) {
      sayDeclarationOnce(
        "name",
        `[boosthis] Boosthis did not take the rhythm declared for ${shown}, so that job is NOT being watched: ${whyNameRefused(name)}`
      );
      return;
    }
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      sayDeclarationOnce(
        "interval",
        `[boosthis] Boosthis did not take the rhythm declared for ${shown}, so that job is NOT being watched: expectEvery() wants how often the job runs in MILLISECONDS, above zero, and was given ${String(intervalMs)}.`
      );
      return;
    }
    const { tally, key } = tallyFor(clean);
    if (key !== clean) {
      sayDeclarationOnce(
        "folded",
        `[boosthis] Boosthis is already tracking ${MAX_JOB_NAMES} job names in this app, so ${shown} is folded into "${JOB_OTHER_NAME}" and is NOT being watched. Its runs are still counted, inside that group. Report fewer distinct job names — a name built from a value (an id, a tenant, a date) is the usual cause.`
      );
      return;
    }
    tally.requestedEveryMs = intervalMs;
    if (intervalMs < MIN_STORABLE_EVERY_MS) {
      sayDeclarationOnce(
        "sub_minute",
        `[boosthis] Boosthis stores a job's rhythm in whole minutes, so the ${intervalMs}ms declared for ${shown} will be kept as every 1 minute — the shortest rhythm it can keep — plus the lateness Boosthis allows on top. Nothing is refused for being short: once Boosthis takes this declaration the job is watched against one minute rather than against the interval stated here, and if it cannot be taken the kit says that on a line of its own.`
      );
    } else if (intervalMs > MAX_STORABLE_EVERY_MS) {
      sayRhythmRefusedOnce(
        `[boosthis] The rhythm declared for ${shown} is longer than the 45 days Boosthis can store, so it will be recorded as a declaration that could not be kept and that job will NOT be watched. Declare a rhythm between 1 minute and 45 days.`
      );
    }
    declareJobRhythm(key, intervalMs);
  } catch {
  }
}
function shownJobName(name) {
  if (typeof name !== "string") return `a job name of type ${typeof name}`;
  const trimmed = name.trim();
  if (trimmed.length === 0) return "an empty job name";
  const short = trimmed.length > MAX_JOB_NAME_LEN ? `${trimmed.slice(0, MAX_JOB_NAME_LEN)}…` : trimmed;
  return `"${short}"`;
}
function refusedJobNameShape(name) {
  if (typeof name !== "string") return `a job name of type ${typeof name}`;
  const trimmed = name.trim();
  if (trimmed.length === 0) return "an empty job name";
  return `a background job whose name is ${trimmed.length} characters`;
}
function nameRefusalCause(name) {
  if (typeof name !== "string") return "type";
  const trimmed = name.trim();
  if (trimmed.length === 0) return "empty";
  if (trimmed.length > MAX_JOB_NAME_LEN) return "length";
  return jobNameHasPII(trimmed) ?? "value";
}
function whyNameRefused(name) {
  if (typeof name !== "string") {
    return `Boosthis wants the job's name as a string and was given ${typeof name}.`;
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) return "the name was empty.";
  if (trimmed.length > MAX_JOB_NAME_LEN) {
    return `the name is ${trimmed.length} characters and a job name here must be ${MAX_JOB_NAME_LEN} or fewer. It is refused rather than shortened, because two names cut to the same ${MAX_JOB_NAME_LEN} characters would be filed as one job.`;
  }
  const rule = jobNameHasPII(trimmed);
  return `the name matched ${rule ?? "a value rule"}, so it reads as something built out of a value rather than a label. Spaces are fine — "queue drain" is a name. An email address, a token, an IP address, a phone number, a UUID or a run of six or more digits is not: name the job the way nightly-billing is written.`;
}
function takeExpectationOutcome(outcome) {
  try {
    const tally = tallies.get(outcome.job);
    if (!tally) return;
    if (outcome.stored === true && typeof outcome.everyMinutes === "number" && Number.isFinite(outcome.everyMinutes) && outcome.everyMinutes > 0) {
      tally.statedEveryMs = outcome.everyMinutes * 6e4;
      tally.statedAllowanceMs = typeof outcome.graceMinutes === "number" && Number.isFinite(outcome.graceMinutes) && outcome.graceMinutes >= 0 ? (outcome.everyMinutes + outcome.graceMinutes) * 6e4 : null;
      return;
    }
    tally.statedEveryMs = null;
    tally.statedAllowanceMs = null;
  } catch {
  }
}
setJobExpectationHandler(takeExpectationOutcome);
const insideMeasuredJob = new AsyncLocalStorage();
const linkedByRun = /* @__PURE__ */ new WeakMap();
setJobLinkedScopeReader(() => insideMeasuredJob.getStore()?.linked ?? null);
let jobBegun = false;
useCrashJobStateReader(() => ({
  open: insideMeasuredJob.getStore() !== void 0,
  begun: jobBegun
}));
function runInsideMeasuredJob(fn, run) {
  try {
    const own = run ? linkedByRun.get(run) : void 0;
    const linked = own ?? insideMeasuredJob.getStore()?.linked ?? null;
    return insideMeasuredJob.run({ linked }, fn);
  } catch (err) {
    throw err;
  }
}
const JOB_STEPS_MIN_GAP_MS = 6e4;
const MAX_JOB_STEP_NAMES = 256;
const lastJobStepsAt = /* @__PURE__ */ new Map();
function sendJobRunSteps(key, linked, durationMs, failedRun) {
  try {
    const folds = closeLinkedScope(linked);
    if (folds.length === 0) return;
    const label = `${JOB_PREFIX}${key}`;
    if (label.length > MAX_PART_NAME) return;
    const now = Date.now();
    const last = lastJobStepsAt.get(key);
    if (last !== void 0 && now - last < JOB_STEPS_MIN_GAP_MS) return;
    const traceId = newTraceId();
    const spanId = newSpanId();
    const sent = enqueueJobRunSteps(
      {
        traceId,
        layer: "node",
        routeLabel: label,
        durationMs,
        startOffsetMs: 0,
        rating: failedRun ? "poor" : rateSpanDuration(durationMs),
        spanId,
        kind: "job",
        outcome: failedRun ? "error" : "ok"
      },
      linkedStepSpans(folds, { traceId, layer: "node", parentSpanId: spanId, baseOffsetMs: 0 })
    );
    if (!sent) return;
    if (!lastJobStepsAt.has(key) && lastJobStepsAt.size >= MAX_JOB_STEP_NAMES) {
      lastJobStepsAt.clear();
    }
    lastJobStepsAt.set(key, now);
  } catch {
  }
}
function beginJob(name, opts = {}) {
  try {
    if (isBoosthisDisabled() || isKitLocked()) return NOOP_RUN;
    jobBegun = true;
    if (insideMeasuredJob.getStore() !== void 0) return NOOP_RUN;
    const clean = cleanName(name);
    if (clean === null) {
      noteJobNameRefused(typeof name === "string" ? name : String(name));
      sayJobNameRefusedOnce(
        nameRefusalCause(name),
        `[boosthis] Boosthis is not measuring ${refusedJobNameShape(name)}: ${whyNameRefused(name)} The name itself is not printed: it is exactly the string the rule says must not travel, and your logs are somewhere it would travel to. Its runs are not counted and it will not appear anywhere — it is not late, and it is not "never reported"; it does not exist.`
      );
      return NOOP_RUN;
    }
    const now = Date.now();
    const started = performance.now();
    const { key, tally } = tallyFor(clean);
    noteStart(tally, now);
    const settledRun = isSettledAt("startupEvent", now);
    if (!settledRun) settlingRunCount += 1;
    if (tally.active > 0 && settledRun) tally.overlaps += 1;
    const tracked = activeTotal() < MAX_ACTIVE_TRACKED;
    if (tracked) tally.active += 1;
    const ring = capRing(tally, now);
    capAccrue(ring, now);
    if (tracked && ring.busyFromMs === null) ring.busyFromMs = now;
    if (typeof opts.system === "string" && opts.system.length > 0) {
      attachedSystems.add(opts.system);
    } else {
      manualRuns += 1;
    }
    const attempt = typeof opts.attempt === "number" && Number.isFinite(opts.attempt) ? Math.max(1, Math.floor(opts.attempt)) : 1;
    const readyAt = opts.readyAtMs !== void 0 ? opts.readyAtMs : opts.queuedAtMs;
    let runWaitMs;
    if (typeof readyAt === "number" && Number.isFinite(readyAt)) {
      const waited = now - readyAt;
      if (waited >= 0 && settledRun) {
        runWaitMs = waited;
        waits.push(waited);
        if (waits.length > DURATION_RING) waits.shift();
        waitRuns += 1;
        const slot = capSlot(ring, Math.floor(now / capacityBucketMs));
        slot.waitCount += 1;
        slot.waitSumMs += waited;
      }
    }
    const hosted = isServerlessMode();
    if (hosted) {
      hostedRuns += 1;
      beginInvocation();
    }
    const linked = openLinkedScope(started);
    let closed = false;
    const close = (failedRun, error) => {
      try {
        if (closed) return;
        closed = true;
        const dur = performance.now() - started;
        if (tracked && tally.active > 0) tally.active -= 1;
        const endedAt = Date.now();
        capAccrue(ring, endedAt);
        if (tracked && tally.active === 0) ring.busyFromMs = null;
        capSlot(ring, Math.floor(endedAt / capacityBucketMs)).finishes += 1;
        if (settledRun) tally.runs += 1;
        if (attempt > 1 && settledRun) {
          tally.retried += 1;
          if (attempt > tally.retryWorst) tally.retryWorst = attempt;
        }
        if (dur > tally.worstMs) tally.worstMs = dur;
        if (failedRun && settledRun) tally.failed += 1;
        durations.push(dur);
        if (durations.length > DURATION_RING) durations.shift();
        record(
          `${JOB_PREFIX}${key}`,
          dur,
          failedRun ? "poor" : rateDuration(dur)
        );
        if (failedRun && error !== void 0) reportJobError(error);
        reportJobRun({
          job: key,
          durationMs: dur,
          ok: !failedRun,
          ...runWaitMs !== void 0 ? { waitMs: runWaitMs } : {}
        });
        sendJobRunSteps(key, linked, dur, failedRun);
        if (hosted) void finishInvocation();
      } catch {
      }
    };
    const handle = {
      done: () => close(false),
      failed: (error) => close(true, error)
    };
    if (linked) linkedByRun.set(handle, linked);
    return handle;
  } catch {
    return NOOP_RUN;
  }
}
async function trackJob(name, fn, opts = {}) {
  const run = beginJob(name, opts);
  try {
    const out = await runInsideMeasuredJob(() => fn(), run);
    run.done();
    return out;
  } catch (error) {
    run.failed(error);
    throw error;
  }
}
function noteJobSystemAttached(system) {
  try {
    if (typeof system === "string" && system.length > 0) {
      attachedSystems.add(system);
      unattachedSystems.delete(system);
    }
  } catch {
  }
}
function noteJobSystemUnattached(system) {
  try {
    if (typeof system === "string" && system.length > 0 && !attachedSystems.has(system)) {
      unattachedSystems.add(system);
    }
  } catch {
  }
}
function unattachedJobSystemCount() {
  return unattachedSystems.size;
}
function attachedJobSystemCount() {
  return attachedSystems.size;
}
function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p / 100 * sorted.length) - 1)
  );
  return Math.round(sorted[idx]);
}
let settlingRunCount = 0;
function jobWorkSettlingRuns() {
  return settlingRunCount;
}
function getJobWorkStats(now = Date.now()) {
  let runs = 0;
  let failed = 0;
  let retried = 0;
  let retryWorst = 1;
  let overlaps = 0;
  let worstMs = 0;
  let missed = 0;
  let recurring = 0;
  let capacity = null;
  for (const [name, tally] of tallies) {
    if (name !== JOB_OTHER_NAME) {
      const read = capacityOf(tally, now);
      if (read !== null && capacityOutranks(read, capacity)) capacity = read;
    }
    runs += tally.runs;
    failed += tally.failed;
    retried += tally.retried;
    if (tally.retryWorst > retryWorst) retryWorst = tally.retryWorst;
    overlaps += tally.overlaps;
    if (tally.worstMs > worstMs) worstMs = tally.worstMs;
    missed += tally.missed;
    const cadence = cadenceOf(tally);
    if (cadence !== null) {
      recurring += 1;
      if (tally.lastStartMs !== null && tally.active === 0) {
        const quiet = now - tally.lastStartMs;
        const allowance = missedAfterMs(tally) ?? cadence * MISSED_GAP_FACTOR;
        if (quiet > allowance) {
          const skipped = Math.round(quiet / cadence) - 1;
          if (skipped > 0) missed += skipped;
        }
      }
    }
  }
  return {
    runs,
    jobNames: tallies.size,
    otherNames: foldedNames.size,
    failed,
    retried,
    retryWorst,
    overlaps,
    worstMs: Math.round(worstMs),
    p95Ms: percentile(durations, 95),
    waitRuns,
    waitP95Ms: waitRuns > 0 ? percentile(waits, 95) : null,
    missed,
    recurring,
    hostedRuns,
    manualRuns,
    attachedSystems: attachedSystems.size,
    unattachedSystems: unattachedSystems.size,
    ...capacity !== null ? {
      capFinishes: capacity.finishes,
      capWindowMs: capacity.windowMs,
      capBusy: capacity.busy ? 1 : 0,
      capWaitGrowing: capacity.growing ? 1 : 0
    } : {}
  };
}
function clearJobWork() {
  settlingRunCount = 0;
  tallies.clear();
  foldedNames.clear();
  durations = [];
  waits = [];
  waitRuns = 0;
  hostedRuns = 0;
  manualRuns = 0;
  attachedSystems.clear();
  unattachedSystems.clear();
  lastJobStepsAt.clear();
  clearJobRhythmDeclarations();
}
const _jobWorkInternals = {
  tallies,
  cleanName,
  percentile,
  JOB_STEPS_MIN_GAP_MS,
  fittedRise,
  /** Shrink (or restore) the capacity window, so a rig can watch a whole one
   *  in seconds. Every job's capacity record starts again. */
  setCapacityWindow(bucketMs, buckets) {
    capacityBucketMs = Math.max(1, Math.floor(bucketMs));
    capacityBuckets = Math.max(2, Math.floor(buckets));
    for (const t of tallies.values()) t.cap = null;
  }
};
export {
  CADENCE_MAX_SPREAD,
  CADENCE_MIN_GAPS,
  CAPACITY_BUSY_SHARE,
  CAPACITY_GROWTH_T,
  CAPACITY_MIN_WAIT_BUCKETS,
  JOB_OTHER_NAME,
  JOB_PREFIX,
  MAX_JOB_NAMES,
  MISSED_GAP_FACTOR,
  _jobWorkInternals,
  attachedJobSystemCount,
  beginJob,
  cadenceOf,
  clearJobWork,
  expectEvery,
  getJobWorkStats,
  jobWorkSettlingRuns,
  missedAfterMs,
  noteJobSystemAttached,
  noteJobSystemUnattached,
  runInsideMeasuredJob,
  trackJob,
  unattachedJobSystemCount
};
