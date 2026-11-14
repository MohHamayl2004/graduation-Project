// @ts-nocheck
/* eslint-disable */
// Built from src/linkedSteps.ts so plain node can run the kit. Do not edit.
import { currentRequestScope } from "./repeatedWork.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import { rateSpanDuration } from "./spanEmitter.js";
import { newSpanId } from "./spanScope.js";
const LINKED_STEPS_MARKER = "BOOSTHIS_LINKED_STEPS_V1";
const LINKED_STEP_LABELS = {
  db: ["database"],
  http: ["signin", "storage", "payments", "messaging", "search", "other"]
};
const MAX_LINKED_STEPS_PER_REQUEST = 7;
const HTTP_WORDS = new Set(LINKED_STEP_LABELS.http);
function kindOfWord(word) {
  if (word === "database") return "db";
  return HTTP_WORDS.has(word) ? "http" : null;
}
const MAX_WINDOWS_PER_WORD = 64;
function openLinkedScope(openedAt = performance.now()) {
  if (isBoosthisDisabled() || isKitLocked()) return null;
  return { openedAt, words: null, closed: false };
}
let jobScopeReader = null;
function setJobLinkedScopeReader(fn) {
  jobScopeReader = fn;
}
function currentLinkedScope() {
  try {
    const job = jobScopeReader ? jobScopeReader() : null;
    if (job) return job;
    return currentRequestScope()?.linked ?? null;
  } catch {
    return null;
  }
}
function noteLinkedCall(scope, word, start, end, failed) {
  try {
    if (!scope || scope.closed || isBoosthisDisabled() || isKitLocked()) return;
    const kind = kindOfWord(word);
    if (kind === null) return;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return;
    const s = start;
    const e = end > start ? end : start;
    if (scope.words === null) scope.words = /* @__PURE__ */ new Map();
    let fold = scope.words.get(word);
    if (!fold) {
      fold = { kind, windows: [], failed: false };
      scope.words.set(word, fold);
    }
    if (failed) fold.failed = true;
    if (fold.windows.length >= MAX_WINDOWS_PER_WORD) {
      fold.windows = mergeWindows(fold.windows);
    }
    if (fold.windows.length >= MAX_WINDOWS_PER_WORD) {
      const last = fold.windows[fold.windows.length - 1];
      last[0] = Math.min(last[0], s);
      last[1] = Math.max(last[1], e);
      return;
    }
    fold.windows.push([s, e]);
  } catch {
  }
}
function mergeWindows(windows) {
  const sorted = windows.map((w) => [w[0], w[1]]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w[0] <= last[1]) {
      if (w[1] > last[1]) last[1] = w[1];
    } else {
      out.push(w);
    }
  }
  return out;
}
function closeLinkedScope(scope) {
  try {
    if (!scope || scope.closed) return [];
    scope.closed = true;
    const words = scope.words;
    scope.words = null;
    if (words === null) return [];
    const out = [];
    for (const [word, fold] of words) {
      if (fold.windows.length === 0) continue;
      const merged = mergeWindows(fold.windows);
      let busy = 0;
      for (const w of merged) busy += w[1] - w[0];
      out.push({
        kind: fold.kind,
        word,
        startMs: Math.max(0, merged[0][0] - scope.openedAt),
        durationMs: busy,
        failed: fold.failed
      });
    }
    out.sort((a, b) => a.startMs - b.startMs);
    return out.slice(0, MAX_LINKED_STEPS_PER_REQUEST);
  } catch {
    return [];
  }
}
function linkedStepSpans(folds, at) {
  const out = [];
  for (const f of folds.slice(0, MAX_LINKED_STEPS_PER_REQUEST)) {
    out.push({
      traceId: at.traceId,
      layer: at.layer,
      routeLabel: f.word,
      durationMs: f.durationMs,
      startOffsetMs: at.baseOffsetMs + f.startMs,
      rating: rateSpanDuration(f.durationMs),
      spanId: newSpanId(),
      parentSpanId: at.parentSpanId,
      kind: f.kind,
      outcome: f.failed ? "error" : "ok"
    });
  }
  return out;
}
const _linkedStepsInternals = {
  MAX_WINDOWS_PER_WORD,
  mergeWindows,
  hasJobScopeReader: () => jobScopeReader !== null
};
export {
  LINKED_STEPS_MARKER,
  LINKED_STEP_LABELS,
  MAX_LINKED_STEPS_PER_REQUEST,
  _linkedStepsInternals,
  closeLinkedScope,
  currentLinkedScope,
  linkedStepSpans,
  noteLinkedCall,
  openLinkedScope,
  setJobLinkedScopeReader
};
