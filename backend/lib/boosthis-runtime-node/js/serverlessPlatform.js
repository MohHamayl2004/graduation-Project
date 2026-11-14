// @ts-nocheck
/* eslint-disable */
// Built from src/serverlessPlatform.ts so plain node can run the kit. Do not edit.
import {
  PLATFORM_AWS_LAMBDA,
  PLATFORM_AZURE_FUNCTIONS,
  PLATFORM_CLOUDFLARE_WORKERS,
  PLATFORM_CLOUD_RUN,
  PLATFORM_FIREBASE_APP_HOSTING,
  PLATFORM_GCP_FUNCTIONS,
  PLATFORM_NETLIFY,
  PLATFORM_SUPABASE_EDGE,
  PLATFORM_UNKNOWN,
  PLATFORM_VERCEL
} from "./serverless.js";
import {
  REASON_PLATFORM_DOES_NOT_EXPOSE,
  REASON_NOTHING_TO_COMPARE
} from "./axisReasons.js";
import {
  REASON_NOTHING_TO_COMPARE as REASON_NOTHING_TO_COMPARE2,
  REASON_PLATFORM_DOES_NOT_EXPOSE as REASON_PLATFORM_DOES_NOT_EXPOSE2
} from "./axisReasons.js";
const CONFIRMED = "2026-08-26";
const PLATFORM_CAPABILITIES = {
  [PLATFORM_UNKNOWN]: {
    code: PLATFORM_UNKNOWN,
    nodeKitRuns: true,
    isFunction: false,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: false,
    memoryLimitReadable: false,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: false,
    refusalsReadableInside: false,
    publishedAfterTheRun: false,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  },
  // Vercel Functions run ON Lambda but do NOT pass the context down, so the
  // countdown Lambda offers is not reachable here. The time limit is a project
  // setting the customer configures; nothing in the environment states it.
  [PLATFORM_VERCEL]: {
    code: PLATFORM_VERCEL,
    nodeKitRuns: true,
    isFunction: true,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    // The underlying Lambda's granted memory IS in the environment, and Vercel
    // does not strip it — which is why memory headroom works here and time
    // headroom does not.
    memoryLimitReadable: true,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: true,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  },
  // The only platform here that hands the run a live clock. Everything the
  // "warn before the kill" work can do, it can do because of this row.
  [PLATFORM_AWS_LAMBDA]: {
    code: PLATFORM_AWS_LAMBDA,
    nodeKitRuns: true,
    isFunction: true,
    liveCountdown: true,
    timeLimitReadable: true,
    timeLimitExists: true,
    memoryLimitReadable: true,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    // Lambda freezes on return, full stop. There is no waitUntil.
    afterResponseMechanism: false,
    refusalsReadableInside: false,
    // Billed duration, throttles and the kill itself live in the platform's own
    // records, never in the run.
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  },
  [PLATFORM_NETLIFY]: {
    code: PLATFORM_NETLIFY,
    nodeKitRuns: true,
    isFunction: true,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    memoryLimitReadable: true,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: true,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  },
  [PLATFORM_GCP_FUNCTIONS]: {
    code: PLATFORM_GCP_FUNCTIONS,
    nodeKitRuns: true,
    isFunction: true,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    memoryLimitReadable: true,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: false,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  },
  [PLATFORM_AZURE_FUNCTIONS]: {
    code: PLATFORM_AZURE_FUNCTIONS,
    nodeKitRuns: true,
    isFunction: true,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    // Azure states no per-function memory grant in the environment.
    memoryLimitReadable: false,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: false,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  },
  // ── The always-on look-alikes ────────────────────────────────────────────
  // A container that looks long-lived and is billed like one, except the
  // processor is frozen between requests unless the customer pays to keep it
  // awake. Everything a function-shaped design fixes — timers that never fire,
  // sends that die mid-flight — happens here too, which is why these rows
  // exist rather than being waved off as "not serverless".
  [PLATFORM_CLOUD_RUN]: {
    code: PLATFORM_CLOUD_RUN,
    nodeKitRuns: true,
    // Not a function: the process really does survive between requests, keeps
    // its identity, and registers once. Only the FREEZE is function-shaped.
    isFunction: false,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    memoryLimitReadable: false,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: false,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: true,
    confirmedOn: CONFIRMED
  },
  [PLATFORM_FIREBASE_APP_HOSTING]: {
    code: PLATFORM_FIREBASE_APP_HOSTING,
    nodeKitRuns: true,
    isFunction: false,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    memoryLimitReadable: false,
    fixedMemoryMb: null,
    cpuTimeCapped: false,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: false,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: true,
    confirmedOn: CONFIRMED
  },
  // ── Isolate runtimes: rows only, no Node kit ─────────────────────────────
  // Workers cap THINKING time rather than waiting time, and the isolate will
  // not let code time itself — so nothing here is measurable from inside and
  // everything comes from Cloudflare's own invocation records.
  //
  // NOTE, and the reason every row carries a date: the 1000-subrequest cap
  // that stood for years was REMOVED in February 2026. Inheriting it would
  // have had us render headroom against a limit that no longer exists.
  [PLATFORM_CLOUDFLARE_WORKERS]: {
    code: PLATFORM_CLOUDFLARE_WORKERS,
    nodeKitRuns: false,
    isFunction: true,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    memoryLimitReadable: false,
    fixedMemoryMb: 128,
    cpuTimeCapped: true,
    // The isolate deliberately does not advance a clock for the code, so a
    // Worker cannot time itself against its own CPU cap.
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: true,
    openConnectionLimit: 6,
    afterResponseMechanism: true,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  },
  // A worker stays alive for a known wall-clock period and serves many
  // requests during it; a supervisor enforces soft and hard computing-time
  // limits and may retire the worker early.
  [PLATFORM_SUPABASE_EDGE]: {
    code: PLATFORM_SUPABASE_EDGE,
    nodeKitRuns: false,
    isFunction: true,
    liveCountdown: false,
    timeLimitReadable: false,
    timeLimitExists: true,
    memoryLimitReadable: false,
    fixedMemoryMb: 256,
    cpuTimeCapped: true,
    cpuTimeLimitReadable: false,
    onwardCallsCapped: false,
    openConnectionsCapped: false,
    openConnectionLimit: null,
    afterResponseMechanism: true,
    refusalsReadableInside: false,
    publishedAfterTheRun: true,
    cpuFrozenBetweenRequests: false,
    confirmedOn: CONFIRMED
  }
};
function capabilitiesFor(code) {
  return PLATFORM_CAPABILITIES[code] ?? PLATFORM_CAPABILITIES[PLATFORM_UNKNOWN];
}
const HOST_KIND_UNKNOWN = 0;
const HOST_KIND_FUNCTION = 1;
const HOST_KIND_FROZEN_CONTAINER = 2;
const HOST_KIND_ALWAYS_ON = 3;
function hostKindFor(code) {
  const c = capabilitiesFor(code);
  if (c.isFunction) return HOST_KIND_FUNCTION;
  if (c.cpuFrozenBetweenRequests) return HOST_KIND_FROZEN_CONTAINER;
  if (code === PLATFORM_UNKNOWN) return HOST_KIND_UNKNOWN;
  return HOST_KIND_ALWAYS_ON;
}
const CAN = { measurable: true, reasonCode: null };
const HIDDEN = {
  measurable: false,
  reasonCode: REASON_PLATFORM_DOES_NOT_EXPOSE2
};
const NO_LIMIT = {
  measurable: false,
  reasonCode: REASON_NOTHING_TO_COMPARE2
};
function availabilityOf(code, reading) {
  const c = capabilitiesFor(code);
  switch (reading) {
    case "timeHeadroom":
      if (!c.timeLimitExists) return NO_LIMIT;
      return c.timeLimitReadable ? CAN : HIDDEN;
    case "platformMemoryHeadroom":
      if (c.fixedMemoryMb !== null) return CAN;
      return c.memoryLimitReadable ? CAN : HIDDEN;
    case "cpuTimeHeadroom":
      if (!c.cpuTimeCapped) return NO_LIMIT;
      return c.cpuTimeLimitReadable ? CAN : HIDDEN;
    case "onwardCallHeadroom":
      return c.onwardCallsCapped ? CAN : NO_LIMIT;
    case "openConnectionHeadroom":
      if (!c.openConnectionsCapped) return NO_LIMIT;
      return c.openConnectionLimit === null ? HIDDEN : CAN;
    case "refusalsAndKills":
      return c.refusalsReadableInside ? CAN : HIDDEN;
    case "imminentKillWarning":
      return c.liveCountdown ? CAN : HIDDEN;
    case "perRunCost":
      return c.isFunction || c.cpuFrozenBetweenRequests ? CAN : NO_LIMIT;
    case "kitCost":
      return c.nodeKitRuns ? CAN : NO_LIMIT;
    default:
      return HIDDEN;
  }
}
export {
  HOST_KIND_ALWAYS_ON,
  HOST_KIND_FROZEN_CONTAINER,
  HOST_KIND_FUNCTION,
  HOST_KIND_UNKNOWN,
  PLATFORM_CAPABILITIES,
  REASON_NOTHING_TO_COMPARE,
  REASON_PLATFORM_DOES_NOT_EXPOSE,
  availabilityOf,
  capabilitiesFor,
  hostKindFor
};
