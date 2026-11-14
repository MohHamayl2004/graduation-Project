// @ts-nocheck
/* eslint-disable */
// Built from src/loopback.ts so plain node can run the kit. Do not edit.
const LOOPBACK = /* @__PURE__ */ new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const PROXY_HEADERS = [
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
  "forwarded"
];
const LOOPBACK_V4 = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
function isLoopbackHostName(raw) {
  const h = String(raw).trim().toLowerCase().replace(/\.$/, "");
  if (h === "localhost") return true;
  if (h.endsWith(".localhost") && h.length > ".localhost".length) return true;
  const v4 = LOOPBACK_V4.exec(h);
  return !!v4 && v4.slice(1).every((o) => Number(o) <= 255);
}
function isLoopbackAuthority(raw) {
  const v = String(raw).trim();
  if (v.startsWith("[")) {
    const end = v.indexOf("]");
    if (end < 0 || !/^(?::\d*)?$/.test(v.slice(end + 1))) return false;
    return v.slice(1, end).toLowerCase() === "::1";
  }
  const parts = v.split(":");
  if (parts.length > 2) return false;
  if (parts.length === 2 && !/^\d*$/.test(parts[1])) return false;
  return isLoopbackHostName(parts[0]);
}
function isLoopbackOrigin(raw) {
  const m = /^https?:\/\/([^/?#@\s]+)$/i.exec(String(raw).trim());
  return !!m && isLoopbackAuthority(m[1]);
}
function headerValues(headers, name) {
  const v = headers[name];
  if (v === void 0) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v;
  return null;
}
function isAddressedToThisMachine(headers) {
  const host = headerValues(headers, "host");
  const authority = headerValues(headers, ":authority");
  if (host === null || authority === null) return false;
  const named = [...host, ...authority];
  if (named.length === 0 || !named.every(isLoopbackAuthority)) return false;
  const origin = headerValues(headers, "origin");
  if (origin === null || origin.length > 1) return false;
  return origin.length === 0 || isLoopbackOrigin(origin[0]);
}
function isDirectLoopback(req) {
  try {
    const ip = req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? "";
    if (!LOOPBACK.has(ip)) return false;
    const headers = req.headers ?? {};
    if (PROXY_HEADERS.some((h) => headers[h] !== void 0)) return false;
    return isAddressedToThisMachine(headers);
  } catch {
    return false;
  }
}
export {
  PROXY_HEADERS,
  isAddressedToThisMachine,
  isDirectLoopback,
  isLoopbackAuthority,
  isLoopbackHostName,
  isLoopbackOrigin
};
