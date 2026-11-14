// @ts-nocheck
/* eslint-disable */
// Built from src/ownerLink.ts so plain node can run the kit. Do not edit.
import { isDirectLoopback } from "./loopback.js";
import { readAnswerJson } from "./answerRead.js";
import { checkNoPII, checkNoPIIInUrl } from "./no-pii.js";
import { getActiveTelemetryClient } from "./telemetry.js";
const OWNER_LINK_PARAM = "boosthis";
const OWNER_PASS_COOKIE = "boosthis_owner_pass";
const OWNER_MARKER_COOKIE = "boosthis_owner";
const PROOF_SHAPE = /^op_[0-9a-f]{64}$/;
const PASS_SHAPE = /^bp1\.([0-9a-z]{1,11})\.[0-9a-f]{32}\.[0-9a-f]{64}$/;
const PASS_MAX_AGE_S = 30 * 24 * 3600;
const CREDENTIAL_WAIT_MS = 8e3;
const CREDENTIAL_POLL_MS = 250;
const CALL_TIMEOUT_MS = 8e3;
const YES_TTL_MS = 10 * 6e4;
const NO_TTL_MS = 10 * 6e4;
const UNANSWERED_TTL_MS = 3e4;
const CACHE_MAX = 256;
const OWNER_ANSWER_MAX_BYTES = 65536;
function header(req, name) {
  const v = req.headers?.[name];
  if (Array.isArray(v)) return v.map(String).join(", ");
  return typeof v === "string" ? v : void 0;
}
function readCookie(req, name) {
  const raw = req.headers?.cookie;
  const all = Array.isArray(raw) ? raw.map(String).join("; ") : raw;
  if (typeof all !== "string" || !all) return null;
  for (const part of all.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
function splitAddress(req) {
  const raw = String(req.originalUrl ?? req.url ?? "/").split("#")[0];
  const q = raw.indexOf("?");
  return {
    path: q >= 0 ? raw.slice(0, q) : raw,
    params: new URLSearchParams(q >= 0 ? raw.slice(q + 1) : "")
  };
}
function strippedAddress(req) {
  const { path, params } = splitAddress(req);
  params.delete(OWNER_LINK_PARAM);
  const rest = params.toString();
  const safePath = path.startsWith("/") && !path.startsWith("//") && !/[\\\r\n]/.test(path) ? path : "/";
  return `${safePath}${rest ? `?${rest}` : ""}`;
}
function cookieTail(req, maxAgeS) {
  const proto = (header(req, "x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
  const secure = req.socket?.encrypted === true || proto === "https";
  return `; Path=/; Max-Age=${Math.max(0, Math.floor(maxAgeS))}; SameSite=Lax${secure ? "; Secure" : ""}`;
}
function addCookies(res, cookies) {
  const prior = res.getHeader?.("set-cookie");
  const list = Array.isArray(prior) ? prior.map(String) : prior ? [String(prior)] : [];
  res.setHeader?.("set-cookie", [...list, ...cookies]);
}
function clearOwnerCookies(req, res) {
  try {
    addCookies(res, [
      `${OWNER_PASS_COOKIE}=${cookieTail(req, 0)}; HttpOnly`,
      `${OWNER_MARKER_COOKIE}=${cookieTail(req, 0)}`
    ]);
  } catch {
  }
}
function redirect(res, location) {
  res.statusCode = 303;
  res.setHeader?.("location", location);
  res.setHeader?.("cache-control", "no-store");
  res.setHeader?.("referrer-policy", "no-referrer");
  res.setHeader?.("content-length", "0");
  res.end?.();
}
const OWNER_LINK_BLOCKED_LINE = "This owner link was not checked: the kit's own privacy check stopped the request on this device, so nothing was sent and nothing was switched on.";
function say(line) {
  try {
    console.info(`[boosthis] ${line}`);
  } catch {
  }
}
function credential() {
  if (transportForTests) return transportForTests.credential();
  const client = getActiveTelemetryClient();
  const token = client?.deleteToken ?? client?.readToken;
  if (!client || !token || !client.installId || !client.endpoint) return null;
  return { endpoint: client.endpoint, installId: client.installId, token };
}
async function waitForCredential() {
  const deadline = Date.now() + CREDENTIAL_WAIT_MS;
  for (; ; ) {
    const c = credential();
    if (c || Date.now() >= deadline) return c;
    await new Promise((r) => setTimeout(r, CREDENTIAL_POLL_MS).unref?.());
  }
}
async function ask(c, path, body) {
  const f = transportForTests?.fetch ?? (typeof fetch === "function" ? fetch : null);
  if (!f) return { kind: "unanswered" };
  const url = `${c.endpoint.replace(/\/$/, "")}${path}`;
  if (checkNoPII(body) || checkNoPIIInUrl(url)) return { kind: "blocked" };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), CALL_TIMEOUT_MS);
  timer.unref?.();
  try {
    const res = await f(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.token}` },
      body: JSON.stringify(body),
      signal: ctl.signal
    });
    if (res.status === 403) return { kind: "refused" };
    if (!res.ok) return { kind: "unanswered" };
    const parsed = await readAnswerJson(res, {
      maxBytes: OWNER_ANSWER_MAX_BYTES,
      timeoutMs: CALL_TIMEOUT_MS
    });
    if (parsed && typeof parsed === "object" && parsed.ok === true) {
      return { kind: "yes", body: parsed };
    }
    return { kind: "unanswered" };
  } catch {
    return { kind: "unanswered" };
  } finally {
    clearTimeout(timer);
  }
}
const verdicts = /* @__PURE__ */ new Map();
const inFlight = /* @__PURE__ */ new Map();
function remember(pass, verdict, ttlMs, passExpiresMs) {
  if (verdicts.size >= CACHE_MAX) {
    const oldest = verdicts.keys().next().value;
    if (oldest !== void 0) verdicts.delete(oldest);
  }
  const until = Date.now() + ttlMs;
  verdicts.set(pass, { verdict, until: verdict === "yes" ? Math.min(until, passExpiresMs) : until });
}
function passExpiry(pass) {
  const m = PASS_SHAPE.exec(pass);
  if (!m) return null;
  const ms = parseInt(m[1], 36) * 1e3;
  return Number.isSafeInteger(ms) ? ms : null;
}
function checkPass(pass) {
  const expires = passExpiry(pass);
  if (expires === null || expires <= Date.now()) return "no";
  const known = verdicts.get(pass);
  if (known && known.until > Date.now()) return known.verdict;
  const pending = inFlight.get(pass);
  if (pending) return pending;
  const c = credential();
  if (!c) return "unanswered";
  const p = ask(c, "/owner-bubble/confirm", { installId: c.installId, pass }).then((a) => {
    const v = a.kind === "yes" ? "yes" : a.kind === "refused" ? "no" : "unanswered";
    remember(pass, v, v === "yes" ? YES_TTL_MS : v === "no" ? NO_TTL_MS : UNANSWERED_TTL_MS, expires);
    return v;
  });
  inFlight.set(pass, p);
  void p.finally(() => inFlight.delete(pass));
  return p;
}
function verdictToOwner(req, res, v) {
  if (v === "no") clearOwnerCookies(req, res);
  return v === "yes";
}
function ownerFromPass(req, res) {
  const pass = readCookie(req, OWNER_PASS_COOKIE);
  if (!pass) return false;
  const v = checkPass(pass);
  return typeof v === "string" ? verdictToOwner(req, res, v) : v.then((x) => verdictToOwner(req, res, x));
}
async function redeem(req, res, proof) {
  const c = await waitForCredential();
  let cookies = [];
  if (!c) {
    say("This owner link could not be checked: this app has not registered with Boosthis yet, so nothing was switched on.");
  } else {
    const a = await ask(c, "/owner-bubble/redeem", { installId: c.installId, proof });
    const pass = a.kind === "yes" ? a.body.pass : null;
    const until = a.kind === "yes" ? Date.parse(String(a.body.passExpiresAt)) : NaN;
    if (typeof pass === "string" && PASS_SHAPE.test(pass) && Number.isFinite(until) && until > Date.now()) {
      const maxAge = Math.min(PASS_MAX_AGE_S, (until - Date.now()) / 1e3);
      cookies = [
        `${OWNER_PASS_COOKIE}=${pass}${cookieTail(req, maxAge)}; HttpOnly`,
        `${OWNER_MARKER_COOKIE}=1${cookieTail(req, maxAge)}`
      ];
      remember(pass, "yes", YES_TTL_MS, until);
    } else {
      say(
        a.kind === "refused" ? "This owner link was not accepted: it was used already, has expired or belongs to another project. Open a new one from your project's page on Boosthis." : a.kind === "blocked" ? OWNER_LINK_BLOCKED_LINE : "Boosthis could not be reached to check this owner link, so nothing was switched on."
      );
    }
  }
  try {
    if (res.headersSent !== true) {
      if (cookies.length) addCookies(res, cookies);
      redirect(res, strippedAddress(req));
    }
  } catch {
  }
  return "answered";
}
function settleOwnerRequest(req, res) {
  const method = String(req.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") {
    const raw = splitAddress(req).params.get(OWNER_LINK_PARAM);
    if (raw !== null) {
      const value = raw.trim();
      if (PROOF_SHAPE.test(value)) return redeem(req, res, value);
      const word = value.toLowerCase();
      if (word === "off") {
        const pass = readCookie(req, OWNER_PASS_COOKIE);
        if (pass) verdicts.delete(pass);
        clearOwnerCookies(req, res);
        redirect(res, strippedAddress(req));
        return "answered";
      }
      if (word === "on" && isDirectLoopback(req)) {
        addCookies(res, [`${OWNER_MARKER_COOKIE}=1${cookieTail(req, PASS_MAX_AGE_S)}`]);
        redirect(res, strippedAddress(req));
        return "answered";
      }
    }
  }
  return ownerFromPass(req, res);
}
function ownerMayHaveBubble(req, owner) {
  try {
    return owner || isDirectLoopback(req) && readCookie(req, OWNER_MARKER_COOKIE) === "1";
  } catch {
    return false;
  }
}
let transportForTests = null;
function _setOwnerLinkTransportForTests(t) {
  transportForTests = t;
}
function _resetOwnerLinkForTests() {
  verdicts.clear();
  inFlight.clear();
  transportForTests = null;
}
export {
  OWNER_LINK_PARAM,
  OWNER_MARKER_COOKIE,
  OWNER_PASS_COOKIE,
  _resetOwnerLinkForTests,
  _setOwnerLinkTransportForTests,
  clearOwnerCookies,
  ownerFromPass,
  ownerMayHaveBubble,
  readCookie,
  settleOwnerRequest
};
