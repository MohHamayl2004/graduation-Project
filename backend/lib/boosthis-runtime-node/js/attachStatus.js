// @ts-nocheck
/* eslint-disable */
// Built from src/attachStatus.ts so plain node can run the kit. Do not edit.
import { detectServerKind } from "./serverKind.js";
let called = false;
let attached = false;
let refusal = null;
let requestsObserved = 0;
let kitReadsServed = 0;
function cannotAttachLine(reason) {
  const cause = {
    "no-node-http": "this process has no Node HTTP server to watch (node:http is unavailable)",
    "deno-runtime": "this app is running on Deno, whose node:http compatibility Boosthis has not proved against a real app, so it is not supported yet (Bun IS supported — it runs this same kit, unchanged)",
    "edge-runtime": "this code is running on Next.js's edge runtime, which never starts a Node server — run Boosthis from the Node.js runtime instead",
    "server-dispatch-locked": "this process will not let Boosthis watch its HTTP server (the server's event dispatch cannot be replaced)"
  };
  return `[boosthis] Boosthis could not attach to this app's server: ${cause[reason]}. No request will be timed and the in-app page will not be served until this is fixed. Nor will this app register on the strength of an attach that did not happen: it cannot sit on your dashboard as a healthy install that is silently measuring nothing. If something else in this process does have readings to file, it registers and files this refusal alongside them. Nothing else about your app is affected.`;
}
function cannotAttachShort(reason) {
  switch (reason) {
    case "no-node-http":
      return "No — no Node HTTP server in this process";
    case "deno-runtime":
      return "No — this is Deno, which is not supported yet";
    case "edge-runtime":
      return "No — Next.js edge runtime, not Node";
    case "server-dispatch-locked":
      return "No — this process will not let Boosthis watch its server";
  }
}
function noteAttachOutcome(outcome) {
  called = true;
  attached = outcome.attached;
  refusal = outcome.attached ? null : outcome.reason;
}
function noteAttachedRequest() {
  requestsObserved++;
}
function noteKitReadServed() {
  kitReadsServed++;
}
function attachWasRefused() {
  return called && !attached && refusal !== null;
}
function attachState() {
  let serverKind = "unknown";
  try {
    serverKind = detectServerKind();
  } catch {
    serverKind = "unknown";
  }
  return { called, attached, reason: refusal, serverKind, requestsObserved, kitReadsServed };
}
function _resetAttachStatusForTests() {
  called = false;
  attached = false;
  refusal = null;
  requestsObserved = 0;
  kitReadsServed = 0;
}
export {
  _resetAttachStatusForTests,
  attachState,
  attachWasRefused,
  cannotAttachLine,
  cannotAttachShort,
  noteAttachOutcome,
  noteAttachedRequest,
  noteKitReadServed
};
