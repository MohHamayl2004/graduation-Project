// @ts-nocheck
/* eslint-disable */
// Built from src/uploadPause.ts so plain node can run the kit. Do not edit.
const DEFAULT_PAUSE_MS = 6e4;
const MIN_PAUSE_MS = 1e3;
const MAX_PAUSE_MS = 15 * 6e4;
const RESUME_SPREAD_MS = 2e3;
const ALLOWANCE = {
  samples: 0,
  spans: 0,
  candidates: 0,
  resolutions: 0,
  snapshots: 1,
  "job-runs": 1,
  crashes: 2
};
const SCOPES = [
  "measurements",
  "all-but-crashes",
  "everything"
];
const pausedUntilAt = [0, 0, 0];
function pauseLengthMs(value, now = Date.now()) {
  const clamp = (ms) => Math.min(MAX_PAUSE_MS, Math.max(MIN_PAUSE_MS, Math.round(ms)));
  if (typeof value !== "string") return DEFAULT_PAUSE_MS;
  const text = value.trim();
  if (/^\d+$/.test(text)) return clamp(Number(text) * 1e3);
  if (!/[A-Za-z]/.test(text)) return DEFAULT_PAUSE_MS;
  const at = Date.parse(text);
  if (Number.isFinite(at)) return clamp(at - now);
  return DEFAULT_PAUSE_MS;
}
function retryAfterOf(res) {
  try {
    const headers = res?.headers;
    const v = headers?.get?.("retry-after");
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}
function recordUploadPause(upload, retryAfter, now = Date.now()) {
  const level = ALLOWANCE[upload];
  const until = now + pauseLengthMs(retryAfter, now);
  if (pausedUntilAt[level] < until) pausedUntilAt[level] = until;
  return uploadPausedUntil(upload, now) ?? until;
}
function uploadPausedUntil(upload, now = Date.now()) {
  let until = 0;
  for (let level = ALLOWANCE[upload]; level < pausedUntilAt.length; level++) {
    if (pausedUntilAt[level] > until) until = pausedUntilAt[level];
  }
  return until > now ? until : null;
}
function getUploadPause(now = Date.now()) {
  let until = 0;
  let widest = -1;
  for (let level = 0; level < pausedUntilAt.length; level++) {
    const end = pausedUntilAt[level];
    if (end <= now) continue;
    widest = level;
    if (end > until) until = end;
  }
  return widest < 0 ? null : { until, scope: SCOPES[widest] };
}
function resumeDelayMs(upload, now = Date.now()) {
  const until = uploadPausedUntil(upload, now);
  if (until === null) return 0;
  return until - now + Math.round(Math.random() * RESUME_SPREAD_MS);
}
const LOCAL_PAUSE_STATUS_TEXT = "Boosthis paused";
const localAnswers = /* @__PURE__ */ new WeakSet();
function localPauseAnswer(until, now = Date.now()) {
  const seconds = Math.max(1, Math.ceil((until - now) / 1e3));
  const res = new Response(null, {
    status: 429,
    statusText: LOCAL_PAUSE_STATUS_TEXT,
    headers: { "Retry-After": String(seconds) }
  });
  try {
    localAnswers.add(res);
  } catch {
  }
  return res;
}
function isLocalPauseAnswer(res) {
  try {
    if (!res || typeof res !== "object") return false;
    if (localAnswers.has(res)) return true;
    const r = res;
    return r.status === 429 && r.statusText === LOCAL_PAUSE_STATUS_TEXT;
  } catch {
    return false;
  }
}
function isAskedToWait(res) {
  try {
    if (!res || typeof res !== "object") return false;
    return res.status === 429 && !isLocalPauseAnswer(res);
  } catch {
    return false;
  }
}
async function pacedUpload(upload, attempt) {
  const held = uploadPausedUntil(upload);
  if (held !== null) return localPauseAnswer(held);
  const res = await attempt();
  if (isAskedToWait(res)) {
    try {
      recordUploadPause(upload, retryAfterOf(res));
    } catch {
    }
  }
  return res;
}
function clearUploadPauses() {
  pausedUntilAt[0] = 0;
  pausedUntilAt[1] = 0;
  pausedUntilAt[2] = 0;
}
export {
  DEFAULT_PAUSE_MS,
  LOCAL_PAUSE_STATUS_TEXT,
  MAX_PAUSE_MS,
  MIN_PAUSE_MS,
  RESUME_SPREAD_MS,
  clearUploadPauses,
  getUploadPause,
  isAskedToWait,
  isLocalPauseAnswer,
  localPauseAnswer,
  pacedUpload,
  pauseLengthMs,
  recordUploadPause,
  resumeDelayMs,
  retryAfterOf,
  uploadPausedUntil
};
