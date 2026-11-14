// @ts-nocheck
/* eslint-disable */
// Built from src/rateHonesty.ts so plain node can run the kit. Do not edit.
const MAX_RATE_EXTRAPOLATION = 12;
const MIN_RATE_WINDOW_MS = 36e5 / MAX_RATE_EXTRAPOLATION;
const MIN_RATE_WINDOW_MIN = MIN_RATE_WINDOW_MS / 6e4;
const MIN_RATE_WINDOW_MS_PER_MIN = 6e4 / MAX_RATE_EXTRAPOLATION;
function rateEarnedMs(windowMs) {
  return typeof windowMs === "number" && Number.isFinite(windowMs) && windowMs >= MIN_RATE_WINDOW_MS;
}
function rateEarnedMin(windowMin) {
  return typeof windowMin === "number" && Number.isFinite(windowMin) && windowMin >= MIN_RATE_WINDOW_MIN;
}
function earnedPerHour(count, windowMs, dp = 1) {
  if (!rateEarnedMs(windowMs)) return null;
  const n = typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0;
  const p = Math.pow(10, dp);
  return Math.round(n / (windowMs / 36e5) * p) / p;
}
function earnedPerMin(count, windowMs, dp = 1) {
  if (typeof windowMs !== "number" || !Number.isFinite(windowMs) || windowMs < MIN_RATE_WINDOW_MS_PER_MIN) {
    return null;
  }
  const n = typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0;
  const p = Math.pow(10, dp);
  return Math.round(n / (windowMs / 6e4) * p) / p;
}
function windowMinOf(windowMs) {
  const ms = typeof windowMs === "number" && Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 0;
  return Math.floor(ms / 1e3) / 60;
}
function minuteText(windowMin) {
  if (windowMin < 10) return `${Math.floor(windowMin * 10) / 10}m`;
  return `${Math.round(windowMin)}m`;
}
function windowPhrase(windowMin, suffix = "observed") {
  if (typeof windowMin !== "number" || !Number.isFinite(windowMin)) {
    return `observation window not reported`;
  }
  if (windowMin < 1) return `under a minute ${suffix}`.trim();
  return `${minuteText(windowMin)} ${suffix}`.trim();
}
function overWords(windowMin) {
  if (typeof windowMin !== "number" || !Number.isFinite(windowMin)) {
    return "an unreported window";
  }
  return windowMin >= 1 ? minuteText(windowMin) : `${Math.round(windowMin * 60)}s`;
}
export {
  MAX_RATE_EXTRAPOLATION,
  MIN_RATE_WINDOW_MIN,
  MIN_RATE_WINDOW_MS,
  MIN_RATE_WINDOW_MS_PER_MIN,
  earnedPerHour,
  earnedPerMin,
  minuteText,
  overWords,
  rateEarnedMin,
  rateEarnedMs,
  windowMinOf,
  windowPhrase
};
