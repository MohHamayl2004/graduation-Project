// @ts-nocheck
/* eslint-disable */
// Built from src/dropReport.ts so plain node can run the kit. Do not edit.
import { readAnswerJson } from "./answerRead.js";
const CAUSE_KEYS = [
  "labelRejected",
  "traceCapReached",
  "snapshotEntryFiltered"
];
const DROP_CAUSE_TEXT = {
  labelRejected: "route names the privacy guard refused",
  traceCapReached: "spans past the 20-span limit",
  snapshotEntryFiltered: "snapshot entries the privacy guard refused"
};
const DROP_CAUSE_FIX = {
  labelRejected: "Name routes in code, the way GET /orders is written.",
  traceCapReached: "A trace keeps its first 20 spans — measure fewer steps per request, or split a very long trace.",
  snapshotEntryFiltered: "Name screens in code, never from what a person typed or an id."
};
function finiteCount(v) {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return 0;
  return Math.floor(v);
}
function parseDropReply(body) {
  try {
    if (!body || typeof body !== "object") return null;
    const rec = body;
    const total = finiteCount(rec.dropped);
    if (total <= 0) return null;
    const raw = rec.droppedByCause;
    const byCause = [];
    if (raw && typeof raw === "object") {
      const causes = raw;
      for (const cause of CAUSE_KEYS) {
        const n = finiteCount(causes[cause]);
        if (n > 0) byCause.push({ cause, count: n });
      }
    }
    return { total, byCause };
  } catch {
    return null;
  }
}
let droppedRows = 0;
const seenCauses = /* @__PURE__ */ new Set();
const warnedCauses = /* @__PURE__ */ new Set();
function getDroppedRowCount() {
  return droppedRows;
}
function getDroppedRowCauses() {
  return CAUSE_KEYS.filter((c) => seenCauses.has(c));
}
function dropSummaryText() {
  if (droppedRows <= 0) return "";
  const causes = getDroppedRowCauses().map((c) => DROP_CAUSE_TEXT[c]);
  return causes.length > 0 ? `${droppedRows} — ${causes.join("; ")}` : String(droppedRows);
}
function warnCauseOnce(cause, count) {
  if (warnedCauses.has(cause)) return;
  warnedCauses.add(cause);
  try {
    console.warn(
      `[boosthis] Boosthis dropped ${count} of the measurements this app sent: ${DROP_CAUSE_TEXT[cause]}. ${DROP_CAUSE_FIX[cause]}`
    );
  } catch {
  }
}
function noteServerDrops(body) {
  try {
    const parsed = parseDropReply(body);
    if (!parsed) return;
    droppedRows += parsed.total;
    for (const { cause, count } of parsed.byCause) {
      seenCauses.add(cause);
      warnCauseOnce(cause, count);
    }
  } catch {
  }
}
async function readDropsFromResponse(res, also) {
  let body;
  try {
    const r = res;
    if (!r || typeof r.json !== "function" && typeof r.text !== "function") return;
    body = await readAnswerJson(r);
  } catch {
    return;
  }
  try {
    noteServerDrops(body);
  } catch {
  }
  try {
    also?.(body);
  } catch {
  }
}
const UNDELIVERED_KEYS = [
  "bufferFull",
  "sendFailed",
  "heldTooLong",
  "processEnded"
];
const UNDELIVERED_CAUSE_TEXT = {
  bufferFull: "buffer full, oldest measurements dropped",
  sendFailed: "an upload failed and its rows were already out of the buffer",
  heldTooLong: "held too long without reaching Boosthis, then given up on",
  processEnded: "the process ended with measurements still waiting"
};
const UNDELIVERED_CAUSE_FIX = {
  bufferFull: "Measurements are arriving faster than they can be sent — check this app can reach Boosthis.",
  sendFailed: "Check this app can reach Boosthis; uploads are being started and not completing.",
  heldTooLong: "Uploads have not succeeded for several minutes — check this app can reach Boosthis.",
  processEnded: "The process exited before its last upload finished. On a function host this is normal at the end of an instance's life."
};
let undeliveredRows = 0;
const seenUndelivered = /* @__PURE__ */ new Set();
const warnedUndelivered = /* @__PURE__ */ new Set();
const undeliveredByCause = /* @__PURE__ */ new Map();
function getUndeliveredRowCount() {
  return undeliveredRows;
}
function getUndeliveredCauses() {
  return UNDELIVERED_KEYS.filter((c) => seenUndelivered.has(c));
}
function getUndeliveredByCause() {
  return getUndeliveredCauses().map((cause) => ({
    cause,
    count: undeliveredByCause.get(cause) ?? 0
  }));
}
function undeliveredSummaryText() {
  if (undeliveredRows <= 0) return "";
  const causes = getUndeliveredCauses().map((c) => UNDELIVERED_CAUSE_TEXT[c]);
  return causes.length > 0 ? `${undeliveredRows} — ${causes.join("; ")}` : String(undeliveredRows);
}
function noteUndeliveredRows(cause, rows) {
  try {
    if (!Number.isFinite(rows) || rows <= 0) return;
    const n = Math.floor(rows);
    undeliveredRows += n;
    seenUndelivered.add(cause);
    undeliveredByCause.set(cause, (undeliveredByCause.get(cause) ?? 0) + n);
    if (warnedUndelivered.has(cause)) return;
    warnedUndelivered.add(cause);
    try {
      console.warn(
        `[boosthis] Boosthis could not deliver ${n} of the measurements this app gathered: ${UNDELIVERED_CAUSE_TEXT[cause]}. ${UNDELIVERED_CAUSE_FIX[cause]}`
      );
    } catch {
    }
  } catch {
  }
}
function _resetDropReportForTests() {
  droppedRows = 0;
  seenCauses.clear();
  warnedCauses.clear();
  undeliveredRows = 0;
  seenUndelivered.clear();
  warnedUndelivered.clear();
  undeliveredByCause.clear();
}
export {
  DROP_CAUSE_FIX,
  DROP_CAUSE_TEXT,
  UNDELIVERED_CAUSE_FIX,
  UNDELIVERED_CAUSE_TEXT,
  _resetDropReportForTests,
  dropSummaryText,
  getDroppedRowCauses,
  getDroppedRowCount,
  getUndeliveredByCause,
  getUndeliveredCauses,
  getUndeliveredRowCount,
  noteServerDrops,
  noteUndeliveredRows,
  parseDropReply,
  readDropsFromResponse,
  undeliveredSummaryText
};
