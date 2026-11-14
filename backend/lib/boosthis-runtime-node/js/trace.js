// @ts-nocheck
/* eslint-disable */
// Built from src/trace.ts so plain node can run the kit. Do not edit.
import { randomBytes } from "node:crypto";
import { PARENT_HEADER, sanitizeSpanId } from "./spanScope.js";
const TRACE_HEADER = "x-boosthis-trace";
const TRACE_ID_RE = /^[0-9a-f]{32}$/;
function isValidTraceId(id) {
  return typeof id === "string" && TRACE_ID_RE.test(id);
}
function newTraceId() {
  try {
    return randomBytes(16).toString("hex");
  } catch {
    let out = "";
    for (let i = 0; i < 32; i++) {
      out += Math.floor(Math.random() * 16).toString(16);
    }
    return out;
  }
}
function sanitizeTraceId(id) {
  return isValidTraceId(id) ? id : newTraceId();
}
function adoptTraceId(headerValue) {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return sanitizeTraceId(raw);
}
function traceHeaders(id) {
  return { [TRACE_HEADER]: sanitizeTraceId(id) };
}
const ELAPSED_HEADER = "x-boosthis-trace-elapsed";
const TRACE_ELAPSED_RE = /^\d{1,6}$/;
const MAX_TRACE_ELAPSED_MS = 6e5;
function sanitizeTraceElapsed(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === "string" && TRACE_ELAPSED_RE.test(raw)) {
    return Math.min(MAX_TRACE_ELAPSED_MS, parseInt(raw, 10));
  }
  return 0;
}
function getTraceId(req) {
  try {
    if (isValidTraceId(req.boosthisTraceId)) return req.boosthisTraceId;
    return adoptTraceId(req.headers?.[TRACE_HEADER]);
  } catch {
    return newTraceId();
  }
}
function getTraceElapsed(req) {
  try {
    const base = typeof req.boosthisTraceElapsedBase === "number" && Number.isFinite(req.boosthisTraceElapsedBase) ? Math.max(0, req.boosthisTraceElapsedBase) : sanitizeTraceElapsed(req.headers?.[ELAPSED_HEADER]);
    const sinceStart = typeof req.boosthisTraceStart === "number" && Number.isFinite(req.boosthisTraceStart) ? Math.max(0, performance.now() - req.boosthisTraceStart) : 0;
    return Math.max(
      0,
      Math.min(MAX_TRACE_ELAPSED_MS, Math.round(base + sinceStart))
    );
  } catch {
    return 0;
  }
}
function getSpanId(req) {
  try {
    return sanitizeSpanId(req.boosthisSpanId);
  } catch {
    return null;
  }
}
function forwardTraceHeaders(req) {
  const headers = {
    [TRACE_HEADER]: getTraceId(req),
    [ELAPSED_HEADER]: String(getTraceElapsed(req))
  };
  const spanId = getSpanId(req);
  if (spanId !== null) headers[PARENT_HEADER] = spanId;
  return headers;
}
export {
  ELAPSED_HEADER,
  MAX_TRACE_ELAPSED_MS,
  TRACE_ELAPSED_RE,
  TRACE_HEADER,
  TRACE_ID_RE,
  adoptTraceId,
  forwardTraceHeaders,
  getSpanId,
  getTraceElapsed,
  getTraceId,
  isValidTraceId,
  newTraceId,
  sanitizeTraceElapsed,
  sanitizeTraceId,
  traceHeaders
};
