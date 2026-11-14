// @ts-nocheck
/* eslint-disable */
// Built from src/jobReporter.ts so plain node can run the kit. Do not edit.
import { jobNameHasPII } from "./no-pii.js";
import { uploadsReady } from "./uploadRecovery.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { getEntitlementGateKind, isKitLocked } from "./killSwitch.js";
import { uploadPausedUntil } from "./uploadPause.js";
import {
  clearPromiseDeclarations,
  hasPendingPromiseDeclarations,
  notePromiseDeclarationOutcomes,
  restorePromiseDeclarations,
  takePromiseDeclarationsForSend
} from "./promiseDeclaration.js";
const MAX_JOB_RUN_BATCH = 50;
const MAX_BUFFERED_JOB_RUNS = 200;
const MAX_JOB_RUN_TALLIES = 100;
const MAX_HELD_JOB_TALLIES = 500;
const MAX_TALLY_RUNS = 1e8;
const MAX_JOB_NAME = 80;
const JOB_FLUSH_MS = 3e4;
const MAX_JOB_MS = 6048e5;
const MAX_JOB_EXPECTATIONS = 20;
const MIN_STORABLE_EVERY_MS = 6e4;
const MAX_STORABLE_EVERY_MS = 45 * 24 * 60 * 6e4;
let pendingExpectations = /* @__PURE__ */ new Map();
let inFlightExpectations = /* @__PURE__ */ new Map();
const acknowledgedExpectations = /* @__PURE__ */ new Map();
let revalidatingExpectations = /* @__PURE__ */ new Map();
const EXPECTATION_REVALIDATE_MS = 5 * 6e4;
let onExpectationOutcome = null;
let undeliveredRounds = 0;
const UNDELIVERED_ROUNDS_BEFORE_WARNING = 2;
let submitter = null;
let buffer = [];
let timer = null;
let active = false;
let inFlight = false;
let inFlightRuns = 0;
let tallies = /* @__PURE__ */ new Map();
let lostJobRuns = 0;
let generation = 0;
function utcDay(ms) {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "0000-00-00" : d.toISOString().slice(0, 10);
}
function runAsTally(r) {
  return {
    job: r.job,
    day: utcDay(r.finishedAtMs),
    runs: 1,
    okRuns: r.ok ? 1 : 0,
    totalMs: r.durationMs,
    worstMs: r.durationMs,
    lastFinishedAtMs: r.finishedAtMs,
    lastOk: r.ok,
    waitRuns: r.waitMs !== void 0 ? 1 : 0,
    waitTotalMs: r.waitMs ?? 0,
    waitWorstMs: r.waitMs ?? 0
  };
}
function addToTally(add) {
  const key = `${add.day}\0${add.job}`;
  const prior = tallies.get(key);
  if (prior) {
    const runs = prior.runs + add.runs;
    const kept = Math.min(MAX_TALLY_RUNS, runs);
    lostJobRuns += runs - kept;
    prior.runs = kept;
    prior.okRuns = Math.min(kept, prior.okRuns + add.okRuns);
    prior.totalMs += add.totalMs;
    if (add.worstMs > prior.worstMs) prior.worstMs = add.worstMs;
    prior.waitRuns += add.waitRuns;
    prior.waitTotalMs += add.waitTotalMs;
    if (add.waitWorstMs > prior.waitWorstMs) prior.waitWorstMs = add.waitWorstMs;
    if (add.lastFinishedAtMs >= prior.lastFinishedAtMs) {
      prior.lastFinishedAtMs = add.lastFinishedAtMs;
      prior.lastOk = add.lastOk;
    }
    return;
  }
  if (tallies.size >= MAX_HELD_JOB_TALLIES) {
    let oldestKey;
    let oldestAt = Infinity;
    for (const [k, t] of tallies) {
      if (t.lastFinishedAtMs < oldestAt) {
        oldestAt = t.lastFinishedAtMs;
        oldestKey = k;
      }
    }
    if (oldestKey !== void 0) {
      lostJobRuns += tallies.get(oldestKey).runs;
      tallies.delete(oldestKey);
    }
  }
  tallies.set(key, { ...add });
}
function heldTallyRuns() {
  let n = 0;
  for (const t of tallies.values()) n += t.runs;
  return n;
}
function setJobRunSubmitter(fn) {
  submitter = fn;
}
function clearBufferedJobRuns() {
  buffer = [];
  tallies = /* @__PURE__ */ new Map();
  generation += 1;
  clearJobNameRefusals();
}
function declareJobRhythm(job, everyMs) {
  try {
    const name = jobName(String(job).trim());
    if (!name) return;
    const ms = Math.round(everyMs);
    if (!Number.isFinite(ms) || ms <= 0) return;
    if (acknowledgedExpectations.get(name)?.everyMs === ms) return;
    if (!pendingExpectations.has(name) && !inFlightExpectations.has(name) && distinctExpectationCount() >= MAX_JOB_EXPECTATIONS) {
      warnExpectationOnce(
        "too_many",
        `[boosthis] This app declared a rhythm for more than ${MAX_JOB_EXPECTATIONS} jobs; "${name}" is not being watched. Boosthis watches at most ${MAX_JOB_EXPECTATIONS} named jobs per app — declare the ones that matter, or the names may be built from a value rather than written in code.`
      );
      return;
    }
    pendingExpectations.set(name, ms);
  } catch {
  }
}
function dueRevalidations(now) {
  const due = [];
  for (const [job, ack] of acknowledgedExpectations) {
    if (now - ack.at >= EXPECTATION_REVALIDATE_MS) due.push([job, ack]);
  }
  return due;
}
function distinctExpectationCount() {
  const names = /* @__PURE__ */ new Set([
    ...pendingExpectations.keys(),
    ...inFlightExpectations.keys(),
    ...acknowledgedExpectations.keys()
  ]);
  return names.size;
}
function setJobExpectationHandler(fn) {
  onExpectationOutcome = fn;
}
function clearJobRhythmDeclarations() {
  pendingExpectations = /* @__PURE__ */ new Map();
  inFlightExpectations = /* @__PURE__ */ new Map();
  revalidatingExpectations = /* @__PURE__ */ new Map();
  acknowledgedExpectations.clear();
}
function pendingJobExpectationCount() {
  return pendingExpectations.size + inFlightExpectations.size;
}
const warnedExpectationCauses = /* @__PURE__ */ new Set();
function warnExpectationOnce(cause, message) {
  if (warnedExpectationCauses.has(cause)) return;
  warnedExpectationCauses.add(cause);
  try {
    console.warn(message);
  } catch {
  }
}
function sayDeclarationOnce(cause, message) {
  warnExpectationOnce(`declared:${cause}`, message);
}
function sayJobNameRefusedOnce(cause, message) {
  warnExpectationOnce(`jobName:${cause}`, message);
}
let jobNameRefusedRuns = 0;
const jobNameRefusedNames = /* @__PURE__ */ new Set();
const MAX_REFUSED_NAMES_TRACKED = 50;
function refusedNameFingerprint(name) {
  let h = 5381;
  for (let i = 0; i < name.length; i += 1) h = h * 33 ^ name.charCodeAt(i);
  return h >>> 0;
}
function noteJobNameRefused(name, runs = 1) {
  jobNameRefusedRuns += runs;
  if (jobNameRefusedNames.size < MAX_REFUSED_NAMES_TRACKED)
    jobNameRefusedNames.add(refusedNameFingerprint(name));
}
function jobNameRefusals() {
  return { runs: jobNameRefusedRuns, names: jobNameRefusedNames.size };
}
function clearJobNameRefusals() {
  jobNameRefusedRuns = 0;
  jobNameRefusedNames.clear();
}
function sayRhythmRefusedOnce(message) {
  warnExpectationOnce("refused:rhythm", message);
}
function uploadGateReason() {
  if (uploadPausedUntil("job-runs") !== null) {
    return {
      kind: "asked-to-wait",
      sentence: "Boosthis asked this app to wait before uploading again (its upload allowance for the moment is used up), so there is nothing to fix; the declaration is kept and re-sent when the wait is over."
    };
  }
  switch (getEntitlementGateKind()) {
    case "unregistered":
      return {
        kind: "unregistered",
        sentence: "This app has not completed its first check-in with Boosthis, so nothing leaves it yet; the declaration is kept and sent as soon as it registers."
      };
    case "unpaid":
      return {
        kind: "unpaid",
        sentence: "This project's plan is not active, so Boosthis is measuring and watching nothing; the declaration is kept and re-sent the moment the plan is active again."
      };
    case "revoked":
      return {
        kind: "revoked",
        sentence: "This project's access was revoked, so Boosthis is watching nothing; the declaration is kept in case access is restored."
      };
    case "paused":
      return {
        kind: "paused",
        sentence: "This project is paused, so Boosthis is watching nothing; the declaration is kept and re-sent when it resumes."
      };
    case "hidden":
      return {
        kind: "hidden",
        sentence: "Boosthis is not active in this app right now, so nothing leaves it; the declaration is kept and re-sent if it becomes active."
      };
    case "dissolved":
      return {
        kind: "dissolved",
        sentence: "This project stayed locked past its owner's delay, so Boosthis erased what it kept on this machine and stopped; nothing leaves this app until it restarts and asks again."
      };
    default:
      return null;
  }
}
function refusalMessage(job, reason) {
  switch (reason) {
    case "name":
      return `[boosthis] Boosthis will not watch the job "${job}": its name did not pass the privacy guard, so the declared rhythm was not stored. Name jobs in code, the way nightly-billing is written — never from a value.`;
    case "rhythm":
      return `[boosthis] Boosthis could not keep the rhythm this app declared for "${job}" — it is outside the storable range (1 minute to 45 days), so the job is NOT being watched. Check the interval passed to expectEvery().`;
    case "too_many":
      return `[boosthis] Boosthis is already watching the most jobs it can for this project, so the rhythm declared for "${job}" was not stored and the job is NOT being watched. Stop watching a job on the project's page to free a slot.`;
    case "not_watched":
      return `[boosthis] Watching was switched off for the job "${job}" on its project page, so the rhythm this app declares in code is not in force. Only that page can switch it back on — otherwise pressing "stop watching" would be undone at this app's next restart.`;
    default:
      return `[boosthis] Boosthis did not store the rhythm this app declared for "${job}", so the job is NOT being watched. Its project page says why.`;
  }
}
function parseExpectationOutcomes(body) {
  try {
    if (!body || typeof body !== "object") return void 0;
    const raw = body.expectations;
    if (!Array.isArray(raw)) return void 0;
    const out = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry;
      if (typeof rec.job !== "string" || rec.job.length === 0) continue;
      const outcome = {
        job: rec.job,
        stored: rec.stored === true
      };
      if (typeof rec.everyMinutes === "number" && Number.isFinite(rec.everyMinutes)) {
        outcome.everyMinutes = rec.everyMinutes;
      }
      if (typeof rec.graceMinutes === "number" && Number.isFinite(rec.graceMinutes)) {
        outcome.graceMinutes = rec.graceMinutes;
      }
      if (typeof rec.reason === "string") outcome.reason = rec.reason;
      out.push(outcome);
    }
    return out;
  } catch {
    return void 0;
  }
}
function noteJobExpectationOutcomes(outcomes) {
  try {
    for (const o of outcomes) {
      if (!o || typeof o.job !== "string") continue;
      const asked = inFlightExpectations.get(o.job);
      if (o.stored === true) {
        if (asked !== void 0)
          acknowledgedExpectations.set(o.job, {
            everyMs: asked,
            at: Date.now()
          });
        inFlightExpectations.delete(o.job);
        revalidatingExpectations.delete(o.job);
        if (typeof o.everyMinutes === "number" && Number.isFinite(o.everyMinutes) && o.everyMinutes > 0) {
          onExpectationOutcome?.(o);
        }
        continue;
      }
      if (asked !== void 0)
        acknowledgedExpectations.set(o.job, { everyMs: asked, at: Date.now() });
      inFlightExpectations.delete(o.job);
      revalidatingExpectations.delete(o.job);
      warnExpectationOnce(
        `refused:${typeof o.reason === "string" ? o.reason : "unknown"}`,
        refusalMessage(o.job, typeof o.reason === "string" ? o.reason : "")
      );
      onExpectationOutcome?.(o);
    }
  } catch {
  }
}
function jobName(name) {
  if (name.length <= MAX_JOB_NAME) return name;
  noteJobNameRefused(name);
  sayJobNameRefusedOnce(
    "length",
    `[boosthis] Boosthis is not measuring a background job whose name is ${name.length} characters: a job name must be ${MAX_JOB_NAME} or fewer. It is refused rather than shortened, because two names cut to the same ${MAX_JOB_NAME} characters would be filed as one job, and a shortened name would be screened with its tail already gone. The name is not printed here — an over-long name is the likeliest of all to have been built out of a value, and your logs are somewhere that value would travel to.`
  );
  return "";
}
function clampMs(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(MAX_JOB_MS, Math.round(v)));
}
function reportJobRun(run) {
  try {
    if (!submitter || isBoosthisDisabled() || isKitLocked()) return;
    const name = typeof run?.job === "string" ? jobName(run.job.trim()) : "";
    if (!name) return;
    const finishedAt = run.finishedAt instanceof Date ? run.finishedAt.getTime() : typeof run.finishedAt === "number" && Number.isFinite(run.finishedAt) ? run.finishedAt : Date.now();
    const waited = typeof run.waitMs === "number" && Number.isFinite(run.waitMs) && run.waitMs >= 0 ? clampMs(run.waitMs) : void 0;
    buffer.push({
      job: name,
      finishedAtMs: finishedAt,
      durationMs: clampMs(run.durationMs),
      ok: run.ok === true,
      ...waited !== void 0 ? { waitMs: waited } : {}
    });
    while (buffer.length > MAX_BUFFERED_JOB_RUNS) addToTally(runAsTally(buffer.shift()));
  } catch {
  }
}
async function tick(ending = false) {
  if (!submitter || isBoosthisDisabled() || inFlight || buffer.length === 0 && tallies.size === 0 && pendingExpectations.size === 0 && // A promise declared by an app that reports no job runs at all must
  // still travel: this upload is the only door it has.
  !hasPendingPromiseDeclarations() && dueRevalidations(Date.now()).length === 0) {
    return 0;
  }
  if (uploadPausedUntil("job-runs") !== null) return 0;
  if (!uploadsReady(ending)) return 0;
  inFlight = true;
  const taken = buffer.splice(0, MAX_JOB_RUN_BATCH);
  const myGeneration = generation;
  const takenTallies = [];
  if (submitter.length >= 4) {
    for (const r of buffer) addToTally(runAsTally(r));
    buffer = [];
    for (const [key, t] of tallies) {
      if (takenTallies.length >= MAX_JOB_RUN_TALLIES) break;
      takenTallies.push(t);
      tallies.delete(key);
    }
  }
  inFlightRuns = taken.length + takenTallies.reduce((n, t) => n + t.runs, 0);
  const now = Date.now();
  const sending = pendingExpectations;
  pendingExpectations = /* @__PURE__ */ new Map();
  for (const [job, ms] of sending) inFlightExpectations.set(job, ms);
  for (const [job, ack] of dueRevalidations(now)) {
    if (inFlightExpectations.size >= MAX_JOB_EXPECTATIONS) break;
    if (inFlightExpectations.has(job)) continue;
    inFlightExpectations.set(job, ack.everyMs);
    revalidatingExpectations.set(job, ack);
    acknowledgedExpectations.delete(job);
  }
  let delivered = false;
  let putBack = false;
  const sentRuns = [];
  const sentTallies = [];
  let promisesSent = 0;
  try {
    const refuseNameAtFlush = (job, runs) => {
      const refused = jobNameHasPII(job);
      if (refused === null) return false;
      noteJobNameRefused(job, runs);
      sayJobNameRefusedOnce(
        refused,
        `[boosthis] Boosthis is not measuring a background job whose name matched ${refused}: its runs are dropped before upload and the job will not appear at all. The name is deliberately not printed — the rule that fired is a rule about a VALUE, so echoing the name would copy that email address, token or id into your logs to explain that it must not travel. It was ${job.length} characters. Name jobs in code, the way nightly-billing is written — never out of a value such as an id, an email address or a customer reference.`
      );
      return true;
    };
    const batch = [];
    for (const r of taken) {
      if (refuseNameAtFlush(r.job, 1)) continue;
      sentRuns.push(r);
      batch.push({
        job: r.job,
        finishedAgoMs: clampMs(now - r.finishedAtMs),
        durationMs: r.durationMs,
        ok: r.ok,
        ...r.waitMs !== void 0 ? { waitMs: r.waitMs } : {}
      });
    }
    const wireTallies = [];
    for (const t of takenTallies) {
      if (refuseNameAtFlush(t.job, t.runs)) continue;
      sentTallies.push(t);
      wireTallies.push({
        job: t.job,
        runs: t.runs,
        okRuns: t.okRuns,
        meanMs: clampMs(t.totalMs / t.runs),
        worstMs: clampMs(t.worstMs),
        lastFinishedAgoMs: clampMs(now - t.lastFinishedAtMs),
        lastOk: t.lastOk,
        ...t.waitRuns > 0 ? {
          waitRuns: Math.min(t.runs, t.waitRuns),
          waitMeanMs: clampMs(t.waitTotalMs / t.waitRuns),
          waitWorstMs: clampMs(t.waitWorstMs)
        } : {}
      });
    }
    const expectations = [];
    for (const [job, everyMs] of inFlightExpectations) {
      if (jobNameHasPII(job) !== null) {
        inFlightExpectations.delete(job);
        revalidatingExpectations.delete(job);
        acknowledgedExpectations.set(job, {
          everyMs,
          at: Number.MAX_SAFE_INTEGER
        });
        warnExpectationOnce(
          "localName",
          `[boosthis] Boosthis will not watch the job "${job}": its name looks like it was built from a value, so the declared rhythm was not sent. Name jobs in code, the way nightly-billing is written.`
        );
        continue;
      }
      expectations.push({ job, everyMs });
    }
    const carriesPromises = submitter.length >= 3;
    const promises = carriesPromises ? takePromiseDeclarationsForSend() : [];
    promisesSent = promises.length;
    if (!carriesPromises && hasPendingPromiseDeclarations()) {
      warnExpectationOnce(
        "noTransportPromises",
        `[boosthis] This app declares a promise in its code, but the installed kit cannot send promises to Boosthis. That promise is NOT saved. Update the Boosthis kit, or write the promise on the project's promises page.`
      );
    }
    if (batch.length === 0 && wireTallies.length === 0 && expectations.length === 0 && promises.length === 0)
      return 0;
    const out = await submitter(batch, expectations, promises, wireTallies);
    if (typeof out === "number") {
      delivered = out > 0;
      return out;
    }
    if (out.undelivered !== void 0) {
      putBack = out.undelivered === "retry";
      return 0;
    }
    delivered = true;
    noteJobExpectationOutcomes(out.expectations ?? []);
    notePromiseDeclarationOutcomes(out.promises ?? []);
    return out.accepted;
  } catch {
    putBack = true;
    return 0;
  } finally {
    inFlight = false;
    inFlightRuns = 0;
    if (putBack && myGeneration === generation && !isBoosthisDisabled()) {
      for (const r of sentRuns) addToTally(runAsTally(r));
      for (const t of sentTallies) addToTally(t);
    }
    if (inFlightExpectations.size > 0) {
      for (const [job, ack] of revalidatingExpectations) {
        inFlightExpectations.delete(job);
        if (!pendingExpectations.has(job))
          acknowledgedExpectations.set(job, { everyMs: ack.everyMs, at: now });
      }
      revalidatingExpectations = /* @__PURE__ */ new Map();
    }
    if (inFlightExpectations.size > 0) {
      for (const [job, ms] of inFlightExpectations)
        if (!pendingExpectations.has(job)) pendingExpectations.set(job, ms);
      inFlightExpectations = /* @__PURE__ */ new Map();
      undeliveredRounds += 1;
      if (delivered && undeliveredRounds === 1) {
        warnExpectationOnce(
          "unanswered",
          `[boosthis] Boosthis accepted this app's job runs but said nothing about the ${pendingExpectations.size === 1 ? "rhythm" : "rhythms"} declared with expectEvery() — ${pendingExpectations.size === 1 ? "that job is" : "those jobs are"} NOT being watched yet. This usually means the Boosthis server is older than this kit; updating it fixes it, and the declaration keeps being re-sent meanwhile.`
        );
      } else if (!delivered && undeliveredRounds >= UNDELIVERED_ROUNDS_BEFORE_WARNING) {
        const gate2 = uploadGateReason();
        warnExpectationOnce(
          gate2 ? `undelivered:${gate2.kind}` : "undelivered",
          `[boosthis] Boosthis could not deliver the ${pendingExpectations.size === 1 ? "job rhythm" : "job rhythms"} this app declared with expectEvery(), after ${undeliveredRounds} attempts — ${pendingExpectations.size === 1 ? "that job is" : "those jobs are"} NOT being watched. ` + (gate2 ? gate2.sentence : `Check this app can reach Boosthis; the declaration keeps being re-sent.`)
        );
      }
    } else if (sending.size > 0) {
      undeliveredRounds = 0;
    }
    const gate = uploadGateReason();
    restorePromiseDeclarations({
      delivered,
      sentCount: promisesSent,
      roundsBeforeWarning: UNDELIVERED_ROUNDS_BEFORE_WARNING,
      gateKind: gate?.kind ?? null,
      gateSentence: gate?.sentence ?? null
    });
  }
}
function pendingJobRunCount() {
  return buffer.length + heldTallyRuns() + inFlightRuns;
}
function flushJobRunsNow(ending = false) {
  return tick(ending);
}
function startJobRunAutoFlush() {
  if (active) return;
  active = true;
  const loop = () => {
    if (!active) return;
    timer = setTimeout(() => {
      void tick().catch(() => {
      }).finally(() => {
        if (active) loop();
      });
    }, JOB_FLUSH_MS);
    timer?.unref?.();
  };
  loop();
}
function stopJobRunAutoFlush() {
  active = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
const _jobInternals = {
  hasSubmitter: () => submitter !== null,
  bufferLen: () => buffer.length,
  /** Count lines held, and the runs they carry. */
  tallyLen: () => tallies.size,
  heldTallyRuns: () => heldTallyRuns(),
  lostRuns: () => lostJobRuns,
  isAutoRunning: () => active,
  flushMs: () => JOB_FLUSH_MS,
  pendingExpectations: () => pendingJobExpectationCount(),
  reset: () => {
    stopJobRunAutoFlush();
    submitter = null;
    buffer = [];
    tallies = /* @__PURE__ */ new Map();
    lostJobRuns = 0;
    generation += 1;
    inFlight = false;
    inFlightRuns = 0;
    clearJobRhythmDeclarations();
    clearJobNameRefusals();
    clearPromiseDeclarations();
    undeliveredRounds = 0;
    warnedExpectationCauses.clear();
  }
};
export {
  EXPECTATION_REVALIDATE_MS,
  JOB_FLUSH_MS,
  MAX_BUFFERED_JOB_RUNS,
  MAX_HELD_JOB_TALLIES,
  MAX_JOB_EXPECTATIONS,
  MAX_JOB_MS,
  MAX_JOB_NAME,
  MAX_JOB_RUN_BATCH,
  MAX_JOB_RUN_TALLIES,
  MAX_STORABLE_EVERY_MS,
  MAX_TALLY_RUNS,
  MIN_STORABLE_EVERY_MS,
  UNDELIVERED_ROUNDS_BEFORE_WARNING,
  _jobInternals,
  clearBufferedJobRuns,
  clearJobNameRefusals,
  clearJobRhythmDeclarations,
  declareJobRhythm,
  flushJobRunsNow,
  jobName,
  jobNameRefusals,
  noteJobExpectationOutcomes,
  noteJobNameRefused,
  parseExpectationOutcomes,
  pendingJobExpectationCount,
  pendingJobRunCount,
  reportJobRun,
  sayDeclarationOnce,
  sayJobNameRefusedOnce,
  sayRhythmRefusedOnce,
  setJobExpectationHandler,
  setJobRunSubmitter,
  startJobRunAutoFlush,
  stopJobRunAutoFlush
};
