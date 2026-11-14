// @ts-nocheck
/* eslint-disable */
// Built from src/telemetry.ts so plain node can run the kit. Do not edit.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { assertNoPII, checkNoPII, transmitLabelHasPII, PIIDetectedError } from "./no-pii.js";
import { isDoorWord } from "./routeDoor.js";
import { readAnswerJson } from "./answerRead.js";
import {
  REGISTRATION_RETRY_SCHEDULE_MS,
  FIRST_VERDICT_SCHEDULE_MS,
  RENEWAL_RETRY_SCHEDULE_MS,
  RENEWAL_ANSWERED_WAIT_MS,
  retryWait,
  temporaryConsentStatus
} from "./retrySchedule.js";
import {
  MAX_PART_NAME,
  warnPartNameRefusal
} from "./routeInventory.js";
import { dependencyKindFor, looksLikeAddress } from "./dependencyKinds.js";
import {
  _safeTransmitInternal,
  _safeTransmitTrustedPayload,
  isNoSendResponse
} from "./transmit.js";
import { RUNTIME_VERSION } from "./thresholds.js";
import { declaredAppVersionBlock } from "./appVersionFacts.js";
import { kitRuntimeTag } from "./runtimeTag.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import {
  startEntitlementCheckin,
  stopEntitlementCheckin,
  clearEntitlementCache,
  forceEntitlementCheck,
  adoptEntitlementAnswer,
  checkEntitlementNow,
  isActivated,
  _isRuntimeKilledInternal,
  isAwaitingAskAfterDissolve,
  isDissolvedThisRun,
  isKitLocked,
  setKitLockHandlers,
  hasBeenActiveInThisRun
} from "./killSwitch.js";
import { forgetServedHosts } from "./servedHostCodes.js";
import { setUploadReadiness } from "./uploadRecovery.js";
import {
  clearAllCandidates,
  setCandidateSubmitter,
  setResolutionSubmitter
} from "./candidateRules.js";
import { clear as clearSampleRing, setSampleObserver } from "./samples.js";
import { detectServerKind } from "./serverKind.js";
import { hostingFacts } from "./hosting.js";
import { readDropsFromResponse } from "./dropReport.js";
import { clearDetectors, ignoreHost } from "./liveDetectors.js";
import { clearAiCalls } from "./aiCalls.js";
import { startEventLoopLag, clearEventLoopLag } from "./eventLoopLag.js";
import { armForkChurn, clearCpuSchedulingMeters } from "./cpuSchedulingMeters.js";
import { armReadyWatch, disarmReadyWatch } from "./readyToServe.js";
import {
  startVitals,
  clearVitals,
  captureColdStart,
  captureStartupImport
} from "./runtimeVitals.js";
import { startExtraMeters, clearExtraMeters } from "./extraMeters.js";
import { resetRouteOutcomes } from "./routeOutcomes.js";
import { armJobSystems } from "./jobAdapters.js";
import { coverageFingerprint, coverageInventory } from "./coverageInventory.js";
import { attachWasRefused } from "./attachStatus.js";
import { clearCommunityCache } from "./community.js";
import { clear as clearFeedbackLog } from "./feedback.js";
function crashDeliveryId(installId, crashes) {
  return createHash("sha256").update(JSON.stringify({ installId, crashes })).digest("hex");
}
import {
  captureBuildIdentity,
  clearBuildIdentity
} from "./buildIdentity.js";
import {
  installExitFlush,
  isExitFlushRunning,
  setExitReadyHook,
  uninstallExitFlush
} from "./exitFlush.js";
import {
  clearSampleSink,
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
} from "./reporting.js";
import {
  setSnapshotSubmitter,
  startSnapshotAutoUpload,
  stopSnapshotAutoUpload,
  uploadPerfSnapshotNow
} from "./snapshot.js";
import {
  setSpanSubmitter,
  startSpanAutoFlush,
  stopSpanAutoFlush,
  clearBufferedSpans,
  flushSpansNow,
  _spanInternals,
  MAX_SPAN_BATCH
} from "./spanEmitter.js";
import {
  detachCrashHandlers,
  installCrashHandlers,
  setCrashCredentialReader,
  setCrashDetailed,
  setCrashOwnerInstallId,
  setCrashSubmitter,
  uninstallCrashHandlers
} from "./crashReporter.js";
import { crashRefusalFor, noteCrashSendRefused } from "./crashDelivery.js";
import {
  clearPromiseDeclarations,
  parsePromiseDeclarationOutcomes as readPromiseOutcomes,
  MAX_PROMISE_DECLARATIONS
} from "./promiseDeclaration.js";
import {
  clearBufferedJobRuns,
  clearJobRhythmDeclarations,
  flushJobRunsNow,
  parseExpectationOutcomes as readExpectationOutcomes,
  pendingJobRunCount,
  setJobRunSubmitter,
  startJobRunAutoFlush,
  stopJobRunAutoFlush,
  MAX_JOB_EXPECTATIONS,
  MAX_JOB_RUN_BATCH,
  MAX_JOB_RUN_TALLIES
} from "./jobReporter.js";
import {
  storage,
  storageBackend,
  storageDurable,
  storageKeyRestored
} from "./storage.js";
import {
  deriveServerlessInstallId,
  isPerRunBilled,
  isServerlessMode,
  platformName,
  scopeHashFor,
  serverlessHost,
  serverlessRefusal
} from "./serverless.js";
import {
  SERVERLESS_SNAPSHOT_MIN_MS,
  setInvocationFlush
} from "./serverlessLifecycle.js";
import { kitShouldReduce, noteKitReduced, noteKitSetupCost } from "./kitFootprint.js";
import {
  clearKitProject,
  getKitProject,
  parseKitProject,
  serializeKitProject,
  setKitPromises,
  parseKitPromises,
  serializeKitPromises,
  setKitProject
} from "./projectIdentity.js";
import {
  resolveProjectKey
} from "./projectKey.js";
import { announceProjectKey } from "./startAnnounce.js";
import {
  checkRegistrationOnce,
  markRegistrationConfirmed,
  markRegistrationRefused,
  markRegistrationThrottled,
  markRegistrationUnreachable,
  _resetRegistrationForTests
} from "./registration.js";
import {
  isCredentialMismatch,
  noteUploadRefusedOnce,
  readCredentialRefusal
} from "./uploadRefusal.js";
import {
  clearUploadPauses,
  isLocalPauseAnswer,
  pacedUpload
} from "./uploadPause.js";
const DEFAULT_TELEMETRY_ENDPOINT = "https://www.boosthis.com/api";
let warnedRegistrationRejected = false;
let warnedProjectKeyOverride = false;
let panelProjectKey = {
  key: null,
  source: "none",
  overrodeShared: false,
  display: null,
  declined: false
};
function getPanelProjectKey() {
  return panelProjectKey;
}
let registrationRefusalKind = null;
let registrationRefusalOpts = {};
function getRegistrationRefusalKind() {
  return registrationRefusalKind;
}
function getRegistrationRefusalRetryAfterSeconds() {
  if (registrationRefusalKind !== "throttled") return null;
  const s = registrationRefusalOpts.retryAfterSeconds;
  return typeof s === "number" && isFinite(s) && s > 0 ? Math.round(s) : null;
}
function getRegistrationRefusalSentence() {
  try {
    if (registrationRefusalKind === null) return null;
    const [why, fix] = stayedInactiveHint(
      registrationRefusalKind,
      registrationRefusalOpts
    );
    return `Boosthis stayed inactive because ${why}. ${fix}`;
  } catch {
    return null;
  }
}
function transportErrorParenthetical(err) {
  try {
    const message = err && typeof err.message === "string" ? err.message : "";
    const typeName = err && err.constructor && typeof err.constructor.name === "string" ? err.constructor.name : "";
    const hay = `${message.slice(0, 512)} ${typeName.slice(0, 128)}`.toLowerCase();
    const has = (needle) => hay.indexOf(needle) !== -1;
    if (has("certificate") || has("tls") || has("ssl") || has("x509") || has("self signed") || has("self-signed") || has("unable to verify") || has("certificate_verify_failed") || has("sslhandshake") || has("trust anchor") || has("unable to get local issuer")) {
      return " (the certificate store rejected the connection)";
    }
    if (has("getaddrinfo") || has("name or service not known") || has("enotfound") || has("unknownhost") || has("nodename nor servname") || has("no such host") || has("failed to resolve") || has("dns")) {
      return " (the API host name did not resolve)";
    }
    if (has("econnrefused") || has("connection refused")) {
      return " (the connection was refused)";
    }
    if (has("etimedout") || has("timeout") || has("timed out")) {
      return " (the connection timed out)";
    }
    if (has("proxy")) {
      return " (a proxy rejected the connection)";
    }
    if (has("enetunreach") || has("network is unreachable") || has("no route to host")) {
      return " (the network was unreachable)";
    }
    const safeType = typeName.replace(/[^A-Za-z0-9_.]/g, "").slice(0, 60);
    return safeType === "" ? "" : ` (${safeType})`;
  } catch {
    return "";
  }
}
function stayedInactiveHint(reason, opts = {}) {
  switch (reason) {
    case "orphan":
      return [
        "this install id already belongs to another copy of the app, and this copy holds none of its credentials",
        "Unset BOOSTHIS_INSTALL_ID (or give this copy its own fresh UUID) and restart."
      ];
    case "no-answer": {
      const detail = opts.detail && opts.detail !== "" ? opts.detail : "";
      return [
        `it could not reach the Boosthis API from this process${detail}`,
        "Check outbound HTTPS and certificate trust from this app, then restart."
      ];
    }
    case "revoked":
      return [
        "its project key has been revoked",
        "A revoked key never works again. Mint a new project key in your Boosthis dashboard, put it in this app, then restart."
      ];
    case "paused":
      return [
        "its project key is paused by a billing problem on the account",
        "Settle the account in your Boosthis dashboard and the same key starts working again. Nothing has been revoked."
      ];
    case "closing":
      return [
        "its project key is paused because the account's owner has asked to close the account",
        "Nothing has been revoked or deleted: if the owner stops the closure from the Boosthis dashboard during the grace window, the same key starts working again."
      ];
    case "unknown":
      return [
        "its project key was not recognised",
        "Check it is the current key, pasted whole, with no stray spaces, and that it belongs to this project."
      ];
    case "key":
      return [
        "its project key wasn't accepted",
        "Copy a current project key from your Boosthis dashboard into this app, then restart."
      ];
    case "no-key-missing":
      return [
        "no project key is wired into this app",
        "Without one this app measures itself and never appears on your Boosthis dashboard. Copy a project key from your Boosthis Setup page into this app, then restart."
      ];
    case "no-key-chosen":
      return [
        "this app is set to run with no project key",
        "That is a deliberate setting: this app measures itself and never appears on your Boosthis dashboard. Nothing is being sent."
      ];
    case "attach-refused":
      return [
        "it could not attach to this app's server and nothing else here is being watched, so it did not register at all",
        "The attach line above says what stopped it. Registering was withheld deliberately: an install that cannot measure would sit on your dashboard looking healthy and empty. Fix the attach and restart, and this app registers normally."
      ];
    // ── The three IDENTITY refusals ──────────────────────────────────────
    // Each of these used to be a `throw` out of enableTelemetry, which killed
    // any back end that called it at startup — and, because the identity is
    // environment-shaped, killed it only where the variable was missing, so it
    // read as the customer's own bug. They are refusals now, and this is where
    // they say so. Wording carries the substance the thrown messages had.
    case "no-install-id":
      return [
        "no install id was given to enableTelemetry and there is nothing here to derive one from",
        "Pass a stable UUIDv4 as opts.installId (or set BOOSTHIS_INSTALL_ID) — the SAME value on every restart — then restart. Until then this app runs normally, measures nothing, and never appears on your Boosthis dashboard."
      ];
    case "bad-install-id":
      return [
        "the install id given to enableTelemetry is not a UUID",
        "Use an 8-4-4-4-12 hex UUID (e.g. crypto.randomUUID()) — the server rejects any other shape at registration, so the install would silently never appear. Fix opts.installId (or BOOSTHIS_INSTALL_ID), then restart."
      ];
    case "no-derivable-install-id": {
      const where = opts.platform && opts.platform !== "" ? opts.platform : "this function host";
      return [
        `it is running on ${where} with nothing to derive a stable identity from`,
        "Set BOOSTHIS_INSTALL_ID to any fixed UUID in the function's environment — the same value on every instance — so every cold start reports as one project. Until then this function runs normally and measures nothing."
      ];
    }
    case "throttled": {
      const wait = describeRetryWait(opts.retryAfterSeconds);
      return [
        "it was rate-limited: Boosthis is capping NEW registrations for this project key right now (HTTP 429)",
        `This is temporary and needs nothing from you: the kit is waiting ${wait} and will register itself, with no restart. If it keeps happening, this deployment is minting more NEW install ids per hour than the cap allows — give each instance an install id that survives its own restarts (a stable UUID per instance, not a fresh one per process) so restarts re-register instead of registering fresh.`
      ];
    }
    case "refused":
      return [
        `the server refused the registration (HTTP ${opts.status ?? 0})`,
        "Retry later; if it keeps happening, check the project key in your Boosthis dashboard."
      ];
  }
}
function describeRetryWait(seconds) {
  const s = typeof seconds === "number" && isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0;
  if (s === 0) return "a short while";
  if (s < 90) return `about ${Math.max(1, s)}s`;
  const mins = Math.round(s / 60);
  if (mins < 90) return `about ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.round(s / 3600);
  return `about ${hours} hour${hours === 1 ? "" : "s"}`;
}
const RETRY_AFTER_MIN_MS = 1e3;
const RETRY_AFTER_MAX_MS = 6 * 60 * 60 * 1e3;
function parseRetryAfterMs(res, nowMs = Date.now()) {
  let raw = null;
  try {
    raw = res.headers?.get?.("retry-after") ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  const text = String(raw).trim();
  if (text === "") return null;
  let ms = null;
  if (/^\d+$/.test(text)) {
    ms = Number(text) * 1e3;
  } else {
    const at = Date.parse(text);
    if (!isNaN(at)) ms = at - nowMs;
  }
  if (ms === null || !isFinite(ms)) return null;
  if (ms < RETRY_AFTER_MIN_MS) return RETRY_AFTER_MIN_MS;
  if (ms > RETRY_AFTER_MAX_MS) return RETRY_AFTER_MAX_MS;
  return Math.round(ms);
}
const THROTTLE_FALLBACK_WAIT_MS = 5 * 60 * 1e3;
function warnStayedInactiveOnce(reason, opts = {}) {
  if (warnedRegistrationRejected) return;
  warnedRegistrationRejected = true;
  registrationRefusalKind = reason;
  registrationRefusalOpts = opts;
  try {
    const [why, fix] = stayedInactiveHint(reason, opts);
    console.warn(`[boosthis] Boosthis stayed inactive because ${why}. ${fix}`);
  } catch {
  }
}
async function warnRegistrationRejectedOnce(res) {
  let reason = "key";
  try {
    const body = await readAnswerJson(res.clone());
    reason = body?.error === "invite_key_revoked" ? "revoked" : body?.error === "plan_required" ? "paused" : body?.error === "account_closure_pending" ? "closing" : body?.error === "invite_key_unknown" ? "unknown" : "key";
  } catch {
  }
  warnStayedInactiveOnce(reason);
}
let registrationRejection = null;
let warnedInvalidInstallId = false;
let panelRegistered = false;
let panelSharingOn = false;
function isRegisteredForPanel() {
  return panelRegistered;
}
function isSharingOnForPanel() {
  return panelSharingOn;
}
function _publishPanelState(registered, sharing) {
  panelRegistered = registered === true;
  panelSharingOn = sharing === true;
  if (panelRegistered) markRegistrationConfirmed();
}
let panelInstallId = null;
let activeClient = null;
function getRegistrationRejection() {
  return registrationRejection;
}
async function handleInvalidInstallIdOnce(res) {
  let invalid = false;
  try {
    const body = await readAnswerJson(res.clone());
    invalid = body?.error === "invalid_install_id";
  } catch {
  }
  if (!invalid) return false;
  registrationRejection = "install-id-not-uuid";
  markRegistrationRefused();
  if (warnedInvalidInstallId) return true;
  warnedInvalidInstallId = true;
  try {
    console.warn(
      "[boosthis] Registration rejected: this app's Boosthis install ID is not a valid UUID. Generate a real UUID (e.g. uuidgen / crypto.randomUUID()), persist it as the install ID, then restart."
    );
  } catch {
  }
  return true;
}
function _resetRegistrationWarningForTests() {
  warnedRegistrationRejected = false;
  warnedInvalidInstallId = false;
  registrationRejection = null;
  _resetRegistrationForTests();
  panelRegistered = false;
  panelSharingOn = false;
  warnedProjectKeyOverride = false;
  registrationRefusalKind = null;
  registrationRefusalOpts = {};
  panelProjectKey = { key: null, source: "none", overrodeShared: false, display: null, declined: false };
}
let consentRetryMs = 60 * 60 * 1e3;
function _setConsentRetryMsForTests(ms) {
  consentRetryMs = ms;
}
const APP_NAME_MAX = 60;
function stripScope(name) {
  const at = name.startsWith("@") ? name.indexOf("/") : -1;
  return at >= 0 ? name.slice(at + 1) : name;
}
function detectAppName() {
  try {
    const env = process.env.npm_package_name;
    if (typeof env === "string" && env.trim()) return stripScope(env.trim());
  } catch {
  }
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.name === "string" && parsed.name.trim()) {
      return stripScope(parsed.name.trim());
    }
  } catch {
  }
  return void 0;
}
function resolveAppName(explicit) {
  if (typeof explicit === "string" && explicit.trim()) {
    return explicit.trim().slice(0, APP_NAME_MAX);
  }
  let auto;
  try {
    auto = detectAppName();
  } catch {
    auto = void 0;
  }
  if (!auto) return void 0;
  const clamped = auto.slice(0, APP_NAME_MAX);
  return checkNoPII({ appName: clamped }) === null ? clamped : void 0;
}
const INSTALL_ID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
function inertTelemetryClient(endpoint, projectKey) {
  const zero = async () => 0;
  return {
    installId: "",
    endpoint,
    enabled: false,
    deleteToken: null,
    readToken: null,
    projectKey,
    fullTelemetryEffective: false,
    consent: zero,
    transmit: zero,
    transmitCandidates: zero,
    transmitResolutions: zero,
    transmitSnapshot: zero,
    transmitCrashes: zero,
    transmitSpans: zero,
    transmitJobRuns: zero,
    disable: () => {
    },
    enable: () => {
    },
    forget: zero
  };
}
function generateRotationInstallId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    try {
      return c.randomUUID();
    } catch {
    }
  }
  let out = "";
  for (const ch of "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx") {
    if (ch === "x") out += (Math.random() * 16 | 0).toString(16);
    else if (ch === "y") out += ((Math.random() * 4 | 0) + 8).toString(16);
    else out += ch;
  }
  return out;
}
let identityWasDerived = false;
function resolveInstallIdentity(explicit, projectKeyValue) {
  const fromEnv = (process.env.BOOSTHIS_INSTALL_ID ?? "").trim();
  if (explicit !== void 0 && explicit !== null && typeof explicit !== "string") {
    return { installId: null, derived: false, refusal: "bad-install-id" };
  }
  if (explicit === null) {
    return { installId: null, derived: false, refusal: "bad-install-id" };
  }
  const supplied = typeof explicit === "string" && explicit ? explicit : fromEnv || null;
  if (supplied) {
    if (!INSTALL_ID_SHAPE.test(supplied)) {
      return { installId: null, derived: false, refusal: "bad-install-id" };
    }
    return { installId: supplied, derived: false, refusal: null };
  }
  if (isServerlessMode()) {
    const derived = deriveServerlessInstallId(
      projectKeyValue ?? "",
      serverlessHost()
    );
    if (derived) return { installId: derived, derived: true, refusal: null };
    let platform = "";
    try {
      platform = platformName(serverlessHost().platform);
    } catch {
    }
    return {
      installId: null,
      derived: false,
      refusal: "no-derivable-install-id",
      platform
    };
  }
  const restored = storage.getSync("installId");
  if (restored) {
    if (!INSTALL_ID_SHAPE.test(restored)) {
      return { installId: null, derived: false, refusal: "bad-install-id" };
    }
    return { installId: restored, derived: false, refusal: null };
  }
  const minted = generateRotationInstallId();
  const { persisted } = storage.updateSyncPersisted("installId", () => minted);
  return persisted ? { installId: minted, derived: false, refusal: null } : { installId: minted, derived: false, refusal: null, unkept: true };
}
const PRE_CONTACT_FULL_TELEMETRY_DEFAULT = true;
function enableTelemetry(opts) {
  const kitSetupStart = performance.now();
  try {
    return enableTelemetryInner(opts);
  } finally {
    noteKitSetupCost(performance.now() - kitSetupStart);
  }
}
function enableTelemetryInner(opts) {
  const endpoint = opts.endpoint ?? DEFAULT_TELEMETRY_ENDPOINT;
  const projectKey = resolveProjectKey(opts.inviteKey);
  panelProjectKey = projectKey;
  const refusal = serverlessRefusal();
  if (refusal) {
    try {
      console.warn(`[boosthis] ${refusal}`);
    } catch {
    }
    return inertTelemetryClient(endpoint, projectKey);
  }
  const identity = resolveInstallIdentity(opts.installId, projectKey.key);
  if (identity.installId === null) {
    warnStayedInactiveOnce(identity.refusal ?? "no-install-id", {
      platform: identity.platform
    });
    return inertTelemetryClient(endpoint, projectKey);
  }
  const bakedInstallId = identity.installId;
  identityWasDerived = identity.derived;
  const pinnedIdentity = typeof opts.installId === "string" && opts.installId.trim() || (process.env.BOOSTHIS_INSTALL_ID ?? "").trim();
  const identitySource = identity.derived ? "derived" : pinnedIdentity ? "host" : "store";
  const identityStore = identitySource === "store" ? storageDurable() && identity.unkept !== true ? storageBackend() : "memory" : void 0;
  const identityRestored = identitySource === "store" ? storageKeyRestored("installId") : void 0;
  if (!projectKey.key) {
    warnStayedInactiveOnce(projectKey.declined ? "no-key-chosen" : "no-key-missing");
  }
  try {
    announceProjectKey(projectKey.key);
  } catch {
  }
  if (projectKey.overrodeShared && !warnedProjectKeyOverride) {
    warnedProjectKeyOverride = true;
    try {
      console.warn(
        `[boosthis] Node project key overridden by BOOSTHIS_PROJECT_KEY_NODE (${projectKey.display}).`
      );
    } catch {
    }
  }
  ignoreHost(endpoint);
  function armCollectors(atStart) {
    if (isKitLocked()) return;
    startEventLoopLag();
    armForkChurn();
    armReadyWatch();
    if (atStart) {
      try {
        captureColdStart();
      } catch {
      }
    }
    startVitals();
    if (atStart) {
      try {
        captureStartupImport();
      } catch {
      }
    }
    startExtraMeters();
    armJobSystems();
    try {
      captureBuildIdentity();
    } catch {
    }
  }
  armCollectors(true);
  const fetchOptions = opts.fetchOptions ?? {};
  const issuesOnly = opts.issuesOnly ?? !PRE_CONTACT_FULL_TELEMETRY_DEFAULT;
  const explicitShareMeterWithAI = opts.shareMeterWithAI ?? false;
  let serverShareMeterWithAI = false;
  let serverFullTelemetry = null;
  let serverCrashDetails = false;
  function effectiveIssuesOnly() {
    return serverFullTelemetry === null ? issuesOnly : !serverFullTelemetry;
  }
  let telemetryModeContradictionAnnounced = false;
  function noteTelemetryModeContradiction() {
    if (telemetryModeContradictionAnnounced) return;
    if (serverFullTelemetry === null) return;
    const requested = issuesOnly ? "reduced" : "full";
    const effective = effectiveIssuesOnly() ? "reduced" : "full";
    if (requested === effective) return;
    telemetryModeContradictionAnnounced = true;
    try {
      console.warn(
        `[boosthis] telemetry mode: your code asked for ${requested} telemetry, but this project's server answer is ${effective}, so ${effective} is what is in force. The server answer wins in both directions: the "Full telemetry" switch on the project's page sets it, and a disconnected or removed project is answered with reduced until it is reconnected. Change it there, or drop the code setting so the two agree.`
      );
    } catch {
    }
  }
  let enabled = true;
  const deleteTokenStoreKey = `deleteToken:${bakedInstallId}`;
  let deleteToken = opts.deleteToken ?? null;
  let forgottenSinceEnable = false;
  let consentGeneration = 0;
  const readTokenStoreKey = `readToken:${bakedInstallId}`;
  let readToken = opts.readToken ?? null;
  const projectStoreKey = `project:${bakedInstallId}`;
  const promisesStoreKey = `promises:${bakedInstallId}`;
  const credsReady = (async () => {
    try {
      if (!deleteToken) {
        const v = await storage.get(deleteTokenStoreKey);
        if (v && !deleteToken) deleteToken = v;
      }
      if (!readToken) {
        const v = await storage.get(readTokenStoreKey);
        if (v && !readToken) readToken = v;
      }
      const storedProject = parseKitProject(await storage.get(projectStoreKey));
      if (storedProject) setKitProject(storedProject.name, storedProject.code);
      const storedPromises = parseKitPromises(
        await storage.get(promisesStoreKey)
      );
      if (storedPromises) setKitPromises(storedPromises);
    } catch {
    }
    publishPanelState();
  })();
  function publishPanelState() {
    try {
      const full = !effectiveIssuesOnly();
      _publishPanelState(!!deleteToken, full);
      if (deleteToken) markRegistrationConfirmed();
      _publishInstallIdentity(activeInstallId, endpoint, full);
    } catch {
    }
  }
  function noteUpload(res, alsoRead) {
    if (isNoSendResponse(res)) return false;
    if (res.status === 429) return false;
    if (!res.ok) {
      try {
        _noteUploadRejected(
          res.status === 401 || res.status === 403 ? "unauthorized" : res.status >= 500 ? "server-error" : "rejected"
        );
      } catch {
      }
      return false;
    }
    try {
      _noteUploadAccepted();
    } catch {
    }
    try {
      lastReplyBodyRead = readDropsFromResponse(res, alsoRead);
      void lastReplyBodyRead;
    } catch {
    }
    return true;
  }
  let lastReplyBodyRead = null;
  function noteUploadUnreachable() {
    try {
      _noteUploadRejected("unreachable");
    } catch {
    }
  }
  let consentRetryTimer = null;
  let consentSuppressedUntil = 0;
  let renewalInFlight = null;
  let renewalAttemptedFor = null;
  let renewalDue = 0;
  let renewalStep = 0;
  let renewalAnswered = false;
  let renewalFloor = 0;
  let renewalProduced = null;
  let renewalRenewed = null;
  async function renewCredentialOnce(stale) {
    if (!stale) return null;
    while (renewalInFlight) {
      await renewalInFlight.catch(() => null);
    }
    if (stale === renewalRenewed) return null;
    if (stale === renewalAttemptedFor && Date.now() < renewalDue) {
      const result = renewalProduced;
      return result && result !== stale && deleteToken === result ? result : null;
    }
    if (stale !== renewalAttemptedFor) renewalStep = 0;
    renewalAttemptedFor = stale;
    renewalAnswered = false;
    renewalFloor = 0;
    const flight = (async () => {
      let fresh = null;
      let fromServer = false;
      try {
        [fresh, fromServer] = await renewCredentialFrom(stale);
      } catch {
        fresh = null;
        fromServer = false;
      }
      renewalProduced = fresh && fresh !== stale ? fresh : null;
      renewalDue = Date.now() + (renewalAnswered ? RENEWAL_ANSWERED_WAIT_MS : retryWait(RENEWAL_RETRY_SCHEDULE_MS, renewalStep++, renewalFloor));
      if (renewalAnswered) renewalStep = 0;
      if (renewalProduced && fromServer) renewalRenewed = renewalProduced;
      renewalInFlight = null;
      return renewalProduced;
    })();
    renewalInFlight = flight;
    return flight;
  }
  async function renewCredentialFrom(stale) {
    if (isBoosthisDisabled() || forgottenSinceEnable) return [null, false];
    await credsReady;
    if (!enabled || isBoosthisDisabled() || forgottenSinceEnable) return [null, false];
    const held = deleteToken;
    if (!held) return [null, false];
    if (held !== stale) return [held, false];
    try {
      const stored = await storage.get(deleteTokenStoreKey);
      if (!enabled || isBoosthisDisabled() || forgottenSinceEnable) return [null, false];
      if (stored && stored !== stale) {
        if (deleteToken !== stale || forgottenSinceEnable) return [null, false];
        deleteToken = stored;
        opts.onTokenIssued?.(stored);
        const storedRead = await storage.get(readTokenStoreKey);
        if (!enabled || isBoosthisDisabled() || forgottenSinceEnable) return [null, false];
        if (storedRead && storedRead !== readToken) {
          readToken = storedRead;
          opts.onReadTokenIssued?.(storedRead);
        }
        publishPanelState();
        return [stored, false];
      }
    } catch {
    }
    if (!projectKey.key) return [null, false];
    const installId = activeInstallId;
    const status = await postConsent({ withoutHeldCredential: true });
    renewalAnswered = !temporaryConsentStatus(status) && !(status >= 200 && status < 300 && consentUnreadable);
    renewalFloor = retryFloor;
    if (activeInstallId !== installId || forgottenSinceEnable) {
      return [null, false];
    }
    const now = deleteToken;
    return now && now !== stale ? [now, true] : [null, false];
  }
  async function sendUpload(upload, held, attempt) {
    const res = await pacedUpload(upload, () => attempt(held));
    if (isNoSendResponse(res) || isLocalPauseAnswer(res)) {
      return { res, refusal: null };
    }
    const refusal2 = await readCredentialRefusal(res);
    if (isExitFlushRunning() || !isCredentialMismatch(res.status, refusal2)) {
      return { res, refusal: refusal2 };
    }
    const fresh = await renewCredentialOnce(held);
    if (!fresh || fresh === held) return { res, refusal: refusal2 };
    const retried = await pacedUpload(upload, () => attempt(fresh));
    if (isNoSendResponse(retried) || isLocalPauseAnswer(retried)) {
      return { res: retried, refusal: null };
    }
    return { res: retried, refusal: await readCredentialRefusal(retried) };
  }
  function judgeUpload(res, refusal2, alsoRead) {
    const ok = noteUpload(res, alsoRead);
    if (!ok && !isNoSendResponse(res) && !isLocalPauseAnswer(res)) {
      noteUploadRefusedOnce(res.status, refusal2);
    }
    return ok;
  }
  let lastCoverageSent = null;
  let coverageRefreshes = 0;
  let coverageCheckedAt = 0;
  const MAX_COVERAGE_REFRESHES = 6;
  const COVERAGE_REFRESH_GAP_MS = 6e4;
  function maybeRefreshCoverage() {
    try {
      if (!enabled || isBoosthisDisabled()) return;
      if (coverageRefreshes >= MAX_COVERAGE_REFRESHES) return;
      const now = Date.now();
      if (now - coverageCheckedAt < COVERAGE_REFRESH_GAP_MS) return;
      coverageCheckedAt = now;
      const fingerprint = coverageFingerprint(coverageInventory());
      if (lastCoverageSent === null || fingerprint === lastCoverageSent) return;
      void postConsent({ onDemand: true }).then((status) => {
        if (status >= 200 && status < 300) coverageRefreshes++;
      }).catch(() => {
      });
    } catch {
    }
  }
  function stopConsentRetry() {
    if (consentRetryTimer !== null) {
      clearTimeout(consentRetryTimer);
      consentRetryTimer = null;
    }
  }
  function scheduleConsentRetry(afterMs = consentRetryMs) {
    if (isServerlessMode()) return;
    if (consentRetryTimer !== null) return;
    consentRetryTimer = setTimeout(() => {
      consentRetryTimer = null;
      if (!enabled || isBoosthisDisabled()) return;
      void postConsent({ registrationOnly: true }).catch(() => {
        if (enabled && !isBoosthisDisabled()) scheduleConsentRetry(afterMs);
      });
    }, afterMs);
    const t = consentRetryTimer;
    if (typeof t.unref === "function") t.unref();
  }
  let entitlementCameBack = false;
  let activeInstallId = bakedInstallId;
  let rotatedThisSession = false;
  const rotationStoreKey = `rotatedInstallId:${bakedInstallId}`;
  const rotationReady = (async () => {
    try {
      const stored = await storage.get(rotationStoreKey);
      if (typeof stored === "string" && INSTALL_ID_SHAPE.test(stored) && stored !== bakedInstallId) {
        activeInstallId = stored;
      }
    } catch {
    }
  })();
  function installCheckinConfig() {
    startEntitlementCheckin({
      endpoint,
      installId: activeInstallId,
      getToken: () => deleteToken ?? readToken,
      integrity: opts.integrity ?? null,
      fetchImpl: fetchOptions.fetchImpl,
      // The one renewal the upload paths share, so a check-in and an upload
      // refused together renew once between them.
      renewCredential: (stale) => renewCredentialOnce(stale),
      onVerdict: (status) => {
        if (status !== "active") stopConsentRetry();
        if (status === "paused") directivesOwed = true;
        if (status === "active" && directivesOwed && enabled && !forgottenSinceEnable) {
          directivesOwed = false;
          void postConsent().catch(() => {
            directivesOwed = true;
          });
        }
      }
    });
  }
  void rotationReady.then(async () => {
    if (!enabled || isBoosthisDisabled()) return;
    installCheckinConfig();
    await credsReady;
    if (!enabled || isBoosthisDisabled()) return;
    if (deleteToken || readToken) return;
    const lapsedWithoutCredential = isKitLocked() && !_isRuntimeKilledInternal();
    if (!isAwaitingAskAfterDissolve() && !lapsedWithoutCredential) return;
    await postConsent({ registrationOnly: true });
    if ((isAwaitingAskAfterDissolve() || isKitLocked()) && (deleteToken || readToken)) {
      installCheckinConfig();
    }
  }).catch(() => {
  });
  function serverKindForConsent() {
    try {
      const kind = detectServerKind();
      return kind === "unknown" ? null : kind;
    } catch {
      return null;
    }
  }
  function wouldRegisterAnInstallThatCannotReport() {
    try {
      if (!attachWasRefused()) return false;
      return coverageInventory().watched.length === 0;
    } catch {
      return false;
    }
  }
  let consentStep = 0;
  let consentFlight = null;
  let orphanAnswer = false;
  let consentUnreadable = false;
  let consentWithheld = false;
  let retryFloor = 0;
  let directivesOwed = false;
  let functionVerdictDue = 0;
  let functionVerdictStep = 0;
  async function postConsent(callOpts) {
    if (!enabled || forgottenSinceEnable || isBoosthisDisabled()) return 0;
    if (_isRuntimeKilledInternal()) {
      markRegistrationUnreachable();
      return 0;
    }
    if (consentFlight) return consentFlight;
    if (callOpts?.onDemand && Date.now() < consentSuppressedUntil) return 0;
    const generation = consentGeneration;
    const run = async () => {
      orphanAnswer = false;
      consentUnreadable = false;
      consentWithheld = false;
      retryFloor = 0;
      const status = await postConsentAttempt(callOpts);
      if (generation !== consentGeneration || !enabled || forgottenSinceEnable || isBoosthisDisabled() || _isRuntimeKilledInternal() || callOpts?.withoutHeldCredential) return status;
      if (consentWithheld) return status;
      if (temporaryConsentStatus(status) || status >= 200 && status < 300 && (consentUnreadable || !deleteToken && !readToken && !orphanAnswer)) {
        const wait = retryWait(REGISTRATION_RETRY_SCHEDULE_MS, consentStep++, retryFloor);
        stopConsentRetry();
        consentSuppressedUntil = Date.now() + wait;
        scheduleConsentRetry(wait);
      } else {
        consentStep = 0;
        if (status !== 401 && status !== 403 && !orphanAnswer) stopConsentRetry();
      }
      return status;
    };
    consentFlight = run();
    try {
      return await consentFlight;
    } finally {
      consentFlight = null;
    }
  }
  async function postConsentAttempt(callOpts) {
    const generation = consentGeneration;
    if (callOpts?.onDemand && Date.now() < consentSuppressedUntil) return 0;
    await rotationReady;
    await credsReady;
    if (generation !== consentGeneration || !enabled || forgottenSinceEnable || isBoosthisDisabled()) return 0;
    if (callOpts?.registrationOnly && !deleteToken && !readToken && wouldRegisterAnInstallThatCannotReport()) {
      try {
        registrationRefusalKind = "attach-refused";
        registrationRefusalOpts = {};
        markRegistrationRefused();
      } catch {
      }
      consentWithheld = true;
      return 0;
    }
    let res;
    let sentCoverage = null;
    const displayName = resolveAppName(opts.appName);
    try {
      res = await _safeTransmitInternal(
        `${endpoint}/installs/consent`,
        {
          installId: activeInstallId,
          // The install names its own engine. This kit and the React Native
          // kit both used to register under a shared "js", which left the
          // dashboard unable to tell a customer's back end from a member of
          // the public's phone — same row, same two-letter code. Each now
          // names itself. The server still ACCEPTS "js" forever, so an older
          // kit in the field keeps working untouched.
          //
          // These same bytes also run on Bun, and an install there says so:
          // filing a Bun project as ordinary Node would hide it on the
          // dashboard, and would also promise seven readings Bun cannot take.
          runtime: kitRuntimeTag(),
          packageVersion: RUNTIME_VERSION,
          // THE APP'S OWN RELEASE, only when the app declared one through the
          // `packageVersion` option. It travels in its own block, marked as
          // declared, and is never sent in place of the kit's version above.
          // An app that declared nothing sends no block at all.
          ...declaredAppVersionBlock(opts.packageVersion),
          // WHAT THIS BUILD'S CODE ASKED FOR — never what is in effect. The
          // server's own switch still wins in both directions and nothing here
          // changes that; sending this is what lets the owner's page show the
          // two answers side by side, instead of describing a code setting it
          // has never been told. See lib/telemetry-mode-contract.json.
          telemetryMode: issuesOnly ? "reduced" : "full",
          // WHICH KIND OF SERVER this project runs — express, fastify, hono,
          // nest, next or a plain Node server. Positive evidence only (see
          // serverKind.ts): the tag names a framework that is really loaded or
          // really serving, never one a package.json merely mentions. It is
          // diagnostic, so it is sent only when we HAVE an answer: an omitted
          // tag reads as "not stated" on the dashboard, while sending
          // "unknown" would claim we looked and found nothing.
          ...serverKindForConsent() ? { serverKind: serverKindForConsent() } : {},
          // Display name (metadata): an explicit `opts.appName` if the developer
          // set one, else a best-effort auto-detected name (npm_package_name /
          // package.json) so the dashboard shows a friendly name instead of a
          // churny install id with zero wiring. The auto path clamps + drops a
          // guard-tripping name so it can never break consent; the PII guard
          // still screens the value before it leaves.
          ...displayName ? { appName: displayName } : {},
          // WHERE THIS PROJECT RUNS. The hosting platform, its region and
          // whether this is production or a throwaway preview, each recognised
          // from what the platform itself publishes and each sent as a word
          // from a fixed list (see hosting.ts). Read fresh on every process, so
          // a project that gets republished somewhere else stops being
          // described by where it used to run.
          //
          // Sent unconditionally, because every one of the three has a real
          // answer for the "nothing declared itself" case: an ordinary server
          // says so rather than going quiet, and only an install from a kit
          // built before this existed leaves the record blank.
          hosting: hostingFacts(),
          identity: {
            source: identitySource,
            ...identityStore ? { store: identityStore } : {},
            ...identityRestored !== void 0 ? { restored: identityRestored } : {}
          },
          // FUNCTION HOSTS. The platform code (a closed numeric vocabulary —
          // the server owns every word a human reads) and the DIGEST of the
          // platform's own project scope. Together with the project key on the
          // Authorization header these are the exact inputs the kit derived its
          // install id from, so the server can recompute the id and refuse
          // anything that does not match: the identity is verified, not merely
          // asserted, and one project's key can never reach another's install.
          //
          // ONLY for a DERIVED id. A function whose host supplies a fixed id
          // (BOOSTHIS_INSTALL_ID, or an explicit option) is the fallback this
          // kit itself recommends when there is nothing to derive from — and
          // declaring the claim for such an id would have the server recompute
          // a different id and refuse the registration as an identity mismatch,
          // permanently, on the configuration we told the customer to use.
          ...isServerlessMode() && identityWasDerived ? {
            serverless: {
              platform: serverlessHost().platform,
              scopeHash: scopeHashFor(serverlessHost())
            }
          } : {},
          // WHAT WE ARE NOT WATCHING IN THIS APP. Green meters read as full
          // coverage, and this kit is the only thing that knows they are not:
          // that `attach()` was refused, that the app loaded a job library we
          // have no adapter for, that a function handler was never wrapped.
          // Terms from `watchableSurfaces.ts` and counts — never a module,
          // route or library name. Sent as a fact about surfaces, not as a
          // score: there is no percentage here and there must never be one.
          //
          // Re-sent whenever the answer CHANGES (see maybeRefreshCoverage):
          // this fires at start-up, before the app has served a request or
          // lazily required its queue library, so a once-only inventory would
          // read as "nothing unwatched" for the life of the process.
          ...(() => {
            try {
              const inv = coverageInventory();
              sentCoverage = coverageFingerprint(inv);
              return inv.watched.length > 0 || inv.unwatched.length > 0 ? { coverage: inv } : {};
            } catch {
              return {};
            }
          })()
        },
        // Consent is the step that LEADS to activation, so it must be allowed
        // to send while the kit is merely LOCKED (never handshaken). A KILLED
        // install (revoked / unpaid / grace-expired) is still silenced.
        { ...fetchOptions, allowWhenLocked: true },
        projectKey.key ? `Bearer ${projectKey.key}` : void 0,
        // Proof of control for the one-time read-token backfill. On re-consent
        // of an install created before read tokens existed, the server only
        // mints + returns a self-scoped read token when the caller proves it
        // owns the install by presenting the delete token. The Authorization
        // header carries the invite key, so the delete token rides in this
        // dedicated internal header (applied AFTER the PII guard). Omitted on
        // first consent (no delete token yet) — the fresh-register path mints
        // the read token unconditionally. Omitted on a renewal too: the held
        // credential is the one Boosthis just said was replaced.
        deleteToken && !callOpts?.withoutHeldCredential ? { "X-Boosthis-Install-Token": deleteToken } : void 0
      );
    } catch (err) {
      if (generation !== consentGeneration || !enabled || forgottenSinceEnable || isBoosthisDisabled()) return 0;
      if (err instanceof Error && err.name === "PIIDetectedError") throw err;
      const detail = transportErrorParenthetical(err);
      warnStayedInactiveOnce("no-answer", { detail });
      markRegistrationUnreachable();
      return 0;
    }
    if (isNoSendResponse(res)) {
      markRegistrationUnreachable();
      return 0;
    }
    if (generation !== consentGeneration || !enabled || forgottenSinceEnable || isBoosthisDisabled() || _isRuntimeKilledInternal()) return res.status;
    if (isDissolvedThisRun()) return res.status;
    if (res.ok) {
      let answer = null;
      try {
        answer = await readAnswerJson(res);
      } catch {
        answer = null;
      }
      if (generation !== consentGeneration || !enabled || forgottenSinceEnable || isBoosthisDisabled() || _isRuntimeKilledInternal()) return res.status;
      if (answer === null || typeof answer !== "object" || Array.isArray(answer)) {
        consentUnreadable = true;
        markRegistrationUnreachable();
        return res.status;
      }
      lastCoverageSent = sentCoverage;
      stopConsentRetry();
      consentSuppressedUntil = 0;
      registrationRejection = null;
      registrationRefusalKind = null;
      registrationRefusalOpts = {};
      try {
        const body = answer;
        if (generation !== consentGeneration || !enabled || forgottenSinceEnable || isBoosthisDisabled() || _isRuntimeKilledInternal()) return res.status;
        directivesOwed = body?.disconnected === true;
        orphanAnswer = body?.status === "already_registered_no_token";
        const ent = body?.entitlement;
        if (ent && typeof ent.status === "string") {
          entitlementCameBack = true;
          adoptEntitlementAnswer({
            status: ent.status,
            graceSeconds: typeof ent.graceSeconds === "number" ? ent.graceSeconds : void 0,
            message: typeof ent.message === "string" ? ent.message : null,
            recheckAfterSeconds: typeof ent.recheckAfterSeconds === "number" ? ent.recheckAfterSeconds : void 0
          });
          if (isDissolvedThisRun()) return res.status;
        }
        if (body?.projectName != null || body?.projectCode != null) {
          setKitProject(body.projectName, body.projectCode);
          void storage.set(projectStoreKey, serializeKitProject(getKitProject())).catch(() => {
          });
        }
        setKitPromises(body?.promises);
        void storage.set(promisesStoreKey, serializeKitPromises()).catch(() => {
        });
        const issued = typeof body?.deleteToken === "string" ? body.deleteToken : null;
        if (issued) {
          const changed = issued !== deleteToken;
          deleteToken = issued;
          void storage.set(deleteTokenStoreKey, issued).catch(() => {
          });
          if (changed) opts.onTokenIssued?.(issued);
        }
        const readIssued = typeof body?.readToken === "string" ? body.readToken : null;
        if (readIssued) {
          const changed = readIssued !== readToken;
          readToken = readIssued;
          void storage.set(readTokenStoreKey, readIssued).catch(() => {
          });
          if (changed) opts.onReadTokenIssued?.(readIssued);
        }
        if (body?.shareMeterWithAI === true && !serverShareMeterWithAI) {
          serverShareMeterWithAI = true;
          syncSnapshotUpload();
        }
        if (typeof body?.fullTelemetry === "boolean" && body.fullTelemetry !== serverFullTelemetry) {
          serverFullTelemetry = body.fullTelemetry;
          setSampleQueueIssuesOnly(effectiveIssuesOnly());
          syncSnapshotUpload();
        }
        serverCrashDetails = body?.crashDetails === true;
        setCrashDetailed(opts.crashDetails === true || serverCrashDetails);
        noteTelemetryModeContradiction();
        if (body?.status === "already_registered_no_token" && !deleteToken && projectKey.key && !rotatedThisSession) {
          rotatedThisSession = true;
          if (readToken) {
            readToken = null;
            void storage.remove(readTokenStoreKey).catch(() => {
            });
          }
          const rotated = generateRotationInstallId();
          try {
            await storage.set(rotationStoreKey, rotated);
          } catch {
          }
          activeInstallId = rotated;
          installCheckinConfig();
          setCrashOwnerInstallId(rotated);
          void storage.set("installId", rotated).catch(() => {
          });
          return postConsentAttempt({ registrationOnly: callOpts?.registrationOnly });
        }
        if (body?.status === "already_registered_no_token" && !deleteToken) {
          warnStayedInactiveOnce("orphan");
          consentSuppressedUntil = Date.now() + consentRetryMs;
          if (!callOpts?.withoutHeldCredential) scheduleConsentRetry();
        }
      } catch {
      }
      if (!isServerlessMode()) {
        forceEntitlementCheck(true);
      } else if (!entitlementCameBack && !isActivated()) {
        functionVerdictDue = Date.now() + retryWait(FIRST_VERDICT_SCHEDULE_MS, functionVerdictStep++);
      }
      publishPanelState();
    } else if (res.status === 400) {
      void handleInvalidInstallIdOnce(res).then((handled) => {
        if (!handled) warnStayedInactiveOnce("refused", { status: 400 });
      }).catch(() => {
      });
    } else if (res.status === 401 || res.status === 403) {
      void warnRegistrationRejectedOnce(res);
      markRegistrationRefused();
      consentSuppressedUntil = Date.now() + consentRetryMs;
      if (!callOpts?.withoutHeldCredential) scheduleConsentRetry();
    } else if (res.status === 429) {
      const waitMs = parseRetryAfterMs(res) ?? THROTTLE_FALLBACK_WAIT_MS;
      retryFloor = waitMs;
      warnStayedInactiveOnce("throttled", {
        status: 429,
        retryAfterSeconds: Math.round(waitMs / 1e3)
      });
      markRegistrationThrottled();
      consentSuppressedUntil = Date.now() + waitMs;
      if (!callOpts?.withoutHeldCredential) scheduleConsentRetry(waitMs);
    } else {
      warnStayedInactiveOnce("refused", { status: res.status });
      markRegistrationUnreachable();
    }
    return res.status;
  }
  function effectiveSnapshotUploadAllowed() {
    if (!enabled || isBoosthisDisabled() || isKitLocked()) return false;
    return !effectiveIssuesOnly() || explicitShareMeterWithAI || serverShareMeterWithAI;
  }
  function syncSnapshotUpload() {
    if (effectiveSnapshotUploadAllowed()) {
      setSnapshotSubmitter((snap) => client.transmitSnapshot(snap));
      setSpanSubmitter((spans) => client.transmitSpans(spans));
      if (!isPerRunBilled()) {
        startSnapshotAutoUpload();
        startSpanAutoFlush();
      }
    } else {
      setSnapshotSubmitter(null);
      stopSnapshotAutoUpload();
      setSpanSubmitter(null);
      stopSpanAutoFlush();
    }
  }
  function refuseQueue(onRefused) {
    try {
      onRefused?.();
    } catch {
    }
    return 0;
  }
  function failedQueue(error, onRefused) {
    if (error instanceof PIIDetectedError) {
      _noteUploadRejected("rejected");
      return refuseQueue(onRefused);
    }
    noteUploadUnreachable();
    return 0;
  }
  async function queueSubmit(send) {
    let refused = false;
    const accepted = await send(() => {
      refused = true;
    });
    return refused ? { accepted, undelivered: "refused" } : accepted;
  }
  const client = {
    get installId() {
      return activeInstallId;
    },
    get endpoint() {
      return endpoint;
    },
    get enabled() {
      return enabled && !isBoosthisDisabled();
    },
    get deleteToken() {
      return deleteToken;
    },
    get readToken() {
      return readToken;
    },
    get projectKey() {
      return projectKey;
    },
    get fullTelemetryEffective() {
      return !effectiveIssuesOnly();
    },
    async consent() {
      if (!enabled || isBoosthisDisabled()) return 0;
      return postConsent({ registrationOnly: true });
    },
    async transmit(samples, onRefused) {
      if (effectiveIssuesOnly()) return 0;
      if (!enabled || isBoosthisDisabled() || samples.length === 0) return 0;
      await rotationReady;
      if (!deleteToken) {
        await postConsent({ onDemand: true });
      }
      maybeRefreshCoverage();
      if (!enabled || isBoosthisDisabled()) return 0;
      if (!deleteToken) return 0;
      const ALLOWED_START_TYPES = /* @__PURE__ */ new Set(["cold", "warm", "hot", "unknown"]);
      const ALLOWED_DEVICE_TIERS = /* @__PURE__ */ new Set(["low", "mid", "high", "unknown"]);
      const normMeta = (meta) => {
        const raw2 = meta ?? {};
        return {
          startType: typeof raw2.startType === "string" && ALLOWED_START_TYPES.has(raw2.startType) ? raw2.startType : "unknown",
          deviceTier: typeof raw2.deviceTier === "string" && ALLOWED_DEVICE_TIERS.has(raw2.deviceTier) ? raw2.deviceTier : "unknown",
          ...isDoorWord(raw2.door) ? { door: raw2.door } : {}
        };
      };
      const raw = samples.length > 100 ? samples.slice(0, 100) : samples;
      const batch = raw.filter((s) => {
        if (s.routeLabel.length > MAX_PART_NAME) {
          warnPartNameRefusal("too-long");
          return false;
        }
        if (transmitLabelHasPII(s.routeLabel) !== null) {
          warnPartNameRefusal("invalid");
          return false;
        }
        return true;
      }).map((s) => ({
        routeLabel: s.routeLabel,
        durationMs: s.durationMs,
        rating: s.rating,
        ...s.ruleId !== void 0 ? { ruleId: s.ruleId } : {},
        metadata: normMeta(s.metadata)
      }));
      if (batch.length === 0) {
        _noteUploadRejected("rejected");
        return refuseQueue(onRefused);
      }
      const payload = {
        installId: activeInstallId,
        packageVersion: RUNTIME_VERSION,
        samples: batch
      };
      try {
        assertNoPII(payload);
      } catch {
        _noteUploadRejected("rejected");
        return refuseQueue(onRefused);
      }
      try {
        const { res, refusal: refusal2 } = await sendUpload(
          "samples",
          deleteToken,
          (credential) => _safeTransmitInternal(
            `${endpoint}/samples`,
            payload,
            fetchOptions,
            `Bearer ${credential}`
          )
        );
        if (judgeUpload(res, refusal2)) {
          if (batch.length < raw.length) refuseQueue(onRefused);
          return batch.length;
        }
        return res.status === 400 || res.status === 413 || res.status === 422 ? refuseQueue(onRefused) : 0;
      } catch (error) {
        return failedQueue(error, onRefused);
      }
    },
    async transmitCandidates(signatures, onRefused) {
      if (isBoosthisDisabled() || signatures.length === 0) return 0;
      await rotationReady;
      if (!deleteToken) {
        await postConsent({ onDemand: true });
      }
      if (isBoosthisDisabled()) return 0;
      if (!deleteToken) return 0;
      const batch = signatures.length > 50 ? signatures.slice(0, 50) : signatures;
      const payload = {
        installId: activeInstallId,
        packageVersion: RUNTIME_VERSION,
        signatures: batch
      };
      try {
        assertNoPII(payload);
      } catch {
        _noteUploadRejected("rejected");
        return refuseQueue(onRefused);
      }
      try {
        const { res, refusal: refusal2 } = await sendUpload(
          "candidates",
          deleteToken,
          (credential) => _safeTransmitInternal(
            `${endpoint}/candidates`,
            payload,
            fetchOptions,
            `Bearer ${credential}`
          )
        );
        if (judgeUpload(res, refusal2)) return batch.length;
        return res.status === 400 || res.status === 413 || res.status === 422 ? refuseQueue(onRefused) : 0;
      } catch (error) {
        return failedQueue(error, onRefused);
      }
    },
    async transmitResolutions(resolutions, onRefused) {
      if (isBoosthisDisabled() || resolutions.length === 0) return 0;
      await rotationReady;
      if (!deleteToken) {
        await postConsent({ onDemand: true });
      }
      if (isBoosthisDisabled()) return 0;
      if (!deleteToken) return 0;
      const batch = resolutions.length > 50 ? resolutions.slice(0, 50) : resolutions;
      const payload = {
        installId: activeInstallId,
        packageVersion: RUNTIME_VERSION,
        resolutions: batch
      };
      try {
        assertNoPII(payload);
      } catch {
        _noteUploadRejected("rejected");
        return refuseQueue(onRefused);
      }
      try {
        const { res, refusal: refusal2 } = await sendUpload(
          "resolutions",
          deleteToken,
          (credential) => _safeTransmitInternal(
            `${endpoint}/resolutions`,
            payload,
            fetchOptions,
            `Bearer ${credential}`
          )
        );
        if (judgeUpload(res, refusal2)) return batch.length;
        return res.status === 400 || res.status === 413 || res.status === 422 ? refuseQueue(onRefused) : 0;
      } catch (error) {
        return failedQueue(error, onRefused);
      }
    },
    async transmitSnapshot(snapshot) {
      if (!effectiveSnapshotUploadAllowed()) return 0;
      if (!enabled || isBoosthisDisabled()) return 0;
      await rotationReady;
      if (!deleteToken) {
        await postConsent({ onDemand: true });
      }
      maybeRefreshCoverage();
      if (!effectiveSnapshotUploadAllowed()) return 0;
      if (!deleteToken) return 0;
      const safeRows = snapshot.rows.filter(
        (r) => transmitLabelHasPII(r.key) === null
      );
      const safeCrossCutting = snapshot.crossCutting.filter((f) => transmitLabelHasPII(f.name) === null).map(
        (f) => looksLikeAddress(f.name) ? { ...f, name: `outbound:${dependencyKindFor(f.name)}` } : f
      );
      const safeRouteList = snapshot.routeList ? {
        ...snapshot.routeList,
        entries: snapshot.routeList.entries.filter(
          (e) => transmitLabelHasPII(e.label) === null
        )
      } : void 0;
      const safeDeclaredWaits = snapshot.declaredWaits ? {
        routes: snapshot.declaredWaits.routes.filter(
          (r) => transmitLabelHasPII(r.name) === null
        )
      } : void 0;
      const sanitizedSnapshot = {
        ...snapshot,
        rows: safeRows,
        crossCutting: safeCrossCutting,
        ...safeRouteList ? { routeList: safeRouteList } : {},
        ...safeDeclaredWaits ? { declaredWaits: safeDeclaredWaits } : {}
      };
      const payload = {
        installId: activeInstallId,
        packageVersion: RUNTIME_VERSION,
        capturedAt: sanitizedSnapshot.capturedAt,
        snapshot: sanitizedSnapshot
      };
      try {
        assertNoPII(payload);
      } catch {
        _noteUploadRejected("rejected");
        return 0;
      }
      try {
        const { res, refusal: refusal2 } = await sendUpload(
          "snapshots",
          deleteToken,
          (credential) => _safeTransmitInternal(
            `${endpoint}/snapshots`,
            payload,
            fetchOptions,
            `Bearer ${credential}`
          )
        );
        return judgeUpload(res, refusal2) ? 1 : 0;
      } catch (error) {
        return failedQueue(error);
      }
    },
    async transmitCrashes(crashes, as) {
      if (isBoosthisDisabled() || crashes.length === 0) return 0;
      await rotationReady;
      if (!as) {
        if (!deleteToken) {
          await postConsent({ onDemand: true });
        }
      }
      if (isBoosthisDisabled()) return 0;
      const sendAsInstallId = as?.installId ?? activeInstallId;
      const sendCredential = as?.credential ?? deleteToken;
      if (!sendCredential) return 0;
      const batch = crashes.length > 50 ? crashes.slice(0, 50) : crashes;
      const deliveryId = crashDeliveryId(sendAsInstallId, batch);
      const payload = {
        installId: sendAsInstallId,
        packageVersion: RUNTIME_VERSION,
        deliveryId,
        crashes: batch
      };
      try {
        assertNoPII(payload);
      } catch {
        _noteUploadRejected("rejected");
        noteCrashSendRefused("rejected");
        return 0;
      }
      try {
        const send = (credential) => _safeTransmitInternal(
          `${endpoint}/crashes`,
          payload,
          fetchOptions,
          `Bearer ${credential}`
        );
        let res;
        let ok;
        if (as) {
          res = await pacedUpload("crashes", () => send(sendCredential));
          ok = noteUpload(res);
        } else {
          const sent = await sendUpload("crashes", sendCredential, send);
          res = sent.res;
          ok = judgeUpload(res, sent.refusal);
        }
        if (!ok) noteCrashSendRefused(crashRefusalFor(res?.status ?? 0));
        return ok ? batch.length : 0;
      } catch (error) {
        if (error instanceof PIIDetectedError) {
          _noteUploadRejected("rejected");
          noteCrashSendRefused("rejected");
          return 0;
        }
        noteUploadUnreachable();
        noteCrashSendRefused("unreachable");
        return 0;
      }
    },
    async transmitSpans(spans) {
      if (!effectiveSnapshotUploadAllowed()) return 0;
      if (!enabled || isBoosthisDisabled() || spans.length === 0) return 0;
      await rotationReady;
      if (!deleteToken) {
        await postConsent({ onDemand: true });
      }
      if (!effectiveSnapshotUploadAllowed()) return 0;
      if (!deleteToken) return 0;
      const safe = spans.filter((s) => transmitLabelHasPII(s.routeLabel) === null);
      const batch = safe.length > MAX_SPAN_BATCH ? safe.slice(0, MAX_SPAN_BATCH) : safe;
      if (batch.length === 0) return 0;
      const payload = {
        installId: activeInstallId,
        packageVersion: RUNTIME_VERSION,
        spans: batch
      };
      try {
        assertNoPII(payload);
      } catch {
        _noteUploadRejected("rejected");
        return 0;
      }
      try {
        const { res, refusal: refusal2 } = await sendUpload(
          "spans",
          deleteToken,
          (credential) => _safeTransmitInternal(
            `${endpoint}/spans`,
            payload,
            fetchOptions,
            `Bearer ${credential}`
          )
        );
        return judgeUpload(res, refusal2) ? batch.length : 0;
      } catch (error) {
        return failedQueue(error);
      }
    },
    async transmitJobRuns(runs, expectations = [], promises = [], tallies = []) {
      const nothingToSend = runs.length === 0 && tallies.length === 0 && expectations.length === 0 && promises.length === 0;
      if (!enabled || isBoosthisDisabled() || nothingToSend) return 0;
      await rotationReady;
      if (!deleteToken) {
        await postConsent({ onDemand: true });
      }
      if (!enabled || isBoosthisDisabled()) return 0;
      if (!deleteToken) return { accepted: 0, undelivered: "retry" };
      const safe = runs.filter((r) => transmitLabelHasPII(r.job) === null);
      const safeTallies = tallies.filter((t) => transmitLabelHasPII(t.job) === null).slice(0, MAX_JOB_RUN_TALLIES);
      const batch = safe.length > MAX_JOB_RUN_BATCH ? safe.slice(0, MAX_JOB_RUN_BATCH) : safe;
      const declared = expectations.filter((e) => transmitLabelHasPII(e.job) === null).slice(0, MAX_JOB_EXPECTATIONS);
      const declaredPromises = promises.filter(
        (p) => p.subjectLabel === void 0 || transmitLabelHasPII(p.subjectLabel) === null
      ).slice(0, MAX_PROMISE_DECLARATIONS);
      if (batch.length === 0 && safeTallies.length === 0 && declared.length === 0 && declaredPromises.length === 0)
        return 0;
      const payload = {
        installId: activeInstallId,
        packageVersion: RUNTIME_VERSION,
        runs: batch
      };
      if (safeTallies.length > 0) payload.runTallies = safeTallies;
      if (declared.length > 0) payload.expectations = declared;
      try {
        assertNoPII({
          ...payload,
          ...declaredPromises.length > 0 ? {
            promises: declaredPromises.map(
              ({ wording: _wording, ...rest }) => rest
            )
          } : {}
        });
      } catch {
        _noteUploadRejected("rejected");
        return { accepted: 0, undelivered: "refused" };
      }
      if (declaredPromises.length > 0) payload.promises = declaredPromises;
      try {
        const { res, refusal: refusal2 } = await sendUpload(
          "job-runs",
          deleteToken,
          (credential) => _safeTransmitInternal(
            `${endpoint}/job-runs`,
            payload,
            fetchOptions,
            `Bearer ${credential}`
          )
        );
        let outcomes;
        let promiseOutcomes;
        const ok = judgeUpload(res, refusal2, (body) => {
          outcomes = readExpectationOutcomes(body);
          promiseOutcomes = readPromiseOutcomes(body);
        });
        const bodyRead = lastReplyBodyRead;
        if (isNoSendResponse(res)) return 0;
        if (!ok)
          return {
            accepted: 0,
            undelivered: res.status === 400 || res.status === 413 || res.status === 422 ? "refused" : "retry"
          };
        if ((declared.length > 0 || declaredPromises.length > 0) && bodyRead)
          await bodyRead;
        return {
          accepted: batch.length + safeTallies.reduce((n, t) => n + t.runs, 0),
          expectations: outcomes,
          promises: promiseOutcomes
        };
      } catch (error) {
        if (error instanceof PIIDetectedError) {
          _noteUploadRejected("rejected");
          return { accepted: 0, undelivered: "refused" };
        }
        noteUploadUnreachable();
        return { accepted: 0, undelivered: "retry" };
      }
    },
    disable() {
      enabled = false;
      consentGeneration++;
      stopEntitlementCheckin();
      pauseSampleQueue();
      stopConsentRetry();
      syncSnapshotUpload();
      publishPanelState();
    },
    enable() {
      enabled = true;
      installCheckinConfig();
      forgottenSinceEnable = false;
      setCandidateSubmitter(
        (signatures) => queueSubmit((onRefused) => client.transmitCandidates(signatures, onRefused))
      );
      setResolutionSubmitter(
        (resolutions) => queueSubmit((onRefused) => client.transmitResolutions(resolutions, onRefused))
      );
      if (!effectiveIssuesOnly()) resumeSampleQueue();
      syncSnapshotUpload();
      publishPanelState();
    },
    async forget() {
      forgottenSinceEnable = true;
      consentGeneration++;
      setCandidateSubmitter(null);
      setResolutionSubmitter(null);
      setSampleObserver(null);
      clearSampleSink();
      clearUploadPauses();
      setExitReadyHook(null);
      stopConsentRetry();
      stopEntitlementCheckin();
      void clearEntitlementCache().catch(() => {
      });
      forgetServedHosts();
      setSnapshotSubmitter(null);
      stopSnapshotAutoUpload();
      setSpanSubmitter(null);
      stopSpanAutoFlush();
      clearBufferedSpans();
      setCrashSubmitter(null);
      await uninstallCrashHandlers();
      setJobRunSubmitter(null);
      stopJobRunAutoFlush();
      clearBufferedJobRuns();
      clearJobRhythmDeclarations();
      clearPromiseDeclarations();
      readToken = null;
      void storage.remove(readTokenStoreKey).catch(() => {
      });
      await credsReady;
      void storage.remove(deleteTokenStoreKey).catch(() => {
      });
      await rotationReady;
      void storage.remove(rotationStoreKey).catch(() => {
      });
      await clearAllCandidates();
      clearDetectors();
      clearEventLoopLag();
      clearCpuSchedulingMeters();
      clearVitals();
      resetRouteOutcomes();
      clearExtraMeters();
      clearBuildIdentity();
      if (!deleteToken) {
        enabled = false;
        publishPanelState();
        return 0;
      }
      if (isBoosthisDisabled()) {
        deleteToken = null;
        enabled = false;
        publishPanelState();
        return 204;
      }
      const token = deleteToken;
      try {
        const res = await _safeTransmitTrustedPayload(
          `${endpoint}/installs/forget`,
          {
            installId: activeInstallId,
            deleteToken: token
          },
          fetchOptions
        );
        deleteToken = null;
        enabled = false;
        publishPanelState();
        return res.status;
      } catch {
        return 0;
      }
    }
  };
  let launchConsentPending = true;
  let startingConsent = null;
  setUploadReadiness(() => {
    if (launchConsentPending) return false;
    if (hasBeenActiveInThisRun()) return true;
    if (!deleteToken && consentFlight === null && !startingConsent && enabled && !isBoosthisDisabled()) {
      startingConsent = postConsent({ onDemand: true }).catch(() => {
      }).finally(() => {
        startingConsent = null;
      });
    }
    return false;
  });
  setCandidateSubmitter(
    (signatures) => queueSubmit((onRefused) => client.transmitCandidates(signatures, onRefused))
  );
  setResolutionSubmitter(
    (resolutions) => queueSubmit((onRefused) => client.transmitResolutions(resolutions, onRefused))
  );
  setSampleSink({
    submitter: (samples) => queueSubmit((onRefused) => client.transmit(samples, onRefused)),
    issuesOnly
  });
  setSampleObserver(onSample);
  setCoverageRefreshHook(maybeRefreshCoverage);
  syncSnapshotUpload();
  if (!isKitLocked()) installExitFlush();
  setExitReadyHook(async () => {
    if (!enabled || isBoosthisDisabled() || isKitLocked()) return;
    if (deleteToken || readToken) return;
    await postConsent({ onDemand: true, registrationOnly: true });
    installCheckinConfig();
  });
  if (isPerRunBilled()) {
    setAutoTickEnabled(false);
    const pendingRowsNow = () => pendingSampleCount() + _spanInternals.bufferLen() + pendingJobRunCount();
    let snapshotSent = false;
    let lastSnapshotAt = Date.now();
    setInvocationFlush(
      async (deadline) => {
        if (!enabled || isBoosthisDisabled()) return 0;
        if (functionVerdictDue > 0 && Date.now() >= functionVerdictDue) {
          functionVerdictDue = 0;
          void checkEntitlementNow().catch(() => null).finally(() => {
            if (enabled && !forgottenSinceEnable && !isBoosthisDisabled() && !isActivated()) {
              functionVerdictDue = Date.now() + retryWait([...FIRST_VERDICT_SCHEDULE_MS, ...REGISTRATION_RETRY_SCHEDULE_MS], functionVerdictStep++);
            }
          });
        }
        if (isKitLocked()) return 0;
        const spent = () => deadline?.expired() === true;
        if (!deleteToken || consentSuppressedUntil > 0 && Date.now() >= consentSuppressedUntil) {
          try {
            await postConsent({ onDemand: true });
          } catch {
          }
        }
        if (spent() || isKitLocked()) return pendingRowsNow();
        try {
          await reportNow(true);
        } catch {
        }
        if (spent()) return pendingRowsNow();
        try {
          await flushSpansNow(true);
        } catch {
        }
        if (spent()) return pendingRowsNow();
        try {
          await flushJobRunsNow(true);
        } catch {
        }
        if (!snapshotSent) {
          if (kitShouldReduce()) noteKitReduced();
          snapshotSent = true;
          lastSnapshotAt = Date.now();
          try {
            await uploadPerfSnapshotNow();
          } catch {
          }
        } else if (kitShouldReduce()) {
          noteKitReduced();
        } else if (!spent() && Date.now() - lastSnapshotAt >= SERVERLESS_SNAPSHOT_MIN_MS) {
          lastSnapshotAt = Date.now();
          try {
            await uploadPerfSnapshotNow();
          } catch {
          }
        }
        return pendingRowsNow();
      },
      // The same reading, taken independently — used when the flush ran out of
      // budget or threw and so never got to report what it left behind.
      pendingRowsNow,
      // THE BACKLOG'S ENDING. Called only once the lifecycle has decided these
      // rows are never leaving: five minutes held and ten flushes that could not
      // move them. Emptying the queues is the point — rows that cannot be
      // delivered were still occupying the buffer the next measurements need, so
      // "held for ever" was costing the customer the measurements AFTER it too.
      // The caller counts what comes back as lost, with `heldTooLong` as the
      // cause, and says so on the kit's own problem channel.
      () => {
        let rows = 0;
        try {
          rows += discardPendingSamples();
        } catch {
        }
        try {
          rows += _spanInternals.bufferLen();
          clearBufferedSpans();
        } catch {
        }
        try {
          rows += pendingJobRunCount();
          clearBufferedJobRuns();
        } catch {
        }
        return rows;
      }
    );
  }
  setCrashSubmitter((crashes, as) => client.transmitCrashes(crashes, as));
  setCrashCredentialReader(() => deleteToken);
  const installCrashHandler = () => installCrashHandlers({
    detailed: opts.crashDetails === true || serverCrashDetails,
    // Stamped on every crash this process buffers to disk. Workers of one app
    // share one state file, so an entry without an owner can be uploaded — or
    // cleared — by a process that did not crash.
    installId: activeInstallId
  });
  if (!isKitLocked()) installCrashHandler();
  setJobRunSubmitter(
    (runs, expectations, promises, tallies) => client.transmitJobRuns(runs, expectations, promises, tallies)
  );
  if (!isServerlessMode() && !isKitLocked()) startJobRunAutoFlush();
  setKitLockHandlers({
    unhook: () => {
      stopConsentRetry();
      setAutoTickEnabled(false);
      setSnapshotSubmitter(null);
      stopSnapshotAutoUpload();
      setSpanSubmitter(null);
      stopSpanAutoFlush();
      stopJobRunAutoFlush();
      uninstallExitFlush();
      detachCrashHandlers();
      clearDetectors();
      clearAiCalls();
      clearEventLoopLag();
      clearCpuSchedulingMeters();
      clearVitals();
      clearExtraMeters();
      disarmReadyWatch();
    },
    clearSamples: () => {
      clearSampleRing();
      discardPendingSamples();
      clearBufferedSpans();
      clearBufferedJobRuns();
      resetRouteOutcomes();
      void clearAllCandidates().catch(() => {
      });
    },
    clearChecks: () => {
      clearCommunityCache("js");
    },
    removeLocal: async () => {
      setCandidateSubmitter(null);
      setResolutionSubmitter(null);
      setCrashSubmitter(null);
      setJobRunSubmitter(null);
      clearUploadPauses();
      try {
        await uninstallCrashHandlers();
      } catch {
      }
      clearBufferedJobRuns();
      clearJobRhythmDeclarations();
      clearPromiseDeclarations();
      readToken = null;
      await credsReady;
      deleteToken = null;
      await rotationReady;
      await Promise.all(
        [
          readTokenStoreKey,
          deleteTokenStoreKey,
          rotationStoreKey,
          projectStoreKey,
          promisesStoreKey
        ].map(
          (key) => storage.remove(key).catch(() => {
          })
        )
      );
      clearKitProject();
      await clearAllCandidates();
      clearBuildIdentity();
      clearFeedbackLog();
      publishPanelState();
    },
    rearm: () => {
      if (forgottenSinceEnable || isBoosthisDisabled() || isKitLocked()) return;
      armCollectors(false);
      syncSnapshotUpload();
      setAutoTickEnabled(!isPerRunBilled());
      installExitFlush();
      installCrashHandler();
      if (!isServerlessMode()) startJobRunAutoFlush();
      publishPanelState();
    }
  });
  void Promise.all([rotationReady, credsReady]).then(() => {
    if (!enabled || isBoosthisDisabled()) return;
    if (!deleteToken) return;
    return postConsent();
  }).catch(() => {
  }).finally(() => {
    launchConsentPending = false;
  });
  void rotationReady.then(() => storage.set("installId", activeInstallId)).catch(() => {
  });
  activeClient = client;
  return client;
}
function getActiveTelemetryClient() {
  return activeClient;
}
function getPanelInstallId() {
  return panelInstallId;
}
function _noteUploadAccepted() {
  try {
    lastUploadAtMs = Date.now();
    lastAttemptFailed = false;
  } catch {
  }
}
let lastUploadFailAtMs = null;
let lastUploadFailReason = null;
let droppedUploads = 0;
let lastAttemptFailed = false;
function _noteUploadRejected(reason) {
  try {
    lastUploadFailAtMs = Date.now();
    lastUploadFailReason = reason;
    lastAttemptFailed = true;
    droppedUploads += 1;
  } catch {
  }
}
function getLastUploadFailure() {
  if (lastUploadFailAtMs === null || lastUploadFailReason === null) return null;
  return { at: lastUploadFailAtMs, reason: lastUploadFailReason };
}
function getDroppedUploadCount() {
  return droppedUploads;
}
function isLastUploadAttemptFailed() {
  return lastAttemptFailed;
}
let panelFullTelemetry = false;
let panelEndpoint = null;
function isFullTelemetryForPanel() {
  return panelFullTelemetry;
}
function _publishInstallIdentity(installId, endpoint, fullTelemetry) {
  panelInstallId = typeof installId === "string" && installId ? installId : null;
  panelEndpoint = typeof endpoint === "string" && endpoint ? endpoint : null;
  panelFullTelemetry = fullTelemetry === true;
}
let lastUploadAtMs = null;
function getPanelEndpoint() {
  return panelEndpoint;
}
function askRegistration() {
  try {
    void checkRegistrationOnce({
      endpoint: panelEndpoint,
      installId: panelInstallId,
      projectKey: panelProjectKey.key
    });
  } catch {
  }
}
function getLastUploadAt() {
  return lastUploadAtMs;
}
function _resetStatusMirrorsForTests() {
  _resetRegistrationForTests();
  panelInstallId = null;
  panelEndpoint = null;
  panelFullTelemetry = false;
  lastUploadAtMs = null;
  lastUploadFailAtMs = null;
  lastUploadFailReason = null;
  lastAttemptFailed = false;
  droppedUploads = 0;
  clearUploadPauses();
}
export {
  DEFAULT_TELEMETRY_ENDPOINT,
  PRE_CONTACT_FULL_TELEMETRY_DEFAULT,
  _noteUploadAccepted,
  _noteUploadRejected,
  _publishInstallIdentity,
  _publishPanelState,
  _resetRegistrationWarningForTests,
  _resetStatusMirrorsForTests,
  _setConsentRetryMsForTests,
  askRegistration,
  crashDeliveryId,
  describeRetryWait,
  detectAppName,
  enableTelemetry,
  generateRotationInstallId,
  getActiveTelemetryClient,
  getDroppedUploadCount,
  getLastUploadAt,
  getLastUploadFailure,
  getPanelEndpoint,
  getPanelInstallId,
  getPanelProjectKey,
  getRegistrationRefusalKind,
  getRegistrationRefusalRetryAfterSeconds,
  getRegistrationRefusalSentence,
  getRegistrationRejection,
  isFullTelemetryForPanel,
  isLastUploadAttemptFailed,
  isRegisteredForPanel,
  isSharingOnForPanel,
  resolveAppName
};
