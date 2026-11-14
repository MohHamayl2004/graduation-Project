/**
 * THE CAUSE WORDS A NODE CRASH CARRIES, decided here, on the device.
 *
 * A privacy reduction, never a verdict about the app: the error's wording is
 * read inside this process, sorted into one word from a closed list, and then
 * dropped. The wording itself never leaves the process (only the opt-in first
 * line does, in detailed mode, under its own screen). A Node TypeError covers
 * a value read from nothing, a call to something that is not a function and a
 * value of the wrong type, and only the wording tells them apart, so this is
 * the one place the difference can be decided without sending the text.
 *
 * A name the wording prints never leaves as a field of its own, in any mode.
 * A matching class and wording cannot prove V8 wrote it: the app's own code
 * can build `new TypeError(value + " is not a function")`, or throw an object
 * with that name and message, and a one-word person's name passes every shape
 * screen. So the report says only that a name was printed (`withheld`) or that
 * this wording prints none (`not-printed`). An owner who turns on Detailed
 * crash reports sees the name in the first line, under that line's own screen.
 *
 * BOOSTHIS_CRASH_CAUSE_V1 — copies of the server kits' half of the closed
 * lists in lib/api-zod/src/crashCause.ts. The server's
 * crashCauseServerKits.test.ts fails when a word here is not on them, and
 * when this file or the reporter gives a crash a code-name field.
 */

export const CRASH_MISTAKE_WIRE = [
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
  "not-recognised",
] as const;
export const CRASH_NAMED_MISTAKES = ["name-not-defined", "not-a-function", "read-from-nothing"] as const;
export const CRASH_CODE_NAME_STATES = ["withheld", "not-printed"] as const;
export const CRASH_CODE_OWNERS = ["app", "library", "framework", "runtime"] as const;
export const CRASH_DURING = ["request", "background", "startup", "outside-request"] as const;

export type CrashMistake = (typeof CRASH_MISTAKE_WIRE)[number];
export type CrashCodeNameState = (typeof CRASH_CODE_NAME_STATES)[number];
export type CrashCodeOwner = (typeof CRASH_CODE_OWNERS)[number];
export type CrashDuring = (typeof CRASH_DURING)[number];

/** The cause fields a crash report may carry. Every one is optional: an
 *  omitted field is "the kit could not tell", never a guess. */
export interface CrashCauseFields {
  mistake?: CrashMistake;
  codeNameState?: CrashCodeNameState;
  codeOwner?: CrashCodeOwner;
  during?: CrashDuring;
}

/** The web frameworks, by npm package name. A top frame inside one of these
 *  is the framework's code; inside any other package it is a library's. */
export const FRAMEWORK_PACKAGES: ReadonlySet<string> = new Set([
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
  "elysia",
]);

