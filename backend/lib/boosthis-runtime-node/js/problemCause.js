// @ts-nocheck
/* eslint-disable */
// Built from src/problemCause.ts so plain node can run the kit. Do not edit.
import { KIND_RULES } from "./dependencyKinds.js";
const CAUSE_DESTINATIONS = [
  // boosthis:cause-destinations:begin
  "signin",
  "storage",
  "payments",
  "messaging",
  "search",
  "other",
  "database",
  "ai"
  // boosthis:cause-destinations:end
];
function safeProblemCause(value, kind, count) {
  try {
    const v = value;
    const n = (x, min = 0) => typeof x === "number" && Number.isSafeInteger(x) && x >= min && x <= Number.MAX_SAFE_INTEGER;
    const destination = (x) => CAUSE_DESTINATIONS.includes(x);
    if (!v || !n(v.readAt, 1)) return void 0;
    if (kind === "retry-storm" && v.retry && !v.fanOut) {
      const r = v.retry;
      if (!destination(r.to) || !n(r.attempts, 1) || !n(r.spanMs) || r.spanMs > 1e4 || count !== void 0 && r.attempts !== count) return void 0;
      const service = typeof r.service === "string" && KIND_RULES.some((rule) => rule.kind === r.to && rule.service === r.service) ? r.service : void 0;
      return { readAt: v.readAt, retry: { to: r.to, ...service ? { service } : {}, attempts: r.attempts, spanMs: r.spanMs } };
    }
    if (kind === "api-thundering-herd" && v.fanOut && !v.retry) {
      const f = v.fanOut;
      if (!n(f.hosts, 1) || f.hosts > 200 || !n(f.windowMs) || f.windowMs > 50 || count !== void 0 && f.hosts !== count || !Array.isArray(f.destinations) || f.destinations.length < 1 || f.destinations.length > 8) return void 0;
      const seen = /* @__PURE__ */ new Set();
      const rows = [];
      for (const row of f.destinations) {
        if (!destination(row.to) || !n(row.hosts, 1) || seen.has(row.to)) return void 0;
        seen.add(row.to);
        rows.push({ to: row.to, hosts: row.hosts });
      }
      if (rows.reduce((sum, r) => sum + r.hosts, 0) !== f.hosts) return void 0;
      rows.sort((a, b) => b.hosts - a.hosts || (a.to < b.to ? -1 : a.to > b.to ? 1 : 0));
      return { readAt: v.readAt, fanOut: { hosts: f.hosts, windowMs: f.windowMs, destinations: rows } };
    }
  } catch {
  }
  return void 0;
}
export {
  CAUSE_DESTINATIONS,
  safeProblemCause
};
