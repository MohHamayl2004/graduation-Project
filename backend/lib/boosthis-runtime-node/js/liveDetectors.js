// @ts-nocheck
/* eslint-disable */
// Built from src/liveDetectors.ts so plain node can run the kit. Do not edit.
import { performance as perfHooks } from "node:perf_hooks";
import {
  subscribe as dcSubscribe,
  unsubscribe as dcUnsubscribe
} from "node:diagnostics_channel";
import { collectLiveConnectionFindings } from "./liveConnections.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import { clearEdgeCache, noteEdgeCacheHeaders } from "./edgeCache.js";
import {
  clearCacheDirectives,
  collectCacheDirectiveFindings
} from "./cacheDirectives.js";
import { noteIdleStart, noteIdleEnd, clearServerMeters } from "./serverMeters.js";
import { clearHeldOpen } from "./heldOpen.js";
import { clearDeclaredWaitCounts, matchDeclaredCall } from "./declaredWaits.js";
import {
  noteOutboundStart,
  noteOutboundEnd,
  clearRepeatedWork,
  currentRequestScope
} from "./repeatedWork.js";
import {
  clearDbWork,
  isHostedDatabaseCall,
  noteHostedDbEnd,
  noteHostedDbStart
} from "./dbWork.js";
import { aiProviderCode } from "./aiProviders.js";
import { dependencyFor } from "./dependencyKinds.js";
import {
  noteDependencyStart,
  noteDependencyEnd,
  outcomeForStatus,
  clearDependencyWork
} from "./dependencyWork.js";
import { clearFailureContainment } from "./failureContainment.js";
import { clearJobWork } from "./jobWork.js";
import { unpatchJobSystems } from "./jobAdapters.js";
import {
  noteSuspendActivity,
  noteSuspendIdleStart,
  clearSuspendSensor
} from "./suspendSensor.js";
import {
  recordAttemptStart,
  recordDeclaredAttemptStart,
  recordAttemptComplete,
  recordAttemptError,
  discardAttempt,
  recordConnectionOpened,
  recordConnectStart,
  recordConnectEstablished,
  recordConnectFailed,
  clearNetworkSampler
} from "./networkSampler.js";
import { dependencyKindForHost } from "./depKinds.js";
import {
  attributeOutbound,
  attributeOutboundRequest,
  hostOf,
  ignoreHost,
  isOwnUploadHost,
  _ownTrafficInternals
} from "./ownTraffic.js";
import { ELAPSED_HEADER, TRACE_HEADER, forwardTraceHeaders } from "./trace.js";
import { PARENT_HEADER } from "./spanScope.js";
import { servedHostOf, shouldPropagateTo } from "./tracePropagation.js";
const RETRY_WINDOW_MS = 1e4;
const RETRY_STORM_THRESHOLD = 5;
const RETRY_BACKOFF_MS = 1e3;
const MAX_TRACKED_HOSTS = 200;
const CLUSTER_WINDOW_MS = 50;
const CLUSTER_HOST_THRESHOLD = 3;
const IDLE_GAP_MS = 3e3;
const IDLE_ACTIVE_MS = 1e3;
const IDLE_UTIL_THRESHOLD = 0.5;
const attemptsByHost = /* @__PURE__ */ new Map();
let retryBurstPeak = 0;
let outboundAttemptsSeen = 0;
const PROPAGATED_HEADERS = [
  TRACE_HEADER,
  ELAPSED_HEADER,
  PARENT_HEADER
];
function carriesAnyTraceHeader(headers) {
  if (headers === void 0 || headers === null) return false;
  const isOurs = (name) => {
    const lower = name.toLowerCase();
    return PROPAGATED_HEADERS.includes(lower);
  };
  if (Array.isArray(headers)) {
    for (let i = 0; i < headers.length; i += 2) {
      if (isOurs(String(headers[i]))) return true;
    }
    return false;
  }
  if (typeof headers === "string") {
    const lower = headers.toLowerCase();
    return PROPAGATED_HEADERS.some((name) => lower.includes(name));
  }
  if (typeof headers === "object") {
    for (const key of Object.keys(headers)) {
      if (isOurs(key)) return true;
    }
    return false;
  }
  return true;
}
function destinationHostOf(req) {
  try {
    const target = req.path;
    if (typeof target === "string" && /^https?:\/\//i.test(target)) {
      const proxied = hostOf(target);
      if (proxied) return proxied;
    }
    return hostOf(req.origin);
  } catch {
    return "";
  }
}
function recordOutboundAttempt(target, path) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  ensureArmed();
  const host = hostOf(target);
  if (!host || isOwnUploadHost(host)) return;
  if (outboundAttemptsSeen < Number.MAX_SAFE_INTEGER) outboundAttemptsSeen++;
  const now = Date.now();
  let arr = attemptsByHost.get(host);
  if (!arr) {
    if (attemptsByHost.size >= MAX_TRACKED_HOSTS) return;
    arr = [];
    attemptsByHost.set(host, arr);
  }
  const recognised = dependencyFor(host);
  const destination = isHostedDatabaseCall(host, path) ? { to: "database" } : aiProviderCode(host) > 0 ? { to: "ai" } : recognised.service ? { service: recognised.service, to: recognised.kind } : { to: recognised.kind };
  arr.push({ at: now, destination });
  if (arr.length > 1e4) arr.shift();
  const cutoff = now - RETRY_WINDOW_MS;
  while (arr.length > 0 && arr[0].at < cutoff) arr.shift();
  if (arr.length >= RETRY_STORM_THRESHOLD && medianGap(arr.map((a) => a.at)) < RETRY_BACKOFF_MS && arr.length > retryBurstPeak) {
    retryBurstPeak = arr.length;
  }
}
function peakRetryBurst() {
  return isBoosthisDisabled() ? 0 : retryBurstPeak;
}
function outboundAttemptsObserved() {
  return isBoosthisDisabled() ? 0 : outboundAttemptsSeen;
}
function medianGap(sortedTimestamps) {
  if (sortedTimestamps.length < 2) return 0;
  const gaps = [];
  for (let i = 1; i < sortedTimestamps.length; i++) {
    gaps.push(sortedTimestamps[i] - sortedTimestamps[i - 1]);
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0 ? (gaps[mid - 1] + gaps[mid]) / 2 : gaps[mid];
}
function collectRetryStorms() {
  const out = [];
  const now = Date.now();
  const cutoff = now - RETRY_WINDOW_MS;
  for (const [host, arr] of attemptsByHost) {
    while (arr.length > 0 && arr[0].at < cutoff) arr.shift();
    if (arr.length < RETRY_STORM_THRESHOLD) continue;
    if (medianGap(arr.map((a) => a.at)) >= RETRY_BACKOFF_MS) continue;
    const spanMs = arr[arr.length - 1].at - arr[0].at;
    out.push({
      kind: "retry-storm",
      name: host,
      p95: spanMs,
      count: arr.length,
      cause: { readAt: now, retry: { ...arr[arr.length - 1].destination, attempts: arr.length, spanMs } },
      hint: "The same outbound host was retried many times with no backoff."
    });
  }
  return out;
}
function collectConcurrentClusters() {
  const now = Date.now();
  const cutoff = now - RETRY_WINDOW_MS;
  const events = [];
  for (const [host, arr] of attemptsByHost) {
    for (const attempt of arr) {
      if (attempt.at >= cutoff) events.push({ ts: attempt.at, host, to: attempt.destination.to });
    }
  }
  if (events.length < CLUSTER_HOST_THRESHOLD) return [];
  events.sort((a, b) => a.ts - b.ts);
  let bestHosts = 0;
  let bestSpan = 0;
  let bestDestinations = [];
  let left = 0;
  const windowHosts = /* @__PURE__ */ new Map();
  for (let right = 0; right < events.length; right++) {
    const h = events[right].host;
    windowHosts.set(h, (windowHosts.get(h) ?? 0) + 1);
    while (events[right].ts - events[left].ts > CLUSTER_WINDOW_MS) {
      const lh = events[left].host;
      const c = (windowHosts.get(lh) ?? 0) - 1;
      if (c <= 0) windowHosts.delete(lh);
      else windowHosts.set(lh, c);
      left++;
    }
    const distinct = windowHosts.size;
    if (distinct > bestHosts) {
      bestHosts = distinct;
      bestSpan = events[right].ts - events[left].ts;
      const counts = /* @__PURE__ */ new Map();
      const destinations = /* @__PURE__ */ new Map();
      for (let i = left; i <= right; i++) destinations.set(events[i].host, events[i].to);
      for (const to of destinations.values()) {
        counts.set(to, (counts.get(to) ?? 0) + 1);
      }
      bestDestinations = [...counts].map(([to, hosts]) => ({ to, hosts })).sort((a, b) => b.hosts - a.hosts || (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));
    }
  }
  if (bestHosts < CLUSTER_HOST_THRESHOLD) return [];
  return [
    {
      kind: "api-thundering-herd",
      name: "outbound-fan-out",
      p95: bestSpan,
      count: bestHosts,
      cause: { readAt: now, fanOut: { hosts: bestHosts, windowMs: bestSpan, destinations: bestDestinations } },
      hint: "Many distinct outbound hosts were contacted in a single burst (a thundering-herd fan-out)."
    }
  ];
}
let inFlight = 0;
let idleSince = 0;
let idleElu = null;
let idleBurnCount = 0;
let worstIdleActiveMs = 0;
function eluAvailable() {
  return typeof perfHooks?.eventLoopUtilization === "function";
}
function noteRequestStart() {
  if (isBoosthisDisabled() || isKitLocked()) return;
  ensureArmed();
  noteSuspendActivity();
  if (inFlight === 0 && idleSince > 0 && idleElu && eluAvailable()) {
    const wallGap = Date.now() - idleSince;
    if (wallGap >= IDLE_GAP_MS) {
      try {
        const delta = perfHooks.eventLoopUtilization(idleElu);
        if (delta.active >= IDLE_ACTIVE_MS && delta.utilization >= IDLE_UTIL_THRESHOLD) {
          idleBurnCount++;
          worstIdleActiveMs = Math.max(worstIdleActiveMs, Math.round(delta.active));
        }
      } catch {
      }
    }
    noteIdleEnd();
  }
  inFlight++;
}
function noteRequestEnd() {
  if (isBoosthisDisabled() || isKitLocked()) return;
  if (inFlight > 0) inFlight--;
  if (inFlight === 0) {
    idleSince = Date.now();
    if (eluAvailable()) {
      try {
        idleElu = perfHooks.eventLoopUtilization();
      } catch {
        idleElu = null;
      }
    }
    noteIdleStart();
    noteSuspendIdleStart();
  }
}
function collectIdleBurn() {
  if (idleBurnCount === 0) return [];
  return [
    {
      kind: "idle-burn",
      name: "cpu-during-idle",
      p95: worstIdleActiveMs,
      count: idleBurnCount,
      hint: "The event loop kept burning CPU while no request was in flight."
    }
  ];
}
let armed = false;
let unsubscribe = null;
function ensureArmed() {
  if (armed || isBoosthisDisabled() || isKitLocked()) return;
  armed = true;
  try {
    const dc = {
      subscribe: dcSubscribe,
      unsubscribe: dcUnsubscribe
    };
    if (typeof dc.subscribe !== "function") return;
    const onCreate = (msg) => {
      const req = msg?.request;
      if (req) propagateTraceToNextHop(req);
      try {
        const whose = attributeOutboundRequest(req);
        if (!whose) return;
        const declared = req ? matchDeclaredCall(req.origin, req.path) : null;
        recordOutboundAttempt(req?.origin, req?.path);
        if (req) {
          if (declared !== null) recordDeclaredAttemptStart(req, whose, declared);
          else recordAttemptStart(req, whose);
        }
        if (req && declared !== null) {
          if (!isHostedDatabaseCall(hostOf(req.origin), req.path) && aiProviderCode(hostOf(req.origin)) === 0) {
            noteDependencyStart(req, hostOf(req.origin), true);
          }
          return;
        }
        if (req) {
          const target = `${String(req.method ?? "")} ${String(req.origin ?? "")}${String(req.path ?? "")}`;
          if (isHostedDatabaseCall(hostOf(req.origin), req.path)) {
            noteHostedDbStart(req, target);
          } else if (aiProviderCode(hostOf(req.origin)) > 0) {
          } else {
            noteOutboundStart(req, target);
          }
          if (!isHostedDatabaseCall(hostOf(req.origin), req.path) && aiProviderCode(hostOf(req.origin)) === 0) {
            noteDependencyStart(req, hostOf(req.origin));
          }
        }
      } catch {
      }
    };
    const onHeaders = (msg) => {
      try {
        const m = msg;
        const req = m?.request;
        if (!attributeOutboundRequest(req)) {
          discardAttempt(req);
          return;
        }
        if (req) recordAttemptComplete(req);
        if (req) noteOutboundEnd(req);
        if (req) {
          noteHostedDbEnd(
            req,
            outcomeForStatus(m?.response?.statusCode) !== "ok",
            { status: typeof m?.response?.statusCode === "number" ? m.response.statusCode : void 0 }
          );
        }
        if (req) {
          noteDependencyEnd(
            req,
            outcomeForStatus(m?.response?.statusCode),
            { status: typeof m?.response?.statusCode === "number" ? m.response.statusCode : void 0 }
          );
        }
        noteEdgeCacheHeaders(
          msg?.response?.headers
        );
      } catch {
      }
    };
    const onError = (msg) => {
      try {
        const m = msg;
        if (!m?.request) return;
        if (!attributeOutboundRequest(m.request)) {
          discardAttempt(m.request);
          return;
        }
        const code = String(m.error?.code ?? "");
        const name = String(m.error?.name ?? "");
        const isTimeout = /timeout/i.test(code) || /timeout/i.test(name) || code === "UND_ERR_HEADERS_TIMEOUT" || code === "UND_ERR_BODY_TIMEOUT" || code === "UND_ERR_CONNECT_TIMEOUT";
        recordAttemptError(m.request, isTimeout);
        noteOutboundEnd(m.request);
        noteHostedDbEnd(m.request, true, { error: m.error });
        noteDependencyEnd(m.request, isTimeout ? "timedout" : "failed", { error: m.error });
      } catch {
      }
    };
    const pairKey = (params) => {
      const p = params;
      const h = typeof p?.hostname === "string" ? p.hostname : "";
      const fallback = typeof p?.host === "string" ? p.host : "";
      const port = p?.port == null ? "" : String(p.port);
      return `${(h || fallback).toLowerCase()}|${port}`;
    };
    const connectHostOf = (params) => {
      const p = params;
      const rawHost = typeof p?.hostname === "string" ? p.hostname : typeof p?.host === "string" ? p.host : "";
      return hostOf(rawHost) || String(rawHost).toLowerCase();
    };
    const onBeforeConnect = (msg) => {
      try {
        const params = msg?.connectParams;
        const host = connectHostOf(params);
        const whose = attributeOutbound(host);
        if (!whose) return;
        recordConnectStart(pairKey(params), dependencyKindForHost(host), whose);
      } catch {
      }
    };
    const onConnected = (msg) => {
      try {
        const params = msg?.connectParams;
        const whose = attributeOutbound(connectHostOf(params));
        if (!whose) return;
        recordConnectionOpened(whose);
        recordConnectEstablished(pairKey(params));
      } catch {
      }
    };
    const onConnectError = (msg) => {
      try {
        const params = msg?.connectParams;
        if (!attributeOutbound(connectHostOf(params))) return;
        recordConnectFailed(pairKey(params));
      } catch {
      }
    };
    dc.subscribe("undici:request:create", onCreate);
    dc.subscribe("undici:client:beforeConnect", onBeforeConnect);
    dc.subscribe("undici:client:connected", onConnected);
    dc.subscribe("undici:client:connectError", onConnectError);
    dc.subscribe("undici:request:headers", onHeaders);
    dc.subscribe("undici:request:error", onError);
    if (typeof dc.unsubscribe === "function") {
      unsubscribe = () => {
        try {
          dc.unsubscribe("undici:request:create", onCreate);
          dc.unsubscribe("undici:client:beforeConnect", onBeforeConnect);
          dc.unsubscribe("undici:client:connected", onConnected);
          dc.unsubscribe("undici:client:connectError", onConnectError);
          dc.unsubscribe("undici:request:headers", onHeaders);
          dc.unsubscribe("undici:request:error", onError);
        } catch {
        }
      };
    }
  } catch {
  }
}
function collectDetectorFindings() {
  if (isBoosthisDisabled()) return [];
  return [
    ...collectRetryStorms(),
    ...collectConcurrentClusters(),
    ...collectIdleBurn(),
    // Realtime: reconnect storms, silent-but-open connections and connections
    // nothing ever closes. Same counters the tile reads, so the two surfaces
    // can never disagree.
    ...collectLiveConnectionFindings(),
    // What this app's own replies say about caching. Same finding shape, so it
    // rides the same candidate + snapshot path as everything else.
    ...collectCacheDirectiveFindings()
  ];
}
function clearDetectors() {
  attemptsByHost.clear();
  retryBurstPeak = 0;
  outboundAttemptsSeen = 0;
  inFlight = 0;
  idleSince = 0;
  idleElu = null;
  idleBurnCount = 0;
  worstIdleActiveMs = 0;
  clearNetworkSampler();
  clearServerMeters();
  clearHeldOpen();
  clearDeclaredWaitCounts();
  clearRepeatedWork();
  clearDbWork();
  unpatchJobSystems();
  clearJobWork();
  clearDependencyWork();
  clearFailureContainment();
  clearEdgeCache();
  clearCacheDirectives();
  clearSuspendSensor();
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  armed = false;
}
const _detectorInternals = {
  RETRY_WINDOW_MS,
  RETRY_STORM_THRESHOLD,
  RETRY_BACKOFF_MS,
  CLUSTER_WINDOW_MS,
  CLUSTER_HOST_THRESHOLD,
  IDLE_GAP_MS,
  IDLE_ACTIVE_MS,
  IDLE_UTIL_THRESHOLD,
  reset() {
    clearDetectors();
    _ownTrafficInternals.reset();
  },
  markIdleBurnForTests(activeMs) {
    idleBurnCount++;
    worstIdleActiveMs = Math.max(worstIdleActiveMs, Math.round(activeMs));
  }
};
function propagateTraceToNextHop(req) {
  try {
    if (isBoosthisDisabled()) return;
    if (typeof req.method === "string" && req.method.toUpperCase() === "CONNECT") {
      return;
    }
    if (typeof req.addHeader !== "function") return;
    const host = destinationHostOf(req);
    if (isOwnUploadHost(host)) return;
    const carrier = currentRequestScope()?.trace;
    if (!carrier) return;
    if (!shouldPropagateTo(host, servedHostOf(carrier))) return;
    if (carriesAnyTraceHeader(req.headers)) return;
    const built = forwardTraceHeaders(carrier);
    const ready = [];
    for (const name of PROPAGATED_HEADERS) {
      const value = built[name];
      if (typeof value === "string" && value.length > 0) {
        ready.push(name, value);
      }
    }
    if (ready.length === 0) return;
    const add = req.addHeader;
    const before = Array.isArray(req.headers) ? req.headers.slice() : req.headers;
    try {
      for (let i = 0; i < ready.length; i += 2) {
        add.call(req, ready[i], ready[i + 1]);
      }
    } catch {
      try {
        const current = req.headers;
        if (Array.isArray(current) && Array.isArray(before)) {
          current.length = 0;
          for (const item of before) current.push(item);
        } else {
          req.headers = before;
        }
      } catch {
      }
      return;
    }
  } catch {
  }
}
export {
  _detectorInternals,
  clearDetectors,
  collectDetectorFindings,
  hostOf,
  ignoreHost,
  noteRequestEnd,
  noteRequestStart,
  outboundAttemptsObserved,
  peakRetryBurst,
  recordOutboundAttempt
};
