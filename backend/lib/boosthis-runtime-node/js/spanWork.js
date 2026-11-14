// @ts-nocheck
/* eslint-disable */
// Built from src/spanWork.ts so plain node can run the kit. Do not edit.
const SPAN_WORK_KINDS = [
  "handler",
  "db",
  "http",
  "cache",
  "queue",
  "job",
  "render",
  "other"
];
const SPAN_OUTCOMES = ["ok", "error"];
function sanitizeWorkKind(value) {
  return typeof value === "string" && SPAN_WORK_KINDS.includes(value) ? value : null;
}
function sanitizeOutcome(value) {
  return typeof value === "string" && SPAN_OUTCOMES.includes(value) ? value : null;
}
function outcomeForStatus(status, threw = false) {
  if (threw) return "error";
  return typeof status === "number" && status >= 500 ? "error" : "ok";
}
export {
  SPAN_OUTCOMES,
  SPAN_WORK_KINDS,
  outcomeForStatus,
  sanitizeOutcome,
  sanitizeWorkKind
};
