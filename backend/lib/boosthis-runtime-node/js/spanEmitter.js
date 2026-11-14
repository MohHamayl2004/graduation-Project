// @ts-nocheck
/* eslint-disable */
// Built from src/spanEmitter.ts so plain node can run the kit. Do not edit.
import { rateDuration } from "./thresholds.js";
import { MAX_PART_NAME } from "./routeInventory.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import { noteRowsDiscarded, noteRowsDelivered } from "./serverlessMeters.js";
import { sanitizeSpanId } from "./spanScope.js";
import { uploadsReady } from "./uploadRecovery.js";
import { uploadPausedUntil } from "./uploadPause.js";
import {
  sanitizeWorkKind,
  sanitizeOutcome
} from "./spanWork.js";
const MAX_LINKED_STEPS_PER_REQUEST = 7;
const MAX_SPAN_BATCH = 50;
const MAX_BUFFERED_SPANS = 50;
const MAX_BUFFERED_LINKED_STEPS = 50;
const SPAN_FLUSH_MS = 15e3;
const MAX_SPAN_DURATION_MS = 6e5;
function rateSpanDuration(ms) {
  return rateDuration(ms);
}
function spanLabel(label) {
  return label.length <= MAX_PART_NAME ? label : null;
}
let submitter = null;
let buffer = [];
let waitingForParent = /* @__PURE__ */ new Map();
let linkedReady = [];
let linkedReadyRows = 0;
let timer = null;
let active = false;
let inFlight = false;
function setSpanSubmitter(fn) {
  submitter = fn;
}
function clearBufferedSpans() {
  buffer = [];
  waitingForParent = /* @__PURE__ */ new Map();
  linkedReady = [];
  linkedReadyRows = 0;
}
function closedRow(span) {
  if (span.routeLabel.length > MAX_PART_NAME) {
    noteRowsDiscarded(1, "sendFailed");
    return null;
  }
  const durationMs = Math.max(
    0,
    Math.min(MAX_SPAN_DURATION_MS, Math.round(span.durationMs))
  );
  const startOffsetMs = Math.max(
    0,
    Math.min(MAX_SPAN_DURATION_MS, Math.round(span.startOffsetMs || 0))
  );
  const row = {
    traceId: span.traceId,
    layer: span.layer,
    routeLabel: span.routeLabel,
    durationMs,
    startOffsetMs,
    rating: span.rating
  };
  const spanId = sanitizeSpanId(span.spanId);
  if (spanId !== null) row.spanId = spanId;
  const parentSpanId = sanitizeSpanId(span.parentSpanId);
  if (parentSpanId !== null) row.parentSpanId = parentSpanId;
  const kind = sanitizeWorkKind(span.kind);
  if (kind !== null) row.kind = kind;
  const outcome = sanitizeOutcome(span.outcome);
  if (outcome !== null) row.outcome = outcome;
  if (span.wait === "declared") row.wait = "declared";
  return row;
}
function closedLinkedRows(linked, parentSpanId) {
  const out = [];
  for (const l of linked.slice(0, MAX_LINKED_STEPS_PER_REQUEST)) {
    const row = closedRow({ ...l, parentSpanId });
    if (row !== null && row.parentSpanId === parentSpanId) out.push(row);
  }
  return out;
}
function pushLinkedGroup(group) {
  if (group.length === 0) return;
  linkedReady.push(group);
  linkedReadyRows += group.length;
  while (linkedReadyRows > MAX_BUFFERED_LINKED_STEPS && linkedReady.length > 0) {
    const dropped = linkedReady.shift();
    linkedReadyRows -= dropped.length;
    noteRowsDiscarded(dropped.length);
  }
}
function enqueueSpan(span, linked) {
  if (!submitter || isBoosthisDisabled() || isKitLocked()) return false;
  const row = closedRow(span);
  if (row === null) return false;
  buffer.push(row);
  if (linked && linked.length > 0 && row.spanId) {
    const kids = closedLinkedRows(linked, row.spanId);
    if (kids.length > 0) waitingForParent.set(row.spanId, kids);
  }
  while (buffer.length > MAX_BUFFERED_SPANS) {
    const gone = buffer.shift();
    let n = 1;
    if (gone.spanId) {
      const kids = waitingForParent.get(gone.spanId);
      if (kids) {
        waitingForParent.delete(gone.spanId);
        n += kids.length;
      }
    }
    noteRowsDiscarded(n);
  }
  return true;
}
function enqueueJobRunSteps(run, linked) {
  if (!submitter || isBoosthisDisabled()) return false;
  const row = closedRow(run);
  if (row === null || !row.spanId) return false;
  const kids = closedLinkedRows(linked, row.spanId);
  if (kids.length === 0) return false;
  pushLinkedGroup([row, ...kids]);
  return true;
}
function takeBatch(linkedOnly) {
  const own = linkedOnly ? [] : buffer.splice(0, MAX_SPAN_BATCH);
  const rows = [...own];
  const released = /* @__PURE__ */ new Map();
  for (const step of own) {
    if (!step.spanId) continue;
    const kids = waitingForParent.get(step.spanId);
    if (kids) {
      waitingForParent.delete(step.spanId);
      released.set(step.spanId, kids);
      pushLinkedGroup(kids);
    }
  }
  const groups = [];
  while (linkedReady.length > 0 && rows.length + linkedReady[0].length <= MAX_SPAN_BATCH) {
    const group = linkedReady.shift();
    linkedReadyRows -= group.length;
    rows.push(...group);
    groups.push(group);
  }
  return { rows, own, released, groups };
}
function putBack(taken) {
  const sent = new Set(taken.groups);
  const queued = new Set(linkedReady);
  const waitAgain = /* @__PURE__ */ new Set();
  for (const [parentId, kids] of taken.released) {
    if (!sent.has(kids) && !queued.has(kids)) continue;
    waitAgain.add(kids);
    waitingForParent.set(parentId, kids);
  }
  if (waitAgain.size > 0) {
    const kept = [];
    for (const group of linkedReady) {
      if (waitAgain.has(group)) linkedReadyRows -= group.length;
      else kept.push(group);
    }
    linkedReady = kept;
  }
  const front = taken.groups.filter((group) => !waitAgain.has(group));
  for (const group of front) linkedReadyRows += group.length;
  linkedReady = [...front, ...linkedReady];
  buffer = [...taken.own, ...buffer];
  while (buffer.length > MAX_BUFFERED_SPANS) {
    const gone = buffer.shift();
    let n = 1;
    if (gone.spanId) {
      const kids = waitingForParent.get(gone.spanId);
      if (kids) {
        waitingForParent.delete(gone.spanId);
        n += kids.length;
      }
    }
    noteRowsDiscarded(n);
  }
  while (linkedReadyRows > MAX_BUFFERED_LINKED_STEPS && linkedReady.length > 0) {
    const dropped = linkedReady.shift();
    linkedReadyRows -= dropped.length;
    noteRowsDiscarded(dropped.length);
  }
}
async function sendBatch(send, taken) {
  const batch = taken.rows;
  try {
    const accepted = await send(batch);
    noteRowsDelivered(accepted);
    if (accepted === 0 && batch.length > 0 && submitter === send && !isBoosthisDisabled() && uploadPausedUntil("spans") !== null) {
      putBack(taken);
      return 0;
    }
    if (accepted < batch.length) {
      noteRowsDiscarded(batch.length - accepted, "sendFailed");
    }
    return accepted;
  } catch {
    noteRowsDiscarded(batch.length, "sendFailed");
    return 0;
  }
}
async function tick(ending = false) {
  const send = submitter;
  if (!send || isBoosthisDisabled() || inFlight || buffer.length === 0 && linkedReady.length === 0) {
    return 0;
  }
  if (uploadPausedUntil("spans") !== null) return 0;
  if (!uploadsReady(ending)) return 0;
  inFlight = true;
  try {
    const batch = takeBatch(false);
    if (batch.rows.length === 0) return 0;
    let accepted = await sendBatch(send, batch);
    if (accepted > 0 && linkedReady.length > 0 && submitter === send && !isBoosthisDisabled()) {
      const extra = takeBatch(true);
      if (extra.rows.length > 0) accepted += await sendBatch(send, extra);
    }
    return accepted;
  } finally {
    inFlight = false;
  }
}
function flushSpansNow(ending = false) {
  return tick(ending);
}
function startSpanAutoFlush() {
  if (active) return;
  active = true;
  const loop = () => {
    if (!active) return;
    timer = setTimeout(() => {
      void tick().catch(() => {
      }).finally(() => {
        if (active) loop();
      });
    }, SPAN_FLUSH_MS);
    timer?.unref?.();
  };
  loop();
}
function stopSpanAutoFlush() {
  active = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
const _spanInternals = {
  hasSubmitter: () => submitter !== null,
  bufferLen: () => buffer.length,
  /** Linked steps held: waiting for their request, and ready to send. */
  linkedLen: () => {
    let n = linkedReadyRows;
    for (const kids of waitingForParent.values()) n += kids.length;
    return n;
  },
  isAutoRunning: () => active,
  flushMs: () => SPAN_FLUSH_MS,
  reset: () => {
    stopSpanAutoFlush();
    submitter = null;
    buffer = [];
    waitingForParent = /* @__PURE__ */ new Map();
    linkedReady = [];
    linkedReadyRows = 0;
    inFlight = false;
  }
};
export {
  MAX_BUFFERED_LINKED_STEPS,
  MAX_BUFFERED_SPANS,
  MAX_SPAN_BATCH,
  MAX_SPAN_DURATION_MS,
  SPAN_FLUSH_MS,
  _spanInternals,
  clearBufferedSpans,
  enqueueJobRunSteps,
  enqueueSpan,
  flushSpansNow,
  rateSpanDuration,
  setSpanSubmitter,
  spanLabel,
  startSpanAutoFlush,
  stopSpanAutoFlush
};
