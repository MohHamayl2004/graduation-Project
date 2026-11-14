// @ts-nocheck
/* eslint-disable */
// Built from src/networkSampler.ts so plain node can run the kit. Do not edit.
import { isAppTraffic } from "./ownTraffic.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { noteDeclaredCallExcluded } from "./declaredWaits.js";
import { SETTLE_FAMILIES, settledFromMs, settledTail } from "./settleRule.js";
const NETWORK_STALL_MS = 1e4;
const MAX_INFLIGHT = 512;
const MAX_DURATIONS = 500;
const inFlight = /* @__PURE__ */ new Map();
let inFlightTotal = 0;
let durations = [];
let timed = [];
let settledAttempts = 0;
let settledCompleted = 0;
let settledFailed = 0;
let settledTimeouts = 0;
let settledStalls = 0;
const settledStart = (startMs) => startMs >= settledFromMs("latencyTail");
function bank(dur, startMs) {
  durations.push(dur);
  if (durations.length > MAX_DURATIONS) durations.shift();
  timed.push({ t: startMs, v: dur });
  if (timed.length > MAX_DURATIONS) timed.shift();
  if (dur > worstMs) worstMs = dur;
}
let connectCount = 0;
let attemptCount = 0;
let completedCount = 0;
let failedCount = 0;
let timeoutCount = 0;
let stallCount = 0;
let worstMs = 0;
let unattributedRefused = 0;
function refuseUnattributed(pass) {
  if (isAppTraffic(pass)) return false;
  if (unattributedRefused < Number.MAX_SAFE_INTEGER) unattributedRefused++;
  return true;
}
function recordAttemptStart(token, whose) {
  if (isBoosthisDisabled()) return;
  if (refuseUnattributed(whose)) return;
  attemptCount++;
  if (settledStart(Date.now())) settledAttempts++;
  if (inFlightTotal >= MAX_INFLIGHT) return;
  const rec = { start: Date.now(), stallTimer: null };
  const timer = setTimeout(() => {
    if (drop(token, rec)) {
      stallCount++;
      if (settledStart(rec.start)) settledStalls++;
    }
  }, NETWORK_STALL_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
  rec.stallTimer = timer;
  const q = inFlight.get(token);
  if (q) q.push(rec);
  else inFlight.set(token, [rec]);
  inFlightTotal++;
}
let declaredInFlight = /* @__PURE__ */ new WeakMap();
function recordDeclaredAttemptStart(token, whose, match) {
  if (isBoosthisDisabled()) return;
  if (refuseUnattributed(whose)) return;
  if (typeof token !== "object" || token === null) return;
  const rec = { start: Date.now(), match };
  const q = declaredInFlight.get(token);
  if (q) q.push(rec);
  else declaredInFlight.set(token, [rec]);
}
function resolveDeclared(token) {
  if (typeof token !== "object" || token === null) return null;
  const q = declaredInFlight.get(token);
  const rec = q?.shift();
  if (!rec) return null;
  if (q.length === 0) declaredInFlight.delete(token);
  return rec;
}
function drop(token, rec) {
  const q = inFlight.get(token);
  if (!q) return false;
  const i = q.indexOf(rec);
  if (i < 0) return false;
  q.splice(i, 1);
  inFlightTotal--;
  if (q.length === 0) inFlight.delete(token);
  if (rec.stallTimer) clearTimeout(rec.stallTimer);
  return true;
}
function resolve(token) {
  const q = inFlight.get(token);
  const rec = q?.[0];
  if (!rec) return null;
  drop(token, rec);
  const dur = Date.now() - rec.start;
  return { dur: dur >= 0 ? dur : 0, start: rec.start };
}
function recordAttemptComplete(token) {
  if (isBoosthisDisabled()) return;
  const done = resolve(token);
  if (done === null) {
    const declared = resolveDeclared(token);
    if (declared !== null) {
      noteDeclaredCallExcluded(declared.match, Math.max(0, Date.now() - declared.start));
    }
    return;
  }
  completedCount++;
  if (settledStart(done.start)) settledCompleted++;
  bank(done.dur, done.start);
}
function recordAttemptError(token, timeout = false) {
  if (isBoosthisDisabled()) return;
  const done = resolve(token);
  if (done === null) {
    const declared = resolveDeclared(token);
    if (declared === null) return;
    attemptCount++;
    if (timeout) timeoutCount++;
    else failedCount++;
    if (settledStart(declared.start)) {
      settledAttempts++;
      if (timeout) settledTimeouts++;
      else settledFailed++;
    }
    return;
  }
  if (timeout) timeoutCount++;
  else failedCount++;
  if (settledStart(done.start)) {
    if (timeout) settledTimeouts++;
    else settledFailed++;
  }
  bank(done.dur, done.start);
}
function discardAttempt(token) {
  if (isBoosthisDisabled()) return;
  const q = inFlight.get(token);
  const rec = q?.[0];
  if (!rec) {
    resolveDeclared(token);
    return;
  }
  if (drop(token, rec) && attemptCount > 0) {
    attemptCount--;
    if (settledStart(rec.start) && settledAttempts > 0) settledAttempts--;
  }
}
function recordConnectionOpened(whose) {
  if (isBoosthisDisabled()) return;
  if (refuseUnattributed(whose)) return;
  connectCount++;
}
function getConnectionSetupStats() {
  return { connectCount, completedCount };
}
const MIN_CONNECT_CALLS = 20;
function readConnectionSetup() {
  if (isBoosthisDisabled()) return null;
  try {
    if (completedCount < MIN_CONNECT_CALLS) return null;
    const reconnectPct = Math.round(100 * Math.min(connectCount, completedCount) * 10 / completedCount) / 10;
    return {
      score: null,
      rating: "not-scored",
      reconnectPct,
      connectCount,
      attemptCount: completedCount
    };
  } catch {
    return null;
  }
}
function percentile(values, q) {
  if (values.length === 0) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.ceil(q * s.length) - 1));
  return s[idx];
}
function getNetworkStats() {
  return getNetworkStatsLifetime();
}
function getSettledNetworkStats() {
  const tail = settledTail(timed, 75);
  return {
    attemptCount: settledAttempts,
    completedCount: settledCompleted,
    failedCount: settledFailed,
    timeoutCount: settledTimeouts,
    stallCount: settledStalls,
    p75Ms: tail ? tail.value : null,
    worstMs,
    judged: tail ? tail.n : 0
  };
}
const NETWORK_SETTLED_FLOOR = SETTLE_FAMILIES.latencyTail.minSamples;
function getNetworkStatsLifetime() {
  return {
    attemptCount,
    completedCount,
    failedCount,
    timeoutCount,
    stallCount,
    p75Ms: percentile(durations, 0.75),
    worstMs
  };
}
const MAX_PENDING_CONNECTS = 64;
const MAX_SETUPS_PER_KIND = 200;
const PENDING_CONNECT_TTL_MS = 6e4;
const pendingConnects = /* @__PURE__ */ new Map();
let pendingConnectTotal = 0;
const setupsByKind = /* @__PURE__ */ new Map();
let newConnectionsTimed = 0;
let settlingConnects = 0;
function dependencyDistanceSettlingConnects() {
  return settlingConnects;
}
function nowMs() {
  const p = globalThis.performance;
  return typeof p?.now === "function" ? p.now() : Date.now();
}
function takePending(key) {
  const q = pendingConnects.get(key);
  if (!q || q.length === 0) return null;
  const rec = q.shift();
  pendingConnectTotal--;
  if (q.length === 0) pendingConnects.delete(key);
  return rec;
}
function recordConnectStart(key, kind, whose) {
  if (isBoosthisDisabled()) return;
  if (refuseUnattributed(whose)) return;
  if (!key || !Number.isFinite(kind) || kind <= 0) return;
  const at = nowMs();
  if (pendingConnectTotal >= MAX_PENDING_CONNECTS) {
    for (const [k, q2] of pendingConnects) {
      while (q2.length > 0 && at - q2[0].at > PENDING_CONNECT_TTL_MS) {
        q2.shift();
        pendingConnectTotal--;
      }
      if (q2.length === 0) pendingConnects.delete(k);
    }
    if (pendingConnectTotal >= MAX_PENDING_CONNECTS) return;
  }
  const q = pendingConnects.get(key);
  if (q) q.push({ at, kind });
  else pendingConnects.set(key, [{ at, kind }]);
  pendingConnectTotal++;
}
function recordConnectEstablished(key) {
  if (isBoosthisDisabled()) return;
  const rec = takePending(key);
  if (!rec) return;
  const dur = nowMs() - rec.at;
  if (!(dur >= 0) || dur > PENDING_CONNECT_TTL_MS) return;
  newConnectionsTimed++;
  if (Date.now() < settledFromMs("latencyTail")) {
    settlingConnects++;
    return;
  }
  const list = setupsByKind.get(rec.kind);
  if (list) {
    list.push(dur);
    if (list.length > MAX_SETUPS_PER_KIND) list.shift();
  } else {
    setupsByKind.set(rec.kind, [dur]);
  }
}
function recordConnectFailed(key) {
  if (isBoosthisDisabled()) return;
  takePending(key);
}
function median(values) {
  if (values.length === 0) return 0;
  const s = values.slice().sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function getDependencyDistanceStats() {
  const kinds = [];
  for (const [kind, list] of setupsByKind) {
    if (list.length === 0) continue;
    kinds.push({ kind, connections: list.length, setupMs: median(list) });
  }
  return { kinds, newConnections: newConnectionsTimed };
}
function clearNetworkSampler() {
  for (const q of inFlight.values()) {
    for (const rec of q) {
      if (rec.stallTimer) clearTimeout(rec.stallTimer);
    }
  }
  inFlight.clear();
  inFlightTotal = 0;
  declaredInFlight = /* @__PURE__ */ new WeakMap();
  durations = [];
  timed = [];
  settledAttempts = 0;
  settledCompleted = 0;
  settledFailed = 0;
  settledTimeouts = 0;
  settledStalls = 0;
  attemptCount = 0;
  completedCount = 0;
  failedCount = 0;
  timeoutCount = 0;
  stallCount = 0;
  worstMs = 0;
  connectCount = 0;
  pendingConnects.clear();
  pendingConnectTotal = 0;
  setupsByKind.clear();
  newConnectionsTimed = 0;
  settlingConnects = 0;
  unattributedRefused = 0;
}
const _networkSamplerInternals = {
  NETWORK_STALL_MS,
  reset() {
    clearNetworkSampler();
  },
  /** Attempts tracked in flight — records, NOT keys: retries queued under one
   *  token are several attempts and must read as several. */
  get inFlightSize() {
    return inFlightTotal;
  },
  /** Inject synthetic opened connections (connectionSetup tests). */
  recordSyntheticConnects(n) {
    connectCount += n;
  },
  /** Inject synthetic NEW-connection setup times for one dependency kind, so
   *  the distance axis can be tested without a live handshake. */
  recordSyntheticSetups(kind, ...durationsMs) {
    for (const d of durationsMs) {
      const list = setupsByKind.get(kind);
      if (list) {
        list.push(d);
        if (list.length > MAX_SETUPS_PER_KIND) list.shift();
      } else {
        setupsByKind.set(kind, [d]);
      }
      newConnectionsTimed++;
    }
  },
  get pendingConnectCount() {
    return pendingConnectTotal;
  },
  /** Starts refused for not saying whose traffic they were. Above zero means a
   *  caller is feeding this sampler without asking `ownTraffic`. */
  get unattributedRefused() {
    return unattributedRefused;
  },
  /** Inject a fully-resolved synthetic attempt (hermetic tests without a live
   *  undici round-trip). `outcome`: completed | failed | timeout | stall. */
  recordSyntheticAttempt(outcome, durationMs = 0, startMs = Date.now()) {
    attemptCount++;
    if (outcome === "completed") completedCount++;
    else if (outcome === "failed") failedCount++;
    else if (outcome === "timeout") timeoutCount++;
    else stallCount++;
    if (settledStart(startMs)) {
      settledAttempts++;
      if (outcome === "completed") settledCompleted++;
      else if (outcome === "failed") settledFailed++;
      else if (outcome === "timeout") settledTimeouts++;
      else settledStalls++;
    }
    if (outcome !== "stall") bank(durationMs, startMs);
  }
};
export {
  NETWORK_SETTLED_FLOOR,
  NETWORK_STALL_MS,
  _networkSamplerInternals,
  clearNetworkSampler,
  dependencyDistanceSettlingConnects,
  discardAttempt,
  getConnectionSetupStats,
  getDependencyDistanceStats,
  getNetworkStats,
  getSettledNetworkStats,
  readConnectionSetup,
  recordAttemptComplete,
  recordAttemptError,
  recordAttemptStart,
  recordConnectEstablished,
  recordConnectFailed,
  recordConnectStart,
  recordConnectionOpened,
  recordDeclaredAttemptStart
};
