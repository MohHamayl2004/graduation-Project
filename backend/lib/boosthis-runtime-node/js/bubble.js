// @ts-nocheck
/* eslint-disable */
// Built from src/bubble.ts so plain node can run the kit. Do not edit.
import { summary } from "./samples.js";
import { linearScore as checkedLinearScore } from "./healthAxes.js";
import { BUDGET_BASELINE_N } from "./budgets.js";
import {
  BASELINE_ALGORITHM,
  BASELINE_RECENT_N,
  DECIDED_PART,
  DECIDED_PART_AXIS
} from "./meterAxes.js";
import {
  SCORE_THRESHOLDS,
  RESILIENCE_MIN_MEDIAN_MS,
  RESILIENCE_MIN_TAIL_SAMPLES,
  RESILIENCE_TAIL_FLOOR_MS
} from "./thresholds.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { FREEZE_COUNT_MS } from "./eventLoopLag.js";
import { overWords } from "./rateHonesty.js";
import { SYSTEM_LIMITED_READINGS } from "./systemLimits.js";
import {
  capturePerfSnapshot,
  nextSnapshotDelayMs
} from "./snapshot.js";
import { getEntitlementGateKind, getEntitlementMessage } from "./killSwitch.js";
import {
  getDroppedRowCauses,
  getDroppedRowCount,
  getUndeliveredCauses,
  getUndeliveredRowCount
} from "./dropReport.js";
import {
  askRegistration,
  getDroppedUploadCount,
  getLastUploadFailure,
  getPanelInstallId,
  getPanelProjectKey,
  getRegistrationRejection,
  getRegistrationRefusalKind,
  getRegistrationRefusalRetryAfterSeconds,
  getRegistrationRefusalSentence,
  describeRetryWait,
  isLastUploadAttemptFailed,
  isRegisteredForPanel,
  isSharingOnForPanel
} from "./telemetry.js";
import { getRegistrationVerdict } from "./registration.js";
import { describeProjectKeySource } from "./projectKey.js";
import {
  getKitProject,
  getKitPromises,
  projectDisplay,
  INSTALL_ID_LABEL,
  INSTALL_ID_UNKNOWN_TEXT,
  PROJECT_LABEL,
  PROJECT_UNKNOWN_TEXT,
  SCORE_CAPTION
} from "./projectIdentity.js";
const PULSE_PATH = "/_boosthis/pulse";
const PULSE_SUFFIX = "/pulse";
const PANEL_SUFFIX = "/panel";
const PANEL_PATH = "/_boosthis/panel";
const ACCOUNT_SUFFIX = "/account";
const BOOSTHIS_ICON_URI = "data:image/png;base64,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";
const TERMS_VERSION_LITERAL = "2026-07-21";
const MAX_INJECT_BYTES = 2 * 1024 * 1024;
const TRUE_VALUES = /* @__PURE__ */ new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = /* @__PURE__ */ new Set(["0", "false", "no", "off"]);
function readBubbleFlag(name) {
  let raw;
  if (typeof process !== "undefined" && process.env) raw = process.env[name];
  if (raw === void 0) {
    const g = globalThis;
    raw = g[name];
  }
  return raw;
}
function parseBubbleDirective(raw) {
  if (raw === void 0) return void 0;
  if (typeof raw === "boolean") return raw;
  const value = raw.trim().toLowerCase();
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  return void 0;
}
function isTruthyAlias(raw) {
  if (typeof raw === "boolean") return raw;
  return typeof raw === "string" && TRUE_VALUES.has(raw.trim().toLowerCase());
}
function isDevProcess(env) {
  try {
    const e = env ?? (typeof process !== "undefined" ? process.env : void 0);
    if (!e) return false;
    if (e.REPLIT_DEPLOYMENT !== void 0 && e.REPLIT_DEPLOYMENT !== "") {
      return false;
    }
    const nodeEnv = (e.NODE_ENV ?? "").toLowerCase();
    const plainEnv = (e.ENV ?? "").toLowerCase();
    if (nodeEnv === "production" || plainEnv === "production") return false;
    return true;
  } catch {
    return false;
  }
}
function resolveBubbleVisibility(option) {
  try {
    if (isBoosthisDisabled()) return false;
  } catch {
    return false;
  }
  try {
    const directive = parseBubbleDirective(readBubbleFlag("BOOSTHIS_BUBBLE"));
    if (directive !== void 0) return directive;
    if (isTruthyAlias(readBubbleFlag("BOOSTHIS_NO_BUBBLE"))) return false;
    if (isTruthyAlias(readBubbleFlag("BOOSTHIS_FORCE_BUBBLE"))) return true;
    if (option !== void 0) return option;
  } catch {
    return true;
  }
  return true;
}
function linearScore(durationMs) {
  const { good, poor } = SCORE_THRESHOLDS.tti;
  return checkedLinearScore(durationMs, good, poor);
}
function ratingForScore(score) {
  if (score >= 85) return "good";
  if (score >= 60) return "needs-work";
  return "poor";
}
function computePulse() {
  try {
    const sum = summary();
    if (sum.total === 0 || sum.p95_ms === null || sum.p95_ms === void 0) {
      return { score: null, rating: null, sampleCount: sum.total ?? 0 };
    }
    const score = linearScore(sum.p95_ms);
    return { score, rating: ratingForScore(score), sampleCount: sum.total };
  } catch {
    return { score: null, rating: null, sampleCount: 0 };
  }
}
const PANEL_JOBS = { reporting: "reported" };
function computePanelDrops() {
  try {
    const count = getDroppedRowCount();
    if (count <= 0) return null;
    return { count, causes: getDroppedRowCauses() };
  } catch {
    return null;
  }
}
function panelUploadFailText(reason) {
  if (reason === "unauthorized") {
    return "Refused — credentials rejected";
  }
  if (reason === "rejected") {
    return "Refused — batch rejected";
  }
  if (reason === "server-error") {
    return "Boosthis failed to store it";
  }
  return "No answer — timed out or unreachable";
}
function computePanelNotice() {
  try {
    askRegistration();
    if (getRegistrationRejection() === "install-id-not-uuid") {
      return {
        kind: "install-id-not-uuid",
        title: "Registration rejected",
        body: "Install ID must be a UUID. Mint a real UUID and restart."
      };
    }
    const refusalKind = getRegistrationRefusalKind();
    if (refusalKind === "no-key-missing" || refusalKind === "no-key-chosen") {
      return {
        kind: refusalKind === "no-key-chosen" ? "no-project-key-chosen" : "no-project-key",
        title: refusalKind === "no-key-chosen" ? "Running with no project key" : "No project key",
        body: getRegistrationRefusalSentence() ?? ""
      };
    }
    if (refusalKind === "throttled") {
      const secs = getRegistrationRefusalRetryAfterSeconds();
      return {
        kind: "registration-throttled",
        title: "Waiting — too many new registrations",
        body: "Boosthis is rate-limiting new registrations for this project key, so this app is not on file yet. It is temporary and needs nothing from you: the kit is waiting " + describeRetryWait(secs ?? void 0) + " and will register itself, with no restart. Do not change the install line's id while this is showing — a new id is a new registration and makes the wait longer.",
        ...secs !== null ? { retryAfterSeconds: secs } : {}
      };
    }
    const verdict = getRegistrationVerdict();
    if (verdict === "unregistered") {
      const reason = getRegistrationRefusalSentence();
      return {
        kind: "not-registered",
        title: "Not registered yet",
        body: reason ?? "This app has not registered with Boosthis, so nothing is being sent. Check the project key and this app's outbound network access, then restart."
      };
    }
    if (verdict === "unknown") {
      if (!isRegisteredForPanel()) {
        return {
          kind: "registration-unknown",
          title: "Can't check right now",
          body: "Boosthis could not be reached to confirm whether this app is registered, so this panel cannot say either way yet. This is not a failed install and it does not mean anything stopped — it settles by itself once the check goes through. Do not change the install line's id while this is showing."
        };
      }
    }
    if (!isSharingOnForPanel()) {
      return {
        kind: "sharing-off",
        title: "Nothing is being uploaded",
        body: "This app is registered, but sharing is off: these meters stay on this screen and your Boosthis dashboard stays empty. Turn sharing on there, or start the kit with shareMeterWithAI: true."
      };
    }
    const failure = getLastUploadFailure();
    if (isLastUploadAttemptFailed() && failure) {
      const lost = getDroppedUploadCount();
      return {
        kind: "uploads-failing",
        title: "Uploads are not getting through",
        body: "This app is registered and sharing is on, but the last batch of measurements did not reach Boosthis, so your dashboard is missing the most recent data. " + panelUploadFailText(failure.reason) + "." + (lost > 0 ? " Uploads lost: " + String(lost) + "." : ""),
        reason: failure.reason,
        lost
      };
    }
    return null;
  } catch {
    return null;
  }
}
const PANEL_AXIS_LABELS = {
  responsiveness: "Responsiveness",
  resilience: "Resilience",
  budget: "On budget",
  baseline: "Baseline",
  network: "Network",
  idle: "Idle efficiency",
  latencyFloor: "Latency floor",
  confidence: "Confidence",
  eventLoopLag: "Event-loop lag",
  cpuEntitlement: "CPU entitlement",
  contextSwitching: "Context switching",
  threadFootprint: "Thread footprint",
  queueTime: "Queue time",
  blockingAsync: "Blocking async",
  forkChurn: "Fork churn",
  memoryStability: "Memory stability",
  heapHeadroom: "Heap headroom",
  gcPressure: "GC pressure",
  gcPauseTail: "GC pause tail",
  gcGenerationBalance: "GC generation balance",
  containerPressure: "Container pressure",
  crashFree: "Crash-free",
  reliability: "Reliability",
  eventLoopUtilization: "Event-loop utilization",
  heapFragmentation: "Heap fragmentation",
  handleLeak: "Handle leak",
  // 2026-08 Node meter batch (mirrors the web dashboard's AXIS_LABELS).
  worstFreeze: "Worst freeze",
  backpressure: "Backpressure",
  connectionSetup: "Connection setup",
  handleChurn: "Handle churn",
  gcTrend: "GC trend",
  workerImbalance: "Worker balance",
  rejectionPressure: "Rejection pressure",
  promiseRejections: "Promise rejections",
  unhandledErrors: "Unhandled errors",
  timerHealth: "Timer health",
  heapWall: "Heap wall",
  startupImport: "Startup import cost",
  // 2026-08 batch 2 (mirrors the web dashboard's AXIS_LABELS).
  cpuConsumption: "CPU consumption",
  residentGrowth: "Memory growth",
  nativeMemoryMix: "Native memory mix",
  uptimeStability: "Uptime stability",
  heapSpacePressure: "Heap space pressure",
  arrayBufferRetention: "Buffer retention",
  eventLoopDelayTail: "Event-loop delay tail",
  eventLoopDelayMax: "Event-loop delay max",
  perfEntryBacklog: "Perf-entry backlog",
  asyncResourceDiversity: "Async resource diversity",
  diagnosticErrorVolume: "Diagnostic errors",
  diagnosticActivity: "Diagnostic activity",
  // 2026-08 additive display-only leak monitor (mirrors swallowedErrors doctrine:
  // runtime evidence only, never feeds Speed). Label "Leak Watch".
  swallowedErrors: "Swallowed errors",
  leakWatch: "Leak Watch",
  // Cookie Exposure — safe-flag exposure on cookies this app actually sets.
  // NOT in PANEL_EXPECTED_AXES: an app that sets no cookies must show no row
  // at all rather than a "warming up" one that never resolves.
  cookieExposure: "Cookie Exposure",
  // Cross-Origin Exposure — the cross-origin answers on the same responses:
  // any origin, the asking origin echoed back, a wildcard with credentials.
  // IS in PANEL_EXPECTED_AXES: every app answers requests, and the reading
  // arrives with the first one, so its warming row is honest. Never scored.
  corsExposure: "Cross-Origin Exposure",
  // Dev Posture — the development settings we can read; a clean tile means none
  // of them were on, NOT that the deployment is hardened. Frozen at startup and
  // display-only. NOT in PANEL_EXPECTED_AXES: it emits from the first snapshot,
  // so it never needs a warming-up row.
  devPosture: "Dev Posture",
  // Access Pressure — break-in pressure / traffic surge, the shape of who is
  // knocking. IS in PANEL_EXPECTED_AXES: every app answers requests, so a
  // 10-minute warming row is honest (unlike cookieExposure/patchLag).
  accessPressure: "Access Pressure",
  refusalHonesty: "Refusal honesty",
  // Patch lag — build-identity / exposure-window meter. Appears ONLY when the
  // build time is honestly known (like mcpTools it is NOT in
  // PANEL_EXPECTED_AXES, so it never shows a warming-up row).
  patchLag: "Patch lag",
  // Repeated Work — the same call made more than once inside ONE request.
  // NOT in PANEL_EXPECTED_AXES: it needs calls whose identity the kit can see
  // (`trackPerf`-wrapped work, outbound HTTP). An app that wraps none can be
  // honestly "cannot tell" forever, and a permanently-warming row would be a
  // fake meter.
  repeatedWork: "Repeated Work",
  // Database work — how much of a request was spent WAITING on the database.
  // NOT in PANEL_EXPECTED_AXES, for the same reason as repeatedWork: an app
  // with no database, or one using a client this kit cannot watch, honestly
  // has no reading, and a row that warmed up forever would be a fake meter.
  dbWork: "Database work",
  // Database sequencing — whether that database work happened in single file.
  // NOT in PANEL_EXPECTED_AXES, for the same reason as dbWork.
  dbSequencing: "Database sequencing",
  // Database rows — how much a query hands back. Same reason again, plus one
  // of its own: an app whose every read is a cursor reports no size at all.
  dbRowVolume: "Database rows",
  // Point-in-time occupancy of a real bounded connection pool. No pool means
  // no row; it is never a permanently warming expected axis.
  dbPoolPressure: "Database pool pressure",
  // AI calls — how long the AI part of a request takes, what it costs, and how
  // close the project is to its provider's limits. NOT in PANEL_EXPECTED_AXES,
  // and this is the point of the whole reading: an app that calls no AI
  // provider must show NOTHING here rather than a row of zeros or a row that
  // warms up forever. The rows appear the moment a call to a provider on the
  // kit's maintained list is watched, and never before.
  aiCalls: "AI Wait",
  aiSpend: "AI Spend",
  aiHeadroom: "AI Rate Limit Headroom",
  // Background work — jobs, queues and schedules: work with no request behind
  // it. NOT in PANEL_EXPECTED_AXES, for the same reason as dbWork: an app with
  // no background work at all honestly has no reading, and a row warming up
  // forever in a plain web app would be a fake meter.
  backgroundWork: "Background work",
  // Upstream cache — the hit/miss verdict declared by the services this app
  // CALLS (never this project's own hosting: a server cannot see that). NOT in
  // PANEL_EXPECTED_AXES: an app whose dependencies sit behind plain origins, or
  // one that calls nothing, never gets a verdict at all, and a row warming up
  // forever would be a fake meter.
  upstreamCache: "Upstream cache",
  // 2026-08 serverless batch. Present ONLY when this app runs as short-lived
  // functions; a long-running server never emits them. Deliberately NOT in
  // PANEL_EXPECTED_AXES for exactly that reason — an ordinary server would show
  // three rows warming up forever, which is the fake meter this whole doctrine
  // forbids. Labels mirror the web dashboard's AXIS_LABELS word for word.
  serverless: "Serverless Delivery",
  timeoutHeadroom: "Timeout Headroom",
  functionMemory: "Function Memory",
  // Live Connections — chat sockets, live feeds, streamed answers. Deliberately
  // NOT in PANEL_EXPECTED_AXES: a server that holds none must show NO row here,
  // not a warming one that never resolves. An app without a realtime feature is
  // not an app with a broken realtime meter.
  liveConnections: "Live Connections",
  // Failing Routes — of the answers this app sent, how many were its own
  // fault. Worded exactly as the dashboard words it, because it is the same
  // reading. NOT in PANEL_EXPECTED_AXES: the request middleware may not be
  // mounted at all (a worker serves nothing), and an app that has answered
  // nothing must show no row rather than one warming up forever.
  routeFailures: "Failing Routes",
  // How far this app is from its data, judged on how long a NEW connection
  // takes to open — never on the round trip, which would report a slow
  // service as a distant one. Always emitted by this kit (with "too few new
  // connections to judge" while it cannot decide), so it never needs to be in
  // PANEL_EXPECTED_AXES.
  dependencyDistance: "Data distance",
  // 2026-08 serverless limits-and-cost batch. Same reasoning as above: absent
  // on an ordinary server, and absent from PANEL_EXPECTED_AXES so an ordinary
  // server never shows them warming up forever. `kitFootprint` is what BOOSTHIS
  // costs this app — shown on every plan, because a vendor that puts its own
  // honesty behind a paywall has not been honest.
  coldStartCost: "Cold Starts",
  functionCpu: "Computing Time",
  functionLimits: "Platform Limits",
  functionCost: "Function Cost",
  functionKills: "Stopped Runs",
  kitFootprint: "Boosthis Footprint"
};
const PANEL_CORE_AXES = ["responsiveness", "resilience", "budget"];
const PANEL_RATINGS = /* @__PURE__ */ new Set(["good", "needs-work", "poor"]);
const PANEL_CAPTION_MAX = 120;
const PANEL_EXPECTED_AXES = [
  "blockingAsync",
  "threadFootprint",
  // Cross-runtime parity meters that warm up with ordinary traffic, so they
  // show as muted "warming up" rows on a fresh app exactly like the web
  // dashboard. `network` is deliberately ABSENT: an app that makes no outbound
  // calls can be honestly N/A forever, and a permanently-warming row would be a
  // fake meter (same doctrine as containerPressure / cpuThrottling).
  "confidence",
  "baseline",
  "idle",
  "latencyFloor",
  "memoryStability",
  "gcPressure",
  "reliability",
  "crashFree",
  "eventLoopLag",
  "eventLoopUtilization",
  // Break-in pressure / traffic surge — warms on ordinary traffic (10 min +
  // 50 responses), so a warming row is honest on every app.
  "accessPressure",
  "refusalHonesty",
  // Cross-origin answers — counted from the first finished response.
  "corsExposure",
  "heapFragmentation",
  "handleLeak",
  "gcPauseTail",
  "gcGenerationBalance",
  "heapHeadroom",
  // 2026-08 batch — same six the web dashboard expects for a Node project.
  // connectionSetup (needs outbound calls) and workerImbalance (needs a
  // cluster) stay ABSENT here too. startupImport does NOT: see the entry at
  // the end of this list.
  "worstFreeze",
  "backpressure",
  "handleChurn",
  "gcTrend",
  "rejectionPressure",
  "promiseRejections",
  "unhandledErrors",
  "timerHealth",
  "heapWall",
  // 2026-08 batch 2 — the always-on seven warm with ordinary uptime, so a
  // warming row is honest. The env-gated six (event-loop histogram,
  // perf-entry backlog, async diversity, diagnostics) stay ABSENT: without
  // their opt-in flag they can honestly never appear.
  "cpuConsumption",
  "residentGrowth",
  "nativeMemoryMix",
  "uptimeStability",
  "heapSpacePressure",
  "arrayBufferRetention",
  // 2026-08 additive display-only meters that warm with ordinary traffic/logs
  // (5-min minimum window), so a muted "warming up" row is honest — mirroring
  // the swallowedErrors doctrine. Never feed the Speed score.
  "swallowedErrors",
  "leakWatch",
  // startupImport — the ms this app spent loading its own modules. Captured
  // ONCE when telemetry is enabled, from Node's own bootstrap timing
  // (perf_hooks nodeTiming.bootstrapComplete), and frozen. This list used to
  // call it "capture-dependent" and leave it out; that was not true — there is
  // no ordinary Node process without that timing, and the kit puts the reading
  // on the first snapshot of every install. The dashboard's list had it out
  // too, for a DIFFERENT and also-expired reason ("older kits never send it"),
  // so the reading was promised by neither surface while arriving on both. An
  // outside tester found that before we did.
  "startupImport",
  // dependencyDistance — how far this app is from its data, judged on how long
  // a NEW connection takes to open. The kit emits it on every snapshot,
  // including the honest "too few new connections to judge" state a pooled
  // server usually sits in, so a warming row here is honest.
  "dependencyDistance",
  // devPosture — development settings left exposed, read once at startup and
  // frozen. A deterministic one-shot read that every process can take.
  "devPosture",
  // Disk capacity is an immediate read of the volume holding the kit's state,
  // so every process can answer it from its first snapshot.
  "diskPressure",
  // Memory and collection. Every reading here is one this engine can take
  // and that fills with ordinary use, so the panel warms the same rows the
  // web dashboard does for the same app rather than showing fewer meters.
  "gcTax",
  "memoryPerRequest",
  "peakRss"
];
const PANEL_WARMING_CAPTION = "warming up";
function noScoreRating(axis) {
  if (!axis) return "pending";
  const declared = typeof axis.rating === "string" ? axis.rating : "";
  if (declared === "not-scored" || declared === "not-available") {
    return declared;
  }
  if (axis.measurable !== 0) return "pending";
  return typeof axis.reasonCode === "number" ? "not-available" : "pending";
}
const FIRST_REPORT_WAIT_TEXT = `first report arrives in about ${nextSnapshotDelayMs(0) / 1e3} seconds`;
const MEASURING_HERO_TEXT = `measuring — handle a few requests; ${FIRST_REPORT_WAIT_TEXT}`;
const SELF_WORDED_NO_SCORE_AXES = /* @__PURE__ */ new Set([
  "routeFailures"
]);
function withheldBySystem(key, axis) {
  return Object.prototype.hasOwnProperty.call(SYSTEM_LIMITED_READINGS, key) && axis.rating === "not-available";
}
function panelLabel(key) {
  const label = PANEL_AXIS_LABELS[key];
  if (label) return label;
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return words.slice(0, 1).toUpperCase() + words.slice(1);
}
const PANEL_NO_DETAIL_CAPTION = "no detail reported for this reading";
function decidedMsText(ms) {
  if (ms < 1e3) return `${Math.round(ms)}ms`;
  if (ms < 1e4) return `${Math.round(ms / 100) / 10}s`;
  if (ms <= 12e4) return `${Math.round(ms / 1e3)}s`;
  if (ms < 6e5) return `${Math.round(ms / 6e3) / 10} min`;
  return `${Math.round(ms / 6e4)} min`;
}
function decidedNumText(n) {
  return String(Math.round(n * 10) / 10);
}
function panelDecidedLead(key, axis) {
  const code = axis.decidedBy;
  const fig = axis.decidedFigure;
  const poor = axis.decidedPoorAt;
  if (typeof code !== "number" || typeof fig !== "number" || typeof poor !== "number" || !Number.isFinite(fig) || !Number.isFinite(poor) || fig < 0 || poor < 0 || DECIDED_PART_AXIS[code] !== key) {
    return "";
  }
  const ms = decidedMsText;
  const n = decidedNumText;
  const pct = (v) => `${decidedNumText(v)}%`;
  switch (code) {
    case DECIDED_PART.networkLatency:
      return `outside calls p75 ${ms(fig)} (poor at ${ms(poor)})`;
    case DECIDED_PART.networkStalls:
      return `stalled calls ${pct(fig)} (poor at ${pct(poor)})`;
    case DECIDED_PART.mcpLatency:
      return `slowest tool p95 ${ms(fig)} (poor at ${ms(poor)})`;
    case DECIDED_PART.mcpErrors:
      return `tool errors ${pct(fig)} (poor at ${pct(poor)})`;
    case DECIDED_PART.repeatedTime:
      return `time spent repeating ${pct(fig)} (poor at ${pct(poor)})`;
    case DECIDED_PART.repeatedBurst:
      return `worst repeat ${n(fig)}× in one request (poor at ${n(poor)}×)`;
    case DECIDED_PART.dbWait:
      return `database wait ${pct(fig)} of request time (poor at ${pct(poor)})`;
    case DECIDED_PART.dbRepeat:
      return `same statement ${n(fig)}× in one request (poor at ${n(poor)}×)`;
    case DECIDED_PART.rowsWorst:
      return `largest result ${n(fig)} rows (poor at ${n(poor)})`;
    case DECIDED_PART.rowsTypical:
      return `typical result ${n(fig)} rows (poor at ${n(poor)})`;
    case DECIDED_PART.aiFailures:
      return `AI call failures ${pct(fig)} (poor at ${pct(poor)})`;
    case DECIDED_PART.aiFirstWords:
      return `first words p75 ${ms(fig)} (poor at ${ms(poor)})`;
    case DECIDED_PART.headroomRequests:
      return `typical requests left ${pct(fig)} (poor at ${pct(poor)})`;
    case DECIDED_PART.headroomTokens:
      return `typical tokens left ${pct(fig)} (poor at ${pct(poor)})`;
    case DECIDED_PART.jobFailures:
      return `failed runs ${pct(fig)} (poor at ${pct(poor)})`;
    case DECIDED_PART.jobOverlaps:
      return `overlapping runs ${n(fig)} (poor at ${n(poor)})`;
    case DECIDED_PART.jobMissed:
      return `missed runs ${n(fig)} (poor at ${n(poor)})`;
    case DECIDED_PART.jobWait:
      return `queue wait ${ms(fig)} at p95 (poor at ${ms(poor)})`;
    case DECIDED_PART.depWait:
      return `outside-service wait ${pct(fig)} of request time (poor at ${pct(poor)})`;
    case DECIDED_PART.depFailures:
      return `outside-service failures ${pct(fig)} (poor at ${pct(poor)})`;
    default:
      return "";
  }
}
function panelCaption(key, axis) {
  try {
    const cap = axis.caption;
    let out;
    if (typeof cap === "string" && cap.trim()) {
      out = cap;
    } else if (key === "responsiveness" && typeof axis.p75Ms === "number") {
      out = `${panelStoredMsText(axis.p75Ms)} p75`;
      if (typeof axis.count === "number") out += ` · ${axis.count} reqs`;
    } else if (key === "resilience" && typeof axis.sampleCount === "number") {
      const samples = ` · ${axis.sampleCount} samples`;
      if (typeof axis.tailRatio === "number") {
        out = `${axis.tailRatio}× tail${samples}`;
      } else if (typeof axis.score === "number") {
        out = `every request under ${RESILIENCE_TAIL_FLOOR_MS}ms${samples}`;
      } else if (axis.sampleCount >= RESILIENCE_MIN_TAIL_SAMPLES) {
        out = `tail not judged — median under ${RESILIENCE_MIN_MEDIAN_MS}ms${samples}`;
      } else {
        out = `warming up${samples}`;
      }
    } else if (key === "budget" && typeof axis.total === "number") {
      const onBudget = typeof axis.onBudget === "number" ? axis.onBudget : 0;
      out = `${onBudget}/${axis.total} on budget`;
    } else if (key === "baseline" && typeof axis.scoredRoutes === "number") {
      const anoms = typeof axis.anomalyCount === "number" ? axis.anomalyCount : 0;
      const derivation = ` · ${BUDGET_BASELINE_N} post-warm-up vs newest ${BASELINE_RECENT_N} · ${BASELINE_ALGORITHM}`;
      const skipped = typeof axis.unscoredRoutes === "number" ? axis.unscoredRoutes : 0;
      const skippedTail = skipped > 0 ? ` · ${skipped} too fast to compare` : "";
      out = (axis.scoredRoutes === 0 ? `not judged · ${skipped} route${skipped === 1 ? "" : "s"} too fast to compare` : anoms > 0 && typeof axis.worstRatio === "number" ? `worst ${axis.worstRatio}× drift · ${anoms} anomal${anoms === 1 ? "y" : "ies"}${skippedTail}` : `steady · ${axis.scoredRoutes} route${axis.scoredRoutes === 1 ? "" : "s"}${skippedTail}`) + derivation;
    } else if (key === "network" && typeof axis.attemptCount === "number") {
      const stall = typeof axis.stallPct === "number" ? axis.stallPct : 0;
      out = `${stall}% stalled`;
      if (typeof axis.p75Ms === "number") {
        out += ` · p75 ${panelStoredMsText(axis.p75Ms)}`;
      }
    } else if (key === "idle" && typeof axis.idleBusyPct === "number") {
      const stalls = typeof axis.idleLongTaskCount === "number" ? axis.idleLongTaskCount : 0;
      out = `${axis.idleBusyPct}% busy while idle${stalls > 0 ? ` · ${stalls} stalls` : ""}`;
    } else if (key === "latencyFloor" && typeof axis.worstMs === "number") {
      const wins = typeof axis.windowCount === "number" ? axis.windowCount : 0;
      out = `worst window ${panelStoredMsText(axis.worstMs)} · ${wins} windows`;
    } else if (key === "worstFreeze" && typeof axis.worstMs === "number") {
      out = `worst block ${Math.round(axis.worstMs)}ms`;
      if (typeof axis.freezeCount === "number") {
        out += ` · ${axis.freezeCount} block${axis.freezeCount === 1 ? "" : "s"} over ${FREEZE_COUNT_MS}ms`;
        if (typeof axis.freezesPerMin === "number" && typeof axis.windowMin === "number") {
          out += ` · ${axis.freezesPerMin}/min over ${overWords(axis.windowMin)}`;
        }
      }
    } else if (key === "repeatedWork" && typeof axis.worstRepeats === "number") {
      const hits = typeof axis.requestsWithRepeat === "number" ? axis.requestsWithRepeat : 0;
      const seen = typeof axis.watchedRequests === "number" ? axis.watchedRequests : 0;
      const pct = typeof axis.repeatTimePct === "number" ? axis.repeatTimePct : 0;
      out = hits > 0 ? `worst ${axis.worstRepeats}× same call · ${hits}/${seen} requests · ${pct}% of time` : `no repeats · ${seen} request${seen === 1 ? "" : "s"} watched`;
    } else if (key === "upstreamCache" && typeof axis.hitPct === "number") {
      const misses = typeof axis.misses === "number" ? axis.misses : 0;
      const bypass = typeof axis.bypass === "number" ? axis.bypass : 0;
      const bypassNote = bypass > 0 ? ` · ${bypass} never cacheable` : "";
      out = `${axis.hitPct}% served from cache · ${misses} fetched fresh${bypassNote}`;
    } else if (key === "dbWork") {
      const blind = typeof axis.unwatchedClients === "number" ? axis.unwatchedClients : 0;
      const blindNote = blind > 0 ? ` · ${blind} database librar${blind === 1 ? "y" : "ies"} this kit cannot watch` : "";
      if (axis.measurable === 0 || typeof axis.waitPct !== "number") {
        out = `cannot tell yet${blindNote}`;
      } else {
        const seen = typeof axis.watchedRequests === "number" ? axis.watchedRequests : 0;
        const worst = typeof axis.repeatWorst === "number" ? axis.repeatWorst : 1;
        const waste = typeof axis.repeatWastePct === "number" ? axis.repeatWastePct : 0;
        out = `${axis.waitPct}% of request time waiting on the database · ${seen} request${seen === 1 ? "" : "s"} watched`;
        if (worst > 1) {
          out += ` · worst ${worst}× same query (${waste}% wasted)`;
        }
        out += blindNote;
      }
    } else if (key === "dbSequencing") {
      const blind = typeof axis.unwatchedClients === "number" ? axis.unwatchedClients : 0;
      const blindNote = blind > 0 ? ` · ${blind} database librar${blind === 1 ? "y" : "ies"} this kit cannot watch` : "";
      if (axis.measurable === 0 || typeof axis.wavesWorst !== "number") {
        out = `cannot tell yet${blindNote}`;
      } else {
        const seen = typeof axis.watchedRequests === "number" ? axis.watchedRequests : 0;
        const series = typeof axis.seriesPct === "number" ? axis.seriesPct : 100;
        const worst = axis.wavesWorst;
        out = worst > 1 ? `worst request: ${worst} round trips in a row · ${series}% of database time in single file` : "nothing ran in single file";
        out += ` · ${seen} request${seen === 1 ? "" : "s"} watched${blindNote}`;
      }
    } else if (key === "dbRowVolume") {
      const blind = typeof axis.unwatchedClients === "number" ? axis.unwatchedClients : 0;
      const blindNote = blind > 0 ? ` · ${blind} database librar${blind === 1 ? "y" : "ies"} this kit cannot watch` : "";
      if (axis.measurable === 0 || typeof axis.worstRows !== "number") {
        out = `cannot tell yet${blindNote}`;
      } else {
        const avg = typeof axis.rowsAvg === "number" ? axis.rowsAvg : 0;
        const sized = typeof axis.sizedCalls === "number" ? axis.sizedCalls : 0;
        out = `worst query returned ${axis.worstRows} rows · ${avg} on the typical read · ${sized} read${sized === 1 ? "" : "s"} sized${blindNote}`;
      }
    } else if (key === "dbPoolPressure") {
      const busy = typeof axis.busy === "number" ? axis.busy : 0;
      const size = typeof axis.size === "number" ? axis.size : 0;
      const waiting = typeof axis.waiting === "number" ? axis.waiting : 0;
      out = `${axis.usedPct}% used · ${busy}/${size} connections busy`;
      if (waiting > 0) {
        out += ` · ${waiting} waiting`;
      }
    } else if (key === "aiCalls") {
      const num = (k) => typeof axis[k] === "number" ? axis[k] : 0;
      const blind = num("unwatchedClients");
      const blindNote = blind > 0 ? ` · ${blind} HTTP client${blind === 1 ? "" : "s"} this kit cannot watch` : "";
      if (axis.measurable === 0 || typeof axis.waitPct !== "number") {
        out = `cannot tell yet${blindNote}`;
      } else {
        const calls = num("callCount");
        out = `${axis.waitPct}% of request time waiting on AI · ${calls} call${calls === 1 ? "" : "s"}`;
        const streams = num("streamCount");
        if (streams > 0 && num("ttftP75Ms") > 0) {
          out += ` · first words in ${Math.round(num("ttftP75Ms") / 100) / 10}s`;
        }
        const stalls = num("stallCount");
        if (stalls > 0) out += ` · ${stalls} stalled mid-answer`;
        const fails = num("failCount");
        if (fails > 0) out += ` · ${fails} delivered nothing`;
        out += blindNote;
      }
    } else if (key === "aiSpend") {
      const num = (k) => typeof axis[k] === "number" ? axis[k] : 0;
      const cost = num("costMicros");
      const parts = [
        `${num("tokensIn")} in / ${num("tokensOut")} out`
      ];
      parts.push(
        typeof axis.cacheHitPct === "number" ? `${axis.cacheHitPct}% from the provider's cache` : "cache use unknown"
      );
      if (cost > 0) {
        parts.push(`about $${(cost / 1e6).toFixed(4)} so far`);
      }
      const unpriced = num("unpricedCalls");
      const declaredUnpriced = Math.min(unpriced, num("declaredUnpricedCalls"));
      const cannotPrice = unpriced - declaredUnpriced;
      if (cannotPrice > 0) {
        parts.push(
          `${cannotPrice} call${cannotPrice === 1 ? "" : "s"} we cannot price`
        );
      }
      if (declaredUnpriced > 0) {
        parts.push(
          `${declaredUnpriced} call${declaredUnpriced === 1 ? "" : "s"} to an endpoint you host — not priced`
        );
      }
      const missing = num("streamUsageMissingCalls");
      if (missing > 0) {
        parts.push(
          `${missing} streamed answer${missing === 1 ? "" : "s"} did not ask for its own usage`
        );
      }
      const repeat = typeof axis.repeatWorst === "number" ? axis.repeatWorst : 1;
      if (repeat > 1)
        parts.push(`worst ${repeat}× same prompt in one request`);
      out = parts.join(" · ");
    } else if (key === "aiHeadroom") {
      const num = (k) => typeof axis[k] === "number" ? axis[k] : 0;
      const refusals = num("refusals");
      if (axis.measurable === 0) {
        out = refusals > 0 ? `${refusals} refused for rate limit · provider published no headroom` : "provider published no headroom";
      } else {
        out = `${num("worstRequestsPct")}% of requests left · ${num("worstTokensPct")}% of tokens left`;
        if (refusals > 0) out += ` · ${refusals} refused`;
      }
    } else if (key === "routeFailures") {
      const observed = typeof axis.observed === "number" ? axis.observed : 0;
      const failed = typeof axis.failed === "number" ? axis.failed : 0;
      const untracked = typeof axis.untracked === "number" ? axis.untracked : 0;
      const over = untracked > 0 ? ` · ${untracked} over the cap` : "";
      if (observed === 0) {
        out = `no answers counted yet${over}`;
      } else {
        out = failed === 0 ? `none of ${observed} answers failed${over}` : `${failed} of ${observed} answers failed${over}`;
      }
    } else if (key === "backgroundWork") {
      const blind = typeof axis.unattachedSystems === "number" ? axis.unattachedSystems : 0;
      const blindNote = blind > 0 ? ` · ${blind} job system${blind === 1 ? "" : "s"} this kit cannot watch` : "";
      const runs = typeof axis.runs === "number" ? axis.runs : 0;
      if (axis.measurable === 0) {
        out = runs > 0 ? `cannot tell yet · ${runs} job run${runs === 1 ? "" : "s"} so far${blindNote}` : `cannot tell yet${blindNote}`;
      } else {
        const failed = typeof axis.failed === "number" ? axis.failed : 0;
        const names = typeof axis.jobNames === "number" ? axis.jobNames : 0;
        out = `${runs} job run${runs === 1 ? "" : "s"} · ${names} job${names === 1 ? "" : "s"}`;
        out += failed > 0 ? ` · ${failed} failed` : " · none failed";
        if (typeof axis.missed === "number" && axis.missed > 0) {
          out += ` · ${axis.missed} run${axis.missed === 1 ? "" : "s"} never happened`;
        }
        if (typeof axis.overlaps === "number" && axis.overlaps > 0) {
          out += ` · ${axis.overlaps} overlapped`;
        }
        if (typeof axis.waitP95Ms === "number") {
          out += ` · waited ${axis.waitP95Ms}ms before starting`;
        }
        out += blindNote;
      }
    } else if (key === "dependencyDistance") {
      const num = (k) => typeof axis[k] === "number" ? axis[k] : 0;
      if (axis.measurable === 0) {
        const seen = num("newConnections");
        const need = num("minConnections");
        out = `too few new connections to judge · ${seen} of ${need}`;
      } else {
        const setup = num("worstSetupMs");
        out = `furthest dependency ${setup < 10 ? setup : Math.round(setup)}ms away`;
        if (typeof axis.worstSharePct === "number") {
          out += ` · ${axis.worstSharePct}% of a typical request`;
        }
        out += ` · ${num("newConnections")} new connection${num("newConnections") === 1 ? "" : "s"}`;
        if (typeof axis.unjudgedWorstSetupMs === "number") {
          out += ` · a slower one (${Math.round(axis.unjudgedWorstSetupMs)}ms) had too few connections to judge`;
        }
      }
    } else if (key === "patchLag" && typeof axis.buildAgeMs === "number") {
      const days = Math.round(axis.buildAgeMs / 864e5);
      out = `build ~${days}d old`;
    } else if (key === "coldStartCost" && typeof axis.setupSharePct === "number") {
      out = `${axis.setupSharePct}% of this container's life was setup`;
      if (typeof axis.initMs === "number") out += ` · ${axis.initMs}ms init`;
      if (typeof axis.coldPenaltyMs === "number") {
        out += ` · first run ${axis.coldPenaltyMs}ms slower than a warm one`;
      }
    } else if (key === "startupImport" && typeof axis.importMs === "number") {
      out = `${axis.importMs}ms loading modules before this kit started`;
      if (typeof axis.bootMs === "number" && axis.bootMs > 0) {
        out += ` · ${axis.bootMs}ms from process start`;
      }
    } else if (key === "connectionSetup" && typeof axis.reconnectPct === "number" && typeof axis.attemptCount === "number") {
      out = `${axis.reconnectPct}% of ${axis.attemptCount} outbound call${axis.attemptCount === 1 ? "" : "s"} opened a new connection`;
    } else {
      out = PANEL_NO_DETAIL_CAPTION;
    }
    const lead = panelDecidedLead(key, axis);
    if (lead) {
      out = out === PANEL_NO_DETAIL_CAPTION || !out ? lead : `${lead} · ${out}`;
    }
    if (typeof axis.suspendDiscounts === "number" && axis.suspendDiscounts > 0) {
      out += ` · host-suspend gaps discounted (${axis.suspendDiscounts})`;
    }
    out = String(out).split("").filter((ch) => ch >= " ").join("");
    return out.slice(0, PANEL_CAPTION_MAX);
  } catch {
    return "";
  }
}
function computePanel() {
  const pulse = computePulse();
  const rows = [];
  let axes = {};
  try {
    axes = capturePerfSnapshot().axes;
  } catch {
    axes = {};
  }
  try {
    const ordered = [
      ...PANEL_CORE_AXES,
      ...Object.keys(axes).filter(
        (k) => !PANEL_CORE_AXES.includes(k)
      )
    ];
    for (const key of ordered) {
      const raw = axes[key];
      const axis = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
      if (!axis || typeof axis.score !== "number") {
        if (axis && (SELF_WORDED_NO_SCORE_AXES.has(key) || withheldBySystem(key, axis))) {
          rows.push({
            key,
            label: panelLabel(key),
            score: null,
            rating: noScoreRating(axis),
            caption: panelCaption(key, axis).slice(0, PANEL_CAPTION_MAX)
          });
          continue;
        }
        if (PANEL_CORE_AXES.includes(key)) {
          rows.push({
            key,
            label: panelLabel(key),
            score: null,
            // WHICH silence this is, not just "no score yet": a reading that
            // declared itself never-graded, or unreadable on this host, said so
            // on the axis, and hardcoding "pending" threw that word away.
            rating: noScoreRating(axis),
            caption: "measuring…"
          });
        }
        continue;
      }
      const score = Math.max(0, Math.min(100, Math.round(axis.score)));
      let rating = typeof axis.rating === "string" ? axis.rating : void 0;
      if (!rating || !PANEL_RATINGS.has(rating)) rating = ratingForScore(score);
      rows.push({
        key: String(key).slice(0, 40),
        label: panelLabel(String(key)),
        score,
        rating,
        caption: panelCaption(String(key), axis)
      });
    }
  } catch {
    rows.length = 0;
  }
  try {
    const level = typeof axes.confidence === "string" ? axes.confidence : "none";
    const capt = typeof axes.confidenceCaption === "string" ? axes.confidenceCaption : "no samples yet";
    if (level !== "none") {
      const mounts = typeof axes.confidenceMounts === "number" ? axes.confidenceMounts : 0;
      rows.push({
        key: "confidence",
        label: panelLabel("confidence"),
        score: null,
        rating: "not-scored",
        // NAME THE QUANTITY. `mounts` is the sample count of the
        // LEAST-sampled scored route, never the number of requests this kit
        // captured. A bare "10 samples" printed under a headline of "429
        // requests measured" reads as "10 of your 429 were measured", which
        // is a different, wrong, and alarming fact.
        caption: `${capt}${mounts > 0 ? ` · ${mounts} samples on the least-sampled route` : ""}`.slice(
          0,
          PANEL_CAPTION_MAX
        )
      });
    }
  } catch {
  }
  try {
    const seen = new Set(rows.map((r) => r.key));
    for (const key of PANEL_EXPECTED_AXES) {
      if (seen.has(key)) continue;
      const warming = key === "leakWatch" || key === "swallowedErrors" ? "warming up · 5 min minimum window" : key === "accessPressure" ? "warming up · needs 10 min + 50 responses" : key === "refusalHonesty" ? "warming up · 10 min minimum window" : key === "corsExposure" ? "warming up · needs one finished response" : PANEL_WARMING_CAPTION;
      const raw = axes[key];
      const present = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
      const own = present?.caption;
      const abstains = key === "baseline" && !!present && present.measurable === 0;
      const caption = abstains ? panelCaption(key, present).slice(0, PANEL_CAPTION_MAX) : typeof own === "string" && own.trim() ? own.slice(0, PANEL_CAPTION_MAX) : warming;
      const rating = noScoreRating(present);
      rows.push({
        key,
        label: panelLabel(key),
        score: null,
        rating,
        caption
      });
    }
  } catch {
  }
  const projectKey = getPanelProjectKey();
  const projectKeyPayload = {
    display: projectKey.display,
    source: describeProjectKeySource(projectKey.source)
  };
  const notice = computePanelNotice();
  const drops = computePanelDrops();
  const undelivered = computePanelUndelivered();
  let project = PROJECT_UNKNOWN_TEXT;
  try {
    project = projectDisplay(getKitProject());
  } catch {
  }
  let installId = null;
  try {
    installId = getPanelInstallId();
  } catch {
  }
  let promises;
  try {
    const held = getKitPromises();
    if (held.items.length > 0) promises = held;
  } catch {
  }
  const base = notice ? {
    ...pulse,
    axes: rows,
    projectKey: projectKeyPayload,
    project,
    installId,
    // WHERE JOBS LIVE — always sent, so the page can say jobs are not
    // shown there whether or not this app has any.
    jobs: PANEL_JOBS,
    notice
  } : {
    ...pulse,
    axes: rows,
    projectKey: projectKeyPayload,
    project,
    installId,
    jobs: PANEL_JOBS
  };
  const withDrops = drops ? { ...base, drops } : base;
  const withUndelivered = undelivered ? { ...withDrops, undelivered } : withDrops;
  return promises ? { ...withUndelivered, promises } : withUndelivered;
}
const DISSOLVED_TITLE = "Boosthis has stopped for this project";
const DISSOLVED_SENTENCE = "Boosthis erased what it kept on this machine and stopped. It did not ask our server to delete anything, and it asks again once when this app restarts.";
const LOCKED_TITLE = "Boosthis is locked for this project";
const LOCKED_SENTENCE = "Nothing is being measured or sent from this app. The project's owner can see why on the Boosthis dashboard, and this app checks again by itself.";
function renewNotice() {
  try {
    const detail = getEntitlementMessage();
    if (getEntitlementGateKind() === "dissolved") {
      return {
        title: DISSOLVED_TITLE,
        body: detail ? `${detail} ${DISSOLVED_SENTENCE}` : DISSOLVED_SENTENCE
      };
    }
    const lock = computePanelLock();
    if (lock && lock.kind !== "hidden" && lock.title !== "") {
      return { title: lock.title, body: lock.body };
    }
    return { title: LOCKED_TITLE, body: detail ? `${detail} ${LOCKED_SENTENCE}` : LOCKED_SENTENCE };
  } catch {
    return { title: LOCKED_TITLE, body: "" };
  }
}
function computePanelLock() {
  try {
    const gate = getEntitlementGateKind();
    if (gate === "none") return null;
    if (gate === "unregistered") return null;
    if (gate === "hidden") {
      return { kind: "hidden", title: "", body: "" };
    }
    if (gate === "dissolved") {
      const notice = renewNotice();
      return { kind: "dissolved", title: notice.title, body: notice.body };
    }
    const detail = getEntitlementMessage();
    if (gate === "revoked") {
      return {
        kind: "revoked",
        title: "Access revoked",
        body: "This project's Boosthis access was revoked by the account owner. Contact the owner if you think this is a mistake."
      };
    }
    if (gate === "unpaid") {
      return {
        kind: "unpaid",
        title: "Payment required",
        body: "The Boosthis subscription for this account is unpaid. Ask the account owner to renew it at boosthis.com to restore access."
      };
    }
    return {
      kind: "paused",
      title: "Boosthis is paused",
      body: detail ?? "The owner has paused this app from the Boosthis dashboard. Nothing was deleted — press Reconnect there to resume."
    };
  } catch {
    return null;
  }
}
const OWNER_SWITCH_PARAM = "boosthis";
const OWNER_GATE_JS = "var OWNER_ON=false;try{OWNER_ON=(' '+document.cookie+';').indexOf(' boosthis_owner=1;')>=0;}catch(e){}try{window.localStorage.removeItem('boosthis:bubble-owner-device:v1');}catch(e){}if(!OWNER_ON)return;";
function bubbleSnippet(pulsePath = PULSE_PATH, panelPath) {
  const resolvedPanel = panelPath ?? (pulsePath.endsWith(PULSE_SUFFIX) ? pulsePath.slice(0, pulsePath.length - PULSE_SUFFIX.length) + PANEL_SUFFIX : pulsePath);
  const resolvedAccount = resolvedPanel.endsWith(PANEL_SUFFIX) ? resolvedPanel.slice(0, resolvedPanel.length - PANEL_SUFFIX.length) + ACCOUNT_SUFFIX : null;
  const safePanel = resolvedPanel.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeAccount = resolvedAccount === null ? null : resolvedAccount.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeTermsVersion = TERMS_VERSION_LITERAL.replace(/\\/g, "\\\\").replace(
    /"/g,
    '\\"'
  );
  return "\n<script>(function(){try{if(window.__boosthisBubble)return;window.__boosthisBubble=1;" + // The owner gate: the bubble draws only in a browser carrying the kit's owner marker cookie.
  OWNER_GATE_JS + // ---- Terms gate state (port of the RN kit's BoosthisTermsGate) ----
  // The panel opens to a GATE on first ever open (connect card + terms box +
  // checkbox + Agree/Decline); after a one-time accept it opens straight to
  // the dashboard forever, until TERMS_VERSION changes. Display + localStorage
  // only — no new endpoints, no new data collection.
  'var TERMS_VERSION="' + safeTermsVersion + '";var TERMS_KEY="boosthis:terms-accepted:v1";var ACCEPTED_MEM=false;var LINKED=false;function termsRead(){try{var raw=window.localStorage&&window.localStorage.getItem(TERMS_KEY);if(!raw)return null;var p=JSON.parse(raw);if(p&&typeof p.version==="string")return p;return null;}catch(e){return null;}}function termsAccepted(){try{if(ACCEPTED_MEM)return true;var p=termsRead();if(!p||p.version!==TERMS_VERSION)return false;var iid=(typeof ACTX!=="undefined"&&ACTX&&typeof ACTX.installId==="string")?ACTX.installId:null;if(iid===null)return true;return (p.installId||null)===iid;}catch(e){return ACCEPTED_MEM;}}function termsWrite(){try{ACCEPTED_MEM=true;var iid=(typeof ACTX!=="undefined"&&ACTX&&typeof ACTX.installId==="string")?ACTX.installId:null;if(window.localStorage)window.localStorage.setItem(TERMS_KEY,JSON.stringify({version:TERMS_VERSION,at:Date.now(),installId:iid}));}catch(e){}}function termsClear(){try{ACCEPTED_MEM=false;if(window.localStorage)window.localStorage.removeItem(TERMS_KEY);}catch(e){}}var host=document.createElement("div");host.style.cssText="position:fixed;bottom:18px;right:18px;z-index:2147483000;";var root=host.attachShadow?host.attachShadow({mode:"closed"}):host;var T={bg:"#0b0c10",card:"#15171c",br:"#262932",fg:"#e6e7eb",mut:"#8b8f99",pri:"#f97316"};var COLORS={good:"#4ade80","needs-work":"#fbbf24",poor:"#f87171"};var RL={good:"GOOD","needs-work":"NEEDS WORK",poor:"POOR"};var btn=document.createElement("button");btn.type="button";btn.setAttribute("aria-label","Boosthis performance bubble");btn.style.cssText="width:48px;height:48px;border-radius:50%;background:"+T.bg+";border:2.5px solid "+T.mut+";color:"+T.pri+";font-size:22px;line-height:1;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:0;font-family:system-ui,sans-serif;";var bImg=document.createElement("img");bImg.src=' + JSON.stringify(BOOSTHIS_ICON_URI) + ';bImg.alt="";bImg.draggable=false;bImg.style.cssText="width:34px;height:34px;border-radius:50%;pointer-events:none;display:block;";btn.appendChild(bImg);var panel=document.createElement("div");panel.setAttribute("role","dialog");panel.setAttribute("aria-label","Boosthis dashboard");panel.style.cssText="display:none;position:absolute;bottom:56px;right:0;width:300px;max-width:calc(100vw - 36px);max-height:72vh;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:"+T.mut+" transparent;background:"+T.bg+";background:linear-gradient("+T.bg+" 50%,rgba(0,0,0,0)) top/100% 20px no-repeat local,linear-gradient(rgba(0,0,0,0),"+T.bg+" 50%) bottom/100% 20px no-repeat local,radial-gradient(farthest-side at 50% 0,rgba(0,0,0,.6),rgba(0,0,0,0)) top/100% 10px no-repeat scroll,radial-gradient(farthest-side at 50% 100%,rgba(0,0,0,.6),rgba(0,0,0,0)) bottom/100% 10px no-repeat scroll,"+T.bg+";color:"+T.fg+";border:1px solid "+T.br+";border-radius:20px;padding:12px;font:12px/1.5 system-ui,sans-serif;box-shadow:0 10px 28px rgba(0,0,0,.5);text-align:left;";var lockEl=document.createElement("div");lockEl.setAttribute("role","alertdialog");lockEl.setAttribute("aria-label","Boosthis locked");lockEl.style.cssText="display:none;position:absolute;top:0;left:0;right:0;bottom:0;z-index:10;box-sizing:border-box;border-radius:20px;padding:32px 22px;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:rgba(11,12,16,.92);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);";var lockTitle=document.createElement("div");lockTitle.style.cssText="font-size:17px;font-weight:700;color:"+T.fg+";margin-bottom:8px;";var lockBody=document.createElement("div");lockBody.style.cssText="font-size:13px;line-height:1.5;color:"+T.mut+";max-width:240px;";lockEl.appendChild(lockTitle);lockEl.appendChild(lockBody);function showLock(lock){try{lockTitle.textContent=String(lock&&lock.title||"Boosthis is locked");lockBody.textContent=String(lock&&lock.body||"");lockEl.style.display="flex";panel.style.overflow="hidden";}catch(e){}}function hideLock(){try{lockEl.style.display="none";panel.style.overflow="auto";}catch(e){}}function card(){var c=document.createElement("div");c.style.cssText="background:"+T.card+";border:1px solid "+T.br+";border-radius:16px;padding:12px 14px;margin-bottom:10px;";return c;}function cardTitle(tx){var d=document.createElement("div");d.style.cssText="font-size:13px;font-weight:700;color:"+T.fg+";";d.textContent=tx;return d;}function cardSub(tx){var d=document.createElement("div");d.style.cssText="font-size:10.5px;color:"+T.mut+";margin-top:1px;margin-bottom:2px;";d.textContent=tx;return d;}var hero=card();var hName=document.createElement("div");hName.style.cssText="font-size:16px;font-weight:800;color:"+T.fg+";";hName.textContent="Boosthis";var hSub=document.createElement("div");hSub.style.cssText="font-size:11px;color:"+T.mut+";";hSub.textContent="' + RUNTIME_PANEL_SUBTITLE + '";var hProj=document.createElement("div");hProj.style.cssText="font-size:11px;color:"+T.mut+";margin-top:3px;word-break:break-word;";hProj.textContent="' + PROJECT_LABEL + ": " + PROJECT_UNKNOWN_TEXT + '";var hInst=document.createElement("div");hInst.style.cssText="font-size:11px;color:"+T.mut+";margin-top:2px;word-break:break-all;";hInst.textContent="' + INSTALL_ID_LABEL + ": " + INSTALL_ID_UNKNOWN_TEXT + '";var gw=document.createElement("div");gw.style.cssText="text-align:center;padding:10px 0 2px;";var num=document.createElement("div");num.style.cssText="font-size:46px;font-weight:800;line-height:1;letter-spacing:-1px;color:"+T.fg+";";num.textContent="\\u2013";var of=document.createElement("div");of.style.cssText="font-size:11px;color:"+T.mut+";margin-top:2px;";of.textContent="/ 100";var badge=document.createElement("div");badge.style.cssText="display:inline-flex;align-items:center;gap:5px;margin-top:8px;padding:3px 12px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:.6px;background:"+T.br+";color:"+T.mut+";border:1px solid "+T.br+";";var bDot=document.createElement("span");bDot.style.cssText="width:6px;height:6px;border-radius:50%;background:"+T.mut+";";var bTxt=document.createElement("span");bTxt.textContent="MEASURING";badge.appendChild(bDot);badge.appendChild(bTxt);var stat=document.createElement("div");stat.style.cssText="text-align:center;margin-top:7px;font-size:10.5px;color:"+T.mut+";";stat.textContent="' + MEASURING_HERO_TEXT + '";var hCap=document.createElement("div");hCap.style.cssText="text-align:center;margin-top:5px;font-size:10px;line-height:1.4;color:"+T.mut+";";hCap.textContent="' + SCORE_CAPTION + '";gw.appendChild(num);gw.appendChild(of);hero.appendChild(hName);hero.appendChild(hSub);hero.appendChild(hProj);hero.appendChild(hInst);hero.appendChild(gw);var bWrap=document.createElement("div");bWrap.style.cssText="text-align:center;";bWrap.appendChild(badge);hero.appendChild(bWrap);hero.appendChild(stat);hero.appendChild(hCap);var bd=card();bd.appendChild(cardTitle("Score breakdown"));bd.appendChild(cardSub("this process \\u00b7 lower is better"));var bdRows=document.createElement("div");bd.appendChild(bdRows);var formula=document.createElement("div");formula.style.cssText="font-size:10px;color:"+T.mut+";margin-top:8px;";formula.textContent="score = p95 vs TTI budget \\u00b7 good\\u226585 \\u00b7 needs-work\\u226560";bd.appendChild(formula);var hl=card();hl.appendChild(cardTitle("Runtime health"));hl.appendChild(cardSub("environment meters \\u00b7 shown when measurable"));var hlRows=document.createElement("div");hl.appendChild(hlRows);var lg=card();lg.style.cssText+="display:flex;flex-wrap:wrap;gap:6px 12px;font-size:10.5px;color:"+T.mut+";";function lgItem(color,tx){var s=document.createElement("span");s.style.cssText="display:inline-flex;align-items:center;gap:5px;";var d=document.createElement("span");d.style.cssText="width:7px;height:7px;border-radius:50%;background:"+color+";";var t=document.createElement("span");t.textContent=tx;s.appendChild(d);s.appendChild(t);return s;}lg.appendChild(lgItem(COLORS.good,"Good \\u226585"));lg.appendChild(lgItem(COLORS["needs-work"],"Needs work \\u226560"));lg.appendChild(lgItem(COLORS.poor,"Poor <60"));var acct=card();var acctBody=document.createElement("div");acct.appendChild(acctBody);var ACTX={endpoint:null,installId:null,deleteToken:null,available:false,fullTelemetry:false};var SESS=null;var TELE_ON=false;var TELE_KNOWN=false;var TELE_BUSY=false;var CLAIM_MSG=null;var CLAIM_MSG_OK=false;var ACCT_LINK_PROOF_MSG="Couldn\\u2019t link this project. Linking needs either this project\\u2019s own connection credential (available in the session where it registered) or an account that owns this project\\u2019s project key \\u2014 sign in with that account, or link it from your dashboard.";var CLAIM_BUSY=false;var AUTO_CLAIM_FOR=null;var acctView={kind:"signed-out"};var acctBusy=false;function acctJoin(ep,p){return String(ep).replace(/\\/+$/,"")+p;}function acctMkInput(type,ph,ac){var i=document.createElement("input");i.type=type;i.placeholder=ph;if(ac)i.setAttribute("autocomplete",ac);i.style.cssText="width:100%;box-sizing:border-box;margin-bottom:8px;padding:8px 10px;font-size:12.5px;background:"+T.bg+";color:"+T.fg+";border:1px solid "+T.br+";border-radius:8px;outline:none;font-family:inherit;";return i;}function acctMkBtn(tx){var b=document.createElement("button");b.type="button";b.textContent=tx;b.style.cssText="width:100%;padding:9px 10px;font-size:12.5px;font-weight:700;background:"+T.pri+";color:"+T.bg+";border:none;border-radius:8px;cursor:pointer;font-family:inherit;";return b;}function acctMkGhost(tx){var b=acctMkBtn(tx);b.style.background="transparent";b.style.color=T.mut;b.style.border="1px solid "+T.br;b.style.marginTop="8px";return b;}function acctMkMsg(){var d=document.createElement("div");d.style.cssText="margin-top:8px;font-size:10.5px;line-height:1.5;color:"+T.mut+";";return d;}function acctSetMsg(el,tx,color){try{el.textContent=tx;el.style.color=color||T.mut;}catch(e){}}function acctFetch(url,init){return fetch(url,init).then(function(r){return r;});}function acctRender(){try{while(acctBody.firstChild)acctBody.removeChild(acctBody.firstChild);var title=document.createElement("div");title.style.cssText="font-size:13px;font-weight:700;color:"+T.fg+";";title.textContent="Connect to your account";acctBody.appendChild(title);if(!ACTX.available||!ACTX.endpoint){var s=document.createElement("div");s.style.cssText="font-size:10.5px;color:"+T.mut+";margin-top:6px;line-height:1.5;";s.textContent="Sign-in is available when this page is opened on the dev machine.";acctBody.appendChild(s);return;}if(acctView.kind==="signed-in"){acctRenderSignedIn();return;}if(acctView.kind==="otp"){acctRenderOtp();return;}acctRenderSignedOut();}catch(e){}}function acctRenderSignedOut(){var s=document.createElement("div");s.style.cssText="font-size:10.5px;color:"+T.mut+";margin:6px 0 10px;line-height:1.5;";s.textContent="Sign in with your Boosthis dashboard account to link this project directly \\u2014 no project-key matching needed.";acctBody.appendChild(s);var email=acctMkInput("email","Email","username");acctBody.appendChild(email);var pw=acctMkInput("password","Password","current-password");acctBody.appendChild(pw);var btn=acctMkBtn("Sign in");acctBody.appendChild(btn);var msg=acctMkMsg();acctBody.appendChild(msg);btn.addEventListener("click",function(){try{if(acctBusy)return;var em=(email.value||"").trim();var pass=pw.value||"";if(!em||!pass){acctSetMsg(msg,"Enter your email and password.",COLORS.poor);return;}acctBusy=true;btn.disabled=true;btn.textContent="Signing in\\u2026";acctSetMsg(msg,"",T.mut);acctFetch(acctJoin(ACTX.endpoint,"/auth/login"),{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({email:em,password:pass})}).then(function(r){pw.value="";if(r.status===401){throw "Wrong email or password.";}if(r.status===429){throw "Too many attempts. Try again later.";}if(!r.ok){throw "Login failed. Please try again.";}return r.json();}).then(function(b){if(b&&b.otpRequired===true&&typeof b.challengeToken==="string"){acctView={kind:"otp",challengeToken:b.challengeToken,email:em};acctRender();return;}var tok=b&&typeof b.token==="string"?b.token:null;var ae=b&&b.account&&typeof b.account.email==="string"?b.account.email:em;if(!tok){throw "Login failed. Please try again.";}SESS={token:tok,email:ae};acctView={kind:"signed-in"};acctRender();}).catch(function(err){acctBusy=false;try{btn.disabled=false;btn.textContent="Sign in";}catch(e){}acctSetMsg(msg,typeof err==="string"?err:"Something went wrong. Please try again.",COLORS.poor);return;}).then(function(){acctBusy=false;});}catch(e){acctBusy=false;}});}function acctRenderOtp(){var s=document.createElement("div");s.style.cssText="font-size:10.5px;color:"+T.mut+";margin:6px 0 10px;line-height:1.5;";s.textContent="We emailed a 6-digit code to "+acctView.email+". Enter it below to finish signing in.";acctBody.appendChild(s);var code=acctMkInput("text","6-digit code","one-time-code");code.inputMode="numeric";acctBody.appendChild(code);var btn=acctMkBtn("Verify");acctBody.appendChild(btn);var resend=acctMkGhost("Resend code");acctBody.appendChild(resend);var msg=acctMkMsg();acctBody.appendChild(msg);btn.addEventListener("click",function(){try{if(acctBusy)return;var cv=(code.value||"").trim();if(!cv){acctSetMsg(msg,"Enter the code from your email.",COLORS.poor);return;}acctBusy=true;btn.disabled=true;btn.textContent="Verifying\\u2026";acctSetMsg(msg,"",T.mut);acctFetch(acctJoin(ACTX.endpoint,"/auth/login/otp"),{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({challengeToken:acctView.challengeToken,code:cv})}).then(function(r){if(r.status===401){throw "That code isn\\u2019t right. Check the newest email we sent and try again.";}if(r.status===400){acctView={kind:"signed-out"};acctRender();throw "__handled__";}if(r.status===429){throw "Too many attempts. Try again later.";}if(!r.ok){throw "Couldn\\u2019t verify the code. Please try again.";}return r.json();}).then(function(b){var tok=b&&typeof b.token==="string"?b.token:null;var ae=b&&b.account&&typeof b.account.email==="string"?b.account.email:acctView.email;if(!tok){throw "Couldn\\u2019t verify the code. Please try again.";}SESS={token:tok,email:ae};acctView={kind:"signed-in"};acctRender();}).catch(function(err){acctBusy=false;if(err==="__handled__")return;try{btn.disabled=false;btn.textContent="Verify";}catch(e){}acctSetMsg(msg,typeof err==="string"?err:"Something went wrong. Please try again.",COLORS.poor);}).then(function(){acctBusy=false;});}catch(e){acctBusy=false;}});resend.addEventListener("click",function(){try{if(acctBusy)return;acctBusy=true;resend.disabled=true;acctSetMsg(msg,"",T.mut);acctFetch(acctJoin(ACTX.endpoint,"/auth/login/otp/resend"),{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({challengeToken:acctView.challengeToken})}).then(function(r){if(r.ok){acctSetMsg(msg,"A new code is on its way.",COLORS.good);return;}if(r.status===400){acctView={kind:"signed-out"};acctRender();return;}if(r.status===429){throw "Too many resend requests. Please wait a moment.";}if(r.status===502){throw "We couldn\\u2019t send a new code right now. Try again in a few minutes.";}throw "Couldn\\u2019t resend the code. Please try again.";}).catch(function(err){if(typeof err==="string")acctSetMsg(msg,err,COLORS.poor);}).then(function(){acctBusy=false;try{resend.disabled=false;}catch(e){}});}catch(e){acctBusy=false;}});}function acctRenderSignedIn(){var who=document.createElement("div");who.style.cssText="font-size:12.5px;color:"+T.fg+";font-weight:600;";who.textContent="Signed in as "+(SESS?SESS.email:"");acctBody.appendChild(who);var msg=acctMkMsg();var canClaim=!!ACTX.installId;if(canClaim){var cs=document.createElement("div");cs.style.cssText="font-size:10.5px;color:"+T.mut+";margin:8px 0 10px;line-height:1.5;";cs.textContent="Link this project to your account so it appears in your dashboard.";acctBody.appendChild(cs);var claim=acctMkBtn(LINKED?"Linked":(CLAIM_BUSY?"Linking\\u2026":"Link this project"));claim.disabled=LINKED||CLAIM_BUSY;acctBody.appendChild(claim);acctBody.appendChild(msg);if(CLAIM_MSG)acctSetMsg(msg,CLAIM_MSG,CLAIM_MSG_OK?COLORS.good:COLORS.poor);claim.addEventListener("click",function(){try{if(acctBusy||CLAIM_BUSY||LINKED)return;acctBusy=true;claim.disabled=true;claim.textContent="Linking\\u2026";acctSetMsg(msg,"",T.mut);acctClaimRun(function(res){acctBusy=false;CLAIM_MSG=res.msg;CLAIM_MSG_OK=res.ok===true;try{acctRender();}catch(e){}});}catch(e){acctBusy=false;}});acctAutoClaim();}else{var ns=document.createElement("div");ns.style.cssText="font-size:10.5px;color:"+T.mut+";margin:8px 0 0;line-height:1.5;";ns.textContent="This project hasn\\u2019t registered with Boosthis yet, so it can\\u2019t be linked from here.";acctBody.appendChild(ns);acctBody.appendChild(msg);}if(LINKED&&ACTX.installId){acctTeleToggle();}var out=acctMkGhost("Sign out");acctBody.appendChild(out);out.addEventListener("click",function(){try{if(acctBusy)return;acctBusy=true;out.disabled=true;var tok=SESS?SESS.token:null;function done(){SESS=null;acctView={kind:"signed-out"};acctBusy=false;AUTO_CLAIM_FOR=null;CLAIM_MSG=null;CLAIM_MSG_OK=false;TELE_KNOWN=false;termsClear();LINKED=false;gateChecked=false;try{if(gCheckBox){gCheckBox.style.borderColor=T.br;gCheckBox.style.background="transparent";if(gCheckBox.firstChild)gCheckBox.firstChild.style.display="none";}}catch(e){}acctRender();try{gateSync();}catch(e){}}if(tok){acctFetch(acctJoin(ACTX.endpoint,"/auth/logout"),{method:"POST",headers:{authorization:"Bearer "+tok}}).then(done,done);}else{done();}}catch(e){acctBusy=false;}});}function acctClaimKey(){return (SESS?SESS.token:"")+"\\u0001"+(ACTX.installId||"");}function acctClaimHeaders(){var h={accept:"application/json",authorization:"Bearer "+SESS.token};if(ACTX.deleteToken)h["x-boosthis-install-token"]=ACTX.deleteToken;return h;}function acctTeleHeaders(){var h=acctClaimHeaders();h["content-type"]="application/json";return h;}function acctClaimRun(cb){try{if(CLAIM_BUSY)return;function done(res){CLAIM_BUSY=false;try{cb(res);}catch(e){}}if(!SESS||!ACTX.endpoint||!ACTX.installId){done({ok:false,msg:"Linking failed. Please try again."});return;}CLAIM_BUSY=true;AUTO_CLAIM_FOR=acctClaimKey();acctFetch(acctJoin(ACTX.endpoint,"/installs/"+encodeURIComponent(ACTX.installId)+"/claim"),{method:"POST",headers:acctClaimHeaders()}).then(function(r){if(r.status===200){return r.json().then(function(b){return b||{};},function(){return {};}).then(function(b){var linked=b&&b.linked===true;LINKED=true;try{gateSync();}catch(e){}TELE_ON=typeof b.fullTelemetry==="boolean"?b.fullTelemetry:ACTX.fullTelemetry===true;TELE_KNOWN=true;done({ok:true,msg:linked?"Linked. This project now appears in your dashboard.":"This project is already linked to your account."});return;});}if(r.status===401){return r.json().then(function(b){return b&&b.reason;},function(){return null;}).then(function(rs){throw rs==="install_token"?ACCT_LINK_PROOF_MSG:"Your session expired. Sign in again.";});}if(r.status===403){throw ACCT_LINK_PROOF_MSG;}if(r.status===404){throw "This project isn\\u2019t registered yet. Make sure telemetry is enabled.";}if(r.status===409){throw "This project is already linked to a different account.";}if(r.status===429){throw "Too many attempts. Try again later.";}throw "Linking failed. Please try again.";}).catch(function(err){done({ok:false,msg:typeof err==="string"?err:"Linking failed. Please try again."});}).then(function(){CLAIM_BUSY=false;});}catch(e){CLAIM_BUSY=false;}}function acctAutoClaim(){try{if(LINKED||CLAIM_BUSY)return;if(!SESS||!ACTX.endpoint||!ACTX.installId)return;var k=acctClaimKey();if(AUTO_CLAIM_FOR===k)return;AUTO_CLAIM_FOR=k;acctClaimRun(function(res){CLAIM_MSG=res.msg;CLAIM_MSG_OK=res.ok===true;try{acctRender();}catch(e){}});}catch(e){}}function acctTeleToggle(){try{var wrap=document.createElement("div");wrap.style.cssText="margin-top:12px;padding-top:12px;border-top:1px solid "+T.br+";";var row=document.createElement("div");row.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:10px;";var lw=document.createElement("div");lw.style.cssText="flex:1;min-width:0;";var lb=document.createElement("div");lb.style.cssText="font-size:12.5px;font-weight:700;color:"+T.fg+";";lb.textContent="Full telemetry";var sub=document.createElement("div");sub.style.cssText="font-size:10.5px;color:"+T.mut+";margin-top:2px;line-height:1.5;";sub.textContent="Upload the complete meter picture so your dashboard and AI can see performance. Off = private mode.";lw.appendChild(lb);lw.appendChild(sub);var sw=document.createElement("button");sw.type="button";sw.setAttribute("role","switch");sw.style.cssText="flex:0 0 auto;width:46px;height:26px;border-radius:999px;border:none;cursor:pointer;position:relative;padding:0;transition:background .15s;font-family:inherit;";var knob=document.createElement("span");knob.style.cssText="position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:left .15s;";sw.appendChild(knob);var pend=document.createElement("span");pend.style.cssText="font-size:9px;font-weight:700;color:"+T.mut+";margin-left:8px;display:none;";pend.textContent="\\u2026";row.appendChild(lw);row.appendChild(sw);row.appendChild(pend);wrap.appendChild(row);var tmsg=acctMkMsg();wrap.appendChild(tmsg);function reflect(){try{sw.style.background=TELE_ON?T.pri:T.br;sw.setAttribute("aria-checked",TELE_ON?"true":"false");sw.setAttribute("aria-label",(TELE_ON?"Full telemetry on":"Full telemetry off"));knob.style.left=TELE_ON?"23px":"3px";}catch(e){}}reflect();sw.addEventListener("click",function(){try{if(TELE_BUSY||acctBusy)return;var next=!TELE_ON;TELE_BUSY=true;acctSetMsg(tmsg,"",T.mut);pend.style.display="inline";sw.style.opacity="0.6";acctFetch(acctJoin(ACTX.endpoint,"/installs/"+encodeURIComponent(ACTX.installId)+"/telemetry"),{method:"POST",headers:acctTeleHeaders(),body:JSON.stringify({fullTelemetry:next})}).then(function(r){if(r.status===200){return r.json().then(function(b){return b&&typeof b.fullTelemetry==="boolean"?b.fullTelemetry:next;},function(){return next;}).then(function(applied){TELE_ON=applied;TELE_KNOWN=true;reflect();acctSetMsg(tmsg,applied?"Full telemetry on. Your dashboard and AI now see the complete picture.":"Private mode. Only issue-level signals are shared.",COLORS.good);return;});}if(r.status===402){return r.json().then(function(b){return b&&b.error;},function(){return null;}).then(function(er){throw er==="billing_frozen"?"Billing is frozen \\u2014 clear the balance to change this.":"Full telemetry is a Pro plan feature.";});}if(r.status===403){throw "This project is paused \\u2014 telemetry can\\u2019t change while paused.";}if(r.status===401){return r.json().then(function(b){return b&&b.reason;},function(){return null;}).then(function(rs){throw rs==="install_token"?"This copy needs repair \\u2014 press Repair in your dashboard, then reload.":"Your session expired. Sign in again.";});}if(r.status===409){throw "This project is linked to a different account.";}if(r.status===429){throw "Too many changes. Try again in a moment.";}throw "Couldn\\u2019t change telemetry. Please try again.";}).catch(function(err){acctSetMsg(tmsg,typeof err==="string"?err:"Couldn\\u2019t change telemetry. Please try again.",COLORS.poor);}).then(function(){TELE_BUSY=false;try{pend.style.display="none";sw.style.opacity="1";}catch(e){}});}catch(e){TELE_BUSY=false;}});acctBody.appendChild(wrap);}catch(e){}}var acctLoaded=false;var acctPollTimer=null;var acctPollUntil=0;var ACCT_POLL_MS=2000;var ACCT_POLL_WINDOW_MS=120000;function acctCtxComplete(){return !!(ACTX.installId&&ACTX.deleteToken);}function acctPollStop(){try{if(acctPollTimer){clearInterval(acctPollTimer);acctPollTimer=null;}}catch(e){}}function acctCtxRead(){try{' + (safeAccount === null ? "acctRender();" : 'fetch("' + safeAccount + '",{credentials:"omit"}).then(function(r){if(!r.ok)return null;return r.json();}).then(function(b){if(b&&typeof b.endpoint==="string"&&b.endpoint){ACTX.endpoint=b.endpoint;ACTX.installId=typeof b.installId==="string"?b.installId:null;ACTX.deleteToken=typeof b.deleteToken==="string"?b.deleteToken:null;ACTX.available=true;ACTX.fullTelemetry=b.fullTelemetry===true;}acctRender();acctTermsHref();try{gateSync();}catch(e){}try{acctAutoClaim();}catch(e){}if(acctCtxComplete())acctPollStop();}).catch(function(){acctRender();try{gateSync();}catch(e){}});') + "}catch(e){try{acctRender();}catch(e2){}}}function acctPollStart(){try{if(acctPollTimer||acctCtxComplete())return;acctPollUntil=Date.now()+ACCT_POLL_WINDOW_MS;acctPollTimer=setInterval(function(){try{if(acctCtxComplete()||Date.now()>acctPollUntil){acctPollStop();return;}acctCtxRead();}catch(e){}},ACCT_POLL_MS);}catch(e){}}function acctLoad(){try{if(acctLoaded)return;acctLoaded=true;acctCtxRead();" + (safeAccount === null ? "" : "acctPollStart();") + `}catch(e){try{acctRender();}catch(e2){}}}acctRender();var note=document.createElement("div");note.style.cssText="margin:2px 2px 0;color:"+T.mut+";font-size:10.5px;";note.textContent="Local dev meters \\u2014 served by this project, nothing leaves it.";var footer=document.createElement("div");footer.style.cssText="margin:8px 2px 0;text-align:center;";var terms=document.createElement("a");terms.textContent="Terms & Privacy";terms.target="_blank";terms.rel="noopener";terms.style.cssText="color:"+T.mut+";font-size:10px;text-decoration:underline;";terms.href="https://www.boosthis.com/terms";function acctTermsHref(){try{if(ACTX.available&&ACTX.endpoint){var u=new URL(ACTX.endpoint);terms.href=u.origin+"/terms";}}catch(e){}}var gateWrap=document.createElement("div");gateWrap.style.display="none";var dashWrap=document.createElement("div");dashWrap.style.display="none";dashWrap.appendChild(hero);dashWrap.appendChild(bd);dashWrap.appendChild(hl);dashWrap.appendChild(acct);dashWrap.appendChild(lg);dashWrap.appendChild(note);dashWrap.appendChild(footer);footer.appendChild(terms);var switchOff=document.createElement('button');switchOff.type='button';switchOff.textContent='Hide the bubble on this browser';switchOff.style.cssText='display:block;margin:6px auto 0;padding:2px 6px;background:none;border:0;color:#8b8f99;font:inherit;font-size:10px;text-decoration:underline;cursor:pointer;';switchOff.addEventListener('click',function(){try{var u=new URL(window.location.href);u.searchParams.set('boosthis','off');window.location.assign(u.href);}catch(e){}});footer.appendChild(switchOff);var noticeEl=document.createElement("div");noticeEl.style.cssText="display:none;background:"+T.card+";border:1px solid "+COLORS.poor+";border-radius:12px;padding:10px 12px;margin:0 0 10px;";var noticeT=document.createElement("div");noticeT.style.cssText="font-size:12px;font-weight:700;color:"+COLORS.poor+";";var noticeB=document.createElement("div");noticeB.style.cssText="font-size:11px;line-height:1.45;color:"+T.fg+";margin-top:3px;";noticeEl.appendChild(noticeT);noticeEl.appendChild(noticeB);panel.appendChild(noticeEl);function noticeTone(n){try{return (n&&(n.kind==="registration-unknown"||n.kind==="registration-throttled"))?COLORS["needs-work"]:COLORS.poor;}catch(e){return COLORS.poor;}}function waitTxt(s){try{s=(typeof s==="number"&&isFinite(s)&&s>0)?Math.round(s):0;if(!s)return "a short while";if(s<90)return "about "+Math.max(1,s)+"s";var m=Math.round(s/60);if(m<90)return "about "+m+" minute"+(m===1?"":"s");var h=Math.round(s/3600);return "about "+h+" hour"+(h===1?"":"s");}catch(e){return "a short while";}}function showNotice(n){try{var tone=noticeTone(n);noticeEl.style.borderColor=tone;noticeT.style.color=tone;if(n&&n.kind==="install-id-not-uuid"){noticeT.textContent="Registration rejected";noticeB.textContent="Install ID must be a UUID. Mint a real UUID and restart.";noticeEl.style.display="block";}else if(n&&n.kind==="not-registered"){noticeT.textContent="Not registered yet";noticeB.textContent="This app has not registered with Boosthis, so nothing is being sent. Check the project key and this app's outbound network access, then restart.";noticeEl.style.display="block";}else if(n&&n.kind==="registration-throttled"){noticeT.textContent="Waiting \\u2014 too many new registrations";noticeB.textContent="Boosthis is rate-limiting new registrations for this project key, so this app is not on file yet. It is temporary and needs nothing from you: the kit is waiting "+waitTxt(n.retryAfterSeconds)+" and will register itself, with no restart. Do not change the install line's id while this is showing \\u2014 a new id is a new registration and makes the wait longer.";noticeEl.style.display="block";}else if(n&&n.kind==="registration-unknown"){noticeT.textContent="Can't check right now";noticeB.textContent="Boosthis could not be reached to confirm whether this app is registered, so this panel cannot say either way yet. This is not a failed install and it does not mean anything stopped \\u2014 it settles by itself once the check goes through. Do not change the install line's id while this is showing.";noticeEl.style.display="block";}else if(n&&n.kind==="sharing-off"){noticeT.textContent="Nothing is being uploaded";noticeB.textContent="This app is registered, but sharing is off: these meters stay on this screen and your Boosthis dashboard stays empty. Turn sharing on there, or start the kit with shareMeterWithAI: true.";noticeEl.style.display="block";}else if(n&&n.kind==="uploads-failing"){noticeT.textContent="Uploads are not getting through";noticeB.textContent="This app is registered and sharing is on, but the last batch of measurements did not reach Boosthis, so your dashboard is missing the most recent data."+(FAILTXT[n.reason]?" "+FAILTXT[n.reason]+".":"")+((typeof n.lost==="number"&&n.lost>0)?" Uploads lost: "+n.lost+".":"");noticeEl.style.display="block";}else{noticeEl.style.display="none";}}catch(e){}}var FAILTXT={unauthorized:"Refused \\u2014 credentials rejected",rejected:"Refused \\u2014 batch rejected","server-error":"Boosthis failed to store it",unreachable:"No answer \\u2014 timed out or unreachable"};var dropEl=document.createElement("div");dropEl.style.cssText="display:none;background:"+T.card+";border:1px solid "+COLORS["needs-work"]+";border-radius:12px;padding:9px 12px;margin:0 0 10px;";var dropT=document.createElement("div");dropT.style.cssText="font-size:12px;font-weight:700;color:"+COLORS["needs-work"]+";";dropT.textContent="Measurements dropped";var dropB=document.createElement("div");dropB.style.cssText="font-size:11px;line-height:1.45;color:"+T.fg+";margin-top:3px;";dropEl.appendChild(dropT);dropEl.appendChild(dropB);panel.appendChild(dropEl);var DROPTXT={labelRejected:"route names the privacy guard refused",traceCapReached:"spans past the 20-span limit",snapshotEntryFiltered:"snapshot entries the privacy guard refused"};function showDrops(d){try{if(!d||typeof d.count!=="number"||d.count<=0){dropEl.style.display="none";return;}var w=[];var cs=(d.causes&&d.causes.length)?d.causes:[];for(var i=0;i<cs.length;i++){var t=DROPTXT[cs[i]];if(t)w.push(t);}dropB.textContent=String(d.count)+(w.length?" \\u2014 "+w.join("; "):"");dropEl.style.display="block";}catch(e){}}var undEl=document.createElement("div");undEl.style.cssText="display:none;margin-top:8px;padding:8px 10px;border-radius:8px;background:"+T.card+";border:1px solid "+COLORS.poor+";";var undT=document.createElement("div");undT.style.cssText="font-size:12px;font-weight:700;color:"+COLORS.poor+";";undT.textContent="Measurements never delivered";var undB=document.createElement("div");undB.style.cssText="font-size:11px;line-height:1.45;color:"+T.fg+";margin-top:3px;";undEl.appendChild(undT);undEl.appendChild(undB);panel.appendChild(undEl);var UNDTXT={bufferFull:"buffer full, oldest measurements dropped",sendFailed:"an upload failed and its rows were already out of the buffer",heldTooLong:"held too long without reaching Boosthis, then given up on",processEnded:"the process ended with measurements still waiting"};function showUndelivered(d){try{if(!d||typeof d.count!=="number"||d.count<=0){undEl.style.display="none";return;}var w=[];var cs=(d.causes&&d.causes.length)?d.causes:[];for(var i=0;i<cs.length;i++){var t=UNDTXT[cs[i]];if(t)w.push(t);}undB.textContent=String(d.count)+(w.length?" \\u2014 "+w.join("; "):"");undEl.style.display="block";}catch(e){}}panel.appendChild(gateWrap);panel.appendChild(dashWrap);var gateChecked=false;var gAgree=null,gNote=null,gCheckBox=null;function gateMk(){try{while(gateWrap.firstChild)gateWrap.removeChild(gateWrap.firstChild);var kick=document.createElement("div");kick.style.cssText="font-size:10px;font-weight:600;letter-spacing:2px;color:"+T.mut+";margin:2px 2px 10px;";kick.textContent="BOOSTHIS";gateWrap.appendChild(kick);gateWrap.appendChild(acct);var gt=document.createElement("div");gt.style.cssText="font-size:20px;font-weight:800;color:"+T.fg+";margin:4px 2px 0;line-height:1.2;";gt.textContent="Terms of Service & Privacy";gateWrap.appendChild(gt);var gi=document.createElement("div");gi.style.cssText="font-size:11.5px;color:"+T.mut+";margin:3px 2px 8px;";gi.textContent="Please review and accept before using Boosthis.";gateWrap.appendChild(gi);var gb=document.createElement("div");gb.style.cssText="font-size:11.5px;line-height:1.55;color:"+T.mut+";margin:0 2px 6px;";gb.textContent="Everything \\u2014 liability, what Boosthis collects, AI suggestions, and project-key access \\u2014 lives on the Terms & Conditions page. Open it and read it, then tick the box below to agree.";gateWrap.appendChild(gb);var gl=document.createElement("a");gl.textContent="Terms & Privacy";gl.target="_blank";gl.rel="noopener";gl.href=terms.href;gl.style.cssText="display:inline-block;color:"+T.pri+";font-size:11.5px;font-weight:600;text-decoration:underline;margin:0 2px 12px;";gateWrap.appendChild(gl);var crow=document.createElement("div");crow.style.cssText="display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin:0 2px 10px;";gCheckBox=document.createElement("div");gCheckBox.style.cssText="width:20px;height:20px;flex:0 0 20px;border-radius:5px;border:2px solid "+T.br+";display:flex;align-items:center;justify-content:center;box-sizing:border-box;";var ck=document.createElement("span");ck.textContent="\\u2713";ck.style.cssText="color:"+T.bg+";font-size:13px;font-weight:700;line-height:1;display:none;";gCheckBox.appendChild(ck);var cl=document.createElement("span");cl.style.cssText="font-size:11.5px;line-height:1.45;color:"+T.fg+";";cl.textContent="I have read and agree to the Terms of Service & Privacy Policy.";crow.appendChild(gCheckBox);crow.appendChild(cl);gateWrap.appendChild(crow);crow.addEventListener("click",function(){try{gateChecked=!gateChecked;gCheckBox.style.borderColor=gateChecked?T.pri:T.br;gCheckBox.style.background=gateChecked?T.pri:"transparent";ck.style.display=gateChecked?"block":"none";gateSync();}catch(e){}});gNote=document.createElement("div");gNote.style.cssText="display:none;font-size:11px;line-height:1.45;color:"+T.mut+";margin:0 2px 10px;";gNote.textContent="Sign in above to connect this project to your dashboard before continuing.";gateWrap.appendChild(gNote);gAgree=document.createElement("button");gAgree.type="button";gAgree.textContent="I Agree & Continue";gAgree.style.cssText="width:100%;padding:11px 10px;font-size:13px;font-weight:700;border:none;border-radius:10px;cursor:pointer;font-family:inherit;";gateWrap.appendChild(gAgree);gAgree.addEventListener("click",function(){try{if(!gateCanAgree())return;termsWrite();gateSync();}catch(e){}});var gd=document.createElement("button");gd.type="button";gd.textContent="Decline";gd.style.cssText="width:100%;padding:8px 10px;margin-top:8px;font-size:12px;font-weight:600;background:transparent;color:"+T.mut+";border:none;cursor:pointer;font-family:inherit;";gateWrap.appendChild(gd);gd.addEventListener("click",function(){try{panel.style.display="none";}catch(e){}});gateApply();}catch(e){}}function gateRegistered(){return !!(ACTX.available&&ACTX.endpoint&&ACTX.installId&&ACTX.deleteToken);}function gateNeedsConnect(){return gateRegistered()&&!LINKED;}function gateCanAgree(){return gateChecked&&!gateNeedsConnect();}function gateApply(){try{if(gNote)gNote.style.display=gateNeedsConnect()?"block":"none";if(gAgree){var ok=gateCanAgree();gAgree.style.background=ok?T.pri:T.br;gAgree.style.color=ok?T.bg:T.mut;gAgree.style.cursor=ok?"pointer":"default";}}catch(e){}}var gateBuilt=false;function gateSync(){try{if(termsAccepted()){gateWrap.style.display="none";dashWrap.style.display="block";if(acct.parentNode!==dashWrap)dashWrap.insertBefore(acct,lg);}else{if(!gateBuilt){gateBuilt=true;gateMk();}else{if(acct.parentNode!==gateWrap){var k=gateWrap.firstChild;if(k&&k.nextSibling)gateWrap.insertBefore(acct,k.nextSibling);else gateWrap.appendChild(acct);}gateApply();}gateWrap.style.display="block";dashWrap.style.display="none";}}catch(e){}}var CORE={responsiveness:1,resilience:1,budget:1};function axisRow(m){var w=document.createElement("div");w.style.cssText="padding:7px 0;border-bottom:1px solid "+T.br+";";var top=document.createElement("div");top.style.cssText="display:flex;justify-content:space-between;align-items:baseline;gap:8px;";var l=document.createElement("span");l.style.cssText="color:"+T.fg+";font-weight:600;font-size:12px;";l.textContent=String(m.label||m.key||"");var rc=m.rating&&COLORS[m.rating]?COLORS[m.rating]:T.mut;var c=document.createElement("span");c.style.cssText="color:"+rc+";font-variant-numeric:tabular-nums;font-size:11px;text-align:right;";c.textContent=String(m.caption||"");top.appendChild(l);top.appendChild(c);var bar=document.createElement("div");bar.style.cssText="height:4px;border-radius:3px;background:"+T.br+";margin-top:5px;overflow:hidden;";var fill=document.createElement("div");var s=typeof m.score==="number"?Math.max(0,Math.min(100,m.score)):0;fill.style.cssText="height:100%;border-radius:3px;width:"+s+"%;background:"+rc+";";bar.appendChild(fill);w.appendChild(top);w.appendChild(bar);return w;}function fillRows(box,list,empty){while(box.firstChild)box.removeChild(box.firstChild);if(list.length){for(var i=0;i<list.length;i++){var r=axisRow(list[i]);if(i===list.length-1)r.style.borderBottom="none";box.appendChild(r);}}else{var e=document.createElement("div");e.style.cssText="padding:7px 0;color:"+T.mut+";";e.textContent=empty;box.appendChild(e);}}function paint(p){try{if(p&&p.lock){if(p.lock.kind==="hidden"){try{host.style.display="none";}catch(e){}return;}showLock(p.lock);return;}hideLock();try{if(host.style.display==="none")host.style.display="";}catch(e){}showNotice(p&&p.notice);showDrops(p&&p.drops);showUndelivered(p&&p.undelivered);try{hProj.textContent="` + PROJECT_LABEL + ': "+((p&&typeof p.project==="string"&&p.project)||"' + PROJECT_UNKNOWN_TEXT + '");}catch(e){}try{hInst.textContent="' + INSTALL_ID_LABEL + ': "+((p&&typeof p.installId==="string"&&p.installId)||"' + INSTALL_ID_UNKNOWN_TEXT + '");}catch(e){}var c=p&&p.rating?COLORS[p.rating]||T.mut:T.mut;btn.style.borderColor=c;num.textContent=p&&typeof p.score==="number"?String(p.score):"\\u2013";num.style.color=p&&p.rating?c:T.fg;bTxt.textContent=p&&p.rating?(RL[p.rating]||"MEASURING"):"MEASURING";bDot.style.background=p&&p.rating?c:T.mut;badge.style.background=p&&p.rating?c+"1a":T.br;badge.style.borderColor=p&&p.rating?c+"55":T.br;badge.style.color=p&&p.rating?c:T.mut;stat.textContent=p&&typeof p.score==="number"?String(p.sampleCount||0)+" requests measured":"' + MEASURING_HERO_TEXT + '";var ax=(p&&p.axes)||[];var core=[],rest=[];for(var i=0;i<ax.length;i++){(CORE[ax[i].key]?core:rest).push(ax[i]);}fillRows(bdRows,core,"measuring\\u2026 appears after a few requests");fillRows(hlRows,rest,"measuring\\u2026 appears with traffic");}catch(e){}}function poll(){try{fetch("' + safePanel + '",{credentials:"omit"}).then(function(r){return r.ok?r.json():null;}).then(paint).catch(function(){});}catch(e){}}btn.addEventListener("click",function(){try{var open=panel.style.display==="none";panel.style.display=open?"block":"none";if(open){gateSync();acctLoad();poll();}}catch(e){}});panel.appendChild(lockEl);root.appendChild(panel);root.appendChild(btn);poll();setInterval(poll,2000);function add(){try{(document.body||document.documentElement).appendChild(host);}catch(e){}}if(document.body)add();else document.addEventListener("DOMContentLoaded",add);}catch(e){}})();<\/script>\n';
}
const RUNTIME_PANEL_SUBTITLE = "Node.js Performance";
const BUBBLE_SNIPPET = bubbleSnippet(PULSE_PATH);
function injectIntoHtml(body, snippet) {
  try {
    const text = body.toString("utf8");
    const idx = text.toLowerCase().lastIndexOf("</body>");
    if (idx === -1) return null;
    return Buffer.from(text.slice(0, idx) + snippet + text.slice(idx), "utf8");
  } catch {
    return null;
  }
}
function headerString(res, name) {
  try {
    const v = res.getHeader?.(name);
    if (v === void 0 || v === null) return void 0;
    return String(v);
  } catch {
    return void 0;
  }
}
function isHtmlContentType(ct) {
  return ct !== void 0 && ct.toLowerCase().includes("text/html");
}
function toBuffer(chunk, encoding) {
  if (chunk === void 0 || chunk === null) return void 0;
  if (Buffer.isBuffer(chunk)) return chunk;
  if (typeof chunk === "string") {
    try {
      return Buffer.from(
        chunk,
        typeof encoding === "string" ? encoding : "utf8"
      );
    } catch {
      return null;
    }
  }
  if (chunk instanceof Uint8Array) return Buffer.from(chunk);
  return null;
}
function pickCallback(...args) {
  for (const a of args) if (typeof a === "function") return a;
  return void 0;
}
function varyWithCookie(prior) {
  const parts = (prior ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.includes("*") || parts.some((p) => p.toLowerCase() === "cookie")) {
    return parts.join(", ");
  }
  return [...parts, "Cookie"].join(", ");
}
function wrapResponseForInjection(res, snippet = BUBBLE_SNIPPET) {
  if (typeof res.write !== "function" || typeof res.end !== "function") return;
  const origWrite = res.write.bind(res);
  const origEnd = res.end.bind(res);
  let chunks = [];
  let size = 0;
  const giveUp = () => {
    if (!chunks) return;
    const buffered = chunks;
    chunks = null;
    for (const c of buffered) origWrite(c);
  };
  const stillEligibleMidStream = () => {
    const ct = headerString(res, "content-type");
    if (ct !== void 0 && !isHtmlContentType(ct)) return false;
    if (headerString(res, "content-encoding") !== void 0) return false;
    return true;
  };
  res.write = function boosthisWrite(...args) {
    try {
      if (!chunks) return origWrite(...args);
      if (!stillEligibleMidStream()) {
        giveUp();
        return origWrite(...args);
      }
      const [chunk, encoding] = args;
      const buf = toBuffer(chunk, encoding);
      if (buf === null) {
        giveUp();
        return origWrite(...args);
      }
      if (buf) {
        size += buf.length;
        if (size > MAX_INJECT_BYTES) {
          giveUp();
          return origWrite(...args);
        }
        chunks.push(buf);
      }
      const cb = pickCallback(...args.slice(1));
      if (cb) queueMicrotask(cb);
      return true;
    } catch {
      try {
        giveUp();
      } catch {
      }
      return origWrite(...args);
    }
  };
  res.end = function boosthisEnd(...args) {
    try {
      if (!chunks) return origEnd(...args);
      const [chunk, encoding] = args;
      const buf = toBuffer(chunk, encoding);
      const cb = pickCallback(...args);
      if (buf === null) {
        giveUp();
        return origEnd(...args);
      }
      if (buf) {
        size += buf.length;
        chunks.push(buf);
      }
      const body = Buffer.concat(chunks);
      chunks = null;
      const status = res.statusCode ?? 200;
      const eligible = size <= MAX_INJECT_BYTES && status >= 200 && status < 300 && res.headersSent !== true && isHtmlContentType(headerString(res, "content-type")) && headerString(res, "content-encoding") === void 0;
      let out = body;
      if (eligible) {
        const injected = injectIntoHtml(body, snippet);
        if (injected) {
          out = injected;
          try {
            if (headerString(res, "content-length") !== void 0) {
              res.setHeader?.("content-length", String(out.length));
            }
          } catch {
            out = body;
          }
          if (out !== body) {
            try {
              res.setHeader?.("cache-control", "private, no-store");
              res.setHeader?.("vary", varyWithCookie(headerString(res, "vary")));
            } catch {
            }
          }
        }
      }
      return cb ? origEnd(out, cb) : origEnd(out);
    } catch {
      return origEnd(...args);
    }
  };
}
function _resetBubbleForTests() {
}
function computePanelUndelivered() {
  try {
    const count = getUndeliveredRowCount();
    if (count <= 0) return null;
    return { count, causes: getUndeliveredCauses() };
  } catch {
    return null;
  }
}
function panelMsText(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "0";
  if (ms >= 100) return String(Math.round(ms));
  if (ms >= 10) return String(Math.round(ms * 10) / 10);
  const rounded = Math.round(ms * 100) / 100;
  return rounded === 0 ? "<0.01" : String(rounded);
}
function panelStoredMsText(ms) {
  return Number.isFinite(ms) && ms > 0 ? `${panelMsText(ms)} ms` : "<1 ms";
}
export {
  ACCOUNT_SUFFIX,
  BOOSTHIS_ICON_URI,
  BUBBLE_SNIPPET,
  FIRST_REPORT_WAIT_TEXT,
  MAX_INJECT_BYTES,
  OWNER_GATE_JS,
  OWNER_SWITCH_PARAM,
  PANEL_AXIS_LABELS,
  PANEL_EXPECTED_AXES,
  PANEL_JOBS,
  PANEL_PATH,
  PANEL_SUFFIX,
  PULSE_PATH,
  PULSE_SUFFIX,
  SELF_WORDED_NO_SCORE_AXES,
  TERMS_VERSION_LITERAL,
  _resetBubbleForTests,
  bubbleSnippet,
  computePanel,
  computePanelDrops,
  computePanelLock,
  computePanelNotice,
  computePanelUndelivered,
  computePulse,
  injectIntoHtml,
  isDevProcess,
  panelDecidedLead,
  panelUploadFailText,
  renewNotice,
  resolveBubbleVisibility,
  varyWithCookie,
  wrapResponseForInjection
};
