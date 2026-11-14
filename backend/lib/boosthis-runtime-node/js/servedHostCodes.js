// @ts-nocheck
/* eslint-disable */
// Built from src/servedHostCodes.ts so plain node can run the kit. Do not edit.
import { createHash, createHmac } from "node:crypto";
import {
  INTERNAL_SUFFIXES,
  isProviderMetadataHost,
  servedHostOf
} from "./tracePropagation.js";
const FORWARDED_HOST_HOPS_ENV = "BOOSTHIS_FORWARDED_HOST_HOPS";
const MAX_FORWARDED_HOST_HOPS = 4;
const MAX_TRACKED_SERVED_HOSTS = 32;
const MAX_SENT_SERVED_HOST_CODES = 8;
const SERVED_HOST_EARLY_GAP_MS = 6e4;
const EARLY_SETTLE_MS = 5e3;
const KEY_RE = /^[0-9a-f]{32}$/;
const answered = /* @__PURE__ */ new Map();
let optionHops;
let envHops = null;
let key = null;
let keyTag = null;
let earlyCheck = null;
let earlyTimer = null;
let lastEarlyAt = null;
function readHops(value) {
  if (value === void 0 || value === null || value === "") return null;
  const n = typeof value === "number" ? value : typeof value === "string" && /^\s*\d+\s*$/.test(value) ? Number(value.trim()) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_FORWARDED_HOST_HOPS) return null;
  return n;
}
function setForwardedHostHops(value) {
  if (value === void 0) return;
  optionHops = readHops(value) ?? 0;
}
function forwardedHostHops() {
  if (optionHops !== void 0 && optionHops !== null) return optionHops;
  if (envHops === null) {
    try {
      envHops = readHops(process.env[FORWARDED_HOST_HOPS_ENV]) ?? 0;
    } catch {
      envHops = 0;
    }
  }
  return envHops;
}
function isAsciiName(text) {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const ok = c >= 97 && c <= 122 || c >= 48 && c <= 57 || c === 45 || c === 46;
    if (!ok) return false;
  }
  return true;
}
function looksNumeric(name) {
  const labels = name.split(".");
  const last = labels[labels.length - 1] ?? "";
  if (/^\d+$/.test(last)) return true;
  if (/^0x[0-9a-f]+$/.test(last)) return true;
  return false;
}
function codableServedName(raw) {
  if (typeof raw !== "string") return "";
  let name = raw.trim().toLowerCase();
  if (name.endsWith(".")) name = name.slice(0, -1);
  if (name.length === 0 || name.length > 253) return "";
  if (!isAsciiName(name)) return "";
  if (!name.includes(".")) return "";
  if (name.startsWith(".") || name.includes("..")) return "";
  for (const label of name.split(".")) {
    if (label.length === 0 || label.length > 63) return "";
    if (label.startsWith("-") || label.endsWith("-")) return "";
  }
  if (looksNumeric(name)) return "";
  if (isProviderMetadataHost(name)) return "";
  for (const suffix of INTERNAL_SUFFIXES) {
    if (name === suffix || name.endsWith(`.${suffix}`)) return "";
  }
  return name;
}
function headerText(request, name) {
  if (request === null || typeof request !== "object") return null;
  const headers = request.headers;
  if (headers === null || typeof headers !== "object") return null;
  const get = headers.get;
  let raw;
  if (typeof get === "function") {
    raw = get.call(headers, name);
  } else {
    raw = headers[name];
  }
  if (Array.isArray(raw)) raw = raw.join(",");
  return typeof raw === "string" ? raw : null;
}
function servedNameOf(request) {
  try {
    const hops = forwardedHostHops();
    if (hops === 0) return codableServedName(servedHostOf(request));
    const text = headerText(request, "x-forwarded-host");
    if (text === null || text.length > 2048) return "";
    const entries = text.split(",").map((e) => e.trim());
    if (entries.length < hops) return "";
    const entry = entries[entries.length - hops] ?? "";
    if (entry.startsWith("[")) return "";
    const colon = entry.indexOf(":");
    let host = entry;
    if (colon >= 0) {
      if (!/^\d+$/.test(entry.slice(colon + 1))) return "";
      host = entry.slice(0, colon);
    }
    return codableServedName(host);
  } catch {
    return "";
  }
}
function noteServedHost(request, status) {
  try {
    if (typeof status !== "number" || status < 200 || status > 399) return;
    const name = servedNameOf(request);
    if (name === "") return;
    const seen = answered.get(name);
    if (seen !== void 0) {
      answered.set(name, seen + 1);
      return;
    }
    if (answered.size >= MAX_TRACKED_SERVED_HOSTS) return;
    answered.set(name, 1);
    requestEarlyCheck();
  } catch {
  }
}
function topNames() {
  return [...answered.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_SENT_SERVED_HOST_CODES).map(([name]) => name);
}
function servedHostCode(keyText, name) {
  return createHmac("sha256", keyText).update(name, "utf8").digest("hex").slice(0, 32);
}
function servedHostKeyTag(keyText) {
  return createHash("sha256").update(keyText, "utf8").digest("hex").slice(0, 8);
}
function servedHostCodesField() {
  if (!key || !keyTag) return { tag: "", codes: [] };
  const keyText = key;
  return { tag: keyTag, codes: topNames().map((n) => servedHostCode(keyText, n)) };
}
function adoptServedHostSalt(value) {
  try {
    if (typeof value !== "string" || !KEY_RE.test(value)) return;
    if (value === key) return;
    key = value;
    keyTag = servedHostKeyTag(value);
    if (answered.size > 0) requestEarlyCheck();
  } catch {
  }
}
function setServedHostEarlyCheck(fn) {
  earlyCheck = fn;
  if (!fn && earlyTimer) {
    clearTimeout(earlyTimer);
    earlyTimer = null;
  }
}
function requestEarlyCheck() {
  if (!earlyCheck || earlyTimer) return;
  const now = Date.now();
  const wait = lastEarlyAt === null ? EARLY_SETTLE_MS : Math.max(EARLY_SETTLE_MS, lastEarlyAt + SERVED_HOST_EARLY_GAP_MS - now);
  earlyTimer = setTimeout(() => {
    earlyTimer = null;
    lastEarlyAt = Date.now();
    try {
      earlyCheck?.();
    } catch {
    }
  }, wait);
  earlyTimer.unref?.();
}
function forgetServedHosts() {
  answered.clear();
  key = null;
  keyTag = null;
  if (earlyTimer) clearTimeout(earlyTimer);
  earlyTimer = null;
  lastEarlyAt = null;
}
function _resetServedHostsForTests() {
  forgetServedHosts();
  optionHops = void 0;
  envHops = null;
  earlyCheck = null;
}
function _servedHostCountForTests() {
  return answered.size;
}
export {
  FORWARDED_HOST_HOPS_ENV,
  MAX_FORWARDED_HOST_HOPS,
  MAX_SENT_SERVED_HOST_CODES,
  MAX_TRACKED_SERVED_HOSTS,
  SERVED_HOST_EARLY_GAP_MS,
  _resetServedHostsForTests,
  _servedHostCountForTests,
  adoptServedHostSalt,
  codableServedName,
  forgetServedHosts,
  forwardedHostHops,
  noteServedHost,
  servedHostCode,
  servedHostCodesField,
  servedHostKeyTag,
  servedNameOf,
  setForwardedHostHops,
  setServedHostEarlyCheck
};
