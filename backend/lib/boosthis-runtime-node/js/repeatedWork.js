// @ts-nocheck
/* eslint-disable */
// Built from src/repeatedWork.ts so plain node can run the kit. Do not edit.
import { isSettledAt } from "./settleRule.js";
import { AsyncLocalStorage } from "node:async_hooks";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
const MAX_DISTINCT_CALLS = 512;
const MAX_ARGS = 8;
const MAX_DEPTH = 2;
const MAX_MEMBERS = 12;
const MAX_STRING = 64;
const MAX_IDENTITY_CHARS = 512;
let store;
function requestStore() {
  if (store !== void 0) return store;
  store = null;
  try {
    if (typeof AsyncLocalStorage === "function") {
      store = new AsyncLocalStorage();
    }
  } catch {
    store = null;
  }
  return store;
}
let watchedRequests = 0;
let requestsWithRepeat = 0;
let worstRepeats = 0;
let watchedRequestMs = 0;
let redundantMs = 0;
function fnv1a(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function renderValue(v, depth) {
  const t = typeof v;
  if (t === "string") {
    const s = v;
    return s.length > MAX_STRING ? `s${s.length}:${s.slice(0, MAX_STRING)}` : `s:${s}`;
  }
  if (t === "number" || t === "boolean" || t === "bigint") return `${t[0]}:${String(v)}`;
  if (t === "undefined") return "u";
  if (t === "function") return "f";
  if (t === "symbol") return "y";
  if (v === null) return "z";
  if (depth <= 0) return "o";
  try {
    if (Array.isArray(v)) {
      const n = Math.min(v.length, MAX_MEMBERS);
      const parts2 = [];
      for (let i = 0; i < n; i++) parts2.push(renderValue(v[i], depth - 1));
      return `[${v.length}:${parts2.join(",")}]`;
    }
    if (v instanceof Date) return `d:${v.getTime()}`;
    if (ArrayBuffer.isView(v)) return `b:${v.byteLength}`;
    const o = v;
    const keys = Object.keys(o).sort().slice(0, MAX_MEMBERS);
    const parts = [];
    for (const k of keys) parts.push(`${k}=${renderValue(o[k], depth - 1)}`);
    return `{${parts.join(",")}}`;
  } catch {
    return "o";
  }
}
function callIdentity(target, args) {
  try {
    let s = target;
    const n = Math.min(args.length, MAX_ARGS);
    for (let i = 0; i < n; i++) {
      s += `|${renderValue(args[i], MAX_DEPTH)}`;
      if (s.length > MAX_IDENTITY_CHARS) {
        s = s.slice(0, MAX_IDENTITY_CHARS);
        break;
      }
    }
    if (args.length > n) s += `|+${args.length}`;
    return fnv1a(s);
  } catch {
    return fnv1a(target);
  }
}
function file(scope, identity, durationMs) {
  const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
  const seen = scope.calls.get(identity);
  if (seen) {
    seen.n += 1;
    seen.ms += ms;
    return;
  }
  if (scope.calls.size >= MAX_DISTINCT_CALLS) return;
  scope.calls.set(identity, { n: 1, ms });
}
function noteWatchedCall(identity, durationMs) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const scope = requestStore()?.getStore();
    if (scope) file(scope, identity, durationMs);
  } catch {
  }
}
const pendingOutbound = /* @__PURE__ */ new WeakMap();
function noteOutboundStart(token, target) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const scope = requestStore()?.getStore();
    if (!scope) return;
    pendingOutbound.set(token, {
      scope,
      identity: callIdentity(target, []),
      start: performance.now()
    });
  } catch {
  }
}
function noteOutboundEnd(token) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const p = pendingOutbound.get(token);
    if (!p) return;
    pendingOutbound.delete(token);
    file(p.scope, p.identity, performance.now() - p.start);
  } catch {
  }
}
let requestBegun = false;
function beginRequestWork() {
  if (isBoosthisDisabled() || isKitLocked()) return null;
  if (!requestStore()) return null;
  requestBegun = true;
  return { calls: /* @__PURE__ */ new Map(), openedAt: Date.now() };
}
function anyRequestBegun() {
  return requestBegun;
}
function requestScopesReadable() {
  return requestStore() !== null;
}
function _resetRequestBegunForTests() {
  requestBegun = false;
}
function noteRouteFirst(scope, first) {
  if (scope && first) scope.routeFirst = 1;
}
function requestSettled(scope, family) {
  return scope.routeFirst !== 1 && isSettledAt(family, scope.openedAt ?? 0);
}
let settlingRequestCount = 0;
function runInRequestWork(scope, fn) {
  const s = scope ? requestStore() : null;
  if (!scope || !s) return fn();
  return s.run(scope, fn);
}
function currentRequestScope() {
  try {
    return requestStore()?.getStore() ?? null;
  } catch {
    return null;
  }
}
function identifiedCallCount(scope) {
  if (!scope) return 0;
  try {
    let n = 0;
    for (const tally of scope.calls.values()) n += tally.n;
    return n;
  } catch {
    return 0;
  }
}
function endRequestWork(scope, requestMs) {
  if (!scope) return;
  try {
    let identified = 0;
    let worst = 0;
    let redundant = 0;
    for (const tally of scope.calls.values()) {
      identified += tally.n;
      if (tally.n > worst) worst = tally.n;
      if (tally.n > 1) redundant += tally.ms / tally.n * (tally.n - 1);
    }
    scope.calls.clear();
    if (identified === 0) return;
    if (isBoosthisDisabled() || isKitLocked()) return;
    if (!requestSettled(scope, "startupEvent")) {
      settlingRequestCount += 1;
      return;
    }
    const wall = Number.isFinite(requestMs) && requestMs > 0 ? requestMs : 0;
    watchedRequests += 1;
    watchedRequestMs += wall;
    if (worst > worstRepeats) worstRepeats = worst;
    if (worst > 1) {
      requestsWithRepeat += 1;
      redundantMs += Math.min(redundant, wall);
    }
  } catch {
  }
}
function getRepeatedWorkStats() {
  return {
    watchedRequests,
    requestsWithRepeat,
    worstRepeats,
    redundantMs,
    watchedRequestMs,
    settlingRequests: settlingRequestCount
  };
}
function clearRepeatedWork() {
  settlingRequestCount = 0;
  watchedRequests = 0;
  requestsWithRepeat = 0;
  worstRepeats = 0;
  watchedRequestMs = 0;
  redundantMs = 0;
}
const _repeatedWorkInternals = {
  MAX_DISTINCT_CALLS,
  MAX_ARGS,
  MAX_IDENTITY_CHARS,
  renderValue,
  fnv1a
};
export {
  _repeatedWorkInternals,
  _resetRequestBegunForTests,
  anyRequestBegun,
  beginRequestWork,
  callIdentity,
  clearRepeatedWork,
  currentRequestScope,
  endRequestWork,
  getRepeatedWorkStats,
  identifiedCallCount,
  noteOutboundEnd,
  noteOutboundStart,
  noteRouteFirst,
  noteWatchedCall,
  requestScopesReadable,
  requestSettled,
  runInRequestWork
};
