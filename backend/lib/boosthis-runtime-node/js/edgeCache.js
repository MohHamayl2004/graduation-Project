// @ts-nocheck
/* eslint-disable */
// Built from src/edgeCache.ts so plain node can run the kit. Do not edit.
import { isSettling } from "./settleRule.js";
const EDGE_CACHE_HEADERS = [
  "x-vercel-cache",
  "cf-cache-status",
  "x-nextjs-cache",
  "cache-status",
  "x-cache"
];
const MAX_VERDICT_LEN = 120;
const VERCEL = {
  HIT: "hit",
  PRERENDER: "hit",
  STALE: "stale",
  REVALIDATED: "stale",
  MISS: "miss",
  BYPASS: "bypass"
};
const CLOUDFLARE = {
  HIT: "hit",
  MISS: "miss",
  EXPIRED: "stale",
  STALE: "stale",
  UPDATING: "stale",
  REVALIDATED: "stale",
  BYPASS: "bypass",
  DYNAMIC: "bypass",
  IGNORED: "bypass"
};
const NEXTJS = {
  HIT: "hit",
  MISS: "miss",
  STALE: "stale"
};
const XCACHE_FIRST_WORD = {
  HIT: "hit",
  MISS: "miss",
  REFRESHHIT: "stale",
  ERROR: "bypass"
};
function fromCacheStatus(raw) {
  const first = raw.split(",")[0];
  if (first === void 0) return null;
  const params = first.split(";").slice(1);
  let sawFwd = false;
  let fwdReason = "";
  for (const p of params) {
    const key = p.trim().toLowerCase();
    if (key === "hit") return "hit";
    if (key.startsWith("fwd=")) {
      sawFwd = true;
      fwdReason = key.slice(4).trim();
    }
  }
  if (!sawFwd) return null;
  if (fwdReason === "stale" || fwdReason === "request") return "stale";
  if (fwdReason === "bypass" || fwdReason === "method") return "bypass";
  if (fwdReason === "uri-miss" || fwdReason === "vary-miss" || fwdReason === "miss") {
    return "miss";
  }
  return null;
}
function classifyCacheVerdict(read) {
  for (const name of EDGE_CACHE_HEADERS) {
    let raw;
    try {
      raw = read(name);
    } catch {
      continue;
    }
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_VERDICT_LEN) continue;
    if (name === "cache-status") {
      const v2 = fromCacheStatus(trimmed);
      if (v2 !== null) return v2;
      continue;
    }
    if (name === "x-cache") {
      const word = trimmed.split(/[\s,]+/)[0];
      const v2 = word ? XCACHE_FIRST_WORD[word.toUpperCase()] : void 0;
      if (v2 !== void 0) return v2;
      continue;
    }
    const upper = trimmed.toUpperCase();
    const table = name === "x-vercel-cache" ? VERCEL : name === "cf-cache-status" ? CLOUDFLARE : NEXTJS;
    const v = table[upper];
    if (v !== void 0) return v;
  }
  return null;
}
function readVerdictHeaders(headers) {
  const found = /* @__PURE__ */ new Map();
  const wanted = new Set(EDGE_CACHE_HEADERS);
  try {
    if (Array.isArray(headers)) {
      for (let i = 0; i + 1 < headers.length; i += 2) {
        const rawName = headers[i];
        const name = String(
          typeof rawName === "string" ? rawName : rawName?.toString?.() ?? ""
        ).toLowerCase();
        if (!wanted.has(name) || found.has(name)) continue;
        const rawValue = headers[i + 1];
        const value = typeof rawValue === "string" ? rawValue : rawValue?.toString?.() ?? "";
        if (value.length > 0 && value.length <= MAX_VERDICT_LEN) {
          found.set(name, value);
        }
      }
      return found;
    }
    if (headers && typeof headers === "object") {
      const obj = headers;
      for (const name of wanted) {
        const raw = obj[name] ?? obj[name.toUpperCase()];
        const value = Array.isArray(raw) ? raw[0] : raw;
        if (typeof value === "string" && value.length > 0 && value.length <= MAX_VERDICT_LEN) {
          found.set(name, value);
        }
      }
    }
  } catch {
  }
  return found;
}
let hits = 0;
let misses = 0;
let staleServed = 0;
let bypassed = 0;
const MAX_COUNTED = 1e6;
function noteEdgeCacheReply(read) {
  try {
    if (hits + misses + staleServed + bypassed >= MAX_COUNTED) return;
    const verdict = classifyCacheVerdict(read);
    if (verdict === null) return;
    if (isSettling("startupEvent")) {
      settlingVerdicts++;
      return;
    }
    if (verdict === "hit") hits++;
    else if (verdict === "miss") misses++;
    else if (verdict === "stale") staleServed++;
    else bypassed++;
  } catch {
  }
}
function noteEdgeCacheHeaders(headers) {
  try {
    const found = readVerdictHeaders(headers);
    if (found.size === 0) return;
    noteEdgeCacheReply((name) => found.get(name) ?? null);
  } catch {
  }
}
const EDGE_CACHE_MIN = 20;
let settlingVerdicts = 0;
function edgeCacheSettlingVerdicts() {
  return settlingVerdicts;
}
function getEdgeCacheStats() {
  const cacheable = hits + misses + staleServed;
  if (cacheable < EDGE_CACHE_MIN) return null;
  return {
    checked: cacheable + bypassed,
    hits,
    misses,
    stale: staleServed,
    bypass: bypassed,
    hitPct: Math.round((hits + staleServed) / cacheable * 100)
  };
}
function clearEdgeCache() {
  settlingVerdicts = 0;
  hits = 0;
  misses = 0;
  staleServed = 0;
  bypassed = 0;
}
function _noteEdgeVerdictForTests(verdict) {
  noteEdgeCacheReply(
    (name) => name === "x-vercel-cache" ? verdict === "hit" ? "HIT" : verdict === "miss" ? "MISS" : verdict === "stale" ? "STALE" : "BYPASS" : null
  );
}
export {
  EDGE_CACHE_HEADERS,
  _noteEdgeVerdictForTests,
  classifyCacheVerdict,
  clearEdgeCache,
  edgeCacheSettlingVerdicts,
  getEdgeCacheStats,
  noteEdgeCacheHeaders,
  noteEdgeCacheReply
};
