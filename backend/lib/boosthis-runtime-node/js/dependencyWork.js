// @ts-nocheck
/* eslint-disable */
// Built from src/dependencyWork.ts so plain node can run the kit. Do not edit.
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import { callFailure, countFailure, countService, emptyFailures, topServices } from "./callFailures.js";
import { currentRequestScope, requestSettled } from "./repeatedWork.js";
import { currentLinkedScope, noteLinkedCall } from "./linkedSteps.js";
import { isSettledAt } from "./settleRule.js";
import { hostPackageIsLoaded } from "./dbWork.js";
import {
  DEPENDENCY_KINDS,
  KIND_RULES,
  IN_APP_SIGNIN_PACKAGES,
  dependencyFor
} from "./dependencyKinds.js";
const KIND_RING = 128;
function emptyKind() {
  return {
    ...emptyFailures(),
    services: /* @__PURE__ */ new Map(),
    calls: 0,
    ok: 0,
    failed: 0,
    timedOut: 0,
    requests: 0,
    ms: [],
    msAt: 0,
    worstMs: 0
  };
}
const totals = /* @__PURE__ */ new Map();
const learnedServices = /* @__PURE__ */ new Map();
function totalsFor(kind) {
  let t = totals.get(kind);
  if (!t) {
    t = emptyKind();
    totals.set(kind, t);
  }
  return t;
}
function pushMs(t, ms) {
  if (t.ms.length < KIND_RING) t.ms.push(ms);
  else {
    t.ms[t.msAt] = ms;
    t.msAt = (t.msAt + 1) % KIND_RING;
  }
}
function foldCall(t, ms, outcome, timed = true, word, service) {
  t.calls += 1;
  if (outcome === "timedout") t.timedOut += 1;
  else if (outcome === "failed") t.failed += 1;
  else t.ok += 1;
  countFailure(t, word, outcome === "failed", outcome === "timedout");
  countService(t.services, service, outcome === "failed", outcome === "timedout");
  if (!timed) return;
  if (ms > t.worstMs) t.worstMs = ms;
  pushMs(t, ms);
}
function mergeKind(into, from) {
  into.calls += from.calls;
  into.ok += from.ok;
  into.failed += from.failed;
  into.timedOut += from.timedOut;
  for (const field of Object.keys(emptyFailures())) into[field] += from[field];
  for (const [name, s] of from.services) {
    let dest = into.services.get(name);
    if (!dest && into.services.size < 8) {
      dest = { name, calls: 0, failed: 0, timedOut: 0 };
      into.services.set(name, dest);
    }
    if (dest) {
      dest.calls += s.calls;
      dest.failed += s.failed;
      dest.timedOut += s.timedOut;
    }
  }
  if (from.worstMs > into.worstMs) into.worstMs = from.worstMs;
  for (const ms of from.ms) pushMs(into, ms);
}
const closedVerdict = /* @__PURE__ */ new WeakMap();
function tallyFor(scope) {
  let t = scope.dep;
  if (!t) {
    t = { byKind: /* @__PURE__ */ new Map(), count: 0, failed: 0, ms: 0, kinds: /* @__PURE__ */ new Map() };
    scope.dep = t;
  }
  return t;
}
let watchedRequests = 0;
let watchedRequestMs = 0;
let depMs = 0;
let dbMs = 0;
let aiMs = 0;
let callCount = 0;
function noteDependencyCallIn(scope, kind, durationMs, outcome, timed = true, detail) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const elapsed = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
    const ms = timed ? elapsed : 0;
    const word = callFailure(detail?.status, detail?.error);
    let service = kind !== "other" && detail?.service && KIND_RULES.some((r) => r.kind === kind && r.service === detail.service) ? detail.service : void 0;
    if (service) {
      let seen = learnedServices.get(kind);
      if (!seen) {
        seen = /* @__PURE__ */ new Set();
        learnedServices.set(kind, seen);
      }
      if (seen.has(service) || seen.size < 8) seen.add(service);
      else service = void 0;
    }
    if (!scope) {
      if (isSettledAt("latencyTail", Date.now() - elapsed)) {
        foldCall(totalsFor(kind), ms, outcome, timed, word, service);
      }
      return;
    }
    const closed = closedVerdict.get(scope);
    if (closed !== void 0) {
      if (closed === 1) foldCall(totalsFor(kind), ms, outcome, timed, word, service);
      return;
    }
    const rt = tallyFor(scope);
    rt.count += 1;
    if (outcome !== "ok") rt.failed += 1;
    rt.ms += ms;
    rt.byKind.set(kind, (rt.byKind.get(kind) ?? 0) + 1);
    let held = rt.kinds.get(kind);
    if (!held) {
      held = emptyKind();
      rt.kinds.set(kind, held);
    }
    foldCall(held, ms, outcome, timed, word, service);
  } catch {
  }
}
const pending = /* @__PURE__ */ new WeakMap();
function noteDependencyStart(token, host, declared = false) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    pending.set(token, {
      scope: currentRequestScope(),
      linked: declared ? null : currentLinkedScope(),
      ...dependencyFor(host),
      start: performance.now(),
      declared
    });
  } catch {
  }
}
function noteDependencyEnd(token, outcome, detail) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const p = pending.get(token);
    if (!p) return;
    pending.delete(token);
    if (p.declared) {
      if (outcome !== "ok") {
        noteDependencyCallIn(p.scope, p.kind, performance.now() - p.start, outcome, false, { ...detail, service: p.service });
      }
      return;
    }
    const end = performance.now();
    noteLinkedCall(p.linked, p.kind, p.start, end, outcome !== "ok");
    noteDependencyCallIn(p.scope, p.kind, end - p.start, outcome, true, { ...detail, service: p.service });
  } catch {
  }
}
function outcomeForStatus(status) {
  const s = typeof status === "number" && Number.isFinite(status) ? status : 0;
  if (s >= 500 || s === 429) return "failed";
  return "ok";
}
function endDependencyWork(scope, requestMs) {
  if (!scope) return;
  try {
    const settled = requestSettled(scope, "latencyTail");
    closedVerdict.set(scope, settled ? 1 : 0);
    const t = scope.dep;
    if (!t) return;
    scope.dep = void 0;
    if (t.count === 0) return;
    if (isBoosthisDisabled() || isKitLocked()) return;
    if (!settled) {
      settlingRequestCount += 1;
      return;
    }
    const wall = Number.isFinite(requestMs) && requestMs > 0 ? requestMs : 0;
    watchedRequests += 1;
    watchedRequestMs += wall;
    callCount += t.count;
    depMs += wall > 0 ? Math.min(t.ms, wall) : 0;
    const db = scope.db?.ms;
    if (typeof db === "number" && db > 0 && wall > 0) dbMs += Math.min(db, wall);
    const ai = scope.ai?.ms;
    if (typeof ai === "number" && ai > 0 && wall > 0) aiMs += Math.min(ai, wall);
    for (const [kind, held] of t.kinds) mergeKind(totalsFor(kind), held);
    t.kinds.clear();
    for (const kind of t.byKind.keys()) totalsFor(kind).requests += 1;
    t.byKind.clear();
  } catch {
  }
}
function inAppSigninDetected() {
  if (isBoosthisDisabled()) return false;
  try {
    for (const name of IN_APP_SIGNIN_PACKAGES) {
      if (hostPackageIsLoaded(name)) return true;
    }
  } catch {
    return false;
  }
  return false;
}
function p75Of(t) {
  if (t.ms.length === 0) return 0;
  const sorted = [...t.ms].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75));
  return Math.round(sorted[i]);
}
let settlingRequestCount = 0;
function dependencySettlingRequests() {
  return settlingRequestCount;
}
function getDependencyStats() {
  const groups = [];
  for (const kind of DEPENDENCY_KINDS) {
    const t = totals.get(kind);
    if (!t || t.calls === 0) continue;
    groups.push({
      kind,
      calls: t.calls,
      failed: t.failed,
      timedOut: t.timedOut,
      couldNotConnect: t.couldNotConnect,
      noAnswer: t.noAnswer,
      turnedAway: t.turnedAway,
      tooManyRequests: t.tooManyRequests,
      serverError: t.serverError,
      cancelled: t.cancelled,
      ...kind !== "other" ? topServices(t.services) : {},
      requests: t.requests,
      p75Ms: p75Of(t),
      worstMs: Math.round(t.worstMs),
      // Intermittent: this kind BOTH worked and broke inside the window. A
      // dependency that always fails is a different problem from one that
      // fails now and then, and the fix is different too — so the two are
      // never rendered as the same finding.
      flaky: t.ok > 0 && t.failed + t.timedOut > 0 ? 1 : 0
    });
  }
  return {
    watchedRequests,
    watchedRequestMs,
    depMs,
    dbMs,
    aiMs,
    callCount,
    groups,
    inAppSignin: inAppSigninDetected() ? 1 : 0
  };
}
function clearDependencyWork() {
  learnedServices.clear();
  settlingRequestCount = 0;
  totals.clear();
  watchedRequests = 0;
  watchedRequestMs = 0;
  depMs = 0;
  dbMs = 0;
  aiMs = 0;
  callCount = 0;
}
const __dependencyInternals = {
  fileSynthetic(kind, durationMs, outcome, scope) {
    noteDependencyCallIn(scope ?? currentRequestScope(), kind, durationMs, outcome);
  }
};
export {
  __dependencyInternals,
  clearDependencyWork,
  dependencySettlingRequests,
  endDependencyWork,
  getDependencyStats,
  inAppSigninDetected,
  noteDependencyCallIn,
  noteDependencyEnd,
  noteDependencyStart,
  outcomeForStatus
};
