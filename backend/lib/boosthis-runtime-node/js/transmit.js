// @ts-nocheck
/* eslint-disable */
// Built from src/transmit.ts so plain node can run the kit. Do not edit.
import { assertNoPII, assertNoPIIInUrl, checkNoPII, PIIDetectedError } from "./no-pii.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isRuntimeInert, _isRuntimeKilledInternal } from "./killSwitch.js";
function assertNoPIIInHeaders(headers) {
  if (!headers) return;
  for (const [name, value] of Object.entries(headers)) {
    const hit = checkNoPII(value);
    if (hit !== null) {
      throw new PIIDetectedError(
        `$headers.${name}`,
        name,
        hit.matchedFragment
      );
    }
  }
}
async function doFetch(url, payload, method, headers, fetchImpl, timeoutMs, signal, keepalive) {
  const f = fetchImpl ?? fetch;
  if (keepalive && !signal) {
    return f(url, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(payload),
      keepalive: true
    });
  }
  const ctrl = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(
    () => ctrl.abort(new Error(`safeTransmit timeout after ${timeoutMs}ms`)),
    timeoutMs
  ) : null;
  if (timer && typeof timer.unref === "function") {
    timer.unref();
  }
  if (signal) {
    if (signal.aborted) ctrl.abort(signal.reason);
    else
      signal.addEventListener("abort", () => ctrl.abort(signal.reason), {
        once: true
      });
  }
  try {
    return await f(url, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
      // Only set when asked: `keepalive` is unknown to some fetch polyfills
      // and non-browser runtimes, and an unknown init key must not appear in
      // the object they inspect.
      ...keepalive ? { keepalive: true } : {}
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
const NO_SEND_STATUS_TEXTS = [
  "Boosthis inert",
  "Boosthis disabled",
  // THE END USER WITHHELD PERMISSION. A THIRD word, not a reuse of "inert":
  // a caller that cannot tell a withheld consent from a locked entitlement
  // cannot say which of the two a developer needs to act on, and only one of
  // them is a fault. Minted by the runtimes that run on an end user's own
  // device (see the web runtime's `gatedSend.ts`); listed here in both copies
  // of this file because the vocabulary is shared and `isNoSendResponse` has
  // to recognise the word wherever an answer crossed a runtime boundary.
  "Boosthis consent withheld"
];
const noSendAnswers = /* @__PURE__ */ new WeakSet();
function _noSendAnswer(statusText) {
  const res = new Response(null, { status: 204, statusText });
  try {
    noSendAnswers.add(res);
  } catch {
  }
  return res;
}
function isNoSendResponse(res) {
  try {
    if (!res || typeof res !== "object") return false;
    if (noSendAnswers.has(res)) return true;
    const statusText = res.statusText;
    if (typeof statusText !== "string") return false;
    return NO_SEND_STATUS_TEXTS.includes(statusText);
  } catch {
    return false;
  }
}
async function safeTransmit(opts) {
  assertNoPII(opts.payload);
  assertNoPIIInHeaders(opts.headers);
  assertNoPIIInUrl(opts.url);
  if (isBoosthisDisabled()) {
    return _noSendAnswer("Boosthis disabled");
  }
  return doFetch(
    opts.url,
    opts.payload,
    opts.method ?? "POST",
    opts.headers ?? {},
    opts.fetchImpl,
    opts.timeoutMs ?? 5e3,
    opts.signal,
    opts.keepalive
  );
}
async function _safeTransmitInternal(url, payload, opts = {}, authHeader, internalHeaders) {
  assertNoPII(payload);
  assertNoPIIInHeaders(opts.headers);
  assertNoPIIInUrl(url);
  if (isBoosthisDisabled() || (opts.allowWhenLocked ? _isRuntimeKilledInternal() : isRuntimeInert())) {
    return _noSendAnswer("Boosthis inert");
  }
  const headers = {
    ...opts.headers ?? {},
    ...authHeader ? { authorization: authHeader } : {},
    ...internalHeaders ?? {}
  };
  return doFetch(
    url,
    payload,
    "POST",
    headers,
    opts.fetchImpl,
    opts.timeoutMs ?? 5e3,
    opts.signal,
    opts.keepalive
  );
}
async function _safeTransmitTrustedPayload(url, payload, opts = {}) {
  assertNoPIIInHeaders(opts.headers);
  assertNoPIIInUrl(url);
  if (isBoosthisDisabled()) {
    return _noSendAnswer("Boosthis disabled");
  }
  return doFetch(
    url,
    payload,
    "POST",
    opts.headers ?? {},
    opts.fetchImpl,
    opts.timeoutMs ?? 5e3,
    opts.signal,
    opts.keepalive
  );
}
export {
  NO_SEND_STATUS_TEXTS,
  _noSendAnswer,
  _safeTransmitInternal,
  _safeTransmitTrustedPayload,
  isNoSendResponse,
  safeTransmit
};
