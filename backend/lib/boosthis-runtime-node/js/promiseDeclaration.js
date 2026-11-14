// @ts-nocheck
/* eslint-disable */
// Built from src/promiseDeclaration.ts so plain node can run the kit. Do not edit.
import { transmitLabelHasPII } from "./no-pii.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
const MAX_PROMISE_DECLARATIONS = 20;
const MAX_PROMISE_WORDING = 240;
const MAX_PROMISE_SUBJECT_LABEL = 200;
const SUBJECT_KINDS = ["route", "issue", "axis", "job"];
const METRICS = [
  "p50_ms",
  "p75_ms",
  "p95_ms",
  "occurrences",
  "rate_per_day",
  "daily_ceiling",
  "daily_flag",
  "job_runs_per_day",
  "job_failures_per_day",
  "job_typical_ms"
];
let pending = /* @__PURE__ */ new Map();
let inFlight = /* @__PURE__ */ new Map();
const acknowledged = /* @__PURE__ */ new Map();
let undeliveredRounds = 0;
function promiseIdentity(wording) {
  return wording.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function fingerprint(d) {
  return [
    promiseIdentity(d.wording),
    d.subjectKind ?? "",
    d.subjectLabel ?? "",
    d.metric ?? "",
    d.threshold === void 0 ? "" : String(d.threshold)
  ].join("|");
}
const warnedCauses = /* @__PURE__ */ new Set();
function warnOnce(cause, message) {
  if (warnedCauses.has(cause)) return;
  warnedCauses.add(cause);
  try {
    console.warn(message);
  } catch {
  }
}
function promiseRefusalMessage(wording, reason) {
  const quoted = `“${wording}”`;
  switch (reason) {
    case "cap":
      return `[boosthis] This project already holds the most promises it can (${MAX_PROMISE_DECLARATIONS}), so the promise ${quoted} declared in this app's code was NOT saved. Delete one on the project's promises page to free a slot.`;
    case "screened":
      return `[boosthis] Boosthis will not store the promise ${quoted} declared in this app's code: its wording did not pass the privacy guard, so nothing was saved. Write the promise without an address, a token or anyone's personal details in it.`;
    case "unmeasurable":
      return `[boosthis] Boosthis cannot measure the promise ${quoted} as this app's code describes it, so nothing was saved. Give subjectKind, subjectLabel, metric and threshold together or leave all four out — and check the measurement suits the subject (a load time is not something a reported problem has).`;
    case "superseded":
      return `[boosthis] The promise ${quoted} was edited or confirmed on this project's promises page, so THAT version is in force and this app's code did not overwrite it. What the code now says is recorded beside it — change it on that page if the code's wording is the one you want.`;
    default:
      return `[boosthis] Boosthis did not save the promise ${quoted} declared in this app's code. Its project page says why.`;
  }
}
function declarePromise(wording, options) {
  try {
    const words = typeof wording === "string" ? wording.trim() : "";
    if (!words) return;
    if (words.length > MAX_PROMISE_WORDING) {
      warnOnce(
        "tooLong",
        `[boosthis] A promise declared in this app's code is longer than the ${MAX_PROMISE_WORDING} characters Boosthis stores, so it was NOT sent. Shorten it to one plain sentence.`
      );
      return;
    }
    const declaration = { wording: words };
    const kind = options?.subjectKind;
    const label = typeof options?.subjectLabel === "string" ? options.subjectLabel.trim() : void 0;
    const metric = options?.metric;
    const line = options?.threshold;
    const anyGiven = kind !== void 0 || label !== void 0 && label !== "" || metric !== void 0 || line !== void 0;
    if (anyGiven) {
      if (kind === void 0 || label === void 0 || label === "" || metric === void 0 || typeof line !== "number" || !Number.isFinite(line)) {
        warnOnce(
          "partialMeasure",
          `[boosthis] The promise “${words}” declared in this app's code names only part of a measurement, so it was NOT sent. Give subjectKind, subjectLabel, metric and threshold together, or leave all four out and attach the measurement on the project's promises page.`
        );
        return;
      }
      if (!SUBJECT_KINDS.includes(kind) || !METRICS.includes(metric)) {
        warnOnce(
          "unknownMeasure",
          `[boosthis] The promise “${words}” declared in this app's code names a subject kind or measurement Boosthis does not have, so it was NOT sent. subjectKind is one of ${SUBJECT_KINDS.join(", ")}; the project's promises page lists the measurements each one takes.`
        );
        return;
      }
      if (transmitLabelHasPII(label) !== null) {
        warnOnce(
          "localLabel",
          `[boosthis] The promise “${words}” declared in this app's code names a subject that looks like it was built from a value, so it was NOT sent. Name routes, readings and jobs in code, the way /checkout and nightly-billing are written.`
        );
        return;
      }
      declaration.subjectKind = kind;
      declaration.subjectLabel = label.length > MAX_PROMISE_SUBJECT_LABEL ? label.slice(0, MAX_PROMISE_SUBJECT_LABEL) : label;
      declaration.metric = metric;
      declaration.threshold = Math.max(0, Math.round(line));
    }
    const key = promiseIdentity(words);
    if (!key) return;
    if (acknowledged.get(key) === fingerprint(declaration)) return;
    if (!pending.has(key) && !inFlight.has(key) && distinctCount() >= MAX_PROMISE_DECLARATIONS) {
      warnOnce(
        "tooMany",
        `[boosthis] This app declared more than ${MAX_PROMISE_DECLARATIONS} promises in code; “${words}” was not sent. A project holds at most ${MAX_PROMISE_DECLARATIONS} promises — declare the ones that matter.`
      );
      return;
    }
    pending.set(key, declaration);
  } catch {
  }
}
function distinctCount() {
  const keys = /* @__PURE__ */ new Set([
    ...pending.keys(),
    ...inFlight.keys(),
    ...acknowledged.keys()
  ]);
  return keys.size;
}
function hasPendingPromiseDeclarations() {
  return pending.size > 0;
}
function pendingPromiseDeclarationCount() {
  return pending.size + inFlight.size;
}
function takePromiseDeclarationsForSend() {
  if (isBoosthisDisabled()) return [];
  const sending = [];
  for (const [key, declaration] of pending) {
    if (inFlight.size >= MAX_PROMISE_DECLARATIONS) break;
    inFlight.set(key, declaration);
    sending.push(declaration);
  }
  pending = /* @__PURE__ */ new Map();
  return sending;
}
function notePromiseDeclarationOutcomes(outcomes) {
  try {
    for (const o of outcomes) {
      if (!o || typeof o.wording !== "string") continue;
      const key = promiseIdentity(o.wording);
      const asked = inFlight.get(key);
      if (asked !== void 0) acknowledged.set(key, fingerprint(asked));
      inFlight.delete(key);
      if (o.stored === true) continue;
      const reason = typeof o.reason === "string" ? o.reason : "";
      warnOnce(
        `refused:${reason || "unknown"}`,
        promiseRefusalMessage(o.wording, reason)
      );
    }
  } catch {
  }
}
function restorePromiseDeclarations(input) {
  if (inFlight.size === 0) {
    if (input.sentCount > 0) undeliveredRounds = 0;
    return;
  }
  for (const [key, declaration] of inFlight) {
    if (!pending.has(key)) pending.set(key, declaration);
  }
  inFlight = /* @__PURE__ */ new Map();
  undeliveredRounds += 1;
  const one = pending.size === 1;
  if (input.delivered && undeliveredRounds === 1) {
    warnOnce(
      "unanswered",
      `[boosthis] Boosthis accepted this app's upload but said nothing about the ${one ? "promise" : "promises"} declared in its code — ${one ? "it is" : "they are"} NOT saved yet. This usually means the Boosthis server is older than this kit; updating it fixes it, and the declaration keeps being re-sent meanwhile.`
    );
  } else if (!input.delivered && undeliveredRounds >= input.roundsBeforeWarning) {
    warnOnce(
      input.gateKind ? `undelivered:${input.gateKind}` : "undelivered",
      `[boosthis] Boosthis could not deliver the ${one ? "promise" : "promises"} this app declares in code, after ${undeliveredRounds} attempts — ${one ? "it is" : "they are"} NOT saved. ` + (input.gateSentence ?? `Check this app can reach Boosthis; the declaration keeps being re-sent.`)
    );
  }
}
function parsePromiseDeclarationOutcomes(body) {
  try {
    if (!body || typeof body !== "object") return void 0;
    const raw = body.promises;
    if (!Array.isArray(raw)) return void 0;
    const out = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const rec = entry;
      if (typeof rec.wording !== "string" || rec.wording.length === 0) continue;
      const outcome = {
        wording: rec.wording,
        stored: rec.stored === true
      };
      if (typeof rec.reason === "string") outcome.reason = rec.reason;
      out.push(outcome);
    }
    return out;
  } catch {
    return void 0;
  }
}
function clearPromiseDeclarations() {
  pending = /* @__PURE__ */ new Map();
  inFlight = /* @__PURE__ */ new Map();
  acknowledged.clear();
  undeliveredRounds = 0;
  warnedCauses.clear();
}
const _promiseDeclarationInternals = {
  pending: () => pending.size,
  inFlight: () => inFlight.size,
  acknowledged: () => acknowledged.size,
  undeliveredRounds: () => undeliveredRounds,
  reset: clearPromiseDeclarations
};
export {
  MAX_PROMISE_DECLARATIONS,
  MAX_PROMISE_SUBJECT_LABEL,
  MAX_PROMISE_WORDING,
  _promiseDeclarationInternals,
  clearPromiseDeclarations,
  declarePromise,
  hasPendingPromiseDeclarations,
  notePromiseDeclarationOutcomes,
  parsePromiseDeclarationOutcomes,
  pendingPromiseDeclarationCount,
  promiseIdentity,
  promiseRefusalMessage,
  restorePromiseDeclarations,
  takePromiseDeclarationsForSend
};
