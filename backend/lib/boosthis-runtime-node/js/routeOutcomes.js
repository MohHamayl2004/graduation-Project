// @ts-nocheck
/* eslint-disable */
// Built from src/routeOutcomes.ts so plain node can run the kit. Do not edit.
function statusClassOf(status) {
  if (typeof status !== "number" || !Number.isFinite(status)) return "unknown";
  const s = Math.floor(status);
  if (s >= 100 && s < 200) return "1xx";
  if (s >= 200 && s < 300) return "2xx";
  if (s >= 300 && s < 400) return "3xx";
  if (s >= 400 && s < 500) return "4xx";
  if (s >= 500 && s < 600) return "5xx";
  return "unknown";
}
const MAX_TRACKED_ROUTE_OUTCOMES = 200;
let counts = /* @__PURE__ */ new Map();
let untracked = 0;
function noteRouteOutcome(label, status) {
  try {
    if (typeof label !== "string" || label.length === 0) return;
    const cls = statusClassOf(status);
    if (cls === "unknown" || cls === "1xx") return;
    let row = counts.get(label);
    if (!row) {
      if (counts.size >= MAX_TRACKED_ROUTE_OUTCOMES) {
        untracked++;
        return;
      }
      row = { observed: 0, failed: 0 };
      counts.set(label, row);
    }
    row.observed++;
    if (statusClassOf(status) === "5xx") row.failed++;
  } catch {
  }
}
function routeOutcomeFor(label) {
  const row = counts.get(label);
  return row ? { observed: row.observed, failed: row.failed } : null;
}
function getRouteOutcomeTotals() {
  let observed = 0;
  let failed = 0;
  for (const row of counts.values()) {
    observed += row.observed;
    failed += row.failed;
  }
  return { parts: counts.size, observed, failed, untracked };
}
function resetRouteOutcomes() {
  counts = /* @__PURE__ */ new Map();
  untracked = 0;
}
export {
  MAX_TRACKED_ROUTE_OUTCOMES,
  getRouteOutcomeTotals,
  noteRouteOutcome,
  resetRouteOutcomes,
  routeOutcomeFor,
  statusClassOf
};
