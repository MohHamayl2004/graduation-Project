// @ts-nocheck
/* eslint-disable */
// Built from src/healthAxes.ts so plain node can run the kit. Do not edit.
import {
  readResilienceTail,
  RESILIENCE_MIN_MEDIAN_MS,
  RESILIENCE_MIN_TAIL_SAMPLES,
  RESILIENCE_TAIL_FLOOR_MS
} from "./thresholds.js";
import { SETTLE_FAMILIES, SETTLE_RULE } from "./settleRule.js";
import { isJudgedBudget } from "./budgets.js";
const MIN_SAMPLES_FOR_AXES = 5;
const SETTLED_FLOOR = SETTLE_FAMILIES.latencyTail.minSamples;
function ratingFor(score) {
  if (score >= 85) return "good";
  if (score >= 60) return "needs-work";
  return "poor";
}
class InvertedAxisBandError extends Error {
  good;
  poor;
  constructor(good, poor) {
    super(`${INVERTED_BAND_MESSAGE} (good=${good}, poor=${poor})`);
    this.name = "InvertedAxisBandError";
    this.good = good;
    this.poor = poor;
  }
}
const INVERTED_BAND_MESSAGE = "boosthis: inverted axis band, good must be below poor";
function linearScore(value, good, poor) {
  if (!Number.isFinite(good) || !Number.isFinite(poor) || poor <= good) {
    throw new InvertedAxisBandError(good, poor);
  }
  if (value <= good) return 100;
  if (value >= poor) return 0;
  return Math.round(100 * (poor - value) / (poor - good));
}
function clamp(n) {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}
function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
function computeCodeHealth(sum, regressions, findings) {
  if (sum.total < SETTLED_FLOOR) {
    return {
      key: "codeHealth",
      label: "Code Health",
      score: null,
      rating: "pending",
      caption: `Need ${SETTLED_FLOOR} settled samples — ${sum.total} so far.`,
      settleRule: SETTLE_RULE
    };
  }
  let poorRoutes = 0;
  let needsWorkRoutes = 0;
  for (const r of Object.values(sum.byRoute)) {
    if (r.worst_rating === "poor") poorRoutes++;
    else if (r.worst_rating === "needs-work") needsWorkRoutes++;
  }
  const regressedRoutes = regressions.length;
  const distinctKinds = new Set(findings.map((f) => f.kind)).size;
  const penaltyRoutes = Math.min(45, poorRoutes * 12 + needsWorkRoutes * 6);
  const penaltyRegress = Math.min(30, regressedRoutes * 15);
  const penaltyKinds = Math.min(25, distinctKinds * 10);
  const score = clamp(100 - penaltyRoutes - penaltyRegress - penaltyKinds);
  return {
    key: "codeHealth",
    label: "Code Health",
    score,
    rating: ratingFor(score),
    caption: `${plural(findings.length, "live rule signal")} · ${plural(poorRoutes, "poor route")} · ${plural(regressedRoutes, "regression")}`,
    settleRule: SETTLE_RULE
  };
}
function computeResilience(sum, allBudgets, regressions) {
  if (sum.total < SETTLED_FLOOR) {
    return {
      key: "resilience",
      label: "Resilience",
      score: null,
      rating: "pending",
      caption: `Need ${SETTLED_FLOOR} settled samples — ${sum.total} so far.`,
      settleRule: SETTLE_RULE
    };
  }
  const tail = readResilienceTail(sum.p50_ms, sum.p99_ms, sum.total);
  if (tail.state === "insufficient") {
    return {
      key: "resilience",
      label: "Resilience",
      score: null,
      rating: "pending",
      caption: `Need ${RESILIENCE_MIN_TAIL_SAMPLES} settled samples for a tail — ${sum.total} so far.`,
      settleRule: SETTLE_RULE
    };
  }
  if (tail.state === "unmeasurable") {
    return {
      key: "resilience",
      label: "Resilience",
      score: null,
      rating: "pending",
      caption: `Tail not judged — median under ${RESILIENCE_MIN_MEDIAN_MS}ms, too small to measure a p99/p50 ratio against (p99 ${sum.p99_ms}ms).`,
      settleRule: SETTLE_RULE
    };
  }
  const tailRatio = tail.ratio;
  const tailScore = tail.state === "flat" ? 100 : linearScore(tail.ratio, 3, 8);
  const poorRate = sum.total > 0 ? sum.poor / sum.total : 0;
  const poorRateScore = linearScore(poorRate, 0.05, 0.25);
  const routesWithBudgets = allBudgets.filter(isJudgedBudget).length;
  const terms = [
    { weight: 0.4, score: tailScore },
    { weight: 0.35, score: poorRateScore }
  ];
  let regressionCaption;
  if (routesWithBudgets > 0) {
    const regressionRatio = regressions.length / routesWithBudgets;
    terms.push({ weight: 0.25, score: linearScore(regressionRatio, 0, 0.25) });
    regressionCaption = `${plural(regressions.length, "regression")} of ${routesWithBudgets} budgeted`;
  } else {
    regressionCaption = "regressions not judged — no route carries a baseline";
  }
  const weight = terms.reduce((acc, t) => acc + t.weight, 0);
  const score = clamp(
    terms.reduce((acc, t) => acc + t.weight * t.score, 0) / weight
  );
  return {
    key: "resilience",
    label: "Resilience",
    score,
    rating: ratingFor(score),
    caption: `${tail.state === "flat" ? `tail ${sum.p99_ms}ms — every request under ${RESILIENCE_TAIL_FLOOR_MS}ms` : `tail p99/p50 ${tailRatio.toFixed(1)}×`} · ${Math.round(poorRate * 100)}% poor · ` + regressionCaption,
    settleRule: SETTLE_RULE
  };
}
function computeDashboardAxes(sum, allBudgets, regressions, findings) {
  return {
    codeHealth: computeCodeHealth(sum, regressions, findings),
    resilience: computeResilience(sum, allBudgets, regressions)
  };
}
export {
  INVERTED_BAND_MESSAGE,
  InvertedAxisBandError,
  MIN_SAMPLES_FOR_AXES,
  SETTLED_FLOOR,
  computeCodeHealth,
  computeDashboardAxes,
  computeResilience,
  linearScore,
  ratingFor
};
