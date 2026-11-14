// @ts-nocheck
/* eslint-disable */
// Built from src/routeInventory.ts so plain node can run the kit. Do not edit.
import { readFlagValue } from "./runtimeFlags.js";
import { transmitLabelHasPII } from "./no-pii.js";
const MAX_PART_NAME = 100;
const ESCAPE_RUN = /(?:%[0-9A-Fa-f]{2})+/g;
let letterLike;
function isLetterLike(cp) {
  if (cp < 128) return false;
  if (letterLike === void 0) {
    try {
      letterLike = new RegExp("^[\\p{L}\\p{M}\\p{N}]$", "u");
    } catch {
      letterLike = null;
    }
  }
  return letterLike !== null && letterLike.test(String.fromCodePoint(cp));
}
function utf8At(bytes, i) {
  const b0 = bytes[i];
  let len;
  let cp;
  let lo = 128;
  let hi = 191;
  if (b0 >= 194 && b0 <= 223) {
    len = 2;
    cp = b0 & 31;
  } else if (b0 >= 224 && b0 <= 239) {
    len = 3;
    cp = b0 & 15;
    if (b0 === 224) lo = 160;
    if (b0 === 237) hi = 159;
  } else if (b0 >= 240 && b0 <= 244) {
    len = 4;
    cp = b0 & 7;
    if (b0 === 240) lo = 144;
    if (b0 === 244) hi = 143;
  } else {
    return null;
  }
  if (i + len > bytes.length) return null;
  for (let k = 1; k < len; k += 1) {
    const b = bytes[i + k];
    if (b < (k === 1 ? lo : 128) || b > (k === 1 ? hi : 191)) return null;
    cp = cp << 6 | b & 63;
  }
  return { cp, len };
}
function decodeRun(run) {
  const bytes = [];
  for (let i2 = 0; i2 < run.length; i2 += 3) {
    bytes.push(parseInt(run.slice(i2 + 1, i2 + 3), 16));
  }
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const seq = bytes[i] >= 128 ? utf8At(bytes, i) : null;
    if (seq !== null && isLetterLike(seq.cp)) {
      out += String.fromCodePoint(seq.cp);
      i += seq.len;
    } else {
      out += run.slice(i * 3, i * 3 + 3);
      i += 1;
    }
  }
  return out;
}
function readableLetters(text) {
  if (typeof text !== "string" || text.indexOf("%") < 0) return text;
  return text.replace(ESCAPE_RUN, decodeRun);
}
function latinDigits(seg) {
  return seg.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => {
    const code = d.charCodeAt(0);
    return String(code - (code >= 1776 ? 1776 : 1632));
  });
}
const MAX_ESCAPED_INPUT = MAX_PART_NAME * 9;
const ROUTE_SOURCE_WORDS = [
  "express",
  "fastify",
  "koa",
  "hapi"
];
const MAX_ROUTE_LIST_ENTRIES = 200;
const HTTP_METHODS = /* @__PURE__ */ new Set([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
  "TRACE",
  "CONNECT"
]);
const SAFE_TEMPLATE_RE = /^\/[A-Za-z0-9_\-./:~%]*$/;
let safeLetterTemplate;
function isSafeTemplate(p) {
  if (SAFE_TEMPLATE_RE.test(p)) return true;
  if (safeLetterTemplate === void 0) {
    try {
      safeLetterTemplate = new RegExp(
        "^/(?:[A-Za-z0-9_\\-./:~%]|(?![\\x00-\\x7f])[\\p{L}\\p{M}\\p{N}])*$",
        "u"
      );
    } catch {
      safeLetterTemplate = null;
    }
  }
  return safeLetterTemplate !== null && safeLetterTemplate.test(p);
}
let declaredRoutes = null;
const warnedDeclarationRefusals = /* @__PURE__ */ new Set();
function warnPartNameRefusal(reason) {
  if (warnedDeclarationRefusals.has(reason)) return;
  warnedDeclarationRefusals.add(reason);
  try {
    console.warn(
      reason === "too-long" ? `Boosthis refused a route because its length exceeds ${MAX_PART_NAME} characters. Use a METHOD /path template of at most ${MAX_PART_NAME} characters, with volatile segments written as :id.` : `Boosthis refused a route because it is not a safe route template. Use a METHOD /path template such as GET /users/:id.`
    );
  } catch {
  }
}
function registerRoutes(routes) {
  try {
    if (!Array.isArray(routes)) return;
    const cleaned = [];
    for (const raw of routes) {
      if (typeof raw !== "string") continue;
      const label = normalizeDeclaredLabel(raw);
      if (label) cleaned.push(label);
      else {
        const trimmed = readableLetters(raw.trim());
        const hasMethod = trimmed.indexOf(" ") > 0;
        warnPartNameRefusal(
          trimmed.length + (hasMethod ? 0 : 4) > MAX_PART_NAME ? "too-long" : "invalid"
        );
      }
    }
    declaredRoutes = cleaned.length > 0 ? Array.from(new Set(cleaned)) : null;
  } catch {
  }
}
function getDeclaredRoutes() {
  return declaredRoutes ?? [];
}
let appHandle = null;
function registerApp(app) {
  try {
    if (app === null || app === void 0) return;
    if (typeof app !== "object" && typeof app !== "function") return;
    if (appHandle) return;
    appHandle = app;
  } catch {
  }
}
function _resetRouteInventoryForTests() {
  declaredRoutes = null;
  appHandle = null;
  warnedDeclarationRefusals.clear();
}
function routeListEnabled() {
  try {
    const v = readFlagValue("BOOSTHIS_ROUTE_LIST");
    if (v === void 0) return true;
    if (typeof v === "boolean") return v;
    return !["0", "false", "off", "no"].includes(v.trim().toLowerCase());
  } catch {
    return true;
  }
}
function collapseParams(path) {
  return path.replace(/\{[^/{}]*\}/g, ":id").replace(/<[^/<>]*>/g, ":id").replace(/:[A-Za-z0-9_]+/g, ":id").replace(/\*+/g, ":id");
}
function safePathTemplate(path) {
  if (typeof path !== "string") return null;
  let p = path.trim();
  if (p.length === 0) return null;
  if (p.length > MAX_ESCAPED_INPUT) return null;
  p = readableLetters(p);
  if (p.length > MAX_PART_NAME) return null;
  if (p.includes("?") && !/\{[^/{}]*\?\}/.test(p)) return null;
  if (p.includes("#")) return null;
  p = collapseParams(p);
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (!isSafeTemplate(p)) return null;
  return p;
}
function routeLabel(method, path) {
  const m = typeof method === "string" ? method.trim().toUpperCase() : "";
  if (!HTTP_METHODS.has(m)) return null;
  const p = safePathTemplate(path);
  if (p === null) return null;
  const label = `${m} ${p}`;
  if (label.length > MAX_PART_NAME) return null;
  if (transmitLabelHasPII(label) !== null) return null;
  return label;
}
function normalizeDeclaredLabel(raw) {
  const s = raw.trim();
  if (s.length === 0) return null;
  const space = s.indexOf(" ");
  if (space > 0) {
    return routeLabel(s.slice(0, space), s.slice(space + 1));
  }
  return routeLabel("GET", s);
}
const UNSUPPORTED = { status: "unsupported", labels: [] };
function unreadable(source) {
  return { status: "unreadable", source, labels: [] };
}
function isDict(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asHolder(v) {
  if (typeof v === "function") return v;
  return isDict(v) ? v : null;
}
function readFrameworkRoutes(app) {
  if (app === null || typeof app !== "object" && typeof app !== "function") {
    return UNSUPPORTED;
  }
  try {
    const a = app;
    if (typeof a.table === "function" && typeof a.route === "function") {
      return readHapi(a);
    }
    if (typeof a.printRoutes === "function" && typeof a.addHook === "function" && typeof a.route === "function") {
      return readFastify(a);
    }
    if (looksLikeExpressApp(a)) return readExpress(a);
    if (Array.isArray(a.middleware) && typeof a.use === "function") {
      return readKoa(a.middleware);
    }
    return UNSUPPORTED;
  } catch {
    return { status: "unreadable", labels: [] };
  }
}
function readHapi(app) {
  const table = app.table();
  if (!Array.isArray(table)) return unreadable("hapi");
  const labels = [];
  for (const raw of table) {
    if (!isDict(raw)) return unreadable("hapi");
    const method = raw.method;
    const path = raw.path;
    if (typeof method !== "string" || typeof path !== "string") {
      return unreadable("hapi");
    }
    const label = routeLabel(method, path);
    if (label) labels.push(label);
  }
  return { status: "read", source: "hapi", labels: dropAutoHead(labels) };
}
const FASTIFY_LINE_RE = /^((?:(?:│|\s)\s{3})*)(?:├|└)── (\S*)(?: \(([A-Za-z, ]+)\))?$/;
function readFastify(app) {
  const printed = app.printRoutes({ commonPrefix: false, includeMeta: false, includeHooks: false });
  if (typeof printed !== "string") return unreadable("fastify");
  const labels = [];
  const pathAtDepth = [];
  for (const rawLine of printed.split("\n")) {
    if (rawLine.trim().length === 0) continue;
    const m = FASTIFY_LINE_RE.exec(rawLine);
    if (!m) return unreadable("fastify");
    const depth = m[1].length / 4;
    if (!Number.isInteger(depth) || depth > pathAtDepth.length) {
      return unreadable("fastify");
    }
    const whole = (depth === 0 ? "" : pathAtDepth[depth - 1]) + m[2];
    pathAtDepth[depth] = whole;
    pathAtDepth.length = depth + 1;
    if (m[3] === void 0) continue;
    for (const method of m[3].split(",")) {
      const label = routeLabel(method, whole);
      if (label) labels.push(label);
    }
  }
  return { status: "read", source: "fastify", labels: dropAutoHead(labels) };
}
function looksLikeExpressApp(app) {
  return typeof app.use === "function" && typeof app.handle === "function" && typeof app.set === "function" && typeof app.listen === "function" && isDict(app.settings);
}
function expressRouterOf(app) {
  for (const key of ["_router", "router"]) {
    let r;
    try {
      r = app[key];
    } catch {
      continue;
    }
    const holder = asHolder(r);
    if (holder && Array.isArray(holder.stack)) return holder;
  }
  return null;
}
function readExpress(app) {
  const router = expressRouterOf(app);
  if (!router) return { status: "read", source: "express", labels: [] };
  const labels = [];
  const ok = walkExpressStack(router.stack, "", labels, 0);
  if (!ok) return unreadable("express");
  return { status: "read", source: "express", labels: dropAutoHead(labels) };
}
function walkExpressStack(stack, prefix, out, depth) {
  if (depth > 10) return false;
  for (const rawLayer of stack) {
    if (!isDict(rawLayer)) return false;
    const route = rawLayer.route;
    if (isDict(route)) {
      if (!collectExpressRoute(route, prefix, out)) return false;
      continue;
    }
    const nested = nestedExpressStack(rawLayer);
    if (nested) {
      const mount = expressMountPrefix(rawLayer);
      if (mount === null) return false;
      if (!walkExpressStack(nested, `${prefix}${mount}`, out, depth + 1)) {
        return false;
      }
      continue;
    }
    if (rawLayer.name === "mounted_app") return false;
    if (typeof rawLayer.handle === "function") continue;
    return false;
  }
  return true;
}
function collectExpressRoute(route, prefix, out) {
  const paths = Array.isArray(route.path) ? route.path : [route.path];
  const methods = route.methods;
  if (!isDict(methods)) return false;
  for (const p of paths) {
    if (typeof p !== "string") return false;
    for (const [method, on] of Object.entries(methods)) {
      if (on !== true) continue;
      if (method === "_all") continue;
      const label = routeLabel(method, joinPath(prefix, p));
      if (label) out.push(label);
    }
  }
  return true;
}
function nestedExpressStack(layer) {
  const h = asHolder(layer.handle);
  if (!h) return null;
  if (Array.isArray(h.stack)) return h.stack;
  if (looksLikeExpressApp(h)) {
    const sub = expressRouterOf(h);
    return sub ? sub.stack : [];
  }
  return null;
}
function expressMountPrefix(layer) {
  const re = layer.regexp;
  if (re === void 0 || re === null) return null;
  if (isDict(re) && re.fast_slash === true) return "";
  if (!(re instanceof RegExp)) {
    return null;
  }
  if (re.fast_slash === true) return "";
  let src = re.source;
  if (!src.startsWith("^")) return null;
  src = src.slice(1);
  const tail = "\\/?(?=\\/|$)";
  if (!src.endsWith(tail)) return null;
  src = src.slice(0, -tail.length);
  src = src.replace(/\(\?:\\\/\(\[\^\\?\/\]\+\?\)\)/g, "/:id").replace(/\(\?:\(\[\^\\?\/\]\+\?\)\)/g, ":id").replace(/\(\[\^\\?\/\]\+\?\)/g, ":id");
  src = src.replace(/\\\//g, "/");
  if (src.length === 0) return "";
  if (!src.startsWith("/")) return null;
  if (/[\\()[\]{}|+*?^$]/.test(src)) return null;
  if (!SAFE_TEMPLATE_RE.test(src)) return null;
  return src.length > 1 && src.endsWith("/") ? src.slice(0, -1) : src;
}
function joinPath(prefix, path) {
  if (!prefix) return path;
  if (path === "/" || path === "") return prefix;
  return `${prefix}${path.startsWith("/") ? "" : "/"}${path}`;
}
function readKoa(middleware) {
  const labels = [];
  let sawRouter = false;
  for (const mw of middleware) {
    if (typeof mw !== "function") continue;
    const router = mw.router;
    if (!isDict(router)) continue;
    sawRouter = true;
    const stack = router.stack;
    if (!Array.isArray(stack)) return unreadable("koa");
    for (const rawLayer of stack) {
      if (!isDict(rawLayer)) return unreadable("koa");
      const path = rawLayer.path;
      const methods = rawLayer.methods;
      if (typeof path !== "string" || !Array.isArray(methods)) {
        return unreadable("koa");
      }
      for (const method of methods) {
        if (typeof method !== "string") return unreadable("koa");
        const label = routeLabel(method, path);
        if (label) labels.push(label);
      }
    }
  }
  if (!sawRouter) return UNSUPPORTED;
  return { status: "read", source: "koa", labels: dropAutoHead(labels) };
}
function dropAutoHead(labels) {
  const gets = new Set(
    labels.filter((l) => l.startsWith("GET ")).map((l) => l.slice(4))
  );
  return labels.filter((l) => !(l.startsWith("HEAD ") && gets.has(l.slice(5))));
}
function routeListReport() {
  try {
    if (!routeListEnabled()) return { status: "off", entries: [], total: 0 };
    const framework = appHandle ? readFrameworkRoutes(appHandle) : UNSUPPORTED;
    const declared = declaredRoutes ?? [];
    const byLabel = /* @__PURE__ */ new Map();
    for (const label of framework.labels) byLabel.set(label, "framework");
    for (const label of declared) {
      byLabel.set(label, byLabel.has(label) ? "both" : "declared");
    }
    const all = [...byLabel.entries()].map(([label, from]) => ({ label, from }));
    all.sort((a, b) => a.label.localeCompare(b.label));
    return {
      status: framework.status,
      ...framework.source ? { source: framework.source } : {},
      entries: all.slice(0, MAX_ROUTE_LIST_ENTRIES),
      total: all.length
    };
  } catch {
    return { status: "unreadable", entries: [], total: 0 };
  }
}
function routeListForSnapshot() {
  return routeListReport();
}
export {
  MAX_PART_NAME,
  MAX_ROUTE_LIST_ENTRIES,
  ROUTE_SOURCE_WORDS,
  _resetRouteInventoryForTests,
  expressMountPrefix,
  getDeclaredRoutes,
  latinDigits,
  readFrameworkRoutes,
  readableLetters,
  registerApp,
  registerRoutes,
  routeLabel,
  routeListEnabled,
  routeListForSnapshot,
  routeListReport,
  safePathTemplate,
  warnPartNameRefusal
};
