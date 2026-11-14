/**
 * THE NAMES THIS SERVER ANSWERED UNDER, as one-way codes.
 *
 * A phone app of the same project may carry the trace headers only to this
 * project's OWN servers, and Boosthis must never learn a host name. So this
 * process remembers — in memory only, never on disk — the names it answered
 * real requests under, and the check-in it already makes carries one-way codes
 * of them: the first 32 hex characters of an HMAC-SHA256 of each name, keyed
 * with a key Boosthis hands this kit and never stores. A phone of the same
 * project is handed the same key and the codes, codes each destination the
 * same way, and adds the headers only on a match.
 *
 * What counts as a name this server answered under:
 *   - a request whose response COMPLETED with a status from 200 to 399 (a
 *     refusal, a failure and a client that hung up are never counted);
 *   - its own `Host` (HTTP/2 `:authority`), lowercased, with the port and one
 *     trailing dot removed;
 *   - or, only when the developer said how many proxies stand in front
 *     (`forwardedHostHops` / `BOOSTHIS_FORWARDED_HOST_HOPS`, 0 to 4, default
 *     0), the `X-Forwarded-Host` entry the outermost of them wrote: the N-th
 *     from the right. A chain shorter than N counts nothing for that request,
 *     so a header the caller wrote can never add a name. `Forwarded` is never
 *     read.
 *   - never a name without a dot, a number in any form, a name under an
 *     internal suffix, a provider metadata name, or anything that is not
 *     ASCII letters, digits, hyphens and dots.
 *
 * At most 32 names are remembered and the 8 answered most often are sent.
 * Nothing here is written to disk; `forget()` drops all of it.
 */
import { createHash, createHmac } from "node:crypto";
import {
  INTERNAL_SUFFIXES,
  isProviderMetadataHost,
  servedHostOf,
} from "./tracePropagation";

/** The setting that says how many proxies stand in front of this server. */
export const FORWARDED_HOST_HOPS_ENV = "BOOSTHIS_FORWARDED_HOST_HOPS";

/** The most proxies the setting may name. */
export const MAX_FORWARDED_HOST_HOPS = 4;

/** Distinct names remembered per process. */
export const MAX_TRACKED_SERVED_HOSTS = 32;

/** Codes sent per check-in: the names answered most often. */
export const MAX_SENT_SERVED_HOST_CODES = 8;

/** An early check-in (a new name, or a new key) runs at most this often. */
export const SERVED_HOST_EARLY_GAP_MS = 60_000;

/** A short wait before the first early check-in, so a burst of first
 *  requests is carried by one check-in rather than one each. */
const EARLY_SETTLE_MS = 5_000;

const KEY_RE = /^[0-9a-f]{32}$/;

/** name → times answered in this process. Insertion order breaks ties. */
const answered = new Map<string, number>();

let optionHops: number | null | undefined; // undefined: never set
let envHops: number | null = null; // null: not read yet
let key: string | null = null;
let keyTag: string | null = null;
let earlyCheck: (() => void) | null = null;
let earlyTimer: ReturnType<typeof setTimeout> | null = null;
let lastEarlyAt: number | null = null;

/** The proxy count from a value the developer supplied, or null when it is
 *  absent or out of range (which is read as 0, the safe direction). */
function readHops(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\s*\d+\s*$/.test(value)
        ? Number(value.trim())
        : NaN;
  if (!Number.isInteger(n) || n < 0 || n > MAX_FORWARDED_HOST_HOPS) return null;
  return n;
}

/** The `forwardedHostHops` option. It outranks the environment setting; an
 *  out-of-range value is refused and the kit reads no forwarding header. */
export function setForwardedHostHops(value: unknown): void {
  if (value === undefined) return;
  optionHops = readHops(value) ?? 0;
}

/** How many proxies stand in front of this server: 0 unless the developer
 *  said otherwise. Read from the environment once per process. Never throws. */
export function forwardedHostHops(): number {
  if (optionHops !== undefined && optionHops !== null) return optionHops;
  if (envHops === null) {
    try {
      envHops = readHops(process.env[FORWARDED_HOST_HOPS_ENV]) ?? 0;
    } catch {
      envHops = 0;
    }
  }
  return envHops;
}

/** True when every character is an ASCII letter, digit, hyphen or dot. */
function isAsciiName(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    const ok =
      (c >= 97 && c <= 122) || (c >= 48 && c <= 57) || c === 45 || c === 46;
    if (!ok) return false;
  }
  return true;
}

/** True when the last label is all digits or the name is a hex number:
 *  some resolver would read it as an address, never a name. */
function looksNumeric(name: string): boolean {
  const labels = name.split(".");
  const last = labels[labels.length - 1] ?? "";
  if (/^\d+$/.test(last)) return true;
  if (/^0x[0-9a-f]+$/.test(last)) return true;
  return false;
}

/**
 * A served name, normalised, or `""` when it is never coded: lowercased, one
 * trailing dot removed, and refused when it is not a dotted ASCII name, is a
 * number, sits under an internal suffix, is a provider metadata name, or is
 * over 253 characters.
 */
