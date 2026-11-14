// @ts-nocheck
/* eslint-disable */
// Built from src/candidateRules.ts so plain node can run the kit. Do not edit.
import { isProblemKind } from "./problemKinds.js";
import { findingPart } from "./failurePart.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { storage } from "./storage.js";
import { uploadsReady } from "./uploadRecovery.js";
import { noteRowsDiscarded } from "./serverlessMeters.js";
import { safeProblemCause } from "./problemCause.js";
const STORAGE_KEY = "boosthis:candidate-rules:v1";
const MAX_CANDIDATES = 100;
const MIN_OCCURRENCES_TO_SURFACE = 2;
function bucketSeverity(p95) {
  if (p95 <= 100) return "low";
  if (p95 <= 500) return "med";
  return "high";
}
function bucketCount(count) {
  if (count < 3) return "<3";
  if (count < 10) return "<10";
  if (count < 50) return "<50";
  return "50+";
}
function signatureFor(finding) {
  const sev = bucketSeverity(finding.p95);
  const ct = bucketCount(finding.count);
  return `${finding.kind}:${sev}:${ct}`;
}
function safeHashId(input) {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = h * 33 ^ input.charCodeAt(i);
  return "cr_" + (h >>> 0).toString(36);
}
async function writeAll(list) {
  try {
    const trimmed = list.slice(0, MAX_CANDIDATES);
    await storage.set(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
  }
}
async function listCandidateRules() {
  try {
    const raw = await storage.get(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => c && typeof c.id === "string" && typeof c.signature === "string" && typeof c.occurrences === "number"
    );
  } catch {
    return [];
  }
}
let activeSubmitter = null;
let sendLimit = 50;
function setCandidateSubmitter(submitter) {
  activeSubmitter = submitter;
}
const BASELINE_STORAGE_KEY = "boosthis:rule-baselines:v1";
const SEV_RANK = { low: 0, med: 1, high: 2 };
function severityToRating(sev) {
  return sev === "high" ? "poor" : sev === "med" ? "needs-work" : "good";
}
let activeResolutionSubmitter = null;
function setResolutionSubmitter(submitter) {
  activeResolutionSubmitter = submitter;
}
async function readBaselines() {
  try {
    const raw = await storage.get(BASELINE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "low" || v === "med" || v === "high") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
async function writeBaselines(baselines) {
  try {
    await storage.set(BASELINE_STORAGE_KEY, JSON.stringify(baselines));
  } catch {
  }
}
let lastIngestKey = null;
function _resetIngestDedupeForTests() {
  lastIngestKey = null;
  sendLimit = 50;
}
function fingerprintFindings(findings) {
  return findings.map((f) => `${f.kind}|${f.name}|${Math.round(f.p95)}|${f.count}`).sort().join("\n");
}
async function ingestFindings(observed, ending = false) {
  const findings = observed.filter((f) => isProblemKind(f.kind));
  const key = fingerprintFindings(findings);
  const unchanged = key === lastIngestKey;
  lastIngestKey = key;
  const now = Date.now();
  const existing = await listCandidateRules();
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const f of unchanged ? [] : findings) {
    const sig = signatureFor(f);
    const id = safeHashId(sig);
    const prev = byId.get(id);
    const where = findingPart(f.name);
    if (prev) {
      byId.set(id, {
        ...prev,
        lastSeenAt: now,
        occurrences: prev.occurrences + 1,
        // The LATEST sighting's answer, whichever of the two it is. Keeping a
        // part named by an earlier sighting beside a newer "could not tell"
        // would leave one record asserting both, and every reader prefers the
        // name — so the store would keep showing a route this problem is no
        // longer being seen on. One answer, always the freshest.
        routeLabel: where.routeLabel,
        partUnknown: where.partUnknown,
        cause: safeProblemCause(f.cause, f.kind, f.count)
      });
    } else {
      byId.set(id, {
        id,
        signature: sig,
        kind: f.kind,
        severityBucket: bucketSeverity(f.p95),
        firstSeenAt: now,
        lastSeenAt: now,
        occurrences: 1,
        exampleHint: f.hint,
        status: "new",
        cause: safeProblemCause(f.cause, f.kind, f.count),
        ...where
      });
    }
  }
  const merged = [...byId.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  await writeAll(merged);
  const baselines = await readBaselines();
  let baselinesChanged = false;
  const currentWorst = {};
  const currentCount = {};
  for (const f of findings) {
    const sev = bucketSeverity(f.p95);
    const prev = currentWorst[f.kind];
    if (!prev || SEV_RANK[sev] > SEV_RANK[prev]) currentWorst[f.kind] = sev;
    currentCount[f.kind] = Math.max(currentCount[f.kind] ?? 0, f.count);
  }
  const resolved = [];
  for (const [kind, sev] of Object.entries(currentWorst)) {
    const worst = baselines[kind];
    if (worst && SEV_RANK[sev] < SEV_RANK[worst]) {
      resolved.push({
        ruleId: kind,
        kind,
        beforeRating: severityToRating(worst),
        afterRating: severityToRating(sev),
        occurrences: 1,
        // Privacy-safe "circumstances" so the community matcher can weight this
        // proven fix toward similar pages: the severity the issue held BEFORE
        // the fix, plus the bucketed occurrence count. No raw values, no code.
        severityBucket: worst,
        countBucket: bucketCount(currentCount[kind] ?? 0)
      });
    } else if (!worst || SEV_RANK[sev] > SEV_RANK[worst]) {
      baselines[kind] = sev;
      baselinesChanged = true;
    }
  }
  if (resolved.length > 0 && activeResolutionSubmitter && uploadsReady(ending)) {
    try {
      const answer = await activeResolutionSubmitter(resolved);
      const accepted = typeof answer === "number" ? answer : answer.accepted;
      const refused = typeof answer !== "number" && answer.undelivered === "refused";
      if (accepted > 0 || refused) {
        if (refused) noteRowsDiscarded(resolved.length - accepted, "sendFailed");
        for (const r of resolved.slice(0, refused ? resolved.length : accepted)) {
          baselines[r.ruleId] = currentWorst[r.ruleId];
          baselinesChanged = true;
        }
      }
    } catch {
    }
  }
  if (baselinesChanged) await writeBaselines(baselines);
  if (activeSubmitter && listSurfaceable(merged).some((c) => c.status === "new") && uploadsReady(ending)) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const toSubmit = listSurfaceable(merged).filter((c) => c.status === "new").slice(0, sendLimit);
      if (toSubmit.length === 0) break;
      const payload = toSubmit.map((c) => ({
        signature: c.signature,
        kind: c.kind,
        severityBucket: c.severityBucket,
        countBucket: c.signature.split(":")[2] ?? "<3",
        occurrences: c.occurrences,
        ...safeProblemCause(c.cause, c.kind) ? { cause: safeProblemCause(c.cause, c.kind) } : {},
        // A part travels beside the signature, never folded into it.
        ...c.routeLabel !== void 0 ? { routeLabel: c.routeLabel } : c.partUnknown !== void 0 ? { partUnknown: c.partUnknown } : {}
      }));
      try {
        const answer = await activeSubmitter(payload);
        const accepted = typeof answer === "number" ? answer : answer.accepted;
        if (accepted > 0) {
          const submittedIds = new Set(toSubmit.slice(0, accepted).map((c) => c.id));
          for (const c of merged) if (submittedIds.has(c.id)) c.status = "submitted";
          await writeAll(merged);
          continue;
        }
        if (typeof answer !== "number" && answer.undelivered === "refused") {
          if (toSubmit.length === 1) {
            toSubmit[0].status = "refused";
            noteRowsDiscarded(1, "sendFailed");
            sendLimit = 50;
            await writeAll(merged);
          } else {
            sendLimit = Math.ceil(toSubmit.length / 2);
          }
          continue;
        }
      } catch {
      }
      break;
    }
  }
  return listSurfaceable(merged);
}
function listSurfaceable(all) {
  return all.filter((c) => c.occurrences >= MIN_OCCURRENCES_TO_SURFACE);
}
async function promoteCandidateLocal(id) {
  const all = await listCandidateRules();
  const next = all.map(
    (c) => c.id === id ? { ...c, status: "promoted-local" } : c
  );
  await writeAll(next);
}
async function markCandidateSubmitted(id) {
  const all = await listCandidateRules();
  const next = all.map(
    (c) => c.id === id ? { ...c, status: "submitted" } : c
  );
  await writeAll(next);
}
async function clearAllCandidates() {
  try {
    await storage.remove(STORAGE_KEY);
  } catch {
  }
  try {
    await storage.remove(BASELINE_STORAGE_KEY);
  } catch {
  }
  try {
    await storage.remove(RECURRENCE_STORAGE_KEY);
  } catch {
  }
  recurrenceMirror = null;
}
const RECURRENCE_STORAGE_KEY = "boosthis:finding-recurrence:v1";
const MAX_REMEMBERED_PATTERNS = 24;
const MAX_RECENT_RELEASES = 32;
const MS_PER_DAY = 864e5;
const RECURRENCE_TOUCH_MS = 6e4;
const RUN_ID = safeHashId(
  `${Date.now()}:${Math.random()}:${typeof process !== "undefined" ? process.pid ?? 0 : 0}`
);
let runIdOverride = null;
function currentRunId() {
  return runIdOverride ?? RUN_ID;
}
let recurrenceMirror = null;
function emptyRecurrence() {
  return { releaseHash: "", releaseOrdinal: 0, releaseHashes: [], patterns: [] };
}
function isRecurrenceKind(kind) {
  return isProblemKind(kind) && kind.startsWith("ai-");
}
function readRecurrenceRecord(raw) {
  try {
    if (!raw) return emptyRecurrence();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyRecurrence();
    const obj = parsed;
    const patterns = [];
    if (Array.isArray(obj.patterns)) {
      for (const p of obj.patterns) {
        if (!p || typeof p !== "object") continue;
        const r = p;
        if (typeof r.kind !== "string" || !isRecurrenceKind(r.kind)) continue;
        if (typeof r.runs !== "number" || typeof r.firstSeenAt !== "number") continue;
        patterns.push({
          kind: r.kind,
          runs: Math.max(1, Math.floor(r.runs)),
          releases: typeof r.releases === "number" ? Math.max(0, Math.floor(r.releases)) : 0,
          firstSeenAt: r.firstSeenAt,
          lastSeenAt: typeof r.lastSeenAt === "number" ? r.lastSeenAt : r.firstSeenAt,
          lastRun: typeof r.lastRun === "string" ? r.lastRun : "",
          lastOrdinal: typeof r.lastOrdinal === "number" ? Math.max(0, Math.floor(r.lastOrdinal)) : 0,
          releaseHashes: Array.isArray(r.releaseHashes) ? r.releaseHashes.filter((h) => typeof h === "string").slice(-MAX_RECENT_RELEASES) : r.lastOrdinal === obj.releaseOrdinal && typeof obj.releaseHash === "string" && obj.releaseHash ? [obj.releaseHash] : [],
          worst: r.worst === "low" || r.worst === "med" || r.worst === "high" ? r.worst : "low"
        });
      }
    }
    return {
      releaseHash: typeof obj.releaseHash === "string" ? obj.releaseHash : "",
      releaseOrdinal: typeof obj.releaseOrdinal === "number" ? Math.max(0, Math.floor(obj.releaseOrdinal)) : 0,
      releaseHashes: Array.isArray(obj.releaseHashes) ? obj.releaseHashes.filter((h) => typeof h === "string").slice(-MAX_RECENT_RELEASES) : typeof obj.releaseHash === "string" && obj.releaseHash ? [obj.releaseHash] : [],
      patterns
    };
  } catch {
    return emptyRecurrence();
  }
}
async function noteRecurringFindings(findings, opts) {
  try {
    if (isBoosthisDisabled()) return;
    const now = opts?.now ?? Date.now();
    storage.updateSyncExclusive(RECURRENCE_STORAGE_KEY, (raw) => {
      const record = readRecurrenceRecord(raw);
      let changed = false;
      let touched = false;
      const key = (opts?.releaseKey ?? "").trim();
      if (key.length > 0) {
        const hash2 = safeHashId(`release:${key}`);
        if (!record.releaseHashes.includes(hash2)) {
          record.releaseHashes = [...record.releaseHashes, hash2].slice(-MAX_RECENT_RELEASES);
          record.releaseHash = hash2;
          record.releaseOrdinal += 1;
          changed = true;
        }
      }
      const hash = key.length > 0 ? safeHashId(`release:${key}`) : "";
      const ordinal = key.length > 0 ? record.releaseOrdinal : 0;
      const run = currentRunId();
      const byKind = new Map(record.patterns.map((p) => [p.kind, p]));
      for (const f of findings) {
        if (!isRecurrenceKind(f.kind)) continue;
        const sev = bucketSeverity(f.p95);
        const prev = byKind.get(f.kind);
        if (!prev) {
          byKind.set(f.kind, {
            kind: f.kind,
            runs: 1,
            releases: ordinal > 0 ? 1 : 0,
            firstSeenAt: now,
            lastSeenAt: now,
            lastRun: run,
            lastOrdinal: ordinal,
            releaseHashes: hash ? [hash] : [],
            worst: sev
          });
          changed = true;
          continue;
        }
        if (prev.lastRun !== run) {
          prev.runs += 1;
          changed = true;
        }
        if (ordinal > 0 && !prev.releaseHashes.includes(hash)) {
          prev.releases += 1;
          prev.releaseHashes = [...prev.releaseHashes, hash].slice(-MAX_RECENT_RELEASES);
          changed = true;
        }
        if (ordinal > 0) prev.lastOrdinal = ordinal;
        if (now - prev.lastSeenAt >= RECURRENCE_TOUCH_MS) touched = true;
        prev.lastRun = run;
        prev.lastSeenAt = now;
        if (SEV_RANK[sev] > SEV_RANK[prev.worst]) {
          prev.worst = sev;
          changed = true;
        }
      }
      const merged = [...byKind.values()].sort((a, b) => b.lastSeenAt - a.lastSeenAt).slice(0, MAX_REMEMBERED_PATTERNS);
      record.patterns = merged;
      recurrenceMirror = record;
      return changed || touched ? JSON.stringify(record) : raw ?? JSON.stringify(record);
    });
  } catch {
  }
}
function readRecurrenceRows(now) {
  const record = recurrenceMirror;
  if (!record) return null;
  const at = now ?? Date.now();
  const run = currentRunId();
  const out = [];
  for (const p of record.patterns) {
    const seenNow = p.lastRun === run ? 1 : 0;
    if (seenNow === 1 && p.runs < MIN_OCCURRENCES_TO_SURFACE) continue;
    const row = {
      kind: p.kind,
      runs: p.runs,
      seenNow,
      firstSeenDaysAgo: Math.max(0, Math.floor((at - p.firstSeenAt) / MS_PER_DAY)),
      lastSeenDaysAgo: Math.max(0, Math.floor((at - p.lastSeenAt) / MS_PER_DAY))
    };
    if (p.releases > 0) row.releases = p.releases;
    if (p.lastOrdinal > 0 && record.releaseOrdinal > 0) {
      row.releasesSince = Math.max(0, record.releaseOrdinal - p.lastOrdinal);
    }
    out.push(row);
  }
  return out;
}
const _candidateInternals = {
  STORAGE_KEY,
  BASELINE_STORAGE_KEY,
  RECURRENCE_STORAGE_KEY,
  MAX_CANDIDATES,
  MAX_REMEMBERED_PATTERNS,
  MIN_OCCURRENCES_TO_SURFACE,
  bucketSeverity,
  bucketCount,
  safeHashId,
  /** Stand in for a process restart: a different run id is the only thing
   *  that makes a sighting a new RUN. `null` restores this process's own. */
  setRunIdForTests(id) {
    runIdOverride = id;
  },
  /** Drop the in-memory mirror without touching the store — what a fresh
   *  process sees before its first tick. */
  resetRecurrenceMirrorForTests() {
    recurrenceMirror = null;
  }
};
export {
  _candidateInternals,
  _resetIngestDedupeForTests,
  clearAllCandidates,
  ingestFindings,
  isRecurrenceKind,
  listCandidateRules,
  listSurfaceable,
  markCandidateSubmitted,
  noteRecurringFindings,
  promoteCandidateLocal,
  readRecurrenceRows,
  setCandidateSubmitter,
  setResolutionSubmitter,
  signatureFor
};
