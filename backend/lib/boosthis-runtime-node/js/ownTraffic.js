// @ts-nocheck
/* eslint-disable */
// Built from src/ownTraffic.ts so plain node can run the kit. Do not edit.
function hostOf(target) {
  if (typeof target !== "string" || target.length === 0) return "";
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
      return new URL(target).hostname.toLowerCase();
    }
  } catch {
  }
  let s = target.trim();
  const at = s.lastIndexOf("@");
  if (at >= 0) s = s.slice(at + 1);
  s = s.split("/")[0].split("?")[0];
  s = s.split(":")[0];
  return s.toLowerCase();
}
const MAX_IGNORED_HOSTS = 16;
const ignoredHosts = /* @__PURE__ */ new Set();
function ignoreHost(target) {
  const host = hostOf(target);
  if (!host) return;
  if (ignoredHosts.has(host)) return;
  if (ignoredHosts.size >= MAX_IGNORED_HOSTS) return;
  ignoredHosts.add(host);
}
function isOwnUploadHost(host) {
  return host !== "" && ignoredHosts.has(host);
}
const APP_TRAFFIC = Object.freeze({ boosthisOutbound: "app" });
function attributeOutbound(host) {
  if (typeof host !== "string" || host === "") return null;
  if (ignoredHosts.has(host)) return null;
  return APP_TRAFFIC;
}
function attributeOutboundRequest(req) {
  if (!req) return null;
  return attributeOutbound(hostOf(req.origin));
}
function isAppTraffic(pass) {
  if (pass === APP_TRAFFIC) return true;
  return typeof pass === "object" && pass !== null && pass.boosthisOutbound === "app";
}
const _ownTrafficInternals = {
  MAX_IGNORED_HOSTS,
  reset() {
    ignoredHosts.clear();
  },
  get ignoredHostCount() {
    return ignoredHosts.size;
  }
};
export {
  _ownTrafficInternals,
  attributeOutbound,
  attributeOutboundRequest,
  hostOf,
  ignoreHost,
  isAppTraffic,
  isOwnUploadHost
};
