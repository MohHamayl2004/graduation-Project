// @ts-nocheck
/* eslint-disable */
// Built from src/declaredWaits.ts so plain node can run the kit. Do not edit.
import { transmitLabelHasPII } from "./no-pii.js";
import { isBunRuntime } from "./runtimeTag.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { sayAfterStartupLine, sayNoteAfterStartupLine } from "./startAnnounce.js";
const DECLARED_WAIT_NAME_CAP = 10;
const DECLARED_WAIT_NAME_MAX = 200;
const DECLARED_WAIT_READ_MAX = 1e3;
const MATCH_PATH_MAX = 2048;
const SHOWN_SEGMENT_MAX = 40;
const ROUTE_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS"
];
const DECLARED_NAME_REFUSAL_REASON = {
  wildcard: "a wildcard is not a name — name each route exactly",
  prefix: "a prefix covers routes nobody named — name each route exactly",
  pattern: "a pattern is not a name — write the route as the dashboard shows it",
  "kit-route": "the kit's own routes are not yours to declare",
  "host-only": "a host on its own is not an address — give the full address of the call",
  malformed: "not a name this rule accepts — no spaces, query or fragment, and a route starts with /",
  private: "the name failed the privacy check every route label passes"
};
const PATTERN_CHARS = /[\^$()[\]|+\\]/;
const KIT_ROUTE = /^\/_{1,2}boosthis(?:\/|$)/i;
const QUERY_PAIR = /[?&][^/?&]*=/;
function pathRefusal(path) {
  if (!path.startsWith("/")) return "malformed";
  if (/\s/.test(path) || path.includes("#")) return "malformed";
  if (path.includes("?")) return QUERY_PAIR.test(path) ? "malformed" : "wildcard";
  if (path.endsWith("...") || path.endsWith("…") || /\/\*+$/.test(path) || path.endsWith("*")) {
    return "prefix";
  }
  if (path.includes("*")) return "wildcard";
  if (PATTERN_CHARS.test(path)) return "pattern";
  if (KIT_ROUTE.test(path)) return "kit-route";
  return null;
}
function declaredRouteNameRefusal(name) {
  if (typeof name !== "string") return "malformed";
  if (name.length === 0 || name.length > DECLARED_WAIT_NAME_MAX) return "malformed";
  let path = name;
  const space = name.indexOf(" ");
  if (space !== -1) {
    if (!ROUTE_METHODS.includes(name.slice(0, space))) return "malformed";
    path = name.slice(space + 1);
  }
  const refusal = pathRefusal(path);
  if (refusal !== null) return refusal;
  if (transmitLabelHasPII(name) !== null) return "private";
  return null;
}
const PLACEHOLDER = /:[A-Za-z_][A-Za-z0-9_]*/g;
function segmentParts(segment) {
  const parts = [];
  let last = 0;
  PLACEHOLDER.lastIndex = 0;
  let m;
  while ((m = PLACEHOLDER.exec(segment)) !== null) {
    parts.push(segment.slice(last, m.index));
    last = m.index + m[0].length;
  }
  parts.push(segment.slice(last));
  return parts;
}
function shownCallName(origin, path) {
  const segs = path.slice(1).split("/").map(
    (s) => s.length > SHOWN_SEGMENT_MAX || /\d{6}/.test(s) || /[A-Za-z0-9_-]{20}/.test(s) || transmitLabelHasPII(`/${s}`) !== null ? "…" : s
  );
  return `${origin}/${segs.join("/")}`;
}
function parseDeclaredCallName(name) {
  const malformed = { refusal: "malformed" };
  if (typeof name !== "string") return malformed;
  if (name.length === 0 || name.length > DECLARED_WAIT_NAME_MAX) return malformed;
  if (/\s/.test(name) || name.includes("#")) return malformed;
  if (name.includes("?")) {
    return { refusal: QUERY_PAIR.test(name) ? "malformed" : "wildcard" };
  }
  const scheme = /^(https?):\/\//i.exec(name);
  if (!scheme) {
    if (!name.startsWith("/") && /^[^/]+\/?$/.test(name)) {
      return { refusal: name.includes("*") ? "wildcard" : "host-only" };
    }
    return malformed;
  }
  const rest = name.slice(scheme[0].length);
  const slash = rest.indexOf("/");
  const authority = slash === -1 ? rest : rest.slice(0, slash);
  const path = slash === -1 ? "" : rest.slice(slash);
  if (authority.length === 0 || authority.includes("@")) return malformed;
  if (authority.includes("*")) return { refusal: "wildcard" };
  if (path === "" || path === "/") return { refusal: "host-only" };
  const refusal = pathRefusal(path);
  if (refusal !== null) return { refusal };
  let origin;
  try {
    origin = new URL(`${scheme[1].toLowerCase()}://${authority}/`).origin;
  } catch {
    return malformed;
  }
  if (origin === "null" || origin.length === 0) return malformed;
  return {
    rule: {
      origin,
      segments: path.slice(1).split("/").map(segmentParts),
      matched: false,
      shown: shownCallName(origin, path)
    }
  };
}
function segmentFits(parts, seg) {
  if (parts.length === 1) return seg === parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!seg.startsWith(first)) return false;
  let pos = first.length;
  for (let i = 1; i < parts.length - 1; i++) {
    const lit = parts[i];
    const from = pos + 1;
    if (lit.length === 0) {
      pos = from;
      continue;
    }
    const at = seg.indexOf(lit, from);
    if (at === -1) return false;
    pos = at + lit.length;
  }
  return seg.length - last.length >= pos + 1 && seg.endsWith(last);
}
let routeRules = [];
let routeNamesOverCap = null;
const routeNamesSeen = /* @__PURE__ */ new Set();
let callRules = [];
const callKeysSeen = /* @__PURE__ */ new Set();
let callNamesHeld = 0;
let callsOverCap = false;
let callExcluded = 0;
let callWorstMs = 0;
const originCache = /* @__PURE__ */ new Map();
function normalOrigin(raw) {
  const hit = originCache.get(raw);
  if (hit !== void 0) return hit;
  let o;
  try {
    o = new URL(raw).origin;
    if (o === "null") o = null;
  } catch {
    o = null;
  }
  if (originCache.size >= 64) originCache.clear();
  originCache.set(raw, o);
  return o;
}
function readList(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, DECLARED_WAIT_READ_MAX);
}
function setDeclaredWaits(option) {
  try {
    if (option === void 0 || option === null) return;
    if (typeof option !== "object") {
      sayAfterStartupLine(
        "[boosthis] Boosthis will not use declaredWaits: it must be { routes: [...], calls: [...] }."
      );
      return;
    }
    const { routes, calls } = option;
    let changed = false;
    if (routes !== void 0 && !Array.isArray(routes)) {
      sayAfterStartupLine(
        "[boosthis] Boosthis will not use declaredWaits.routes: it must be a list of route names."
      );
    }
    readList(routes).forEach((raw, i) => {
      const refusal = declaredRouteNameRefusal(raw);
      if (refusal !== null) {
        sayAfterStartupLine(
          `[boosthis] Boosthis will not use declared route ${i + 1}: ${DECLARED_NAME_REFUSAL_REASON[refusal]}.`
        );
        return;
      }
      const name = raw;
      if (routeNamesSeen.has(name)) return;
      routeNamesSeen.add(name);
      changed = true;
      const space = name.indexOf(" ");
      const path = space === -1 ? name : name.slice(space + 1);
      routeRules.push({
        name,
        method: space === -1 ? null : name.slice(0, space),
        path,
        segments: path.slice(1).split("/").map(segmentParts),
        excluded: 0,
        worstMs: 0
      });
    });
    if (routeNamesSeen.size > DECLARED_WAIT_NAME_CAP && routeNamesOverCap === null) {
      routeNamesOverCap = routeRules.map((r) => r.name);
      sayAfterStartupLine(
        `[boosthis] Boosthis will not use the declared routes: ${routeNamesSeen.size} were declared and at most ${DECLARED_WAIT_NAME_CAP} are accepted, so none of them is kept out of the readings until the list is cut to ${DECLARED_WAIT_NAME_CAP}.`
      );
    }
    if (calls !== void 0 && !Array.isArray(calls)) {
      sayAfterStartupLine(
        "[boosthis] Boosthis will not use declaredWaits.calls: it must be a list of addresses."
      );
    }
    readList(calls).forEach((raw, i) => {
      const parsed = parseDeclaredCallName(raw);
      if ("refusal" in parsed) {
        sayAfterStartupLine(
          `[boosthis] Boosthis will not use declared call ${i + 1}: ${DECLARED_NAME_REFUSAL_REASON[parsed.refusal]}.`
        );
        return;
      }
      const rule = parsed.rule;
      const key = `${rule.origin}/${rule.segments.map((p) => p.join("\0")).join("/")}`;
      if (callKeysSeen.has(key)) return;
      callKeysSeen.add(key);
      changed = true;
      callNamesHeld = Math.min(callNamesHeld + 1, DECLARED_WAIT_READ_MAX);
      callRules.push(rule);
    });
    if (callNamesHeld > DECLARED_WAIT_NAME_CAP && !callsOverCap) {
      callsOverCap = true;
      sayAfterStartupLine(
        `[boosthis] Boosthis will not use the declared calls: ${callNamesHeld} were declared and at most ${DECLARED_WAIT_NAME_CAP} are accepted, so every one of them is still timed until the list is cut to ${DECLARED_WAIT_NAME_CAP}.`
      );
    }
    if (changed) announceDeclared();
  } catch {
  }
}
function announceDeclared() {
  const parts = [];
  if (routeRules.length > 0 && routeNamesOverCap === null) {
    parts.push(`routes ${routeRules.map((r) => r.name).join(", ")}`);
  }
  if (callRules.length > 0 && !callsOverCap) {
    parts.push(`calls ${callRules.map((r) => r.shown).join(", ")}`);
  }
  if (parts.length === 0) return;
  sayNoteAfterStartupLine(
    `[boosthis] Waits declared on purpose: ${parts.join("; ")}. Their durations are kept out of every speed reading and counted instead; their errors still count.`
  );
  if (callRules.length > 0 && !callsOverCap && isBunRuntime()) {
    sayNoteAfterStartupLine(
      "[boosthis] On Bun the kit sees no call made with Bun's own fetch, so those calls are never timed and declaring them changes nothing."
    );
  }
}
function hasDeclaredRoutes() {
  return routeRules.length > 0 && routeNamesOverCap === null;
}
function requestSegments(rawPath) {
  if (typeof rawPath !== "string") return null;
  const q = rawPath.indexOf("?");
  const p = q === -1 ? rawPath : rawPath.slice(0, q);
  if (p.length > MATCH_PATH_MAX || !p.startsWith("/")) return null;
  return p.slice(1).split("/");
}
function routeFits(r, shownPath, rawSegs) {
  if (shownPath !== null && r.path === shownPath) return true;
  if (rawSegs === null || rawSegs.length !== r.segments.length) return false;
  for (let i = 0; i < rawSegs.length; i++) {
    if (!segmentFits(r.segments[i], rawSegs[i])) return false;
  }
  return true;
}
function noteDeclaredRouteCall(method, shown, durationMs, rawPath) {
  if (routeRules.length === 0 || routeNamesOverCap !== null) return false;
  if (isBoosthisDisabled()) return false;
  try {
    const label = typeof shown === "string" ? shown : null;
    const space = label === null ? -1 : label.indexOf(" ");
    const m = space === -1 ? typeof method === "string" ? method.trim().toUpperCase() : "" : label.slice(0, space);
    const shownPath = label === null ? null : space === -1 ? label : label.slice(space + 1);
    const rawSegs = requestSegments(rawPath);
    if (shownPath === null && rawSegs === null) return false;
    let hit = null;
    for (const r of routeRules) {
      if (r.method !== null && r.method !== m) continue;
      if (!routeFits(r, shownPath, rawSegs)) continue;
      if (r.method !== null) {
        hit = r;
        break;
      }
      if (hit === null) hit = r;
    }
    if (hit === null) return false;
    if (hit.excluded < Number.MAX_SAFE_INTEGER) hit.excluded += 1;
    const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
    if (ms > hit.worstMs) hit.worstMs = ms;
    return true;
  } catch {
    return false;
  }
}
function declaredRoutesKeptOut() {
  if (routeNamesOverCap !== null) return 0;
  let n = 0;
  for (const r of routeRules) n += r.excluded;
  return n;
}
function declaredWaitsBlock() {
  if (routeNamesOverCap !== null) {
    return {
      routes: routeNamesOverCap.slice(0, DECLARED_WAIT_NAME_CAP + 1).map((name) => ({ name, excluded: 0, worstMs: 0 }))
    };
  }
  return {
    routes: routeRules.map((r) => ({
      name: r.name,
      excluded: r.excluded,
      worstMs: r.excluded > 0 ? Math.round(r.worstMs) : 0
    }))
  };
}
function hasDeclaredCalls() {
  return callNamesHeld > 0;
}
function matchDeclaredCall(origin, path) {
  if (callRules.length === 0 || callsOverCap) return null;
  if (isBoosthisDisabled()) return null;
  try {
    if (typeof origin !== "string" || typeof path !== "string") return null;
    const o = normalOrigin(origin);
    if (o === null) return null;
    const q = path.indexOf("?");
    const p = q === -1 ? path : path.slice(0, q);
    if (p.length > MATCH_PATH_MAX || !p.startsWith("/")) return null;
    const segs = p.slice(1).split("/");
    for (const rule of callRules) {
      if (rule.origin !== o || rule.segments.length !== segs.length) continue;
      let fits = true;
      for (let i = 0; i < segs.length; i++) {
        if (!segmentFits(rule.segments[i], segs[i])) {
          fits = false;
          break;
        }
      }
      if (fits) {
        rule.matched = true;
        return rule;
      }
    }
    return null;
  } catch {
    return null;
  }
}
function noteDeclaredCallExcluded(match, durationMs) {
  if (isBoosthisDisabled()) return;
  if (match !== null) match.matched = true;
  if (callExcluded < Number.MAX_SAFE_INTEGER) callExcluded += 1;
  const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
  if (ms > callWorstMs) callWorstMs = ms;
}
function declaredCallCounts() {
  if (callsOverCap) {
    return {
      waitDeclaredNames: callNamesHeld,
      waitDeclaredMatched: 0,
      waitDeclaredExcluded: 0,
      waitDeclaredWorstMs: 0
    };
  }
  let matched = 0;
  for (const r of callRules) if (r.matched) matched += 1;
  return {
    waitDeclaredNames: callRules.length,
    waitDeclaredMatched: matched,
    waitDeclaredExcluded: callExcluded,
    waitDeclaredWorstMs: callExcluded > 0 ? Math.round(callWorstMs) : 0
  };
}
function clearDeclaredWaitCounts() {
  for (const r of routeRules) {
    r.excluded = 0;
    r.worstMs = 0;
  }
  for (const r of callRules) r.matched = false;
  callExcluded = 0;
  callWorstMs = 0;
}
function _resetDeclaredWaitsForTests() {
  routeRules = [];
  routeNamesOverCap = null;
  routeNamesSeen.clear();
  callRules = [];
  callKeysSeen.clear();
  callNamesHeld = 0;
  callsOverCap = false;
  callExcluded = 0;
  callWorstMs = 0;
  originCache.clear();
}
export {
  DECLARED_NAME_REFUSAL_REASON,
  DECLARED_WAIT_NAME_CAP,
  DECLARED_WAIT_NAME_MAX,
  DECLARED_WAIT_READ_MAX,
  _resetDeclaredWaitsForTests,
  clearDeclaredWaitCounts,
  declaredCallCounts,
  declaredRouteNameRefusal,
  declaredRoutesKeptOut,
  declaredWaitsBlock,
  hasDeclaredCalls,
  hasDeclaredRoutes,
  matchDeclaredCall,
  noteDeclaredCallExcluded,
  noteDeclaredRouteCall,
  parseDeclaredCallName,
  setDeclaredWaits
};
