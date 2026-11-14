// @ts-nocheck
/* eslint-disable */
// Built from src/reportDelivery.ts so plain node can run the kit. Do not edit.
import { readAnswerJson } from "./answerRead.js";
import { PIIDetectedError } from "./no-pii.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { _safeTransmitInternal, isNoSendResponse } from "./transmit.js";
const REPORT_STATE_PATH = "/rules/propose/state";
const REPORT_PATH = "/rules/propose";
const REPORT_STATE_TIMEOUT_MS = 5e3;
const REPORT_SEND_TIMEOUT_MS = 1e4;
const REPORT_ANSWER_MAX_BYTES = 16384;
const MINIMUM_LOCK_WAIT_SECONDS = 21600;
const MAXIMUM_LOCK_WAIT_SECONDS = 86400;
const LOCKED_403_ERRORS = [
  "invite_key_revoked",
  "plan_required",
  "account_closure_pending",
  "project_locked"
];
const ERROR_WORD = /^[a-z][a-z0-9_]{0,63}$/;
const PATTERN_SENT = "Sent for a person to review. Nothing you send becomes a rule unless a person approves it.";
const PATTERN_NOT_SENT = "Kept on this computer and not sent.";
const PATTERN_UNCONFIRMED = "Kept on this computer. It may not have reached Boosthis.";
const CRASH_FIX_SENT = "Sent for a person to review. Nothing is read back or served from it.";
const CRASH_FIX_NOT_SENT = "Not sent, and not kept on this computer.";
const CRASH_FIX_UNCONFIRMED = "Not kept on this computer. It may not have reached Boosthis.";
const REPORT_WHY = {
  locked: "Boosthis is locked for this project, so reports are not sent until it is active again.",
  "no-key": "No project key is set where this helper runs, so it cannot send reports.",
  "switched-off": "Boosthis is switched off here, so nothing is sent.",
  "privacy-guard": "The privacy check on this computer stopped it before it left.",
  "rate-limited": "Boosthis is taking too many reports from this project right now. Try again later.",
  refused: "Boosthis refused it.",
  unreachable: "Boosthis could not be reached to confirm the project is active.",
  unreadable: "Boosthis gave an answer this helper could not read.",
  unconfirmed: "Boosthis did not confirm that it arrived."
};
let lockedUntilMs = 0;
function _resetReportDeliveryForTests() {
  lockedUntilMs = 0;
}
function rememberLock(seconds) {
  const stated = seconds !== null && Number.isFinite(seconds) ? seconds : MINIMUM_LOCK_WAIT_SECONDS;
  const wait = Math.min(MAXIMUM_LOCK_WAIT_SECONDS, Math.max(MINIMUM_LOCK_WAIT_SECONDS, stated));
  lockedUntilMs = Date.now() + wait * 1e3;
}
function notSent(reason, refusedBecause) {
  return refusedBecause ? { sent: false, reason, refusedBecause } : { sent: false, reason };
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
async function post(url, payload, auth, internalHeaders, timeoutMs) {
  try {
    const res = await _safeTransmitInternal(
      url,
      payload,
      { timeoutMs, allowWhenLocked: true },
      auth,
      internalHeaders
    );
    return { kind: "answer", res };
  } catch (err) {
    return { kind: "threw", guard: err instanceof PIIDetectedError };
  }
}
async function readObject(res, timeoutMs) {
  try {
    const body = await readAnswerJson(res, { maxBytes: REPORT_ANSWER_MAX_BYTES, timeoutMs });
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}
function silenced() {
  return notSent(isBoosthisDisabled() ? "switched-off" : "locked");
}
async function refusal(res) {
  if (res.status === 402) {
    rememberLock(null);
    return notSent("locked");
  }
  if (res.status === 429) return notSent("rate-limited");
  if (res.status < 400 || res.status >= 500) return null;
  const body = await readObject(res, REPORT_STATE_TIMEOUT_MS);
  const word = body && typeof body.error === "string" && ERROR_WORD.test(body.error) ? body.error : void 0;
  if (res.status === 403 && word !== void 0 && LOCKED_403_ERRORS.includes(word)) {
    rememberLock(null);
    return notSent("locked");
  }
  return notSent("refused", word);
}
async function deliverReport(send) {
  let reportLeft = false;
  try {
    if (!send.key) return notSent("no-key");
    if (isBoosthisDisabled()) return notSent("switched-off");
    if (Date.now() < lockedUntilMs) return notSent("locked");
    const auth = `Bearer ${send.key}`;
    const asked = await post(`${send.endpoint}${REPORT_STATE_PATH}`, {}, auth, void 0, REPORT_STATE_TIMEOUT_MS);
    if (asked.kind === "threw") return notSent(asked.guard ? "privacy-guard" : "unreachable");
    if (isNoSendResponse(asked.res)) return silenced();
    if (asked.res.status !== 200) {
      const refused2 = await refusal(asked.res);
      if (refused2) return refused2;
      return notSent(asked.res.status >= 500 ? "unreachable" : "unreadable");
    }
    const state = await readObject(asked.res, REPORT_STATE_TIMEOUT_MS);
    if (state === null) return notSent("unreadable");
    if (state.state === "locked") {
      const recheck = typeof state.recheckAfterSeconds === "number" ? state.recheckAfterSeconds : null;
      rememberLock(recheck);
      return notSent("locked");
    }
    if (state.state !== "active") return notSent("unreadable");
    reportLeft = true;
    const filed = await post(
      `${send.endpoint}${REPORT_PATH}`,
      send.body,
      auth,
      send.internalHeaders,
      REPORT_SEND_TIMEOUT_MS
    );
    if (filed.kind === "threw") return notSent(filed.guard ? "privacy-guard" : "unconfirmed");
    if (isNoSendResponse(filed.res)) return silenced();
    if (filed.res.status === 202) {
      const answer = await readObject(filed.res, REPORT_SEND_TIMEOUT_MS);
      if (answer === null || answer.accepted !== true) return notSent("unconfirmed");
      const tier = answer.tier === "A" || answer.tier === "B" ? answer.tier : null;
      return { sent: true, tier };
    }
    const refused = await refusal(filed.res);
    return refused ?? notSent("unconfirmed");
  } catch {
    return notSent(reportLeft ? "unconfirmed" : "unreachable");
  }
}
function patternReply(storedAtMs, outcome) {
  if (outcome.sent) {
    return {
      ok: true,
      stored_at_ms: storedAtMs,
      sent: true,
      says: PATTERN_SENT,
      ...outcome.tier ? { tier: outcome.tier } : {}
    };
  }
  const lead = outcome.reason === "unconfirmed" ? PATTERN_UNCONFIRMED : PATTERN_NOT_SENT;
  return {
    ok: true,
    stored_at_ms: storedAtMs,
    sent: false,
    says: `${lead} ${REPORT_WHY[outcome.reason]}`,
    not_sent_reason: outcome.reason,
    ...outcome.refusedBecause ? { refused_because: outcome.refusedBecause } : {}
  };
}
function crashFixReply(outcome) {
  if (outcome.sent) {
    return {
      ok: true,
      filed: true,
      sent: true,
      says: CRASH_FIX_SENT,
      ...outcome.tier ? { tier: outcome.tier } : {}
    };
  }
  const lead = outcome.reason === "unconfirmed" ? CRASH_FIX_UNCONFIRMED : CRASH_FIX_NOT_SENT;
  return {
    ok: false,
    filed: false,
    sent: false,
    says: `${lead} ${REPORT_WHY[outcome.reason]}`,
    not_sent_reason: outcome.reason,
    ...outcome.refusedBecause ? { refused_because: outcome.refusedBecause } : {}
  };
}
export {
  CRASH_FIX_NOT_SENT,
  CRASH_FIX_SENT,
  CRASH_FIX_UNCONFIRMED,
  PATTERN_NOT_SENT,
  PATTERN_SENT,
  PATTERN_UNCONFIRMED,
  REPORT_PATH,
  REPORT_STATE_PATH,
  REPORT_WHY,
  _resetReportDeliveryForTests,
  crashFixReply,
  deliverReport,
  patternReply
};
