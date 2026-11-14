// @ts-nocheck
/* eslint-disable */
// Built from src/heldOpen.ts so plain node can run the kit. Do not edit.
import { isBoosthisDisabled } from "./runtimeFlags.js";
const HELD_OPEN_CONTENT_TYPES = [
  "text/event-stream",
  "multipart/x-mixed-replace"
];
function isHeldOpenContentType(raw) {
  if (typeof raw !== "string" || raw.length === 0) return false;
  const semi = raw.indexOf(";");
  const mediaType = (semi >= 0 ? raw.slice(0, semi) : raw).trim().toLowerCase();
  if (mediaType.length === 0) return false;
  return HELD_OPEN_CONTENT_TYPES.includes(mediaType);
}
function isHeldOpenResponse(res) {
  try {
    const r = res;
    if (!r) return false;
    if (r.statusCode === 101) return true;
    if (typeof r.getHeader !== "function") return false;
    const header = r.getHeader("content-type");
    if (Array.isArray(header)) {
      return header.some((v) => isHeldOpenContentType(v));
    }
    return isHeldOpenContentType(header);
  } catch {
    return false;
  }
}
const UPGRADED = /* @__PURE__ */ Symbol.for("boosthis.heldOpen.upgraded");
function markUpgraded(req) {
  try {
    if (!req || typeof req !== "object") return;
    Object.defineProperty(req, UPGRADED, {
      value: true,
      enumerable: false,
      configurable: true,
      writable: false
    });
  } catch {
  }
}
function wasUpgraded(req) {
  try {
    if (!req || typeof req !== "object") return false;
    return req[UPGRADED] === true;
  } catch {
    return false;
  }
}
function isHeldOpenCall(req, res) {
  return wasUpgraded(req) || isHeldOpenResponse(res);
}
let heldOpenExcluded = 0;
let heldOpenWorstMs = 0;
function noteHeldOpenExcluded(durationMs) {
  if (isBoosthisDisabled()) return;
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  heldOpenExcluded++;
  const ms = Math.round(durationMs);
  if (ms > heldOpenWorstMs) heldOpenWorstMs = ms;
}
function getHeldOpenStats() {
  return { heldOpenExcluded, heldOpenWorstMs };
}
function clearHeldOpen() {
  heldOpenExcluded = 0;
  heldOpenWorstMs = 0;
}
export {
  HELD_OPEN_CONTENT_TYPES,
  clearHeldOpen,
  getHeldOpenStats,
  isHeldOpenCall,
  isHeldOpenContentType,
  isHeldOpenResponse,
  markUpgraded,
  noteHeldOpenExcluded,
  wasUpgraded
};