export function codableServedName(raw: unknown): string {
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

/** One header's text from a header map or a Fetch `Headers`. */
function headerText(request: unknown, name: string): string | null {
  if (request === null || typeof request !== "object") return null;
  const headers = (request as { headers?: unknown }).headers;
  if (headers === null || typeof headers !== "object") return null;
  const get = (headers as { get?: unknown }).get;
  let raw: unknown;
  if (typeof get === "function") {
    raw = (get as (n: string) => unknown).call(headers, name);
  } else {
    raw = (headers as Record<string, unknown>)[name];
  }
  if (Array.isArray(raw)) raw = raw.join(",");
  return typeof raw === "string" ? raw : null;
}

/**
 * The name this request was addressed to, normalised, or `""`.
 *
 * At 0 proxies (the default) the request's own `Host`, never a forwarding
 * header. At N, the `X-Forwarded-Host` entry the outermost trusted proxy
 * wrote: the N-th from the right. Fewer entries than N is `""` — never a
 * fall-back to an entry the caller could have written. Never throws.
 */
export function servedNameOf(request: unknown): string {
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

/**
 * Note one answered request. Only a completed answer from 200 to 399 counts.
 * A new name asks for an early check-in (at most once a minute). Never throws.
 */
export function noteServedHost(request: unknown, status: unknown): void {
  try {
    if (typeof status !== "number" || status < 200 || status > 399) return;
    const name = servedNameOf(request);
    if (name === "") return;
    const seen = answered.get(name);
    if (seen !== undefined) {
      answered.set(name, seen + 1);
      return;
    }
    if (answered.size >= MAX_TRACKED_SERVED_HOSTS) return;
    answered.set(name, 1);
    requestEarlyCheck();
  } catch {
    /* instrumentation never takes down the host */
  }
}

/** The names answered most often, at most {@link MAX_SENT_SERVED_HOST_CODES}. */
function topNames(): string[] {
  return [...answered.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SENT_SERVED_HOST_CODES)
    .map(([name]) => name);
}

/** The code for one name under one key. */
export function servedHostCode(keyText: string, name: string): string {
  return createHmac("sha256", keyText).update(name, "utf8").digest("hex").slice(0, 32);
}

/** The tag that names a key: the first 8 hex characters of its SHA-256. */
export function servedHostKeyTag(keyText: string): string {
  return createHash("sha256").update(keyText, "utf8").digest("hex").slice(0, 8);
}

/**
 * The check-in's `servedHostCodes` field: the codes under the key Boosthis
 * handed this kit, with that key's tag — or an empty list with no tag when no
 * key has arrived yet, which asks for one. Never a name.
 */
export function servedHostCodesField(): { tag: string; codes: string[] } {
  if (!key || !keyTag) return { tag: "", codes: [] };
  const keyText = key;
  return { tag: keyTag, codes: topNames().map((n) => servedHostCode(keyText, n)) };
}

/**
 * Take the key a check-in answer carried (`servedHostSalt`). A malformed value
 * is ignored. A key that differs from the one held, while names are waiting,
 * asks for an early check-in so the codes travel under it. Never throws.
 */
export function adoptServedHostSalt(value: unknown): void {
  try {
    if (typeof value !== "string" || !KEY_RE.test(value)) return;
    if (value === key) return;
    key = value;
    keyTag = servedHostKeyTag(value);
    if (answered.size > 0) requestEarlyCheck();
  } catch {
    /* never throw into the host */
  }
}

/** Wire the early check-in (the kill switch supplies it; nothing else does). */
export function setServedHostEarlyCheck(fn: (() => void) | null): void {
  earlyCheck = fn;
  if (!fn && earlyTimer) {
    clearTimeout(earlyTimer);
    earlyTimer = null;
  }
}

/** Ask for one early check-in: after a short settle the first time, then at
 *  most once a minute; requests inside the gap fold into one. */
function requestEarlyCheck(): void {
  if (!earlyCheck || earlyTimer) return;
  const now = Date.now();
  const wait =
    lastEarlyAt === null
      ? EARLY_SETTLE_MS
      : Math.max(EARLY_SETTLE_MS, lastEarlyAt + SERVED_HOST_EARLY_GAP_MS - now);
  earlyTimer = setTimeout(() => {
    earlyTimer = null;
    lastEarlyAt = Date.now();
    try {
      earlyCheck?.();
    } catch {
      /* never throw into the host */
    }
  }, wait);
  (earlyTimer as unknown as { unref?: () => void }).unref?.();
}

/** Drop every name and the key (`forget()`, and tests). */
export function forgetServedHosts(): void {
  answered.clear();
  key = null;
  keyTag = null;
  if (earlyTimer) clearTimeout(earlyTimer);
  earlyTimer = null;
  lastEarlyAt = null;
}

/** For tests: forget everything, the settings included. */
export function _resetServedHostsForTests(): void {
  forgetServedHosts();
  optionHops = undefined;
  envHops = null;
  earlyCheck = null;
}

/** For tests: how many names are remembered. */
export function _servedHostCountForTests(): number {
  return answered.size;
}
