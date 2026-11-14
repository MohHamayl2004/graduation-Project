// @ts-nocheck
/* eslint-disable */
// Built from src/reporting.ts so plain node can run the kit. Do not edit.
import { doorWordOf, settledSummary } from "./samples.js";
import * as budgets from "./budgets.js";
import {
  ingestFindings,
  noteRecurringFindings
} from "./candidateRules.js";
import { readReleaseKey } from "./buildIdentity.js";
import { transmitLabelHasPII } from "./no-pii.js";
import { MAX_PART_NAME } from "./routeInventory.js";
import { collectDetectorFindings } from "./liveDetectors.js";
import { collectAiFindings } from "./aiCalls.js";
import { noteRowsDiscarded, noteRowsDelivered } from "./serverlessMeters.js";
import { resumeDelayMs, uploadPausedUntil } from "./uploadPause.js";
import { uploadsReady, setUploadReadiness } from "./uploadRecovery.js";
function collectFindings() {
  const out = [];
  const sum = settledSummary();
  for (const [route, r] of Object.entries(sum.byRoute)) {
    if (r.worst_rating === "good") continue;
    const b = budgets.statusFor(route);
    const p95 = b.recent_p95_ms ?? r.max_ms;
    out.push({
      kind: "slow-route",
      name: route,
      p95,
      count: r.count,
      hint: "A route is rated needs-work or poor against the TTI budget."
    });
  }
  for (const reg of budgets.regressions()) {
    out.push({
      kind: "budget-regression",
      name: reg.route,
      p95: reg.recent_p95_ms ?? 0,
      count: reg.samples_seen,
      hint: "A route's p95 latency regressed past 1.5x its learned baseline."
    });
  }
  out.push(...collectDetectorFindings());
  out.push(...collectAiFindings());
  return out;
}
let sampleSubmitter = null;
let issuesOnlyMode = false;
let queuePaused = false;
let pending = [];
const PENDING_CAP = 500;
const SAMPLE_BATCH = 100;
function setSampleSink(opts) {
  sampleSubmitter = opts.submitter;
  issuesOnlyMode = opts.issuesOnly;
  queuePaused = false;
}
function setSampleQueueIssuesOnly(issuesOnly) {
  issuesOnlyMode = issuesOnly;
  if (issuesOnly) {
    pending = [];
  }
}
function pauseSampleQueue() {
  queuePaused = true;
  pending = [];
}
function resumeSampleQueue() {
  queuePaused = false;
}
function clearSampleSink() {
  sampleSubmitter = null;
  issuesOnlyMode = false;
  queuePaused = false;
  pending = [];
  coverageRefresh = null;
}
let coverageRefresh = null;
function setCoverageRefreshHook(fn) {
  coverageRefresh = fn;
}
function onSample(s) {
  if (!issuesOnlyMode && !queuePaused) {
    const label = s.name;
    if (label.length <= MAX_PART_NAME && transmitLabelHasPII(label) === null) {
      const door = doorWordOf(s);
      pending.push({
        routeLabel: label,
        durationMs: s.duration_ms,
        rating: s.rating,
        ...door !== null ? { metadata: { door } } : {}
      });
      if (pending.length > PENDING_CAP) {
        pending.shift();
        noteRowsDiscarded(1, "bufferFull");
      }
    } else {
      noteRowsDiscarded(1, "sendFailed");
    }
  }
  scheduleTick();
}
let running = false;
let dirty = false;
let timer = null;
let timerDueAt = 0;
const THROTTLE_MS = 1e3;
const SAMPLE_QUIET_MS = 15e3;
const SAMPLE_PARTIAL_GAP_MS = 15e3;
const SAMPLE_FULL_GAP_MS = 4e3;
const SAMPLE_BACKLOG = 3 * SAMPLE_BATCH;
let lastSampleUploadAt = 0;
function nextTickDelayMs(now) {
  const resume = resumeDelayMs("samples", now);
  if (resume > 0) return Math.max(THROTTLE_MS, resume);
  const since = now - lastSampleUploadAt;
  if (lastSampleUploadAt === 0 || since >= SAMPLE_QUIET_MS || pending.length >= SAMPLE_BACKLOG)
    return THROTTLE_MS;
  const gap = pending.length >= SAMPLE_BATCH ? SAMPLE_FULL_GAP_MS : SAMPLE_PARTIAL_GAP_MS;
  return Math.max(THROTTLE_MS, gap - since);
}
let autoTick = true;
function setAutoTickEnabled(on) {
  autoTick = on;
  if (!on && timer) {
    clearTimeout(timer);
    timer = null;
  }
}
function pendingSampleCount() {
  return pending.length;
}
function discardPendingSamples() {
  const n = pending.length;
  pending.length = 0;
  return n;
}
function scheduleTick() {
  if (!autoTick) return;
  const now = Date.now();
  const delay = nextTickDelayMs(now);
  const pausedUntil = uploadPausedUntil("samples", now);
  if (timer) {
    if (now + delay >= timerDueAt || pausedUntil !== null && timerDueAt >= pausedUntil) {
      dirty = true;
      return;
    }
    clearTimeout(timer);
    timer = null;
  }
  timerDueAt = now + delay;
  timer = setTimeout(() => {
    timer = null;
    void runTick();
  }, delay);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
async function runTick(ending = false) {
  if (running) {
    dirty = true;
    return;
  }
  running = true;
  try {
    dirty = false;
    await tickOnce(ending);
  } catch {
  } finally {
    running = false;
  }
  if (pending.length > 0 || dirty) {
    dirty = false;
    scheduleTick();
  }
}
async function tickOnce(ending = false) {
  const findings = collectFindings();
  try {
    await ingestFindings(findings, ending);
  } catch {
  }
  try {
    await noteRecurringFindings(findings, { releaseKey: readReleaseKey() });
  } catch {
  }
  try {
    coverageRefresh?.();
  } catch {
  }
  if (sampleSubmitter && !issuesOnlyMode && !queuePaused && pending.length > 0 && uploadPausedUntil("samples") === null && uploadsReady(ending)) {
    const batch = pending.slice(0, SAMPLE_BATCH);
    lastSampleUploadAt = Date.now();
    try {
      const answer = await sampleSubmitter(batch);
      const accepted = typeof answer === "number" ? answer : answer.accepted;
      if (accepted > 0) {
        pending.splice(0, accepted);
        noteRowsDelivered(accepted);
      }
      if (typeof answer !== "number" && answer.undelivered === "refused") {
        pending.splice(0, batch.length - accepted);
        noteRowsDiscarded(batch.length - accepted, "sendFailed");
      }
    } catch {
    }
  }
}
async function reportNow(ending = false) {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await runTick(ending);
}
function _resetReportingForTests() {
  setUploadReadiness(null);
  autoTick = true;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  running = false;
  dirty = false;
  timerDueAt = 0;
  lastSampleUploadAt = 0;
  pending = [];
  sampleSubmitter = null;
  issuesOnlyMode = false;
  queuePaused = false;
  coverageRefresh = null;
}
export {
  _resetReportingForTests,
  clearSampleSink,
  collectFindings,
  discardPendingSamples,
  onSample,
  pauseSampleQueue,
  pendingSampleCount,
  reportNow,
  resumeSampleQueue,
  setAutoTickEnabled,
  setCoverageRefreshHook,
  setSampleQueueIssuesOnly,
  setSampleSink
};
