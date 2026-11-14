// @ts-nocheck
/* eslint-disable */
// Built from src/crashCause.ts so plain node can run the kit. Do not edit.
const CRASH_MISTAKE_WIRE = [
  "read-from-nothing",
  "name-not-defined",
  "not-a-function",
  "request-failed",
  "data-unreadable",
  "wrong-type",
  "too-deep",
  "out-of-memory",
  "timed-out",
  "database-error",
  "raised-by-code",
  "not-recognised"
];
const CRASH_NAMED_MISTAKES = ["name-not-defined", "not-a-function", "read-from-nothing"];
const CRASH_CODE_NAME_STATES = ["withheld", "not-printed"];
const CRASH_CODE_OWNERS = ["app", "library", "framework", "runtime"];
const CRASH_DURING = ["request", "background", "startup", "outside-request"];
const FRAMEWORK_PACKAGES = /* @__PURE__ */ new Set([
  "express",
  "router",
  "finalhandler",
  "fastify",
  "koa",
  "koa-router",
  "@koa/router",
  "@nestjs/core",
  "@nestjs/common",
  "@nestjs/platform-express",
  "@nestjs/platform-fastify",
  "@hapi/hapi",
  "hapi",
  "next",
  "@remix-run/node",
  "@remix-run/server-runtime",
  "@remix-run/express",
  "hono",
  "@hono/node-server",
  "restify",
  "@sveltejs/kit",
  "nuxt",
  "h3",
  "nitropack",
  "@adonisjs/core",
  "@adonisjs/http-server",
  "@feathersjs/feathers",
  "@feathersjs/express",
  "sails",
  "polka",
  "micro",
  "@trpc/server",
  "elysia"
]);
const TIMEOUT_CODES = /* @__PURE__ */ new Set([
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT"
]);
const REQUEST_CODES = /* @__PURE__ */ new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "UND_ERR_SOCKET",
  "UND_ERR_CLOSED",
  "CERT_HAS_EXPIRED",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID"
]);
const ENGINE_CLASSES = /* @__PURE__ */ new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError", "EvalError", "URIError", "AggregateError"]);
const JSON_WORDING = /Unexpected token .*in JSON|is not valid JSON|Unexpected end of JSON input|JSON\.parse:|in JSON at position|Unexpected non-whitespace character after JSON|Bad control character in string literal|Expected property name or '\}' in JSON|Unterminated string in JSON|Bad escaped character in JSON/i;
function named(mistake, printed) {
  return { mistake, codeNameState: printed === void 0 ? "not-printed" : "withheld" };
}
function field(o, key) {
  try {
    return o !== null && (typeof o === "object" || typeof o === "function") ? o[key] : void 0;
  } catch {
    return void 0;
  }
}
function isDatabaseError(error, code) {
  if (code === void 0) return false;
  if (/^[0-9A-Z]{5}$/.test(code) && (typeof field(error, "severity") === "string" || typeof field(error, "routine") === "string")) return true;
  if (/^ER_[A-Z0-9_]+$/.test(code) && typeof field(error, "errno") === "number") return true;
  return /^SQLITE_[A-Z_]+$/.test(code);
}
function crashMistakeOf(error) {
  try {
    const isObject = error !== null && (typeof error === "object" || typeof error === "function");
    const rawName = field(error, "name");
    const name = typeof rawName === "string" ? rawName : "";
    const rawMessage = field(error, "message");
    const m = typeof rawMessage === "string" ? rawMessage.slice(0, 500) : "";
    const rawCode = field(error, "code");
    const code = typeof rawCode === "string" ? rawCode : void 0;
    if (!isObject || !(error instanceof Error) && name === "" && m === "") return { mistake: "raised-by-code" };
    if (code !== void 0) {
      if (TIMEOUT_CODES.has(code)) return { mistake: "timed-out" };
      if (REQUEST_CODES.has(code)) return { mistake: "request-failed" };
      if (code === "ERR_INVALID_ARG_TYPE") return { mistake: "wrong-type" };
      if (isDatabaseError(error, code)) return { mistake: "database-error" };
    }
    if (name === "TypeError" && m === "fetch failed") {
      const causeCode = field(field(error, "cause"), "code");
      if (typeof causeCode === "string" && TIMEOUT_CODES.has(causeCode)) return { mistake: "timed-out" };
      return { mistake: "request-failed" };
    }
    if (JSON_WORDING.test(m)) return { mistake: "data-unreadable" };
    if (name === "RangeError" && /^Maximum call stack size exceeded/.test(m)) return { mistake: "too-deep" };
    if (name === "RangeError" && /^Array buffer allocation failed/.test(m)) return { mistake: "out-of-memory" };
    const ref = name === "ReferenceError";
    const type = name === "TypeError";
    let hit = m.match(/^(.*?) is not defined\b/) ?? m.match(/^Cannot access ['"]([^'"]+)['"] before initialization/);
    if (hit && ref) return named("name-not-defined", hit[1]);
    if (ref) return named("name-not-defined", void 0);
    if (type) {
      hit = m.match(/^(.*?) is not a (?:function|constructor)\b/);
      if (hit) return named("not-a-function", hit[1]);
      hit = m.match(/^Cannot (?:read|set) propert(?:ies|y) of (?:undefined|null)(?: \((?:reading|setting) ['"]([^'"]*)['"]\))?/i) ?? m.match(/^Cannot (?:read|set) property ['"]([^'"]*)['"] of (?:undefined|null)/i);
      if (hit) return named("read-from-nothing", hit[1]);
      if (/^Cannot destructure /.test(m) && /as it is (?:undefined|null)/.test(m)) return { mistake: "read-from-nothing", codeNameState: "withheld" };
      if (/^Cannot convert undefined or null to object/.test(m)) return { mistake: "read-from-nothing", codeNameState: "not-printed" };
      if (/ is not iterable\b/.test(m) || /^Cannot mix BigInt and other types/.test(m) || /^Cannot convert a (?:BigInt|Symbol) value to /.test(m) || /^Do not know how to serialize a BigInt/.test(m)) {
        return { mistake: "wrong-type" };
      }
    }
    if (ENGINE_CLASSES.has(name)) return { mistake: "not-recognised" };
    if (code !== void 0) return { mistake: "not-recognised" };
    const ctor = field(field(error, "constructor"), "name");
    if (ctor === "DOMException") return { mistake: "not-recognised" };
    return { mistake: "raised-by-code" };
  } catch {
    return {};
  }
}
function packageOfPath(path) {
  const parts = path.split(/[\\/]/);
  let at = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].toLowerCase() === "node_modules") {
      at = i;
      break;
    }
  }
  if (at < 0) return null;
  const first = parts[at + 1];
  if (!first) return null;
  if (first.startsWith("@")) {
    const second = parts[at + 2];
    return second ? `${first}/${second}`.toLowerCase() : null;
  }
  return first.toLowerCase();
}
function codeOwnerOfPath(path, own, kitPath) {
  if (path === void 0) return void 0;
  const p = path.trim();
  if (!p) return void 0;
  if (own) return "app";
  const pkg = packageOfPath(p);
  if (pkg !== null) return FRAMEWORK_PACKAGES.has(pkg) ? "framework" : "library";
  if (kitPath) return "library";
  if (/^(?:node:|internal[\\/]|bun:|native(?::|$))/i.test(p)) return "runtime";
  return void 0;
}
function restoredCauseFields(c) {
  const out = {};
  const has = (list, v) => typeof v === "string" && list.includes(v);
  const mistake = field(c, "mistake");
  if (has(CRASH_MISTAKE_WIRE, mistake)) out.mistake = mistake;
  if (has(CRASH_NAMED_MISTAKES, out.mistake)) {
    const state = field(c, "codeNameState");
    if (field(c, "codeName") !== void 0) out.codeNameState = "withheld";
    else if (has(CRASH_CODE_NAME_STATES, state)) out.codeNameState = state;
  }
  const owner = field(c, "codeOwner");
  if (has(CRASH_CODE_OWNERS, owner)) out.codeOwner = owner;
  const during = field(c, "during");
  if (has(CRASH_DURING, during)) out.during = during;
  return out;
}
export {
  CRASH_CODE_NAME_STATES,
  CRASH_CODE_OWNERS,
  CRASH_DURING,
  CRASH_MISTAKE_WIRE,
  CRASH_NAMED_MISTAKES,
  FRAMEWORK_PACKAGES,
  codeOwnerOfPath,
  crashMistakeOf,
  packageOfPath,
  restoredCauseFields
};
