// @ts-nocheck
/* eslint-disable */
// Built from src/trendVerdict.ts so plain node can run the kit. Do not edit.
import { linearScore } from "./healthAxes.js";
import { REASON_TREND_INSIDE_NOISE } from "./axisReasons.js";
import { windowMinOf } from "./rateHonesty.js";
const NOISE_SIGMAS = 2;
function fitLine(pts) {
  const n = pts.length;
  if (n < 3) return null;
  const t0 = pts[0].t;
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += (p.t - t0) / 6e4;
    sy += p.v;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of pts) {
    const dx = (p.t - t0) / 6e4 - mx;
    sxx += dx * dx;
    sxy += dx * (p.v - my);
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  let ss = 0;
  for (const p of pts) {
    const x = (p.t - t0) / 6e4;
    const resid = p.v - (my + slope * (x - mx));
    ss += resid * resid;
  }
  const variance = ss / (n - 2);
  const stdErr = variance > 0 ? Math.sqrt(variance / sxx) : 0;
  if (!Number.isFinite(slope) || !Number.isFinite(stdErr)) return null;
  return { slope, stdErr };
}
function floorSeries(pts, bucketMs) {
  if (bucketMs <= 0) return [...pts];
  const t0 = pts[0].t;
  const lowest = /* @__PURE__ */ new Map();
  const reachedInto = /* @__PURE__ */ new Map();
  for (const p of pts) {
    const key = Math.floor((p.t - t0) / bucketMs);
    const cur = lowest.get(key);
    if (!cur || p.v < cur.v) lowest.set(key, p);
    reachedInto.set(key, p.t - (t0 + key * bucketMs));
  }
  const keys = [...lowest.keys()].sort((a, b) => a - b);
  const newest = keys[keys.length - 1];
  if (newest !== void 0 && keys.length > 1 && (reachedInto.get(newest) ?? 0) < bucketMs / 2) {
    lowest.delete(newest);
  }
  return [...lowest.values()].sort((a, b) => a.t - b.t);
}
function medianOf(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
const spanOf = (pts) => pts.length < 2 ? 0 : pts[pts.length - 1].t - pts[0].t;
function judgeTrend(points, opts) {
  const warmupMs = opts.warmupMs ?? 0;
  const startedAt = opts.startedAt ?? 0;
  const judged = warmupMs > 0 && startedAt > 0 ? points.filter((p) => p.t >= startedAt + warmupMs) : [...points];
  if (judged.length < opts.minSamples) return null;
  const spanMs = spanOf(judged);
  if (spanMs < opts.minSpanMs) return null;
  let fitPts = judged;
  if (opts.floorBucketMs && opts.floorBucketMs > 0) {
    const floor = floorSeries(judged, opts.floorBucketMs);
    if (floor.length < (opts.minFloorBuckets ?? 6)) return null;
    fitPts = floor;
  }
  const fit = fitLine(fitPts);
  if (!fit) return null;
  const windowMin = windowMinOf(spanMs);
  const upperPerMin = fit.slope + NOISE_SIGMAS * fit.stdErr;
  const lowerPerMin = fit.slope - NOISE_SIGMAS * fit.stdErr;
  const riseFloor = opts.riseFloor ?? 0;
  if (opts.abstainAroundZero) {
    const materialRise = fit.slope * windowMin >= riseFloor;
    if (fit.stdErr > 0 && Math.abs(fit.slope) <= fit.stdErr) {
      return verdict(fit.slope, upperPerMin, lowerPerMin, null, REASON_TREND_INSIDE_NOISE);
    }
    const score = !materialRise ? 100 : linearScore(fit.slope, opts.good, opts.poor);
    return verdict(fit.slope, upperPerMin, lowerPerMin, score, null);
  }
  if (riseFloor > 0 && upperPerMin * windowMin < riseFloor) {
    return verdict(fit.slope, upperPerMin, lowerPerMin, 100, null);
  }
  if (upperPerMin <= opts.good) {
    return verdict(fit.slope, upperPerMin, lowerPerMin, 100, null);
  }
  if (lowerPerMin >= opts.good) {
    const rise = lowerPerMin * windowMin;
    const score = riseFloor > 0 && rise < riseFloor ? 100 : linearScore(lowerPerMin, opts.good, opts.poor);
    return verdict(fit.slope, upperPerMin, lowerPerMin, score, null);
  }
  return verdict(
    fit.slope,
    upperPerMin,
    lowerPerMin,
    null,
    REASON_TREND_INSIDE_NOISE
  );
  function verdict(perMin, upper, lower, score, reasonCode) {
    return {
      perMin,
      upperPerMin: upper,
      lowerPerMin: lower,
      slopeSePerMin: fit.stdErr,
      score,
      reasonCode,
      sampleCount: judged.length,
      spanMs,
      windowMin,
      // The movement the verdict was taken against: what was established when
      // there is a climb, the most the data allows when there is not.
      rise: (score !== null && lower >= opts.good ? lower : upper) * windowMin,
      judged
    };
  }
}
const _trendVerdictInternals = {
  fitLine,
  floorSeries,
  spanOf
};
export {
  NOISE_SIGMAS,
  _trendVerdictInternals,
  judgeTrend,
  medianOf
};