const TIMEOUT_CODES = new Set([
  "ETIMEDOUT",
  "ESOCKETTIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);
const REQUEST_CODES = new Set([
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
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

/** V8's own error classes: their wording is the engine's, so it is sorted. */
const ENGINE_CLASSES = new Set(["TypeError", "ReferenceError", "SyntaxError", "RangeError", "EvalError", "URIError", "AggregateError"]);

const JSON_WORDING =
  /Unexpected token .*in JSON|is not valid JSON|Unexpected end of JSON input|JSON\.parse:|in JSON at position|Unexpected non-whitespace character after JSON|Bad control character in string literal|Expected property name or '\}' in JSON|Unterminated string in JSON|Bad escaped character in JSON/i;

type Named = (typeof CRASH_NAMED_MISTAKES)[number];

/** Whether the wording printed a name, never the name (see the rule above). */
function named(mistake: Named, printed: string | undefined): CrashCauseFields {
  return { mistake, codeNameState: printed === undefined ? "not-printed" : "withheld" };
}

function field(o: unknown, key: string): unknown {
  try {
    return o !== null && (typeof o === "object" || typeof o === "function") ? (o as Record<string, unknown>)[key] : undefined;
  } catch {
    return undefined;
  }
}

/** A database driver's error, recognised by the fields each driver sets rather
 *  than by its class name (node-postgres names its class "error"). */
function isDatabaseError(error: unknown, code: string | undefined): boolean {
  if (code === undefined) return false;
  // node-postgres: a five-character SQLSTATE beside the server's own severity.
  if (/^[0-9A-Z]{5}$/.test(code) && (typeof field(error, "severity") === "string" || typeof field(error, "routine") === "string")) return true;
  // mysql2: ER_* with the server's errno; sqlite3 / better-sqlite3: SQLITE_*.
  if (/^ER_[A-Z0-9_]+$/.test(code) && typeof field(error, "errno") === "number") return true;
  return /^SQLITE_[A-Z_]+$/.test(code);
}

/**
 * The kind of mistake (and whether the wording printed a name) one thrown
 * value reads as. Never throws; reads the wording and keeps none of it.
 */
export function crashMistakeOf(error: unknown): CrashCauseFields {
  try {
    const isObject = error !== null && (typeof error === "object" || typeof error === "function");
    const rawName = field(error, "name");
    const name = typeof rawName === "string" ? rawName : "";
    const rawMessage = field(error, "message");
    const m = typeof rawMessage === "string" ? rawMessage.slice(0, 500) : "";
    const rawCode = field(error, "code");
    const code = typeof rawCode === "string" ? rawCode : undefined;
    // A thrown string, number or plain value: code threw it on purpose.
    if (!isObject || (!(error instanceof Error) && name === "" && m === "")) return { mistake: "raised-by-code" };
    if (code !== undefined) {
      if (TIMEOUT_CODES.has(code)) return { mistake: "timed-out" };
      if (REQUEST_CODES.has(code)) return { mistake: "request-failed" };
      if (code === "ERR_INVALID_ARG_TYPE") return { mistake: "wrong-type" };
      if (isDatabaseError(error, code)) return { mistake: "database-error" };
    }
    // undici's fetch: the cause holds the system code.
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
    if (ref) return named("name-not-defined", undefined);
    if (type) {
      hit = m.match(/^(.*?) is not a (?:function|constructor)\b/);
      if (hit) return named("not-a-function", hit[1]);
      // V8 prints the property KEY it evaluated, when it prints one.
      hit =
        m.match(/^Cannot (?:read|set) propert(?:ies|y) of (?:undefined|null)(?: \((?:reading|setting) ['"]([^'"]*)['"]\))?/i) ??
        m.match(/^Cannot (?:read|set) property ['"]([^'"]*)['"] of (?:undefined|null)/i);
      if (hit) return named("read-from-nothing", hit[1]);
      if (/^Cannot destructure /.test(m) && /as it is (?:undefined|null)/.test(m)) return { mistake: "read-from-nothing", codeNameState: "withheld" };
      if (/^Cannot convert undefined or null to object/.test(m)) return { mistake: "read-from-nothing", codeNameState: "not-printed" };
      if (
        / is not iterable\b/.test(m) ||
        /^Cannot mix BigInt and other types/.test(m) ||
        /^Cannot convert a (?:BigInt|Symbol) value to /.test(m) ||
        /^Do not know how to serialize a BigInt/.test(m)
      ) {
        return { mistake: "wrong-type" };
      }
    }
    if (ENGINE_CLASSES.has(name)) return { mistake: "not-recognised" };
    // A runtime refusal (ERR_HTTP_HEADERS_SENT, EACCES, EADDRINUSE, ...) is
    // the runtime stopping, not code raising: no word for it here.
    if (code !== undefined) return { mistake: "not-recognised" };
    const ctor = field(field(error, "constructor"), "name");
    if (ctor === "DOMException") return { mistake: "not-recognised" };
    // A plain Error, or a class the code defined, thrown on purpose. The
    // server's type table outranks this word for a class it knows (a database
    // or request error), so it says only what nothing else settles.
    return { mistake: "raised-by-code" };
  } catch {
    return {};
  }
}

/** The npm package a path is inside: the segment after its LAST
 *  `node_modules` (pnpm's store nests one inside another), scope kept. */
export function packageOfPath(path: string): string | null {
  const parts = path.split(/[\\/]/);
  let at = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i]!.toLowerCase() === "node_modules") {
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

/**
 * Whose code a frame is in, judged from the frame's real location, which
 * never leaves the device. `own` is the reporter's own-code judgement for the
 * same location. Undefined when the location names no code anyone wrote down
 * (`<anonymous>`, an `eval`): "could not tell", never a guess.
 */
export function codeOwnerOfPath(path: string | undefined, own: boolean, kitPath: boolean): CrashCodeOwner | undefined {
  if (path === undefined) return undefined;
  const p = path.trim();
  if (!p) return undefined;
  if (own) return "app";
  const pkg = packageOfPath(p);
  if (pkg !== null) return FRAMEWORK_PACKAGES.has(pkg) ? "framework" : "library";
  // This kit's own files: an installed package like any other.
  if (kitPath) return "library";
  if (/^(?:node:|internal[\\/]|bun:|native(?::|$))/i.test(p)) return "runtime";
  return undefined;
}

/** Is a value read back off the customer's disk one the kit could have
 *  written? Each field on its own: a bad one is dropped, the rest kept. */
export function restoredCauseFields(c: unknown): CrashCauseFields {
  const out: CrashCauseFields = {};
  const has = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === "string" && (list as readonly string[]).includes(v);
  const mistake = field(c, "mistake");
  if (has(CRASH_MISTAKE_WIRE, mistake)) out.mistake = mistake;
  if (has(CRASH_NAMED_MISTAKES, out.mistake)) {
    // A name is never sent: one read back off disk (any copy that kept one)
    // comes back as "a name was printed", never as the name.
    const state = field(c, "codeNameState");
    if (field(c, "codeName") !== undefined) out.codeNameState = "withheld";
    else if (has(CRASH_CODE_NAME_STATES, state)) out.codeNameState = state;
  }
  const owner = field(c, "codeOwner");
  if (has(CRASH_CODE_OWNERS, owner)) out.codeOwner = owner;
  const during = field(c, "during");
  if (has(CRASH_DURING, during)) out.during = during;
  return out;
}
