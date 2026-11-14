// @ts-nocheck
/* eslint-disable */
// Built from src/proposeRule.ts so plain node can run the kit. Do not edit.
import { createHash } from "node:crypto";
import { checkNoPII } from "./no-pii.js";
import { deliverReport } from "./reportDelivery.js";
import { SCORE_THRESHOLDS } from "./thresholds.js";
const CATEGORIES = /* @__PURE__ */ new Set([
  "startup",
  "navigation",
  "interaction",
  "rendering",
  "network",
  "data",
  "memory",
  "other"
]);
function env() {
  return process.env;
}
function endpointBase() {
  const e = env();
  const raw = e.BOOSTHIS_ENDPOINT || e.BOOSTEN_ENDPOINT || "https://www.boosthis.com/api";
  return raw.replace(/\/+$/, "");
}
function inviteKey() {
  const e = env();
  const k = (e.BOOSTHIS_PROJECT_KEY || e.BOOSTHIS_INVITE_KEY || e.BOOSTEN_INVITE_KEY || "").trim();
  return k || void 0;
}
function installCreds() {
  const e = env();
  const installId = (e.BOOSTHIS_INSTALL_ID || e.BOOSTEN_INSTALL_ID || "").trim();
  const token = (e.BOOSTHIS_READ_TOKEN || e.BOOSTEN_READ_TOKEN || "").trim();
  if (!installId || !token) return null;
  return { installId, token };
}
function runtimeFromLanguage(language) {
  switch (language) {
    case "node":
      return "node";
    case "python":
      return "py";
    case "react-native":
      return "rn";
    default:
      return "node";
  }
}
function patternSignature(pattern) {
  const norm = pattern.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(norm).digest("hex");
}
function timingBucketFor(observedMs) {
  if (typeof observedMs !== "number" || !Number.isFinite(observedMs)) {
    return "warn";
  }
  const t = SCORE_THRESHOLDS.tti;
  if (observedMs <= t.good) return "good";
  if (observedMs >= t.poor) return "poor";
  return "warn";
}
function severityFor(timing) {
  if (timing === "poor") return "high";
  if (timing === "warn") return "med";
  return "low";
}
function normalizeCategory(category) {
  return category && CATEGORIES.has(category) ? category : "other";
}
function cleanText(value, maxLen) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.slice(0, maxLen);
  if (!trimmed) return void 0;
  return checkNoPII(trimmed) === null ? trimmed : void 0;
}
async function reportUnmatchedPattern(report) {
  const timingBucket = timingBucketFor(report.observedMs);
  const body = {
    runtime: runtimeFromLanguage(report.language),
    category: normalizeCategory(report.category),
    severityBucket: severityFor(timingBucket),
    timingBucket,
    signature: patternSignature(report.pattern),
    occurrences: 1
  };
  let internalHeaders;
  const creds = installCreds();
  if (creds) {
    internalHeaders = {
      "X-Boosthis-Install-Id": creds.installId,
      "X-Boosthis-Install-Token": creds.token
    };
    const rawPattern = cleanText(report.pattern, 2e3);
    if (rawPattern) body.pattern = rawPattern;
    const d = report.draft ?? {};
    if (d.proposedRuleId) {
      const id = d.proposedRuleId.slice(0, 80);
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) body.proposedRuleId = id;
    }
    const title = cleanText(d.title, 160);
    if (title) body.title = title;
    const whenToApply = cleanText(d.whenToApply, 2e3);
    if (whenToApply) body.whenToApply = whenToApply;
    const fixTemplate = cleanText(d.fixTemplate, 8e3);
    if (fixTemplate) body.fixTemplate = fixTemplate;
  }
  return deliverReport({ endpoint: endpointBase(), key: inviteKey(), body, internalHeaders });
}
const CRASH_FIX_SHAPES = [
  "missing-value-field",
  "not-a-list",
  "malformed-data",
  "index-out-of-range",
  "out-of-memory",
  "timed-out",
  "unclassified"
];
const CRASH_RULE_HELPED = ["yes", "no", "none"];
const CRASH_REF_RE = /^[A-Za-z0-9][A-Za-z0-9:._-]*$/;
const RULE_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function crashFixRefusal(r) {
  if (typeof r.crash !== "string" || r.crash.length > 128 || !CRASH_REF_RE.test(r.crash)) {
    return "crash must be a crash identity exactly as the crash read gave it";
  }
  if (typeof r.fixShape !== "string" || !CRASH_FIX_SHAPES.includes(r.fixShape)) {
    return `fix_shape must be one of: ${CRASH_FIX_SHAPES.join(", ")}`;
  }
  if (typeof r.ruleHelped !== "string" || !CRASH_RULE_HELPED.includes(r.ruleHelped)) {
    return `rule_helped must be one of: ${CRASH_RULE_HELPED.join(", ")} (none: no Boosthis rule was used)`;
  }
  if (r.ruleId !== void 0 && (typeof r.ruleId !== "string" || r.ruleId.length > 80 || !RULE_ID_RE.test(r.ruleId))) {
    return "rule_id must be a Boosthis rule id (lower-case words joined by hyphens)";
  }
  return null;
}
async function reportCrashFix(report) {
  if (crashFixRefusal(report) !== null) return { sent: false, reason: "refused" };
  const body = {
    runtime: "node",
    category: "other",
    severityBucket: "low",
    timingBucket: "good",
    signature: patternSignature(`crash-fix:${report.crash}`),
    occurrences: 1,
    crashRef: report.crash,
    fixShape: report.fixShape,
    ruleHelped: report.ruleHelped
  };
  if (report.ruleId) body.ruleId = report.ruleId;
  let internalHeaders;
  const creds = installCreds();
  if (creds) {
    internalHeaders = {
      "X-Boosthis-Install-Id": creds.installId,
      "X-Boosthis-Install-Token": creds.token
    };
    const w = report.words ?? {};
    const title = cleanText(w.title, 160);
    if (title) body.title = title;
    const whenToApply = cleanText(w.whenToApply, 2e3);
    if (whenToApply) body.whenToApply = whenToApply;
    const fixTemplate = cleanText(w.fixTemplate, 8e3);
    if (fixTemplate) body.fixTemplate = fixTemplate;
  }
  return deliverReport({ endpoint: endpointBase(), key: inviteKey(), body, internalHeaders });
}
export {
  CRASH_FIX_SHAPES,
  CRASH_RULE_HELPED,
  crashFixRefusal,
  patternSignature,
  reportCrashFix,
  reportUnmatchedPattern,
  runtimeFromLanguage,
  timingBucketFor
};
