// @ts-nocheck
/* eslint-disable */
// Built from src/projectKey.ts so plain node can run the kit. Do not edit.
import { warnProjectKeyRefused } from "./startAnnounce.js";
function noKeyRequested(env) {
  try {
    return (/* @__PURE__ */ new Set(["1", "true", "yes", "on"])).has(
      String(env.BOOSTHIS_NO_PROJECT_KEY ?? "").trim().toLowerCase()
    );
  } catch {
    return false;
  }
}
function trimmed(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
function clean(value, source) {
  const value2 = trimmed(value);
  if (value2 === null) return null;
  if (warnProjectKeyRefused(value2, source)) return null;
  return value2;
}
function maskProjectKey(value) {
  const key = trimmed(value);
  if (!key) return null;
  return key.length >= 8 ? `…${key.slice(-4)}` : "set";
}
function resolveProjectKey(explicit, env = process.env) {
  const runtime = clean(env.BOOSTHIS_PROJECT_KEY_NODE, "BOOSTHIS_PROJECT_KEY_NODE");
  const code = clean(explicit, "the key passed in code");
  const shared = clean(env.BOOSTHIS_PROJECT_KEY, "BOOSTHIS_PROJECT_KEY");
  const legacy = clean(env.BOOSTHIS_INVITE_KEY, "BOOSTHIS_INVITE_KEY") ?? clean(env.BOOSTEN_INVITE_KEY, "BOOSTEN_INVITE_KEY");
  if (runtime) {
    const replaced = code ?? shared ?? legacy;
    return {
      key: runtime,
      source: "env-runtime",
      overrodeShared: !!replaced && replaced !== runtime,
      display: maskProjectKey(runtime),
      declined: false
    };
  }
  if (code) return { key: code, source: "code", overrodeShared: false, display: maskProjectKey(code), declined: false };
  if (shared) return { key: shared, source: "env-shared", overrodeShared: false, display: maskProjectKey(shared), declined: false };
  if (legacy) return { key: legacy, source: "env-legacy", overrodeShared: false, display: maskProjectKey(legacy), declined: false };
  const declined = noKeyRequested(env);
  return { key: null, source: declined ? "declined" : "none", overrodeShared: false, display: null, declined };
}
function describeProjectKeySource(source) {
  switch (source) {
    case "env-runtime":
      return "Node key from the environment";
    case "code":
      return "key passed in code";
    case "env-shared":
      return "shared key from BOOSTHIS_PROJECT_KEY";
    case "env-legacy":
      return "shared key from BOOSTHIS_INVITE_KEY";
    case "none":
      return "no project key configured";
    case "declined":
      return "running with no project key on purpose";
  }
}
export {
  describeProjectKeySource,
  maskProjectKey,
  resolveProjectKey
};
