// @ts-nocheck
/* eslint-disable */
// Built from src/crashReporter.ts so plain node can run the kit. Do not edit.
import { hostname } from "node:os";
import {
  beginRun,
  endRun,
  hasRunAs,
  noteCarriedCrashes,
  noteCrashDelivered,
  noteCrashDeliveryRefused,
  noteCrashesGivenUp,
  noteCrashKeepFailed,
  noteCrashOccurred,
  noteCrashRefiledUnderSuccessor,
  takeCrashSendRefusal,
  useHeldCrashReader
} from "./crashDelivery.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { currentAction, errorAction } from "./spanScope.js";
import {
  currentFailurePart,
  FAILURE_PART_UNKNOWN
} from "./failurePart.js";
import { checkNoPII } from "./no-pii.js";
import {
  codeOwnerOfPath,
  crashMistakeOf,
  restoredCauseFields
} from "./crashCause.js";
import { anyRequestBegun, currentRequestScope, requestScopesReadable } from "./repeatedWork.js";
import { readyToServeMs } from "./readyToServe.js";
import {
  eraseCrashState,
  processLiveness,
  processLivenessMark,
  storage,
  storageDurable,
  withCrashGeneration
} from "./storage.js";
const STORAGE_KEY = "boosthis:crash-pending:v1";
const MAX_CRASHES = 200;
const MAX_BATCH = 50;
const MAX_OCCURRENCES = 1e5;
const MAX_FRAMES = 20;
const CRASH_RECEIPT_KEEP_MS = 30 * 24 * 60 * 60 * 1e3;
function bufferKey(signature, installId) {
  return installId ? `${installId}${signature}` : signature;
}
function keyOf(e) {
  return bufferKey(e.signature, e.sendAs?.installId);
}
function isRestoredUnknownTerm(v) {
  return v === FAILURE_PART_UNKNOWN.noPartOpen || v === FAILURE_PART_UNKNOWN.notTracked || v === FAILURE_PART_UNKNOWN.refused;
}
function isRestoredAppFrame(v) {
  return typeof v === "string" && v.length > 0 && v.length <= 160 && checkNoPII({ appFrame: v }) === null;
}
let activeSubmitter = null;
let active = false;
let detailedMode = false;
let jobStateReader = null;
function useCrashJobStateReader(read) {
  jobStateReader = read;
}
function setCrashDetailed(on) {
  if (active) detailedMode = on === true;
}
function duringOf(kind, where) {
  if (kind === "job") return "background";
  if (kind === "errorPage") return "request";
  let jobs = null;
  try {
    jobs = jobStateReader?.() ?? null;
  } catch {
    jobs = null;
  }
  if (jobs?.open === true) return "background";
  if (currentRequestScope() !== null || where.routeLabel !== void 0) return "request";
  if (!requestScopesReadable()) return void 0;
  return anyRequestBegun() || jobs?.begun === true || readyToServeMs() !== null ? "outside-request" : "startup";
}
let monitorListener = null;
let restoredOnce = false;
let crashTotal = 0;
const ERROR_PAGE_SEND_GAP_MS = 3e4;
let lastErrorPageSendAt = 0;
let errorPageTimer = null;
function clearErrorPageTimer() {
  if (errorPageTimer) {
    try {
      clearTimeout(errorPageTimer);
    } catch {
    }
    errorPageTimer = null;
  }
}
function scheduleErrorPageSend(now) {
  try {
    if (errorPageTimer) return;
    const wait = lastErrorPageSendAt + ERROR_PAGE_SEND_GAP_MS - now;
    if (wait <= 0) {
      lastErrorPageSendAt = now;
      persist();
      scheduleFlush();
      return;
    }
    errorPageTimer = setTimeout(() => {
      errorPageTimer = null;
      lastErrorPageSendAt = Date.now();
      persist();
      scheduleFlush();
    }, wait);
    errorPageTimer.unref?.();
  } catch {
  }
}
let errorPagesSeen = /* @__PURE__ */ new WeakMap();
let credentialReader = null;
const pending = /* @__PURE__ */ new Map();
function setCrashSubmitter(submitter) {
  const arrived = submitter !== null && activeSubmitter !== submitter;
  activeSubmitter = submitter;
  if (arrived && active && pending.size > 0 && !isBoosthisDisabled()) {
    scheduleFlush();
  }
}
function setCrashCredentialReader(read) {
  credentialReader = read;
}
function ownCredential() {
  try {
    const v = credentialReader?.();
    return typeof v === "string" && v ? v : null;
  } catch {
    return null;
  }
}
function hash(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = h * 33 ^ input.charCodeAt(i);
  return (h >>> 0).toString(36);
}
function bucketCount(n) {
  if (n <= 1) return "1";
  if (n <= 5) return "2-5";
  if (n <= 20) return "6-20";
  if (n <= 100) return "21-100";
  return "100+";
}
function toError(error) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  if (error && typeof error === "object") {
    const o = error;
    return {
      name: typeof o.name === "string" ? o.name : "Error",
      message: typeof o.message === "string" ? o.message : String(error),
      stack: typeof o.stack === "string" ? o.stack : void 0
    };
  }
  return {
    name: "Error",
    message: typeof error === "string" ? error : String(error)
  };
}
function sanitizeErrorName(name) {
  const cleaned = name.replace(/[^A-Za-z0-9_$]/g, "").slice(0, 80);
  return cleaned.length > 0 ? cleaned : "Error";
}
function fileBasename(raw) {
  let s = raw;
  const q = s.search(/[?#]/);
  if (q >= 0) s = s.slice(0, q);
  const segs = s.split(/[\\/]/);
  s = segs[segs.length - 1] ?? "";
  s = s.trim().slice(0, 120);
  return s.length > 0 ? s : "<unknown>";
}
const ON_DISK = /^(?:\/|[A-Za-z]:[\\/]|\\\\|file:\/\/)/i;
const DEPENDENCY_SEGMENT = /(?:^|[\\/])node_modules(?:[\\/]|$)/i;
const KIT_SEGMENT = /(?:^|[\\/])(?:boosthis-runtime-node|boosthis-checklist)(?:[\\/]|$)/i;
function isOwnCodePath(path) {
  const p = path.trim();
  return ON_DISK.test(p) && !DEPENDENCY_SEGMENT.test(p) && !KIT_SEGMENT.test(p);
}
function firstAppFrame(frames) {
  const top = frames[0];
  if (!top || isOwnCodePath(top.path)) return null;
  for (let i = 1; i < frames.length; i++) {
    const f = frames[i];
    if (isOwnCodePath(f.path)) return f;
  }
  return null;
}
function parseStack(stack) {
  if (!stack || typeof stack !== "string") return [];
  const frames = [];
  const lines = stack.split("\n");
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) continue;
    let func = "<anonymous>";
    let loc = "";
    const v8 = line.match(/^at\s+(.*?)\s+\((.*)\)$/);
    if (v8) {
      func = v8[1] ?? "<anonymous>";
      loc = v8[2] ?? "";
    } else {
      const v8NoFn = line.match(/^at\s+(.*)$/);
      const jsc = line.match(/^(.*?)@(.*)$/);
      if (v8NoFn) {
        loc = v8NoFn[1] ?? "";
      } else if (jsc) {
        func = jsc[1] && jsc[1].length > 0 ? jsc[1] : "<anonymous>";
        loc = jsc[2] ?? "";
      } else {
        continue;
      }
    }
    let file = loc;
    let lineNo;
    let colNo;
    const m = loc.match(/^(.*):(\d+):(\d+)$/) ?? loc.match(/^(.*):(\d+)$/);
    if (m) {
      file = m[1] ?? loc;
      lineNo = clampInt(m[2]);
      colNo = m[3] !== void 0 ? clampInt(m[3]) : void 0;
    }
    func = func.replace(/[^A-Za-z0-9_$.<>\s]/g, "").trim().slice(0, 120);
    if (func.length === 0) func = "<anonymous>";
    frames.push({
      func,
      file: fileBasename(file),
      line: lineNo,
      column: colNo,
      path: file
    });
    if (frames.length >= MAX_FRAMES) break;
  }
  return frames;
}
function clampInt(s) {
  const n = parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return void 0;
  return Math.min(n, 1e8);
}
function formatRedactedFrame(top) {
  if (!top) return "<unknown>";
  const lineSuffix = top.line !== void 0 ? `:${top.line}` : "";
  return `${top.func} (${top.file}${lineSuffix})`.slice(0, 160);
}
function sanitizeSummary(message) {
  const first = message.split(/\r?\n/)[0]?.trim().slice(0, 300);
  if (!first) return void 0;
  if (checkNoPII(first) !== null) return void 0;
  return first;
}
function redactError(error, kind) {
  const err = toError(error);
  const errorName = sanitizeErrorName(err.name);
  const frames = parseStack(err.stack);
  const top = frames[0];
  const redactedFrame = formatRedactedFrame(top);
  let basis = top ? redactedFrame : `${errorName}|${kind}|<no-frame>`;
  const app = firstAppFrame(frames);
  const appFrameText = app ? formatRedactedFrame(app) : void 0;
  const appFrame = appFrameText !== void 0 && checkNoPII({ appFrame: appFrameText }) === null ? appFrameText : void 0;
  if (app && appFrame !== void 0) basis = `${basis}|app:${app.func}@${app.file}`;
  if (kind === "errorPage") basis = `errorPage|${basis}`;
  const signature = `${errorName}:${hash(basis)}`.slice(0, 120);
  const cause = { ...crashMistakeOf(error) };
  const owner = top ? codeOwnerOfPath(top.path, isOwnCodePath(top.path), KIT_SEGMENT.test(top.path)) : void 0;
  if (owner !== void 0) cause.codeOwner = owner;
  const out = { signature, errorName, kind, redactedFrame, cause };
  if (appFrame !== void 0) out.appFrame = appFrame;
  if (detailedMode) {
    const summary = sanitizeSummary(err.message);
    if (summary) out.summary = summary;
    const safeFrames = frames.slice(0, MAX_FRAMES).map((f) => {
      const fr = { func: f.func, file: f.file };
      if (f.line !== void 0) fr.line = f.line;
      if (f.column !== void 0) fr.column = f.column;
      return fr;
    }).filter((fr) => checkNoPII(fr) === null);
    if (safeFrames.length > 0) out.frames = safeFrames;
  }
  return out;
}
function capture(error, kind, place) {
  try {
    if (!active || isBoosthisDisabled()) return;
    if (withCrashGeneration(() => true) !== true) {
      pending.clear();
      noteCrashKeepFailed(storageDurable() ? "write-failed" : "storage-not-durable");
      return;
    }
    const errorPage = kind === "errorPage";
    if (!errorPage) crashTotal += 1;
    const r = redactError(error, kind);
    const now = Date.now();
    const at = currentAction() ?? errorAction(error);
    const where = place ?? currentFailurePart();
    const during = duringOf(kind, where);
    const cause = { ...r.cause, ...during !== void 0 ? { during } : {} };
    const existing = pending.get(bufferKey(r.signature));
    if (existing) {
      existing.sessionTotal = Math.min(
        existing.sessionTotal + 1,
        MAX_OCCURRENCES
      );
      existing.unsent = Math.min(existing.unsent + 1, MAX_OCCURRENCES);
      existing.kind = r.kind;
      existing.errorName = r.errorName;
      existing.redactedFrame = r.redactedFrame;
      existing.appFrame = r.appFrame;
      existing.cause = cause;
      existing.lastSeen = now;
      existing.noted = true;
      if (r.summary !== void 0) existing.summary = r.summary;
      if (r.frames !== void 0) existing.frames = r.frames;
      if (at !== null) {
        existing.traceId = at.traceId;
        existing.spanId = at.spanId;
      }
      if (where.routeLabel !== void 0) {
        existing.routeLabel = where.routeLabel;
        existing.partUnknown = void 0;
      } else if (existing.routeLabel === void 0) {
        existing.partUnknown = where.partUnknown;
      }
    } else {
      pending.set(bufferKey(r.signature), {
        signature: r.signature,
        errorName: r.errorName,
        kind: r.kind,
        redactedFrame: r.redactedFrame,
        ...r.appFrame !== void 0 ? { appFrame: r.appFrame } : {},
        cause,
        summary: r.summary,
        frames: r.frames,
        sessionTotal: 1,
        unsent: 1,
        lastSeen: now,
        noted: true,
        ...at !== null ? { traceId: at.traceId, spanId: at.spanId } : {},
        ...where
      });
      evictIfNeeded();
    }
    if (errorPage) {
      scheduleErrorPageSend(now);
      return;
    }
    if (!noteCrashOccurred(now)) {
      const e = pending.get(bufferKey(r.signature));
      if (e) delete e.noted;
    }
    persist();
    scheduleFlush();
  } catch {
  }
}
function reportRenderError(error) {
  capture(error, "render");
}
function reportJobError(error) {
  capture(error, "job");
}
function captureErrorPage(error, opts = {}) {
  try {
    if (error === void 0 || error === null) return false;
    if (!active || isBoosthisDisabled()) return false;
    if ((typeof error === "object" || typeof error === "function") && opts.request) {
      if (errorPagesSeen.get(error) === opts.request) return false;
      errorPagesSeen.set(error, opts.request);
    }
    const before = pendingCrashOccurrences();
    capture(error, "errorPage", opts.place);
    return pendingCrashOccurrences() > before;
  } catch {
    return false;
  }
}
function evictIfNeeded() {
  if (pending.size <= MAX_CRASHES) return;
  const sortable = [...pending.values()].sort((a, b) => a.lastSeen - b.lastSeen);
  for (const e of sortable) {
    if (pending.size <= MAX_CRASHES) break;
    if (e.unsent <= 0) pending.delete(keyOf(e));
  }
  while (pending.size > MAX_CRASHES) {
    const oldest = sortable.shift();
    if (!oldest) break;
    pending.delete(keyOf(oldest));
  }
}
let inFlight = null;
let flushQueued = false;
const RETRY_LADDER_MS = [5e3, 3e4, 12e4, 6e5, 18e5];
let retryTimer = null;
let retryStep = 0;
function clearRetry() {
  if (retryTimer) {
    try {
      clearTimeout(retryTimer);
    } catch {
    }
    retryTimer = null;
  }
}
function scheduleRetry() {
  try {
    if (retryTimer || !active || !activeSubmitter || isBoosthisDisabled()) {
      return;
    }
    if (pendingCrashOccurrences() <= 0) return;
    const delay = RETRY_LADDER_MS[Math.min(retryStep, RETRY_LADDER_MS.length - 1)];
    retryStep += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      scheduleFlush();
    }, delay);
    retryTimer.unref?.();
  } catch {
  }
}
function scheduleFlush() {
  void flush().catch(() => {
  });
}
const refusedCrashKeys = /* @__PURE__ */ new Set();
function buildBatch(as = null, excluded = /* @__PURE__ */ new Set(), retrying) {
  const batch = [];
  for (const e of pending.values()) {
    if (e.unsent <= 0) continue;
    const key = bufferKey(e.signature, as?.installId);
    if (excluded.has(key)) continue;
    if (retrying !== void 0 && refusedCrashKeys.has(key) !== retrying) continue;
    if ((e.sendAs?.installId ?? null) !== (as?.installId ?? null)) continue;
    const item = {
      signature: e.signature,
      errorName: e.errorName,
      kind: e.kind,
      redactedFrame: e.redactedFrame,
      countBucket: bucketCount(e.sessionTotal),
      occurrences: Math.min(e.unsent, MAX_OCCURRENCES)
    };
    if (Number.isFinite(e.lastSeen)) item.occurredAt = Math.floor(e.lastSeen);
    if (e.appFrame !== void 0) item.appFrame = e.appFrame;
    if (e.cause?.mistake !== void 0) item.mistake = e.cause.mistake;
    if (e.cause?.codeNameState !== void 0) item.codeNameState = e.cause.codeNameState;
    if (e.cause?.codeOwner !== void 0) item.codeOwner = e.cause.codeOwner;
    if (e.cause?.during !== void 0) item.during = e.cause.during;
    if (e.summary !== void 0) item.summary = e.summary;
    if (e.frames !== void 0) item.frames = e.frames;
    if (e.traceId !== void 0) item.traceId = e.traceId;
    if (e.spanId !== void 0) item.spanId = e.spanId;
    if (e.routeLabel !== void 0) item.routeLabel = e.routeLabel;
    else if (e.partUnknown !== void 0) item.partUnknown = e.partUnknown;
    batch.push(item);
    if (batch.length >= MAX_BATCH) break;
  }
  return batch;
}
function applySent(batch, as) {
  let refiled = 0;
  for (const sent of batch) {
    const cur = pending.get(bufferKey(sent.signature, as?.installId));
    if (!cur) continue;
    cur.unsent = Math.max(0, cur.unsent - sent.occurrences);
    if (cur.refiledPending) {
      const landed = Math.min(cur.refiledPending, sent.occurrences);
      cur.refiledPending -= landed;
      if (cur.refiledPending <= 0) delete cur.refiledPending;
      refiled += landed;
    }
  }
  return refiled;
}
const MAX_IDENTITIES_PER_FLUSH = 3;
function pendingIdentities() {
  const out = [];
  const others = /* @__PURE__ */ new Map();
  let own = false;
  for (const e of pending.values()) {
    if (e.unsent <= 0) continue;
    if (!e.sendAs) {
      own = true;
      continue;
    }
    if (!others.has(e.sendAs.installId)) others.set(e.sendAs.installId, e.sendAs);
  }
  if (own) out.push(null);
  out.push(...[...others.values()].slice(0, MAX_IDENTITIES_PER_FLUSH));
  return out;
}
let stopCrashPass = false;
async function offer(as, batch = buildBatch(as)) {
  const submitter = activeSubmitter;
  if (!submitter) return 0;
  if (batch.length === 0) return 0;
  const occurrences = batch.reduce((n, b) => n + b.occurrences, 0);
  let accepted = 0;
  let unreachable = false;
  try {
    const admitted = withCrashGeneration(() => as ? submitter(batch, as) : submitter(batch));
    if (!admitted) {
      pending.clear();
      return 0;
    }
    accepted = await admitted;
  } catch {
    accepted = 0;
    unreachable = true;
  }
  if (accepted > 0) {
    const refiled = applySent(batch, as);
    persist();
    noteCrashDelivered(occurrences);
    for (const item of batch) refusedCrashKeys.delete(bufferKey(item.signature, as?.installId));
    if (refiled > 0) noteCrashRefiledUnderSuccessor(refiled);
    return 0;
  }
  const refusal = takeCrashSendRefusal();
  stopCrashPass = unreachable || refusal === "unreachable" || refusal === "rate-limited";
  if (refusal && !stopCrashPass) {
    for (const item of batch) refusedCrashKeys.add(bufferKey(item.signature, as?.installId));
  }
  if (refusal) noteCrashDeliveryRefused(refusal, occurrences);
  if (as && (refusal === "credential-refused" || refusal === "not-registered")) {
    let moved = 0;
    for (const item of batch) {
      const from = bufferKey(item.signature, as.installId);
      const cur = pending.get(from);
      if (cur?.sendAs?.installId !== as.installId) continue;
      pending.delete(from);
      delete cur.sendAs;
      const to = bufferKey(cur.signature);
      const mine = pending.get(to);
      if (mine) {
        mine.sessionTotal = Math.min(
          MAX_OCCURRENCES,
          mine.sessionTotal + cur.sessionTotal
        );
        mine.unsent = Math.min(MAX_OCCURRENCES, mine.unsent + cur.unsent);
        mine.lastSeen = Math.max(mine.lastSeen, cur.lastSeen);
        mine.refiledPending = (mine.refiledPending ?? 0) + (cur.refiledPending ?? 0) + cur.unsent;
        if (cur.fromEarlierRun) mine.fromEarlierRun = true;
      } else {
        cur.refiledPending = (cur.refiledPending ?? 0) + cur.unsent;
        pending.set(to, cur);
      }
      moved += item.occurrences;
    }
    if (moved > 0) persist();
  }
  return occurrences;
}
async function flushPass() {
  let accepted = false;
  let waiting = false;
  const heldKeys = new Set([...pending.values()].map((entry) => bufferKey(entry.signature, entry.sendAs?.installId)));
  for (const key of refusedCrashKeys) if (!heldKeys.has(key)) refusedCrashKeys.delete(key);
  stopCrashPass = false;
  const attempted = /* @__PURE__ */ new Set();
  for (const as of pendingIdentities()) {
    for (const retrying of [false, true]) {
      for (let pass = 0; pass < Math.ceil(MAX_CRASHES / MAX_BATCH); pass++) {
        const batch = buildBatch(as, attempted, retrying);
        if (batch.length === 0) break;
        for (const item of batch) attempted.add(bufferKey(item.signature, as?.installId));
        const left = await offer(as, batch);
        if (left > 0) waiting = true;
        else accepted = true;
        if (stopCrashPass) break;
      }
      if (stopCrashPass) break;
    }
    if (stopCrashPass) break;
  }
  if (accepted) {
    retryStep = 0;
    clearRetry();
  }
  if (waiting || pendingCrashOccurrences() > 0 || accepted) scheduleRetry();
}
function dropCrashesPastReceiptWindow(now = Date.now()) {
  let dropped = 0;
  let oldest = Number.POSITIVE_INFINITY;
  for (const [key, e] of pending) {
    if (e.unsent <= 0 || !(now - e.lastSeen > CRASH_RECEIPT_KEEP_MS)) continue;
    dropped += e.unsent;
    oldest = Math.min(oldest, e.lastSeen);
    pending.delete(key);
  }
  if (dropped > 0) {
    persist();
    noteCrashesGivenUp(dropped, oldest);
  }
  return dropped;
}
async function flush() {
  if (inFlight) {
    flushQueued = true;
    await inFlight.catch(() => {
    });
    return;
  }
  try {
    dropCrashesPastReceiptWindow();
  } catch {
  }
  if (!activeSubmitter || isBoosthisDisabled() || pending.size === 0) return;
  const pass = flushPass().catch(() => {
  });
  inFlight = pass;
  try {
    await pass;
  } finally {
    inFlight = null;
    if (flushQueued) {
      flushQueued = false;
      scheduleFlush();
    }
  }
}
async function flushCrashesNow() {
  try {
    if (errorPageTimer) {
      clearErrorPageTimer();
      lastErrorPageSendAt = Date.now();
      persist();
    }
    await flush();
    if (pendingCrashOccurrences() > 0) await flush();
  } catch {
  }
}
function pendingCrashOccurrences() {
  try {
    let n = 0;
    for (const e of pending.values()) n += Math.max(0, e.unsent);
    return n;
  } catch {
    return 0;
  }
}
function carriedOverCrashOccurrences() {
  try {
    let n = 0;
    for (const e of pending.values()) {
      if (e.fromEarlierRun && e.kind !== "errorPage") n += Math.max(0, e.unsent);
    }
    return n;
  } catch {
    return 0;
  }
}
const OWNER_HOST = (() => {
  try {
    return hostname();
  } catch {
    return "unknown-host";
  }
})();
const OWNER_STARTED_AT = Math.round(
  Date.now() - (typeof process.uptime === "function" ? process.uptime() * 1e3 : 0)
);
const OWNER_ID = `${OWNER_HOST}#${process.pid}#${OWNER_STARTED_AT}`;
let ownInstallId = null;
const claimed = /* @__PURE__ */ new Set();
function ownerOf(entry) {
  const raw = entry?.owner;
  if (!raw || typeof raw.id !== "string" || typeof raw.pid !== "number") {
    return null;
  }
  return {
    id: raw.id,
    pid: raw.pid,
    host: typeof raw.host === "string" ? raw.host : OWNER_HOST,
    ...typeof raw.live === "string" && /^[0-9a-f]{16}$/.test(raw.live) ? { live: raw.live } : {},
    installId: typeof raw.installId === "string" ? raw.installId : void 0,
    credential: typeof raw.credential === "string" && raw.credential ? raw.credential : void 0
  };
}
function claimKey(owner, signature) {
  return `${owner?.id ?? "unowned"}|${signature}`;
}
function identityOn(entry) {
  const raw = entry?.sendAs;
  if (!raw) return null;
  const installId = typeof raw.installId === "string" ? raw.installId : "";
  const credential = typeof raw.credential === "string" ? raw.credential : "";
  if (!installId || !credential || installId === ownInstallId) return null;
  return { installId, credential };
}
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code !== "ESRCH";
  }
}
function isOwn(owner) {
  return owner !== null && owner.id === OWNER_ID;
}
function isClaimable(owner) {
  if (owner === null) return true;
  if (owner.id === OWNER_ID) return false;
  if (owner.host !== OWNER_HOST) return false;
  const gone = owner.pid === process.pid || !pidAlive(owner.pid) || owner.live !== void 0 && processLiveness(owner.live) === "gone";
  if (!gone) return false;
  if (owner.installId === ownInstallId) return true;
  if (owner.installId === void 0) return true;
  return hasRunAs(owner.installId);
}
function foreignEntries(raw, opts) {
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const keep = [];
  for (const entry of parsed) {
    const signature = entry?.signature;
    if (typeof signature !== "string") continue;
    const owner = ownerOf(entry);
    if (isOwn(owner)) continue;
    if (claimed.has(claimKey(owner, signature))) continue;
    if (opts?.alsoDropClaimable && isClaimable(owner)) continue;
    keep.push(entry);
    if (keep.length >= MAX_CRASHES) break;
  }
  return keep;
}
function persist() {
  try {
    const cred = ownCredential();
    const mark = processLivenessMark();
    const owner = {
      id: OWNER_ID,
      pid: process.pid,
      host: OWNER_HOST,
      ...mark !== null ? { live: mark } : {},
      ...ownInstallId ? { installId: ownInstallId } : {},
      // Kept WITH the crash so the process that replaces this one can file it
      // as the install that crashed, not as itself.
      ...ownInstallId && cred ? { credential: cred } : {}
    };
    const mine = [...pending.values()].slice(0, MAX_CRASHES).map((entry) => ({ ...entry, owner }));
    const { persisted } = storage.updateSyncPersisted(STORAGE_KEY, (current) => {
      const others = foreignEntries(current);
      if (mine.length === 0 && others.length === 0) return null;
      return JSON.stringify([...mine, ...others]);
    });
    if (!persisted && mine.length > 0) {
      noteCrashKeepFailed(
        storageDurable() ? "write-failed" : "storage-not-durable"
      );
    }
  } catch {
    noteCrashKeepFailed("write-failed");
  }
}
function restore() {
  if (restoredOnce) return;
  if (withCrashGeneration(() => true) !== true) return;
  restoredOnce = true;
  const toAdopt = [];
  let adopted = false;
  try {
    const raw = storage.getSync(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    for (const c of parsed) {
      if (c && typeof c.signature === "string" && typeof c.errorName === "string" && typeof c.redactedFrame === "string" && (c.kind === "uncaught" || c.kind === "unhandledRejection" || c.kind === "render" || // A background job's crash persists exactly like every other kind
      // and used to be dropped here on the way back in, so a job that
      // threw as the process died was written to disk and then silently
      // discarded by the launch that was meant to report it.
      c.kind === "job" || // A request answered with an error page, left waiting by a run
      // that ended before its send: delivered, never adopted as a crash.
      c.kind === "errorPage") && typeof c.sessionTotal === "number" && typeof c.unsent === "number") {
        const owner = ownerOf(c);
        if (!isOwn(owner) && !isClaimable(owner)) continue;
        claimed.add(claimKey(owner, c.signature));
        const restoredIdentity = identityOn(c) ?? (owner && owner.installId && owner.credential && owner.installId !== ownInstallId ? { installId: owner.installId, credential: owner.credential } : null);
        const already = pending.get(
          bufferKey(c.signature, restoredIdentity?.installId)
        );
        if (already) {
          already.sessionTotal = Math.min(
            MAX_OCCURRENCES,
            already.sessionTotal + c.sessionTotal
          );
          already.unsent = Math.min(
            MAX_OCCURRENCES,
            already.unsent + c.unsent
          );
          if (isRestoredAppFrame(c.appFrame) && (already.appFrame === void 0 || typeof c.lastSeen === "number" && c.lastSeen > already.lastSeen)) {
            already.appFrame = c.appFrame;
          }
          if (c.cause !== void 0 && (already.cause === void 0 || typeof c.lastSeen === "number" && c.lastSeen > already.lastSeen)) {
            already.cause = restoredCauseFields(c.cause);
          }
          if (typeof c.lastSeen === "number" && c.lastSeen > already.lastSeen) {
            already.lastSeen = c.lastSeen;
            if (typeof c.traceId === "string") {
              already.traceId = c.traceId;
              already.spanId = typeof c.spanId === "string" ? c.spanId : void 0;
            }
          } else if (already.traceId === void 0) {
            if (typeof c.traceId === "string") {
              already.traceId = c.traceId;
              if (typeof c.spanId === "string") already.spanId = c.spanId;
            }
          }
          if (typeof c.routeLabel === "string") {
            already.routeLabel = c.routeLabel;
            already.partUnknown = void 0;
          } else if (already.routeLabel === void 0 && already.partUnknown === void 0 && isRestoredUnknownTerm(c.partUnknown)) {
            already.partUnknown = c.partUnknown;
          }
          if (c.noted !== true && c.kind !== "errorPage") {
            toAdopt.push({
              ...adoptionOf(c, owner),
              key: bufferKey(c.signature, restoredIdentity?.installId)
            });
          }
          continue;
        }
        pending.set(bufferKey(c.signature, restoredIdentity?.installId), {
          signature: c.signature,
          errorName: c.errorName,
          kind: c.kind,
          redactedFrame: c.redactedFrame,
          // The fatal crash is the one most likely to have been thrown inside a
          // library, and it reaches the server only through this restore — so
          // the line of the app that led there comes back with it, re-checked
          // on the way in like every other value read off the customer's disk.
          ...isRestoredAppFrame(c.appFrame) ? { appFrame: c.appFrame } : {},
          // The cause words, each re-checked against its closed list (and a
          // code name against its shape and both privacy screens): the file is
          // on the customer's disk.
          ...c.cause !== void 0 ? { cause: restoredCauseFields(c.cause) } : {},
          summary: typeof c.summary === "string" ? c.summary : void 0,
          frames: Array.isArray(c.frames) ? c.frames : void 0,
          // The action the dead run placed this crash in, carried back with
          // it. A restore that dropped these would turn a crash that knew its
          // action into one that never did — and the fatal crash, the one the
          // restore exists for, is exactly the crash worth placing.
          ...typeof c.traceId === "string" ? { traceId: c.traceId } : {},
          ...typeof c.spanId === "string" ? { spanId: c.spanId } : {},
          // And WHERE it happened, for exactly the same reason: the fatal
          // crash is the one a developer most needs placed, and it is the one
          // that can only arrive through this restore. Re-checked against the
          // closed vocabulary on the way back in — the file is on the
          // customer's disk and nothing reaches the wire on the strength of a
          // value something else could have written there.
          ...typeof c.routeLabel === "string" ? { routeLabel: c.routeLabel } : isRestoredUnknownTerm(c.partUnknown) ? { partUnknown: c.partUnknown } : {},
          sessionTotal: c.sessionTotal,
          unsent: c.unsent,
          lastSeen: typeof c.lastSeen === "number" ? c.lastSeen : Date.now(),
          // WHOSE CRASH THIS IS STAYS WHOSE CRASH THIS IS. A crash claimed
          // from a process that reported under another install is replayed as
          // that install, using the credential it left with the crash —
          // otherwise the restart that mints a new id moves the crash onto an
          // install that never crashed and leaves the one that did looking
          // clean. Already-travelled entries carry the identity forward.
          ...restoredIdentity ? { sendAs: restoredIdentity } : {},
          // Not this process's crash: it is in no local count, so while it
          // waits, "zero crashes" here is our silence and not the app's health.
          fromEarlierRun: true,
          // Whether the dead run also wrote this crash into the durable
          // history. A kit old enough not to have kept one leaves it out, and
          // the buffer below is then the only thing that remembers the crash —
          // so it is adopted into the history before anything can deliver and
          // empty it.
          ...c.noted === true || c.kind === "errorPage" ? { noted: true } : {}
        });
        if (c.noted !== true && c.kind !== "errorPage") {
          toAdopt.push({
            ...adoptionOf(c, owner),
            key: bufferKey(c.signature, restoredIdentity?.installId)
          });
        }
      }
    }
    evictIfNeeded();
  } catch {
  }
  try {
    for (const a of toAdopt) {
      if (!noteCarriedCrashes(a.occurrences, a.at, a.owner)) continue;
      const e = pending.get(a.key);
      if (e) e.noted = true;
      adopted = true;
    }
    if (adopted) persist();
  } catch {
  }
}
function adoptionOf(c, owner) {
  const owed = typeof c.unsent === "number" && c.unsent > 0 ? c.unsent : 0;
  const total = typeof c.sessionTotal === "number" && c.sessionTotal > 0 ? c.sessionTotal : 0;
  return {
    occurrences: Math.max(1, Math.min(owed || total || 1, MAX_OCCURRENCES)),
    at: typeof c.lastSeen === "number" ? c.lastSeen : Date.now(),
    owner: owner?.id ?? "carried"
  };
}
function installCrashHandlers(opts) {
  try {
    detailedMode = opts.detailed === true;
    if (typeof opts.installId === "string" && opts.installId) {
      ownInstallId = opts.installId;
    }
    if (active) return;
    active = true;
    monitorListener = (err, origin) => {
      try {
        const kind = origin === "unhandledRejection" ? "unhandledRejection" : "uncaught";
        capture(err, kind);
        endRun("uncaught");
      } catch {
      }
    };
    process.on("uncaughtExceptionMonitor", monitorListener);
    useHeldCrashReader(carriedOverCrashOccurrences);
    beginRun(ownInstallId);
    try {
      restore();
      scheduleFlush();
    } catch {
    }
  } catch {
  }
}
function detachCrashHandlers() {
  active = false;
  detailedMode = false;
  try {
    if (monitorListener) {
      process.removeListener("uncaughtExceptionMonitor", monitorListener);
    }
  } catch {
  }
  monitorListener = null;
  pending.clear();
  crashTotal = 0;
  clearRetry();
  retryStep = 0;
  clearErrorPageTimer();
  endRun("clean");
}
async function uninstallCrashHandlers() {
  active = false;
  detailedMode = false;
  try {
    if (monitorListener) {
      process.removeListener("uncaughtExceptionMonitor", monitorListener);
    }
  } catch {
  }
  monitorListener = null;
  pending.clear();
  crashTotal = 0;
  credentialReader = null;
  clearRetry();
  retryStep = 0;
  clearErrorPageTimer();
  lastErrorPageSendAt = 0;
  errorPagesSeen = /* @__PURE__ */ new WeakMap();
  refusedCrashKeys.clear();
  endRun("clean");
  eraseCrashState();
}
function setCrashOwnerInstallId(installId) {
  if (typeof installId === "string" && installId) ownInstallId = installId;
}
function crashCount() {
  return crashTotal;
}
const _crashInternals = {
  STORAGE_KEY,
  MAX_CRASHES,
  MAX_BATCH,
  redactError,
  parseStack,
  fileBasename,
  isOwnCodePath,
  firstAppFrame,
  sanitizeErrorName,
  sanitizeSummary,
  bucketCount,
  capture,
  flush,
  buildBatch,
  isActive: () => active,
  isDetailed: () => detailedMode,
  pendingSize: () => pending.size,
  getPending: () => [...pending.values()].map((e) => ({ ...e })),
  getMonitorListener: () => monitorListener,
  ownerId: () => OWNER_ID,
  ownerOf,
  isClaimable,
  foreignEntries,
  setOwnInstallIdForTests: (id) => {
    ownInstallId = id;
  },
  reset: () => {
    refusedCrashKeys.clear();
    pending.clear();
    active = false;
    detailedMode = false;
    monitorListener = null;
    restoredOnce = false;
    inFlight = null;
    flushQueued = false;
    activeSubmitter = null;
    crashTotal = 0;
    credentialReader = null;
    claimed.clear();
    ownInstallId = null;
    clearRetry();
    retryStep = 0;
    clearErrorPageTimer();
    lastErrorPageSendAt = 0;
    errorPagesSeen = /* @__PURE__ */ new WeakMap();
  },
  errorPageSendArmed: () => errorPageTimer !== null,
  ERROR_PAGE_SEND_GAP_MS,
  retryPending: () => retryTimer !== null,
  retryStep: () => retryStep,
  RETRY_LADDER_MS,
  setCrashCountForTests: (n) => {
    crashTotal = n;
  },
  setDetailedForTests: (d) => {
    detailedMode = d;
  },
  setActiveForTests: (a) => {
    active = a;
  }
};
export {
  ERROR_PAGE_SEND_GAP_MS,
  _crashInternals,
  captureErrorPage,
  crashCount,
  detachCrashHandlers,
  dropCrashesPastReceiptWindow,
  flushCrashesNow,
  installCrashHandlers,
  pendingCrashOccurrences,
  reportJobError,
  reportRenderError,
  setCrashCredentialReader,
  setCrashDetailed,
  setCrashOwnerInstallId,
  setCrashSubmitter,
  uninstallCrashHandlers,
  useCrashJobStateReader
};
