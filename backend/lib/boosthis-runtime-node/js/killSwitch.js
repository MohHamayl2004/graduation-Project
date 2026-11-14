// @ts-nocheck
/* eslint-disable */
// Built from src/killSwitch.ts so plain node can run the kit. Do not edit.
import { performance as perfHooks } from "node:perf_hooks";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { readAnswerJson } from "./answerRead.js";
import { checkNoPII, checkNoPIIInUrl } from "./no-pii.js";
import { storage, storageDurable } from "./storage.js";
import { isServerlessMode } from "./serverless.js";
import {
  adoptServedHostSalt,
  servedHostCodesField,
  setServedHostEarlyCheck
} from "./servedHostCodes.js";
const CACHE_KEY = "boosthis.entitlement.v1";
const ACTIVE = "active";
const DISSOLVED = "dissolved";
const UNDERSTANDS = [DISSOLVED];
const ASK_AGAIN = "after-restart";
const DEFAULT_GRACE_SECONDS = 7 * 24 * 60 * 60;
const MAX_GRACE_SECONDS = 7 * 24 * 60 * 60;
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1e3;
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1e3;
const DEFAULT_TIMEOUT_MS = 8e3;
const FORCE_CHECK_THROTTLE_MS = 60 * 1e3;
let memStatus = ACTIVE;
let memInert = false;
let memMessage = null;
let hydrated = false;
let memRecheckAt = null;
let askedThisRun = false;
let dissolvedThisRun = false;
let handlers = null;
function setKitLockHandlers(next) {
  handlers = next;
}
function runStep(step) {
  try {
    step();
  } catch {
  }
}
let memActivated = null;
const LOCKED_MESSAGE = "Boosthis is locked. Connect this app to Boosthis with your project key to activate it.";
let awaitingFirstAnswer = false;
const AWAITING_MESSAGE = "Boosthis is waiting for its first answer from the server on this function. Nothing is uploaded until it arrives.";
function isAwaitingFirstAnswer() {
  return awaitingFirstAnswer && memActivated !== true;
}
let memCheckedAt = null;
let memGraceSeconds = DEFAULT_GRACE_SECONDS;
let memInitialAgeMs = 0;
let memMonoAt = null;
let memMaxSeenWall = null;
let lastForcedCheckAt = null;
import { FIRST_VERDICT_SCHEDULE_MS, REGISTRATION_RETRY_SCHEDULE_MS, retryWait } from "./retrySchedule.js";
import { RUNTIME_VERSION } from "./thresholds.js";
let config = null;
let everActive = false;
let timer = null;
let firstTimer = null;
let firstStep = 0;
function scheduleFirstVerdict() {
  if (!config || !config.getToken() || memActivated === true || firstTimer || isBoosthisDisabled() || isServerlessMode()) return;
  const schedule = [...FIRST_VERDICT_SCHEDULE_MS, ...REGISTRATION_RETRY_SCHEDULE_MS];
  firstTimer = setTimeout(() => {
    firstTimer = null;
    void checkEntitlementNow().catch(() => null).finally(scheduleFirstVerdict);
  }, retryWait(schedule, firstStep++));
  firstTimer.unref?.();
}
const listeners = /* @__PURE__ */ new Set();
function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch {
    }
  }
}
function subscribeEntitlement(listener) {
  listeners.add(listener);
  if (!hydrated) void hydrateEntitlement();
  return () => {
    listeners.delete(listener);
  };
}
function isRuntimeInert() {
  return isBoosthisDisabled() || dissolvedThisRun || memActivated !== true || memInert || activeGraceExpired();
}
function isKitLocked() {
  if (isBoosthisDisabled()) return false;
  if (dissolvedThisRun) return true;
  hydrateSync();
  if (memActivated !== true) return false;
  return memStatus !== ACTIVE || memInert || activeGraceExpired();
}
function renewOnly() {
  return isKitLocked();
}
function visibleEntitlementStatus() {
  if (dissolvedThisRun) return DISSOLVED;
  hydrateSync();
  if (memActivated !== true) return "unregistered";
  if (memStatus === ACTIVE && (memInert || activeGraceExpired())) return "hidden";
  return memStatus;
}
function isDissolvedThisRun() {
  return dissolvedThisRun;
}
function isAwaitingAskAfterDissolve() {
  if (isBoosthisDisabled() || dissolvedThisRun) return false;
  hydrateSync();
  return memActivated === true && memStatus === DISSOLVED;
}
function isKitDissolved() {
  return dissolvedThisRun || isAwaitingAskAfterDissolve();
}
function getEntitlementGateKind() {
  if (isBoosthisDisabled()) return "hidden";
  if (dissolvedThisRun) return "dissolved";
  if (!isRuntimeInert()) return "none";
  if (memActivated !== true) return "unregistered";
  switch (memStatus) {
    case "revoked":
      return "revoked";
    case "unpaid":
      return "unpaid";
    case "paused":
      return "paused";
    case "dissolved":
      return "dissolved";
    // "active" here means the offline grace window lapsed: no server verdict to
    // explain → vanish. "tampered" also hides (no user-facing overlay copy), and
    // so does a word this kit does not know: it is a lock with nothing readable.
    default:
      return "hidden";
  }
}
function _isRuntimeKilledInternal() {
  if (isBoosthisDisabled()) return true;
  if (dissolvedThisRun) return true;
  if (memStatus === DISSOLVED) return false;
  if (memStatus !== ACTIVE) return memInert;
  if (!(memInert || activeGraceExpired())) return false;
  return hasCheckinConfig();
}
function isActivated() {
  return memActivated === true;
}
function hasCheckinConfig() {
  if (credentialForTests !== void 0) return credentialForTests !== null;
  const cfg = config;
  if (!cfg) return false;
  try {
    const token = cfg.getToken();
    return typeof token === "string" && token !== "";
  } catch {
    return false;
  }
}
let credentialForTests = void 0;
function _setInstallCredentialForTests(token) {
  credentialForTests = token;
}
function clampGrace(graceSeconds) {
  let g = graceSeconds;
  if (!(g > 0)) g = DEFAULT_GRACE_SECONDS;
  if (g > MAX_GRACE_SECONDS) g = MAX_GRACE_SECONDS;
  return g;
}
function monoNow() {
  try {
    return perfHooks.now();
  } catch {
    return Date.now();
  }
}
function recordActiveTiming(checkedAt, graceSeconds, maxSeenWallMs) {
  memCheckedAt = checkedAt;
  memGraceSeconds = clampGrace(graceSeconds);
  memInitialAgeMs = Math.max(0, Date.now() - checkedAt);
  memMonoAt = monoNow();
  memMaxSeenWall = typeof maxSeenWallMs === "number" && maxSeenWallMs > checkedAt ? maxSeenWallMs : checkedAt;
}
function clearActiveTiming() {
  memCheckedAt = null;
  memMonoAt = null;
  memInitialAgeMs = 0;
  memMaxSeenWall = null;
}
function activeGraceExpired() {
  if (memStatus !== "active" || memCheckedAt === null) return false;
  const wallAgeMs = Date.now() - memCheckedAt;
  const monoAgeMs = memMonoAt === null ? Number.NEGATIVE_INFINITY : memInitialAgeMs + (monoNow() - memMonoAt);
  const highWaterAgeMs = memMaxSeenWall === null ? Number.NEGATIVE_INFINITY : memMaxSeenWall - memCheckedAt;
  const ageMs = Math.max(wallAgeMs, monoAgeMs, highWaterAgeMs);
  if (ageMs < 0) return false;
  return ageMs > memGraceSeconds * 1e3;
}
function maybeExpireActiveGrace() {
  if (!memInert && activeGraceExpired()) {
    memInert = true;
    notify();
  }
}
async function persistCache(cache) {
  try {
    await storage.set(CACHE_KEY, JSON.stringify(cache));
  } catch {
  }
}
async function bumpAndPersistMaxSeenWall() {
  if (memStatus !== "active" || memCheckedAt === null) return;
  const now = Date.now();
  if (memMaxSeenWall !== null && now <= memMaxSeenWall) return;
  memMaxSeenWall = now;
  try {
    const cache = {
      status: "active",
      checkedAt: memCheckedAt,
      graceSeconds: memGraceSeconds,
      maxSeenWallMs: memMaxSeenWall
    };
    await storage.set(CACHE_KEY, JSON.stringify(cache));
  } catch {
  }
}
async function onOfflineCheckin() {
  await bumpAndPersistMaxSeenWall();
  maybeExpireActiveGrace();
}
function getEntitlementStatus() {
  return memStatus;
}
function getEntitlementMessage() {
  if (!isBoosthisDisabled() && memActivated !== true && !memInert) {
    return isAwaitingFirstAnswer() ? AWAITING_MESSAGE : LOCKED_MESSAGE;
  }
  return memMessage;
}
function applyCache(cache) {
  memActivated = true;
  memStatus = cache.status;
  memMessage = cache.status !== ACTIVE && typeof cache.message === "string" && cache.message ? cache.message : null;
  memRecheckAt = cache.status !== ACTIVE && typeof cache.recheckAt === "number" ? cache.recheckAt : null;
  if (cache.status !== ACTIVE) {
    memInert = true;
    clearActiveTiming();
    return;
  }
  let checkedAt = cache.checkedAt;
  const ageMs = Date.now() - checkedAt;
  if (ageMs < 0) {
    if (-ageMs <= CLOCK_SKEW_TOLERANCE_MS) {
      checkedAt = Date.now();
    } else {
      memInert = true;
      clearActiveTiming();
      return;
    }
  }
  recordActiveTiming(checkedAt, cache.graceSeconds, cache.maxSeenWallMs);
  memInert = activeGraceExpired();
  if (!memInert) everActive = true;
}
function hydrateEntitlement() {
  try {
    hydrateSync();
  } catch {
  }
  return Promise.resolve();
}
function applyStoredAnswer(raw) {
  if (!raw) return false;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.status !== "string" || parsed.status === "" || typeof parsed.checkedAt !== "number") {
    return false;
  }
  applyCache({
    status: parsed.status,
    checkedAt: parsed.checkedAt,
    graceSeconds: typeof parsed.graceSeconds === "number" ? parsed.graceSeconds : DEFAULT_GRACE_SECONDS,
    maxSeenWallMs: typeof parsed.maxSeenWallMs === "number" ? parsed.maxSeenWallMs : void 0,
    message: typeof parsed.message === "string" ? parsed.message : null,
    recheckAt: typeof parsed.recheckAt === "number" ? parsed.recheckAt : void 0
  });
  return true;
}
function hydrateSync() {
  if (hydrated) return;
  let activated = false;
  try {
    if (!storageDurable()) {
      awaitingFirstAnswer = true;
    } else {
      activated = applyStoredAnswer(storage.getSync(CACHE_KEY));
    }
  } catch {
  }
  if (memActivated !== true) memActivated = activated;
  hydrated = true;
  queueMicrotask(notify);
}
function cappedGrace(value) {
  const g = typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : DEFAULT_GRACE_SECONDS;
  return Math.min(g, MAX_GRACE_SECONDS);
}
function recheckAt(recheckAfterSeconds) {
  const waitMs = typeof recheckAfterSeconds === "number" && Number.isFinite(recheckAfterSeconds) && recheckAfterSeconds > 0 ? recheckAfterSeconds * 1e3 : 0;
  const interval = config?.intervalMs ?? DEFAULT_INTERVAL_MS;
  return Date.now() + Math.max(waitMs, interval);
}
function recheckWaiting() {
  return askedThisRun && memStatus !== ACTIVE && memRecheckAt !== null && Date.now() < memRecheckAt;
}
async function store(status, message, graceSeconds, success, recheckAfterSeconds) {
  const wasLocked = isKitLocked();
  const wasInert = isRuntimeInert();
  const now = Date.now();
  const grace = clampGrace(graceSeconds);
  awaitingFirstAnswer = false;
  memActivated = true;
  hydrated = true;
  memStatus = status;
  memMessage = success ? null : message;
  if (success) {
    everActive = true;
    recordActiveTiming(now, grace);
    memInert = false;
    memRecheckAt = null;
  } else {
    memInert = true;
    clearActiveTiming();
    memRecheckAt = recheckAt(recheckAfterSeconds);
  }
  if (isRuntimeInert() !== wasInert || isKitLocked() !== wasLocked) notify();
  if (status === DISSOLVED) {
    await dissolve(message);
    return DISSOLVED;
  }
  if (!success) {
    lockDown();
  } else if (wasLocked && handlers) {
    const h = handlers;
    runStep(() => h.rearm());
  }
  await persistCache({
    status,
    checkedAt: now,
    graceSeconds: grace,
    ...success ? { maxSeenWallMs: now } : { message, recheckAt: memRecheckAt ?? void 0 }
  });
  return status;
}
function lockDown() {
  const h = handlers;
  if (!h) return;
  runStep(() => h.unhook("locked"));
  runStep(() => h.clearSamples());
  runStep(() => h.clearChecks());
}
async function dissolve(message) {
  dissolvedThisRun = true;
  stopTimer();
  const h = handlers;
  if (h) {
    runStep(() => h.unhook("dissolved"));
    runStep(() => h.clearSamples());
    runStep(() => h.clearChecks());
    try {
      await h.removeLocal();
    } catch {
    }
  }
  await persistCache({
    status: DISSOLVED,
    checkedAt: Date.now(),
    graceSeconds: DEFAULT_GRACE_SECONDS,
    message,
    askAgain: ASK_AGAIN
  });
  try {
    console.warn(
      `[boosthis] ${message || "This project stayed locked past its delay."} The kit has erased what it stored on this machine and stopped; it asks again when the app restarts.`
    );
  } catch {
  }
  notify();
}
function adoptEntitlementAnswer(answer) {
  if (isBoosthisDisabled() || dissolvedThisRun) return;
  const status = answer.status;
  if (typeof status !== "string" || status === "") return;
  askedThisRun = true;
  void store(
    status,
    typeof answer.message === "string" ? answer.message : null,
    cappedGrace(answer.graceSeconds),
    status === ACTIVE,
    answer.recheckAfterSeconds
  ).catch(() => {
  });
}
async function postCheckin(cfg, token, timeoutOverrideMs) {
  const f = cfg.fetchImpl ?? (typeof fetch === "function" ? fetch : void 0);
  if (!f) return null;
  const url = `${cfg.endpoint.replace(/\/$/, "")}/entitlements/check`;
  const body = {
    installId: cfg.installId,
    // Built in, never configured: see `kitVersion` on the config above.
    kitVersion: RUNTIME_VERSION,
    understands: UNDERSTANDS,
    // One-way codes of the names this server answered under, never a name
    // (servedHostCodes.ts): what lets a phone app of the same project join
    // this server on the map with nothing set. An empty list with no tag
    // asks for the key the codes are made with.
    servedHostCodes: servedHostCodesField()
  };
  const integ = cfg.integrity;
  if (integ && (integ.status === "ok" || integ.status === "mismatch")) {
    body.integrity = {
      status: integ.status,
      ...typeof integ.manifestHash === "string" && integ.manifestHash ? { manifestHash: integ.manifestHash } : {}
    };
  }
  if (checkNoPII(body) || checkNoPIIInUrl(url)) return null;
  const timeoutMs = typeof timeoutOverrideMs === "number" && timeoutOverrideMs > 0 ? timeoutOverrideMs : cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = new Promise(
    (resolve) => setTimeout(() => resolve(null), timeoutMs).unref?.()
  );
  const req = Promise.resolve().then(
    () => f(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })
  ).catch(() => null);
  return Promise.race([req, timeout]);
}
async function readCheckinRefusal(res, readMs) {
  if (!res || res.status !== 401) return null;
  try {
    const body = await readAnswerJson(res, { timeoutMs: readMs });
    if (!body || typeof body !== "object") return null;
    if (body.error !== "credentials_cut") {
      return { cut: null, mismatch: body.credentialRefusal === "mismatch" };
    }
    const reason = body.reason;
    const status = reason === "revoked" || reason === "unpaid" || reason === "tampered" || reason === "paused" ? reason : "revoked";
    return {
      cut: {
        status,
        message: typeof body.detail === "string" ? body.detail : null
      },
      mismatch: false
    };
  } catch {
    return null;
  }
}
async function checkEntitlementNow(timeoutOverrideMs) {
  return checkEntitlementOnce(timeoutOverrideMs, timeoutOverrideMs === void 0);
}
async function checkEntitlementOnce(timeoutOverrideMs, mayRenew) {
  if (isBoosthisDisabled()) return null;
  if (dissolvedThisRun) return DISSOLVED;
  const cfg = config;
  if (!cfg) return null;
  if (recheckWaiting()) return memStatus;
  const token = cfg.getToken();
  if (!token) return null;
  try {
    askedThisRun = true;
    const res = await postCheckin(cfg, token, timeoutOverrideMs);
    if (config !== cfg || isBoosthisDisabled()) return null;
    const readMs = typeof timeoutOverrideMs === "number" && timeoutOverrideMs > 0 ? timeoutOverrideMs : void 0;
    if (!res || !res.ok) {
      const refusal = await readCheckinRefusal(res, readMs);
      if (config !== cfg || isBoosthisDisabled()) return null;
      if (refusal?.cut) {
        cfg.onVerdict?.(refusal.cut.status);
        return store(
          refusal.cut.status,
          refusal.cut.message,
          DEFAULT_GRACE_SECONDS,
          false
        );
      }
      if (mayRenew && refusal?.mismatch && cfg.renewCredential) {
        let fresh = null;
        try {
          fresh = await cfg.renewCredential(token);
        } catch {
          fresh = null;
        }
        if (fresh && fresh !== token) {
          return checkEntitlementOnce(timeoutOverrideMs, false);
        }
      }
      await onOfflineCheckin();
      return null;
    }
    const data = await readAnswerJson(res, { timeoutMs: readMs });
    if (config !== cfg || isBoosthisDisabled()) return null;
    const answer = typeof data?.status === "string" ? data.status : "";
    if (answer === "") return null;
    if (answer === ACTIVE) adoptServedHostSalt(data?.servedHostSalt);
    const grace = cappedGrace(data?.graceSeconds);
    const message = typeof data?.message === "string" ? data.message : null;
    const stored = await store(answer, message, grace, answer === ACTIVE, data?.recheckAfterSeconds);
    cfg.onVerdict?.(stored);
    return stored;
  } catch {
    await onOfflineCheckin();
    return null;
  }
}
function forceEntitlementCheck(force = false) {
  if (isBoosthisDisabled()) return;
  if (!config) return;
  if (!force) {
    const now = monoNow();
    if (lastForcedCheckAt !== null && now - lastForcedCheckAt < FORCE_CHECK_THROTTLE_MS) {
      return;
    }
    lastForcedCheckAt = now;
  } else {
    lastForcedCheckAt = monoNow();
  }
  void checkEntitlementNow().catch(() => null).finally(scheduleFirstVerdict);
}
function startEntitlementCheckin(cfg) {
  config = cfg;
  stopTimer();
  firstStep = 0;
  if (dissolvedThisRun) return;
  if (isServerlessMode()) {
    void hydrateEntitlement().catch(() => {
    });
    return;
  }
  void (async () => {
    try {
      await hydrateEntitlement();
      if (config !== cfg || isBoosthisDisabled()) return;
      await checkEntitlementNow();
      scheduleFirstVerdict();
    } catch {
    }
  })();
  setServedHostEarlyCheck(() => {
    if (config !== cfg) return;
    void checkEntitlementNow().catch(() => null).finally(scheduleFirstVerdict);
  });
  lastForcedCheckAt = monoNow();
  const interval = cfg.intervalMs ?? DEFAULT_INTERVAL_MS;
  timer = setInterval(() => {
    void checkEntitlementNow().catch(() => null).finally(scheduleFirstVerdict);
  }, interval);
  timer.unref?.();
}
function stopTimer() {
  if (firstTimer) clearTimeout(firstTimer);
  firstTimer = null;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
function stopEntitlementCheckin() {
  stopTimer();
  setServedHostEarlyCheck(null);
  config = null;
}
async function clearEntitlementCache() {
  const wasInert = isRuntimeInert();
  memActivated = false;
  memStatus = ACTIVE;
  memInert = false;
  memMessage = null;
  memRecheckAt = null;
  clearActiveTiming();
  memGraceSeconds = DEFAULT_GRACE_SECONDS;
  hydrated = true;
  try {
    await storage.remove(CACHE_KEY);
  } catch {
  }
  if (isRuntimeInert() !== wasInert) notify();
}
function _resetEntitlementForTests() {
  everActive = false;
  stopTimer();
  setServedHostEarlyCheck(null);
  config = null;
  memActivated = null;
  memStatus = ACTIVE;
  memInert = false;
  memMessage = null;
  memCheckedAt = null;
  memGraceSeconds = DEFAULT_GRACE_SECONDS;
  memInitialAgeMs = 0;
  memMonoAt = null;
  memMaxSeenWall = null;
  memRecheckAt = null;
  askedThisRun = false;
  dissolvedThisRun = false;
  lastForcedCheckAt = null;
  hydrated = false;
  listeners.clear();
}
function _restartEntitlementForTests() {
  const keptHandlers = handlers;
  _resetEntitlementForTests();
  handlers = keptHandlers;
}
function _setEntitlementStateForTests(status, inert, message = null) {
  if (status === "active" && !inert) everActive = true;
  memActivated = true;
  memStatus = status;
  memInert = inert;
  memMessage = message;
  memRecheckAt = null;
  memCheckedAt = null;
  memGraceSeconds = DEFAULT_GRACE_SECONDS;
  memInitialAgeMs = 0;
  memMonoAt = null;
  memMaxSeenWall = null;
  hydrated = true;
  notify();
}
function hasBeenActiveInThisRun() {
  return everActive;
}
export {
  _isRuntimeKilledInternal,
  _resetEntitlementForTests,
  _restartEntitlementForTests,
  _setEntitlementStateForTests,
  _setInstallCredentialForTests,
  adoptEntitlementAnswer,
  checkEntitlementNow,
  clearEntitlementCache,
  forceEntitlementCheck,
  getEntitlementGateKind,
  getEntitlementMessage,
  getEntitlementStatus,
  hasBeenActiveInThisRun,
  hasCheckinConfig,
  hydrateEntitlement,
  isActivated,
  isAwaitingAskAfterDissolve,
  isAwaitingFirstAnswer,
  isDissolvedThisRun,
  isKitDissolved,
  isKitLocked,
  isRuntimeInert,
  renewOnly,
  setKitLockHandlers,
  startEntitlementCheckin,
  stopEntitlementCheckin,
  subscribeEntitlement,
  visibleEntitlementStatus
};
