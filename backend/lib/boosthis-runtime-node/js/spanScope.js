// @ts-nocheck
/* eslint-disable */
// Built from src/spanScope.ts so plain node can run the kit. Do not edit.
import { randomBytes } from "node:crypto";
const PARENT_HEADER = "x-boosthis-trace-parent";
const SPAN_ID_RE = /^[0-9a-f]{16}$/;
const MAX_ACTIVE_SPANS = 32;
function isValidSpanId(id) {
  return typeof id === "string" && SPAN_ID_RE.test(id);
}
function newSpanId() {
  try {
    return randomBytes(8).toString("hex");
  } catch {
    let out = "";
    for (let i = 0; i < 16; i++) {
      out += Math.floor(Math.random() * 16).toString(16);
    }
    return out;
  }
}
function sanitizeSpanId(id) {
  return isValidSpanId(id) ? id : null;
}
function adoptParentSpanId(headerValue) {
  try {
    const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    return sanitizeSpanId(raw);
  } catch {
    return null;
  }
}
const TRACE_ID_SHAPE = /^[0-9a-f]{32}$/;
const active = [];
function currentSpanId() {
  return active.length === 0 ? null : active[active.length - 1].spanId;
}
function currentAction() {
  for (let i = active.length - 1; i >= 0; i--) {
    const frame = active[i];
    if (frame.traceId !== null) {
      return { traceId: frame.traceId, spanId: frame.spanId };
    }
  }
  return null;
}
const ERROR_ACTION = /* @__PURE__ */ Symbol("boosthis.action");
function markErrorAction(err, at) {
  try {
    if (at === null) return;
    if (err === null || typeof err !== "object" && typeof err !== "function") {
      return;
    }
    if (errorAction(err) !== null) return;
    Object.defineProperty(err, ERROR_ACTION, {
      value: { traceId: at.traceId, spanId: at.spanId },
      enumerable: false,
      configurable: true,
      writable: true
    });
  } catch {
  }
}
function errorAction(err) {
  try {
    if (err === null || typeof err !== "object" && typeof err !== "function") {
      return null;
    }
    const raw = err[ERROR_ACTION];
    if (raw === null || typeof raw !== "object") return null;
    const { traceId, spanId } = raw;
    if (typeof traceId !== "string" || !TRACE_ID_SHAPE.test(traceId)) return null;
    if (!isValidSpanId(spanId)) return null;
    return { traceId, spanId };
  } catch {
    return null;
  }
}
function beginSpan(opts) {
  const explicit = opts && "parentSpanId" in opts;
  const traceId = opts?.traceId;
  return {
    spanId: newSpanId(),
    parentSpanId: explicit ? sanitizeSpanId(opts.parentSpanId) : currentSpanId(),
    traceId: typeof traceId === "string" && TRACE_ID_SHAPE.test(traceId) ? traceId : null
  };
}
function runInSpan(span, fn) {
  const pushed = active.length < MAX_ACTIVE_SPANS;
  if (pushed) {
    active.push({
      spanId: span.spanId,
      traceId: typeof span.traceId === "string" && TRACE_ID_SHAPE.test(span.traceId) ? span.traceId : null
    });
  }
  try {
    return fn();
  } finally {
    if (pushed) {
      let at = -1;
      for (let i = active.length - 1; i >= 0; i--) {
        if (active[i].spanId === span.spanId) {
          at = i;
          break;
        }
      }
      if (at !== -1) active.splice(at, 1);
    }
  }
}
const _spanScopeInternals = {
  activeCount: () => active.length,
  reset: () => {
    active.length = 0;
  }
};
export {
  MAX_ACTIVE_SPANS,
  PARENT_HEADER,
  SPAN_ID_RE,
  _spanScopeInternals,
  adoptParentSpanId,
  beginSpan,
  currentAction,
  currentSpanId,
  errorAction,
  isValidSpanId,
  markErrorAction,
  newSpanId,
  runInSpan,
  sanitizeSpanId
};
