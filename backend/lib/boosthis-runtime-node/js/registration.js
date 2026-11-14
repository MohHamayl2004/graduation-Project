// @ts-nocheck
/* eslint-disable */
// Built from src/registration.ts so plain node can run the kit. Do not edit.
import { answerWithin, readAnswerJson } from "./answerRead.js";
import { checkNoPIIInUrl } from "./no-pii.js";
let state = "pending";
let inFlight = false;
let lastAttemptAt = 0;
const RECHECK_MS = 3e4;
const REGISTRATION_ASK_MS = 1e4;
function setState(next) {
  if (next === state) return;
  state = next;
}
function markRegistrationConfirmed() {
  setState("registered");
}
function markRegistrationRefused() {
  setState("unregistered");
}
function markRegistrationUnreachable() {
  if (state === "registered" || state === "unregistered") return;
  setState("unreachable");
}
function markRegistrationThrottled() {
  if (state === "registered" || state === "unregistered") return;
  setState("throttled");
}
function getRegistrationState() {
  return state;
}
function getRegistrationVerdict() {
  if (state === "registered") return "registered";
  if (state === "unregistered") return "unregistered";
  return "unknown";
}
function _resetRegistrationForTests() {
  state = "pending";
  inFlight = false;
  lastAttemptAt = 0;
}
async function checkRegistrationOnce(ctx) {
  try {
    if (state === "registered" || state === "unregistered") return;
    if (inFlight) return;
    const now = ctx.nowMs ?? Date.now();
    if (lastAttemptAt !== 0 && now - lastAttemptAt < RECHECK_MS) return;
    const endpoint = ctx.endpoint;
    const installId = ctx.installId;
    if (!endpoint || !installId) {
      setState("unregistered");
      return;
    }
    if (!ctx.projectKey) {
      setState("unregistered");
      return;
    }
    const f = ctx.fetchImpl ?? (typeof fetch === "function" ? fetch : null);
    if (!f) {
      setState("unreachable");
      return;
    }
    inFlight = true;
    lastAttemptAt = now;
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const timer = setTimeout(() => ctl?.abort(), REGISTRATION_ASK_MS);
    timer.unref?.();
    try {
      const base = endpoint.replace(/\/$/, "");
      const url = `${base}/installs/${encodeURIComponent(installId)}/registration`;
      if (checkNoPIIInUrl(url)) {
        setState("unreachable");
        return;
      }
      const res = await answerWithin(
        f(url, {
          method: "GET",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${ctx.projectKey}`
          },
          ...ctl ? { signal: ctl.signal } : {}
        }),
        REGISTRATION_ASK_MS
      );
      if (res.status === 200) {
        let registered = void 0;
        try {
          const body = await readAnswerJson(res, {
            timeoutMs: REGISTRATION_ASK_MS
          });
          registered = body?.registered;
        } catch {
        }
        if (registered === true) setState("registered");
        else if (registered === false) setState("unregistered");
        else setState("unreachable");
        return;
      }
      if (res.status === 401 || res.status === 403) {
        setState("unregistered");
        return;
      }
      if (res.status === 429) {
        setState("throttled");
        return;
      }
      setState("unreachable");
    } finally {
      clearTimeout(timer);
      inFlight = false;
    }
  } catch {
    inFlight = false;
    try {
      markRegistrationUnreachable();
    } catch {
    }
  }
}
export {
  _resetRegistrationForTests,
  checkRegistrationOnce,
  getRegistrationState,
  getRegistrationVerdict,
  markRegistrationConfirmed,
  markRegistrationRefused,
  markRegistrationThrottled,
  markRegistrationUnreachable
};
