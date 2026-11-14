// @ts-nocheck
/* eslint-disable */
// Built from src/crashDelivery.ts so plain node can run the kit. Do not edit.
import { statSync } from "node:fs";
import { hostname } from "node:os";
import {
  hostPlatform,
  processLiveness,
  processLivenessMark,
  storage,
  storageDurable
} from "./storage.js";
const STORAGE_KEY = "boosthis:runs:v1";
const MAX_RUN_RECORDS = 16;
const FOREIGN_HOST_RETENTION_MS = 7 * 24 * 60 * 60 * 1e3;
const CRASH_REFUSAL_TEXT = {
  unreachable: "Boosthis could not be reached",
  "not-registered": "this install is not registered with Boosthis",
  "credential-refused": "this install's credential was refused",
  "rate-limited": "Boosthis is rate-limiting this install",
  rejected: "Boosthis rejected the report",
  "server-error": "Boosthis answered with an error",
  unknown: "Boosthis did not accept it and gave no reason we recognise"
};
function crashRefusalFor(status) {
  if (!Number.isFinite(status) || status <= 0) return "unreachable";
  if (status === 404) return "not-registered";
  if (status === 401 || status === 403) return "credential-refused";
  if (status === 429) return "rate-limited";
  if (status === 400 || status === 413 || status === 422) return "rejected";
  if (status >= 500) return "server-error";
  return "unknown";
}
let keepFailures = 0;
let keepFailureCause = null;
let deliveredOccurrences = 0;
let undeliveredOccurrences = 0;
let lastRefusal = null;
let abruptThisLaunch = 0;
let abruptTotal = 0;
let abruptLastAt = null;
let runOpened = false;
let seenIdentities = null;
let heldReader = null;
const announced = /* @__PURE__ */ new Set();
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
function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code !== "ESRCH";
  }
}
const PID_INSTANCE_SLACK_MS = 5e3;
function pidStartedAt(pid) {
  if (hostPlatform() === "win32") return null;
  try {
    const st = statSync(`/proc/${pid}`);
    return Number.isFinite(st.ctimeMs) && st.ctimeMs > 0 ? st.ctimeMs : null;
  } catch {
    return null;
  }
}
function spanStillRunning(sp) {
  if (sp.o === OWNER_ID) return true;
  if (sp.h !== OWNER_HOST) return false;
  if (sp.p === process.pid) return false;
  if (!pidAlive(sp.p)) return false;
  if (sp.l !== void 0) {
    const live = processLiveness(sp.l);
    if (live === "gone") return false;
    if (live === "alive") return true;
  }
  const started = pidStartedAt(sp.p);
  return started === null ? true : Math.abs(started - sp.s) <= PID_INSTANCE_SLACK_MS;
}
const MAX_SEEN_IDENTITIES = 8;
const CRASH_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1e3;
const MAX_HISTORY_SPANS = 32;
const MAX_HISTORY_CRASHES = 64;
const LIVE_MARK = /^[0-9a-f]{16}$/;
function markEnded(mark) {
  return mark !== void 0 && processLiveness(mark) === "gone";
}
function emptyHistory() {
  return { spans: [], spansDropped: 0, crashes: [], crashesDropped: 0 };
}
function historyIsEmpty(h) {
  return h.spans.length === 0 && h.crashes.length === 0 && h.spansDropped === 0 && h.crashesDropped === 0;
}
function pruneHistory(h, now) {
  const from = now - CRASH_HISTORY_WINDOW_MS;
  const spans = h.spans.filter((sp) => sp.e >= from || sp.o === OWNER_ID);
  const crashes = h.crashes.filter((c) => c.t >= from);
  let spansDropped = h.spansDropped;
  let crashesDropped = h.crashesDropped;
  if (spans.length > MAX_HISTORY_SPANS) {
    spansDropped += spans.length - MAX_HISTORY_SPANS;
    spans.splice(0, spans.length - MAX_HISTORY_SPANS);
  }
  if (crashes.length > MAX_HISTORY_CRASHES) {
    crashesDropped += crashes.length - MAX_HISTORY_CRASHES;
    crashes.splice(0, crashes.length - MAX_HISTORY_CRASHES);
  }
  return { spans, spansDropped, crashes, crashesDropped };
}
function emptyFile() {
  return {
    runs: [],
    abrupt: { count: 0, lastAt: null },
    seen: [],
    history: emptyHistory()
  };
}
function parseFile(raw) {
  if (!raw) return emptyFile();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyFile();
    const rec = parsed;
    const runs = [];
    if (Array.isArray(rec.runs)) {
      for (const r of rec.runs) {
        const o = r;
        if (!o || typeof o.id !== "string" || typeof o.pid !== "number" || typeof o.host !== "string" || o.state !== "open" && o.state !== "uncaught") {
          continue;
        }
        runs.push({
          id: o.id,
          pid: o.pid,
          host: o.host,
          ...typeof o.live === "string" && LIVE_MARK.test(o.live) ? { live: o.live } : {},
          installId: typeof o.installId === "string" ? o.installId : void 0,
          startedAt: typeof o.startedAt === "number" ? o.startedAt : 0,
          state: o.state,
          at: typeof o.at === "number" ? o.at : 0
        });
        if (runs.length >= MAX_RUN_RECORDS) break;
      }
    }
    const abruptRaw = rec.abrupt;
    const count = abruptRaw && typeof abruptRaw.count === "number" && abruptRaw.count > 0 ? Math.floor(abruptRaw.count) : 0;
    const lastAt = abruptRaw && typeof abruptRaw.lastAt === "number" ? abruptRaw.lastAt : null;
    const seen = Array.isArray(rec.seen) ? rec.seen.filter((v) => typeof v === "string" && v.length > 0) : [];
    return {
      runs,
      abrupt: { count, lastAt },
      seen: seen.slice(-MAX_SEEN_IDENTITIES),
      history: parseHistory(rec.history)
    };
  } catch {
    return emptyFile();
  }
}
function parseHistory(raw) {
  if (!raw || typeof raw !== "object") return emptyHistory();
  const rec = raw;
  const spans = [];
  if (Array.isArray(rec.spans)) {
    for (const v of rec.spans) {
      const o = v;
      if (!o || typeof o.o !== "string" || typeof o.h !== "string" || typeof o.p !== "number" || typeof o.s !== "number" || typeof o.e !== "number") {
        continue;
      }
      spans.push({
        o: o.o,
        h: o.h,
        p: o.p,
        s: o.s,
        e: Math.max(o.s, o.e),
        ...typeof o.l === "string" && LIVE_MARK.test(o.l) ? { l: o.l } : {}
      });
      if (spans.length >= MAX_HISTORY_SPANS) break;
    }
  }
  const crashes = [];
  if (Array.isArray(rec.crashes)) {
    for (const v of rec.crashes) {
      const o = v;
      if (!o || typeof o.o !== "string" || typeof o.t !== "number") continue;
      crashes.push({ o: o.o, t: o.t });
      if (crashes.length >= MAX_HISTORY_CRASHES) break;
    }
  }
  const nonNeg = (v) => typeof v === "number" && v > 0 ? Math.floor(v) : 0;
  return {
    spans,
    spansDropped: nonNeg(rec.spansDropped),
    crashes,
    crashesDropped: nonNeg(rec.crashesDropped)
  };
}
function writeFile(next) {
  if (next.runs.length === 0 && next.abrupt.count === 0 && next.seen.length === 0 && historyIsEmpty(next.history)) {
    return null;
  }
  return JSON.stringify({
    runs: next.runs.slice(-MAX_RUN_RECORDS),
    abrupt: next.abrupt,
    seen: next.seen.slice(-MAX_SEEN_IDENTITIES),
    ...historyIsEmpty(next.history) ? {} : { history: next.history }
  });
}
function beginRun(installId) {
  try {
    if (runOpened) return;
    runOpened = true;
    const now = Date.now();
    let foundAbrupt = 0;
    let total = 0;
    let lastAt = null;
    const mark = processLivenessMark();
    storage.updateSync(STORAGE_KEY, (current) => {
      const file = parseFile(current);
      const keep = [];
      for (const r of file.runs) {
        if (r.id === OWNER_ID) continue;
        if (r.host !== OWNER_HOST) {
          if (now - Math.max(r.at, r.startedAt) < FOREIGN_HOST_RETENTION_MS) {
            keep.push(r);
          }
          continue;
        }
        const gone = r.pid === process.pid || !pidAlive(r.pid) || markEnded(r.live);
        if (!gone) {
          keep.push(r);
          continue;
        }
        if (r.state === "open") {
          foundAbrupt += 1;
          lastAt = Math.max(lastAt ?? 0, r.at, r.startedAt) || now;
        }
      }
      keep.push({
        id: OWNER_ID,
        pid: process.pid,
        host: OWNER_HOST,
        ...mark !== null ? { live: mark } : {},
        ...installId ? { installId } : {},
        startedAt: OWNER_STARTED_AT,
        state: "open",
        at: now
      });
      total = file.abrupt.count + foundAbrupt;
      if (foundAbrupt === 0) lastAt = file.abrupt.lastAt;
      const seen = installId ? [...file.seen.filter((id) => id !== installId), installId] : file.seen;
      seenIdentities = new Set(seen.slice(-MAX_SEEN_IDENTITIES));
      const history = pruneHistory(
        {
          ...file.history,
          spans: [
            ...file.history.spans.filter((sp) => sp.o !== OWNER_ID),
            {
              o: OWNER_ID,
              h: OWNER_HOST,
              p: process.pid,
              s: OWNER_STARTED_AT,
              e: now,
              ...mark !== null ? { l: mark } : {}
            }
          ]
        },
        now
      );
      return writeFile({
        runs: keep,
        abrupt: { count: total, lastAt },
        seen,
        history
      });
    });
    abruptThisLaunch = foundAbrupt;
    abruptTotal = total;
    abruptLastAt = lastAt;
    if (foundAbrupt > 0) announceAbruptEnding(foundAbrupt);
  } catch {
  }
}
function endRun(reason) {
  try {
    if (!runOpened) return;
    storage.updateSync(STORAGE_KEY, (current) => {
      const file = parseFile(current);
      const keep = [];
      for (const r of file.runs) {
        if (r.id !== OWNER_ID) {
          keep.push(r);
          continue;
        }
        if (reason === "uncaught") keep.push({ ...r, state: "uncaught" });
      }
      const now = Date.now();
      const history = pruneHistory(
        {
          ...file.history,
          spans: file.history.spans.map(
            (sp) => sp.o === OWNER_ID ? { ...sp, e: Math.max(sp.e, now) } : sp
          )
        },
        now
      );
      return writeFile({
        runs: keep,
        abrupt: file.abrupt,
        seen: file.seen,
        history
      });
    });
    if (reason !== "uncaught") runOpened = false;
  } catch {
  }
}
function hasRunAs(installId) {
  if (!installId) return false;
  if (seenIdentities === null) {
    try {
      seenIdentities = new Set(parseFile(storage.getSync(STORAGE_KEY)).seen);
    } catch {
      seenIdentities = /* @__PURE__ */ new Set();
    }
  }
  return seenIdentities.has(installId);
}
function noteCrashOccurred(at) {
  try {
    const now = Date.now();
    const t = typeof at === "number" && Number.isFinite(at) ? at : now;
    const { persisted } = storage.updateSyncPersisted(STORAGE_KEY, (current) => {
      const file = parseFile(current);
      const history = pruneHistory(
        {
          ...file.history,
          crashes: [...file.history.crashes, { o: OWNER_ID, t }],
          // A crash proves this run was alive at least until now, whatever the
          // span last recorded.
          spans: file.history.spans.map(
            (sp) => sp.o === OWNER_ID ? { ...sp, e: Math.max(sp.e, t) } : sp
          )
        },
        now
      );
      return writeFile({
        runs: file.runs,
        abrupt: file.abrupt,
        seen: file.seen,
        history
      });
    });
    if (!persisted) noteCrashKeepFailed("write-failed");
    return persisted;
  } catch {
    noteCrashKeepFailed("write-failed");
    return false;
  }
}
function noteCarriedCrashes(occurrences, at, owner) {
  try {
    const n = Math.min(
      Math.floor(Number.isFinite(occurrences) ? occurrences : 0),
      MAX_HISTORY_CRASHES
    );
    if (n <= 0) return false;
    const now = Date.now();
    const t = Number.isFinite(at) && at > 0 ? Math.min(at, now) : now;
    if (t < now - CRASH_HISTORY_WINDOW_MS) return true;
    const o = owner && owner !== OWNER_ID ? owner : "carried";
    const rows = Array.from({ length: n }, () => ({ o, t }));
    const { persisted } = storage.updateSyncPersisted(STORAGE_KEY, (current) => {
      const file = parseFile(current);
      const history = pruneHistory(
        { ...file.history, crashes: [...file.history.crashes, ...rows] },
        now
      );
      return writeFile({
        runs: file.runs,
        abrupt: file.abrupt,
        seen: file.seen,
        history
      });
    });
    if (!persisted) noteCrashKeepFailed("write-failed");
    return persisted;
  } catch {
    noteCrashKeepFailed("write-failed");
    return false;
  }
}
function crashHistoryWindow(now = Date.now()) {
  const empty = {
    windowMs: CRASH_HISTORY_WINDOW_MS,
    carried: 0,
    own: 0,
    carriedAtLeast: false,
    observedMs: 0,
    runs: 0,
    runsAtLeast: false,
    recorded: false
  };
  try {
    const raw = storage.getSync(STORAGE_KEY);
    if (raw === null) return empty;
    const h = parseFile(raw).history;
    if (historyIsEmpty(h)) return empty;
    const from = now - CRASH_HISTORY_WINDOW_MS;
    const inWindow = h.crashes.filter((c) => c.t >= from && c.t <= now);
    const carried = inWindow.filter((c) => c.o !== OWNER_ID).length;
    const own = inWindow.length - carried;
    const intervals = [];
    for (const sp of h.spans) {
      const end = Math.min(now, spanStillRunning(sp) ? now : sp.e);
      const start = Math.max(sp.s, from);
      if (end > start) intervals.push([start, end]);
    }
    intervals.sort((a, b) => a[0] - b[0]);
    let observedMs = 0;
    let cursor = -1;
    for (const [s, e] of intervals) {
      const from2 = Math.max(s, cursor);
      if (e > from2) observedMs += e - from2;
      cursor = Math.max(cursor, e);
    }
    return {
      windowMs: CRASH_HISTORY_WINDOW_MS,
      carried,
      own,
      carriedAtLeast: h.crashesDropped > 0,
      observedMs,
      runs: intervals.length,
      runsAtLeast: h.spansDropped > 0,
      recorded: true
    };
  } catch {
    return empty;
  }
}
let pendingRefusal = null;
function noteCrashSendRefused(reason) {
  pendingRefusal = reason;
}
function takeCrashSendRefusal() {
  const r = pendingRefusal;
  pendingRefusal = null;
  return r;
}
function useHeldCrashReader(read) {
  heldReader = read;
}
function noteCrashKeepFailed(cause = "write-failed") {
  try {
    keepFailures += 1;
    keepFailureCause = cause;
    announceKeepFailure(cause);
  } catch {
  }
}
function noteCrashDelivered(occurrences) {
  try {
    if (!Number.isFinite(occurrences) || occurrences <= 0) return;
    deliveredOccurrences += Math.floor(occurrences);
    lastRefusal = null;
    undeliveredOccurrences = 0;
    pendingRefusal = null;
  } catch {
  }
}
function noteCrashDeliveryRefused(reason, occurrences) {
  try {
    const n = Number.isFinite(occurrences) && occurrences > 0 ? Math.floor(occurrences) : 0;
    undeliveredOccurrences = n;
    lastRefusal = { reason, at: Date.now() };
    announceRefusal(reason, n);
  } catch {
  }
}
function say(key, line) {
  if (announced.has(key)) return;
  announced.add(key);
  try {
    console.warn(`[boosthis] ${line}`);
  } catch {
  }
}
function noteCrashesGivenUp(occurrences, oldestAt) {
  try {
    const n = Number.isFinite(occurrences) && occurrences > 0 ? Math.floor(occurrences) : 0;
    if (n === 0) return;
    const day = Number.isFinite(oldestAt) ? new Date(oldestAt).toISOString().slice(0, 10) : "an unknown day";
    say(
      `given-up:${oldestAt}:${n}`,
      n === 1 ? `1 crash occurrence this app kept was older than the 30 days Boosthis keeps crash receipts for, so it was not sent and has been removed. It happened on ${day}.` : `${n} crash occurrences this app kept were older than the 30 days Boosthis keeps crash receipts for, so they were not sent and have been removed. The oldest happened on ${day}.`
    );
  } catch {
  }
}
function announceKeepFailure(cause) {
  say(
    `keep:${cause}`,
    cause === "storage-not-durable" ? "This app has nowhere to write, so a crash that kills the process cannot be kept for the next launch and will not be reported. Give the process a writable HOME or set BOOSTHIS_STATE_DIR." : "A crash was captured but could not be written to disk, so it will not survive this process. Check that the Boosthis state directory is writable."
  );
}
function announceRefusal(reason, occurrences) {
  say(
    `refused:${reason}`,
    `Boosthis did not accept ${occurrences} crash occurrence${occurrences === 1 ? "" : "s"} this app reported: ${CRASH_REFUSAL_TEXT[reason]}. They are still held and will be offered again; until they are accepted this project's crash count is lower than the truth.`
  );
}
function announceAbruptEnding(found) {
  say(
    "abrupt",
    `The previous run of this app ended without a word — no error and no shutdown we could see${found > 1 ? ` (${found} runs)` : ""}. That is what a SIGKILL, an out-of-memory kill or an interrupted terminal looks like from inside: no code of ours runs, so nothing about that ending can be reported at the time it happens. Anything that run had captured is being offered again now.`
  );
}
function crashDeliveryFacts() {
  let canKeep = true;
  try {
    canKeep = storageDurable() && keepFailures === 0;
  } catch {
    canKeep = keepFailures === 0;
  }
  return {
    canKeep,
    keepFailure: canKeep ? null : keepFailureCause ?? "storage-not-durable",
    keepFailures,
    delivered: deliveredOccurrences,
    undelivered: undeliveredOccurrences,
    held: heldOccurrences(),
    refiledUnderSuccessor,
    lastRefusal,
    abruptEndingsThisLaunch: abruptThisLaunch,
    abruptEndingsTotal: abruptTotal,
    abruptEndingLastAt: abruptLastAt
  };
}
function crashReportingVerdict() {
  const f = crashDeliveryFacts();
  if (!f.canKeep) return "cannot-keep";
  if (f.lastRefusal !== null) return "not-delivering";
  if (f.held > 0) return "holding";
  return "reporting";
}
function crashDeliveryNote() {
  const f = crashDeliveryFacts();
  const parts = [];
  if (!f.canKeep) {
    parts.push(
      f.keepFailure === "storage-not-durable" ? "a crash that kills this process cannot be kept (nothing writable to keep it in)" : "a captured crash could not be written to disk"
    );
  }
  if (f.lastRefusal) {
    parts.push(
      `${f.undelivered} crash occurrence${f.undelivered === 1 ? "" : "s"} not accepted — ${CRASH_REFUSAL_TEXT[f.lastRefusal.reason]}`
    );
  } else if (f.held > 0) {
    parts.push(
      `${f.held} crash occurrence${f.held === 1 ? "" : "s"} captured and not yet delivered to Boosthis`
    );
  }
  if (f.refiledUnderSuccessor > 0) {
    parts.push(
      `${f.refiledUnderSuccessor} crash occurrence${f.refiledUnderSuccessor === 1 ? " is" : "s are"} filed under this install rather than the earlier install that crashed`
    );
  }
  if (f.abruptEndingsThisLaunch > 0) {
    parts.push(
      `the previous run ended with no code of ours running (a kill, an out-of-memory stop or an interrupt)`
    );
  }
  return parts.join("; ");
}
function _resetCrashDeliveryForTests() {
  seenIdentities = null;
  heldReader = null;
  refiledUnderSuccessor = 0;
  keepFailures = 0;
  keepFailureCause = null;
  deliveredOccurrences = 0;
  undeliveredOccurrences = 0;
  lastRefusal = null;
  pendingRefusal = null;
  abruptThisLaunch = 0;
  abruptTotal = 0;
  abruptLastAt = null;
  runOpened = false;
  announced.clear();
}
const _crashDeliveryInternals = {
  STORAGE_KEY,
  OWNER_ID,
  ownerHost: () => OWNER_HOST,
  runOpened: () => runOpened
};
function heldOccurrences() {
  try {
    const n = heldReader?.() ?? 0;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}
function noteCrashRefiledUnderSuccessor(occurrences) {
  try {
    const n = Number.isFinite(occurrences) && occurrences > 0 ? Math.floor(occurrences) : 1;
    refiledUnderSuccessor += n;
    say(
      "refiled",
      "A crash from an earlier run of this app could not be filed under the install that crashed — that install's credential is no longer accepted — so it is filed under the install running now. The crash is reported; the install it is attached to is the successor."
    );
  } catch {
  }
}
let refiledUnderSuccessor = 0;
export {
  CRASH_HISTORY_WINDOW_MS,
  CRASH_REFUSAL_TEXT,
  _crashDeliveryInternals,
  _resetCrashDeliveryForTests,
  beginRun,
  crashDeliveryFacts,
  crashDeliveryNote,
  crashHistoryWindow,
  crashRefusalFor,
  crashReportingVerdict,
  endRun,
  hasRunAs,
  noteCarriedCrashes,
  noteCrashDelivered,
  noteCrashDeliveryRefused,
  noteCrashKeepFailed,
  noteCrashOccurred,
  noteCrashRefiledUnderSuccessor,
  noteCrashSendRefused,
  noteCrashesGivenUp,
  takeCrashSendRefusal,
  useHeldCrashReader
};
