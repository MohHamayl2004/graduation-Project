// @ts-nocheck
/* eslint-disable */
// Built from src/meterAxes.ts so plain node can run the kit. Do not edit.
import { linearScore, ratingFor, MIN_SAMPLES_FOR_AXES } from "./healthAxes.js";
import { SCORE_THRESHOLDS } from "./thresholds.js";
import { REASON_NOTHING_TO_COMPARE } from "./axisReasons.js";
import { SETTLE_RULE, isSettling, markSettled, settlingReading } from "./settleRule.js";
import { earnedPerMin } from "./rateHonesty.js";
const CONFIDENCE_CUTOFFS = { medium: 5, high: 20 };
function confidenceLevel(sampleCount) {
  if (!sampleCount || sampleCount <= 0) return "none";
  if (sampleCount < CONFIDENCE_CUTOFFS.medium) return "low";
  if (sampleCount < CONFIDENCE_CUTOFFS.high) return "medium";
  return "high";
}
function confidenceRatingFor(level) {
  return level === "high" ? "good" : level === "medium" ? "needs-work" : level === "low" ? "poor" : "pending";
}
const CONFIDENCE_CAPTIONS = {
  none: "no samples yet",
  low: "few samples",
  medium: "moderate samples",
  high: "well-sampled"
};
function confidenceCaptionFor(level) {
  return CONFIDENCE_CAPTIONS[level];
}
function computeConfidence(leastScoredSamples) {
  const mounts = Math.max(0, Math.round(leastScoredSamples || 0));
  const level = confidenceLevel(mounts);
  return {
    confidence: level,
    confidenceMounts: mounts,
    confidenceRating: confidenceRatingFor(level),
    confidenceCaption: confidenceCaptionFor(level)
  };
}
const BASELINE_THRESHOLDS = { good: 1.2, poor: 2 };
const BASELINE_MIN_SAMPLES = 6;
const BASELINE_RECENT_N = 3;
const BASELINE_BASELINE_N = BASELINE_MIN_SAMPLES - BASELINE_RECENT_N;
const BASELINE_MIN_DELTA_MS = 50;
const BASELINE_ALGORITHM = "device-ring-frozen-baseline";
function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
function computeBaselineScore(series) {
  let scoredRoutes = 0;
  let unscoredRoutes = 0;
  let anomalyCount = 0;
  let worstRatio = null;
  let worstBaselineMs = null;
  let worstCurrentMs = null;
  for (const route of series) {
    const durations = route?.durations;
    const base = route?.baseline;
    if (!Array.isArray(base) || base.length < BASELINE_BASELINE_N) continue;
    if (!Array.isArray(durations) || durations.length < BASELINE_RECENT_N) {
      continue;
    }
    const recent = durations.slice(-BASELINE_RECENT_N);
    const baseMed = median(base);
    const recentMed = median(recent);
    if (baseMed <= 0) {
      unscoredRoutes++;
      continue;
    }
    scoredRoutes++;
    const ratio = recentMed / baseMed;
    const delta = recentMed - baseMed;
    if (ratio < BASELINE_THRESHOLDS.good || delta < BASELINE_MIN_DELTA_MS) {
      continue;
    }
    anomalyCount++;
    if (worstRatio === null || ratio > worstRatio) {
      worstRatio = ratio;
      worstBaselineMs = Math.round(baseMed);
      worstCurrentMs = Math.round(recentMed);
    }
  }
  if (scoredRoutes === 0) {
    return {
      score: null,
      rating: "pending",
      worstRatio: null,
      worstBaselineMs: null,
      worstCurrentMs: null,
      anomalyCount: 0,
      scoredRoutes: 0,
      unscoredRoutes,
      measurable: 0
    };
  }
  if (worstRatio === null) {
    return {
      score: 100,
      rating: "good",
      worstRatio: null,
      worstBaselineMs: null,
      worstCurrentMs: null,
      anomalyCount: 0,
      scoredRoutes,
      unscoredRoutes,
      measurable: 1
    };
  }
  const score = linearScore(
    worstRatio,
    BASELINE_THRESHOLDS.good,
    BASELINE_THRESHOLDS.poor
  );
  return {
    score,
    rating: ratingFor(score),
    worstRatio: Math.round(worstRatio * 100) / 100,
    worstBaselineMs,
    worstCurrentMs,
    anomalyCount,
    scoredRoutes,
    unscoredRoutes,
    measurable: 1
  };
}
const DECIDED_PART = {
  networkLatency: 1,
  networkStalls: 2,
  mcpLatency: 11,
  mcpErrors: 12,
  repeatedTime: 21,
  repeatedBurst: 22,
  dbWait: 31,
  dbRepeat: 32,
  rowsWorst: 41,
  rowsTypical: 42,
  aiFailures: 51,
  aiFirstWords: 52,
  headroomRequests: 61,
  headroomTokens: 62,
  jobFailures: 71,
  jobOverlaps: 72,
  jobMissed: 73,
  jobWait: 74,
  depWait: 81,
  depFailures: 82
};
const DECIDED_PART_AXIS = {
  [DECIDED_PART.networkLatency]: "network",
  [DECIDED_PART.networkStalls]: "network",
  [DECIDED_PART.mcpLatency]: "mcpTools",
  [DECIDED_PART.mcpErrors]: "mcpTools",
  [DECIDED_PART.repeatedTime]: "repeatedWork",
  [DECIDED_PART.repeatedBurst]: "repeatedWork",
  [DECIDED_PART.dbWait]: "dbWork",
  [DECIDED_PART.dbRepeat]: "dbWork",
  [DECIDED_PART.rowsWorst]: "dbRowVolume",
  [DECIDED_PART.rowsTypical]: "dbRowVolume",
  [DECIDED_PART.aiFailures]: "aiCalls",
  [DECIDED_PART.aiFirstWords]: "aiCalls",
  [DECIDED_PART.headroomRequests]: "aiHeadroom",
  [DECIDED_PART.headroomTokens]: "aiHeadroom",
  [DECIDED_PART.jobFailures]: "backgroundWork",
  [DECIDED_PART.jobOverlaps]: "backgroundWork",
  [DECIDED_PART.jobMissed]: "backgroundWork",
  [DECIDED_PART.jobWait]: "backgroundWork",
  [DECIDED_PART.depWait]: "dependencies",
  [DECIDED_PART.depFailures]: "dependencies"
};
function worstOfParts(parts) {
  let worst = null;
  for (const p of parts) {
    if (worst === null || p.score < worst.score) worst = p;
  }
  if (worst === null) return { score: 100, decided: null };
  return {
    score: worst.score,
    decided: worst.score < 100 ? {
      decidedBy: worst.code,
      decidedFigure: worst.figure,
      decidedPoorAt: worst.poorAt
    } : null
  };
}
function decidedFieldsOf(r) {
  if (!r || typeof r.decidedBy !== "number" || typeof r.decidedFigure !== "number" || typeof r.decidedPoorAt !== "number") {
    return {};
  }
  return {
    decidedBy: r.decidedBy,
    decidedFigure: r.decidedFigure,
    decidedPoorAt: r.decidedPoorAt
  };
}
const NETWORK_THRESHOLDS = {
  p75GoodMs: 800,
  p75PoorMs: 3e3,
  stallRateGood: 0.01,
  stallRatePoor: 0.1
};
const NETWORK_MIN_ATTEMPTS = 3;
function computeNetworkScore(stats) {
  if (!stats || stats.attemptCount < NETWORK_MIN_ATTEMPTS) {
    return {
      score: null,
      rating: "pending",
      stallPct: null,
      attemptCount: stats?.attemptCount ?? 0,
      failedCount: stats?.failedCount ?? 0,
      timeoutCount: stats?.timeoutCount ?? 0,
      stallCount: stats?.stallCount ?? 0,
      p75Ms: null,
      worstMs: Math.round(stats?.worstMs ?? 0)
    };
  }
  const stallRate = (stats.timeoutCount + stats.stallCount) / stats.attemptCount;
  const latencyScore = linearScore(
    stats.p75Ms,
    NETWORK_THRESHOLDS.p75GoodMs,
    NETWORK_THRESHOLDS.p75PoorMs
  );
  const stallScore = linearScore(
    stallRate,
    NETWORK_THRESHOLDS.stallRateGood,
    NETWORK_THRESHOLDS.stallRatePoor
  );
  const stallPct = Math.round(stallRate * 1e3) / 10;
  const { score, decided } = worstOfParts([
    {
      code: DECIDED_PART.networkLatency,
      score: latencyScore,
      figure: Math.round(stats.p75Ms),
      poorAt: NETWORK_THRESHOLDS.p75PoorMs
    },
    {
      code: DECIDED_PART.networkStalls,
      score: stallScore,
      figure: stallPct,
      poorAt: NETWORK_THRESHOLDS.stallRatePoor * 100
    }
  ]);
  return {
    score,
    rating: ratingFor(score),
    stallPct,
    attemptCount: stats.attemptCount,
    failedCount: stats.failedCount,
    timeoutCount: stats.timeoutCount,
    stallCount: stats.stallCount,
    p75Ms: Math.round(stats.p75Ms),
    worstMs: Math.round(stats.worstMs),
    ...decidedFieldsOf(decided)
  };
}
const IDLE_EFFICIENCY_THRESHOLDS = { good: 0.02, poor: 0.2 };
const IDLE_MIN_WALL_MS = 2e3;
function computeIdleEfficiency(stats) {
  if (!stats || stats.idleWallMs < IDLE_MIN_WALL_MS) {
    return {
      score: null,
      rating: "pending",
      idleBusyPct: null,
      idleLongTaskCount: stats?.idleLongTaskCount ?? 0
    };
  }
  const busy = stats.idleWallMs > 0 ? stats.idleCpuMs / stats.idleWallMs : 0;
  const score = linearScore(
    busy,
    IDLE_EFFICIENCY_THRESHOLDS.good,
    IDLE_EFFICIENCY_THRESHOLDS.poor
  );
  return {
    score,
    rating: ratingFor(score),
    idleBusyPct: Math.round(busy * 1e3) / 10,
    idleLongTaskCount: stats.idleLongTaskCount
  };
}
const MCP_TOOLS_THRESHOLDS = {
  errRateGood: 0.01,
  errRatePoor: 0.1
};
const MCP_TOOLS_MIN_SAMPLES = 5;
function p95Of(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[idx];
}
function computeMcpToolsScore(series) {
  let toolCount = 0;
  let sampleCount = 0;
  let errorCount = 0;
  let worstMs = null;
  for (const tool of series) {
    const durations = tool?.durations;
    if (!Array.isArray(durations) || durations.length < MCP_TOOLS_MIN_SAMPLES) {
      continue;
    }
    toolCount++;
    sampleCount += durations.length;
    errorCount += Math.max(0, Math.round(tool.errorCount || 0));
    const p95 = p95Of(durations);
    if (worstMs === null || p95 > worstMs) worstMs = p95;
  }
  if (toolCount === 0 || worstMs === null) {
    return {
      score: null,
      rating: "pending",
      worstMs: null,
      toolCount: 0,
      errorPct: null,
      sampleCount: 0
    };
  }
  const latencyScore = linearScore(
    worstMs,
    SCORE_THRESHOLDS.tti.good,
    SCORE_THRESHOLDS.tti.poor
  );
  const errRate = sampleCount > 0 ? errorCount / sampleCount : 0;
  const errScore = linearScore(
    errRate,
    MCP_TOOLS_THRESHOLDS.errRateGood,
    MCP_TOOLS_THRESHOLDS.errRatePoor
  );
  const errorPct = Math.round(errRate * 1e3) / 10;
  const { score, decided } = worstOfParts([
    {
      code: DECIDED_PART.mcpLatency,
      score: latencyScore,
      figure: Math.round(worstMs),
      poorAt: SCORE_THRESHOLDS.tti.poor
    },
    {
      code: DECIDED_PART.mcpErrors,
      score: errScore,
      figure: errorPct,
      poorAt: MCP_TOOLS_THRESHOLDS.errRatePoor * 100
    }
  ]);
  return {
    score,
    rating: ratingFor(score),
    worstMs: Math.round(worstMs),
    toolCount,
    errorPct,
    sampleCount,
    ...decidedFieldsOf(decided)
  };
}
const LATENCY_FLOOR_WINDOW_MS = 1e4;
const LATENCY_FLOOR_MIN_WINDOWS = 3;
const LATENCY_FLOOR_GOOD_MS = 200;
const LATENCY_FLOOR_POOR_MS = 1e3;
function computeLatencyFloor(stats) {
  if (!stats || stats.windowCount < LATENCY_FLOOR_MIN_WINDOWS) {
    return {
      score: null,
      rating: "pending",
      worstMs: null,
      windowCount: stats?.windowCount ?? 0
    };
  }
  const worst = Math.max(0, Math.round(stats.worstMs));
  const score = linearScore(
    worst,
    LATENCY_FLOOR_GOOD_MS,
    LATENCY_FLOOR_POOR_MS
  );
  return {
    score,
    rating: ratingFor(score),
    worstMs: worst,
    windowCount: stats.windowCount
  };
}
const REPEATED_WORK_TIME_PCT_THRESHOLDS = { good: 1, poor: 20 };
const REPEATED_WORK_BURST_THRESHOLDS = { good: 1, poor: 10 };
const REPEATED_WORK_MIN_REQUESTS = MIN_SAMPLES_FOR_AXES;
function computeRepeatedWork(stats) {
  if (!stats || stats.watchedRequests < REPEATED_WORK_MIN_REQUESTS) {
    return {
      score: null,
      rating: "pending",
      worstRepeats: null,
      requestsWithRepeat: stats?.requestsWithRepeat ?? 0,
      watchedRequests: stats?.watchedRequests ?? 0,
      repeatTimePct: 0
    };
  }
  const pct = stats.watchedRequestMs > 0 ? stats.redundantMs / stats.watchedRequestMs * 100 : 0;
  const repeatTimePct = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
  const worst = Math.max(1, Math.round(stats.worstRepeats));
  const { score, decided } = worstOfParts([
    {
      code: DECIDED_PART.repeatedTime,
      score: linearScore(
        repeatTimePct,
        REPEATED_WORK_TIME_PCT_THRESHOLDS.good,
        REPEATED_WORK_TIME_PCT_THRESHOLDS.poor
      ),
      figure: repeatTimePct,
      poorAt: REPEATED_WORK_TIME_PCT_THRESHOLDS.poor
    },
    {
      code: DECIDED_PART.repeatedBurst,
      score: linearScore(
        worst,
        REPEATED_WORK_BURST_THRESHOLDS.good,
        REPEATED_WORK_BURST_THRESHOLDS.poor
      ),
      figure: worst,
      poorAt: REPEATED_WORK_BURST_THRESHOLDS.poor
    }
  ]);
  return {
    score,
    rating: ratingFor(score),
    worstRepeats: worst,
    requestsWithRepeat: stats.requestsWithRepeat,
    watchedRequests: stats.watchedRequests,
    repeatTimePct,
    ...decidedFieldsOf(decided)
  };
}
const DB_WAIT_PCT_THRESHOLDS = { good: 20, poor: 70 };
const DB_REPEAT_BURST_THRESHOLDS = { good: 1, poor: 10 };
const DB_LARGE_RESULT_ROWS = 1e3;
const DB_WORK_MIN_REQUESTS = 20;
const DB_WAIT_MS_PER_REQUEST_FLOOR = 100;
function computeDbWork(stats) {
  if (!stats) return null;
  const unwatchedClients = Math.max(0, Math.round(stats.unwatchedClients ?? 0));
  if (stats.watchedRequests < DB_WORK_MIN_REQUESTS) {
    if (unwatchedClients === 0) return null;
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      waitPct: 0,
      callCount: stats.callCount ?? 0,
      watchedRequests: stats.watchedRequests ?? 0,
      hostedCalls: stats.hostedCalls ?? 0,
      repeatWorst: null,
      repeatRequests: stats.repeatRequests ?? 0,
      repeatWastePct: 0,
      rowsWorst: null,
      unwatchedClients
    };
  }
  const pctOf = (ms) => {
    const raw = stats.watchedRequestMs > 0 ? ms / stats.watchedRequestMs * 100 : 0;
    return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
  };
  const waitPct = pctOf(stats.dbMs);
  const repeatWastePct = pctOf(stats.repeatMs);
  const repeatWorst = Math.max(1, Math.round(stats.repeatWorst));
  const waitMsPerRequest = Math.round(stats.dbMs / Math.max(1, stats.watchedRequests) * 10) / 10;
  const { score, decided } = worstOfParts([
    {
      code: DECIDED_PART.dbWait,
      score: waitMsPerRequest <= DB_WAIT_MS_PER_REQUEST_FLOOR ? 100 : linearScore(
        waitPct,
        DB_WAIT_PCT_THRESHOLDS.good,
        DB_WAIT_PCT_THRESHOLDS.poor
      ),
      figure: waitPct,
      poorAt: DB_WAIT_PCT_THRESHOLDS.poor
    },
    {
      code: DECIDED_PART.dbRepeat,
      score: linearScore(
        repeatWorst,
        DB_REPEAT_BURST_THRESHOLDS.good,
        DB_REPEAT_BURST_THRESHOLDS.poor
      ),
      figure: repeatWorst,
      poorAt: DB_REPEAT_BURST_THRESHOLDS.poor
    }
  ]);
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    ...decidedFieldsOf(decided),
    waitMsPerRequest,
    waitPct,
    callCount: stats.callCount,
    watchedRequests: stats.watchedRequests,
    hostedCalls: stats.hostedCalls,
    repeatWorst,
    repeatRequests: stats.repeatRequests,
    repeatWastePct,
    // Deliberately outside the score: an unbounded result set is a finding to
    // hand a developer with the rule that caps it, not a number that quietly
    // marks a legitimately large query as poor.
    rowsWorst: typeof stats.rowsWorst === "number" && stats.rowsWorst >= DB_LARGE_RESULT_ROWS ? Math.floor(stats.rowsWorst) : null,
    unwatchedClients
  };
}
const DB_WAVE_BURST_THRESHOLDS = { good: 2, poor: 10 };
function computeDbSequencing(stats) {
  if (!stats) return null;
  const unwatchedClients = Math.max(0, Math.round(stats.unwatchedClients ?? 0));
  const judged = Math.max(0, Math.round(stats.waveRequests ?? 0));
  if (judged < DB_WORK_MIN_REQUESTS) {
    if (unwatchedClients === 0) return null;
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      wavesWorst: null,
      wavesAvg: 0,
      seriesPct: 0,
      watchedRequests: judged,
      unwatchedClients
    };
  }
  const wavesWorst = Math.max(1, Math.round(stats.wavesWorst));
  const wavesAvg = Math.round(stats.wavesTotal / judged * 10) / 10;
  const seriesPct = stats.sumMs > 0 ? Math.min(
    100,
    Math.max(0, Math.round(stats.spanMs / stats.sumMs * 100))
  ) : 100;
  const score = linearScore(
    wavesWorst,
    DB_WAVE_BURST_THRESHOLDS.good,
    DB_WAVE_BURST_THRESHOLDS.poor
  );
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    wavesWorst,
    wavesAvg,
    seriesPct,
    watchedRequests: judged,
    unwatchedClients
  };
}
const DB_ROWS_WORST_THRESHOLDS = { good: 500, poor: 1e4 };
const DB_ROWS_TYPICAL_THRESHOLDS = { good: 100, poor: 2e3 };
const DB_POOL_USED_PCT_THRESHOLDS = { good: 60, poor: 95 };
function computeDbPoolPressure(stats) {
  if (!stats || !Number.isFinite(stats.size) || stats.size <= 0) return null;
  const size = Math.max(1, Math.round(stats.size));
  const busy = Math.max(0, Math.round(stats.busy));
  const idle = Math.max(0, Math.round(stats.idle));
  const waiting = Math.max(0, Math.round(stats.waiting));
  const usedPct = Math.max(
    0,
    Math.min(100, Math.round(100 * busy / size * 10) / 10)
  );
  const score = linearScore(
    usedPct,
    DB_POOL_USED_PCT_THRESHOLDS.good,
    DB_POOL_USED_PCT_THRESHOLDS.poor
  );
  return {
    score,
    rating: ratingFor(score),
    usedPct,
    busy,
    idle,
    waiting,
    size
  };
}
function settledDbPoolPressure(stats, nowMs = Date.now()) {
  const result = computeDbPoolPressure(stats);
  if (!result) return null;
  if (isSettling("peakRate", nowMs)) return settlingReading({ score: null });
  return markSettled(result);
}
function computeDbRowVolume(stats) {
  if (!stats) return null;
  const unwatchedClients = Math.max(0, Math.round(stats.unwatchedClients ?? 0));
  const watched = Math.max(0, Math.round(stats.watchedRequests ?? 0));
  const sizedCalls = Math.max(0, Math.round(stats.rowsCalls ?? 0));
  if (watched < DB_WORK_MIN_REQUESTS || sizedCalls === 0) {
    if (unwatchedClients === 0) return null;
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      worstRows: null,
      rowsAvg: 0,
      sizedCalls,
      watchedRequests: watched,
      unwatchedClients
    };
  }
  const worstRows = Math.max(0, Math.floor(stats.rowsWorst ?? 0));
  const rowsAvg = Math.max(0, Math.round((stats.rowsSum ?? 0) / sizedCalls));
  const { score, decided } = worstOfParts([
    {
      code: DECIDED_PART.rowsWorst,
      score: linearScore(
        worstRows,
        DB_ROWS_WORST_THRESHOLDS.good,
        DB_ROWS_WORST_THRESHOLDS.poor
      ),
      figure: worstRows,
      poorAt: DB_ROWS_WORST_THRESHOLDS.poor
    },
    {
      code: DECIDED_PART.rowsTypical,
      score: linearScore(
        rowsAvg,
        DB_ROWS_TYPICAL_THRESHOLDS.good,
        DB_ROWS_TYPICAL_THRESHOLDS.poor
      ),
      figure: rowsAvg,
      poorAt: DB_ROWS_TYPICAL_THRESHOLDS.poor
    }
  ]);
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    ...decidedFieldsOf(decided),
    worstRows,
    rowsAvg,
    sizedCalls,
    watchedRequests: watched,
    unwatchedClients
  };
}
const DEP_WAIT_PCT_THRESHOLDS = { good: 25, poor: 75 };
const JOB_FAIL_PCT_THRESHOLDS = { good: 1, poor: 20 };
const AI_FAIL_PCT_THRESHOLDS = { good: 0, poor: 10 };
const AI_TTFT_MS_THRESHOLDS = { good: 1e3, poor: 8e3 };
const AI_TTFT_MIN_STREAMS = 5;
const AI_WORK_MIN_REQUESTS = MIN_SAMPLES_FOR_AXES;
function computeAiCalls(stats) {
  if (!stats) return null;
  const unwatchedClients = Math.max(0, Math.round(stats.unwatchedClients ?? 0));
  const unclassifiedCalls = Math.max(
    0,
    Math.round(stats.unclassifiedCalls ?? 0)
  );
  const ttftP75Ms = (stats.ttftSettledCount ?? 1) > 0 ? Math.max(0, Math.round(stats.ttftP75Ms ?? 0)) : 0;
  const base = {
    callCount: Math.max(0, Math.round(stats.callCount ?? 0)),
    watchedRequests: Math.max(0, Math.round(stats.watchedRequests ?? 0)),
    providerCount: Math.max(0, Math.round(stats.providerCount ?? 0)),
    topProvider: Math.max(0, Math.round(stats.topProvider ?? 0)),
    p75Ms: Math.max(0, Math.round(stats.p75Ms ?? 0)),
    worstMs: Math.max(0, Math.round(stats.worstMs ?? 0)),
    streamCount: Math.max(0, Math.round(stats.streamCount ?? 0)),
    // Only a first-words wait that was really timed: a settled stream. No
    // such stream yet (every one so far was a provider's first, or came in
    // before the process settled) is no figure at all, never 0ms.
    ...ttftP75Ms > 0 ? { ttftP75Ms } : {},
    stallCount: Math.max(0, Math.round(stats.stallCount ?? 0)),
    failCount: Math.max(0, Math.round(stats.failCount ?? 0)),
    rateLimitedCount: Math.max(0, Math.round(stats.rateLimitedCount ?? 0)),
    quotaCount: Math.max(0, Math.round(stats.quotaCount ?? 0)),
    timeoutCount: Math.max(0, Math.round(stats.timeoutCount ?? 0)),
    truncatedCount: Math.max(0, Math.round(stats.truncatedCount ?? 0)),
    filteredCount: Math.max(0, Math.round(stats.filteredCount ?? 0)),
    serverMsP75: Math.max(0, Math.round(stats.serverMsP75 ?? 0)),
    serverMsCalls: Math.max(0, Math.round(stats.serverMsCalls ?? 0)),
    unwatchedClients,
    unclassifiedCalls
  };
  if (base.callCount === 0) {
    if (unclassifiedCalls === 0 && unwatchedClients === 0) return null;
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      waitPct: 0,
      ...base
    };
  }
  if (base.watchedRequests < AI_WORK_MIN_REQUESTS) {
    if (unwatchedClients === 0 && unclassifiedCalls === 0) return null;
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      waitPct: 0,
      ...base
    };
  }
  const waitPct = (() => {
    const raw = stats.watchedRequestMs > 0 ? stats.aiMs / stats.watchedRequestMs * 100 : 0;
    return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
  })();
  const failPct = base.callCount > 0 ? base.failCount / base.callCount * 100 : 0;
  const terms = [
    {
      code: DECIDED_PART.aiFailures,
      score: linearScore(
        failPct,
        AI_FAIL_PCT_THRESHOLDS.good,
        AI_FAIL_PCT_THRESHOLDS.poor
      ),
      figure: Math.round(failPct * 10) / 10,
      poorAt: AI_FAIL_PCT_THRESHOLDS.poor
    }
  ];
  if ((stats.ttftSettledCount ?? 0) >= AI_TTFT_MIN_STREAMS && ttftP75Ms > 0) {
    terms.push({
      code: DECIDED_PART.aiFirstWords,
      score: linearScore(
        ttftP75Ms,
        AI_TTFT_MS_THRESHOLDS.good,
        AI_TTFT_MS_THRESHOLDS.poor
      ),
      figure: ttftP75Ms,
      poorAt: AI_TTFT_MS_THRESHOLDS.poor
    });
  }
  const { score, decided } = worstOfParts(terms);
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    waitPct,
    ...base,
    ...decidedFieldsOf(decided)
  };
}
const AI_USAGE_MISSING_PCT_THRESHOLDS = { good: 0, poor: 50 };
const AI_PROMPT_REPEAT_THRESHOLDS = { good: 1, poor: 4 };
function computeAiSpend(stats, priceTableDay) {
  if (!stats) return null;
  const calls = Math.max(0, Math.round(stats.callCount ?? 0));
  if (calls === 0) return null;
  const tokensIn = Math.max(0, Math.round(stats.tokensIn ?? 0));
  const tokensOut = Math.max(0, Math.round(stats.tokensOut ?? 0));
  const cachedIn = Math.max(0, Math.round(stats.cachedIn ?? 0));
  const usageMissingCalls = Math.max(
    0,
    Math.round(stats.usageMissingCalls ?? 0)
  );
  const watchedRequests = Math.max(0, Math.round(stats.watchedRequests ?? 0));
  const costMicros = Math.max(0, Math.round(stats.costMicros ?? 0));
  const usageMissingPct = Math.round(usageMissingCalls / calls * 100 * 10) / 10;
  const shape = {
    calls,
    tokensIn,
    tokensOut,
    cachedIn,
    // Never 0% for an app whose provider simply reported no input tokens —
    // that is "cannot tell", and a 0% cache hit rate is a very different
    // (and actionable) statement.
    cacheHitPct: tokensIn > 0 ? Math.max(
      0,
      Math.min(100, Math.round(cachedIn / tokensIn * 1e3) / 10)
    ) : null,
    costMicros,
    reportedCostCalls: Math.max(0, Math.round(stats.reportedCostCalls ?? 0)),
    pricedCalls: Math.max(0, Math.round(stats.pricedCalls ?? 0)),
    unpricedCalls: Math.max(0, Math.round(stats.unpricedCalls ?? 0)),
    // The denominator is an inbound REQUEST that called AI, never an AI call
    // and never the app's whole traffic: `watchedRequests` is only incremented
    // for a request that made at least one call, so a request that made three
    // is charged once, at what all three cost together. That is the number a
    // developer budgets with. Money per CALL is `costMicros / pricedCalls`,
    // derived where it is shown rather than carried twice on the wire.
    costPerRequestMicros: watchedRequests > 0 ? Math.round(costMicros / watchedRequests) : 0,
    worstRequestCostMicros: Math.max(
      0,
      Math.round(stats.worstRequestCostMicros ?? 0)
    ),
    windowMs: Math.max(0, Math.round(stats.windowMs ?? 0)),
    usageMissingCalls,
    usageMissingPct,
    streamUsageMissingCalls: Math.max(
      0,
      Math.round(stats.streamUsageMissingCalls ?? 0)
    ),
    declaredCalls: Math.max(0, Math.round(stats.declaredCalls ?? 0)),
    // The deliberate abstentions are a SUBSET of the unpriced calls, and every
    // surface subtracts one from the other to separate "we could not price
    // this" from "we chose not to". Sanitising the two independently lets a
    // malformed or older stats object emit a pair that cannot both be true,
    // and the subtraction then goes negative on a real dashboard. Clamped
    // here, at the boundary where the numbers are emitted.
    declaredUnpricedCalls: Math.min(
      Math.max(0, Math.round(stats.unpricedCalls ?? 0)),
      Math.max(0, Math.round(stats.declaredUnpricedCalls ?? 0))
    ),
    repeatRequests: Math.max(0, Math.round(stats.promptRepeatRequests ?? 0)),
    priceTableDay: Math.round(priceTableDay)
  };
  if (watchedRequests < AI_WORK_MIN_REQUESTS) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      repeatWorst: null,
      ...shape
    };
  }
  const repeatWorst = Math.max(1, Math.round(stats.promptRepeatWorst ?? 0));
  return {
    score: null,
    rating: "not-scored",
    measurable: 1,
    repeatWorst,
    ...shape
  };
}
const AI_HEADROOM_PCT_THRESHOLDS = { good: 40, poor: 5 };
const AI_HEADROOM_MIN_READS = 3;
function computeAiHeadroom(stats) {
  if (!stats) return null;
  const reads = Math.max(0, Math.round(stats.headroomReads ?? 0));
  const refusals = Math.max(0, Math.round(stats.rateLimitedCount ?? 0));
  if (reads === 0 && refusals === 0) return null;
  const worstRetryAfterMs = Math.max(
    0,
    Math.round(stats.worstRetryAfterMs ?? 0)
  );
  const pct = (v) => typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v * 10) / 10)) : null;
  const req = pct(stats.worstRequestsPct ?? null);
  const tok = pct(stats.worstTokensPct ?? null);
  if (req === null && tok === null) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      reads,
      // Not "full" — unknown. The tile reads measurable 0 first and says so.
      worstRequestsPct: 0,
      worstTokensPct: 0,
      refusals,
      worstRetryAfterMs
    };
  }
  const context = {
    reads,
    worstRequestsPct: req ?? 100,
    worstTokensPct: tok ?? 100,
    refusals,
    worstRetryAfterMs
  };
  const settledReads = Math.max(0, Math.round(stats.headroomSettledReads ?? 0));
  const typReq = pct(stats.typicalRequestsPct ?? null);
  const typTok = pct(stats.typicalTokensPct ?? null);
  if (settledReads < AI_HEADROOM_MIN_READS || typReq === null && typTok === null) {
    return { score: null, rating: "pending", measurable: 1, settleRule: SETTLE_RULE, ...context };
  }
  const typical = Math.min(typReq ?? 100, typTok ?? 100);
  const usedScore = (left) => linearScore(
    100 - left,
    100 - AI_HEADROOM_PCT_THRESHOLDS.good,
    100 - AI_HEADROOM_PCT_THRESHOLDS.poor
  );
  const parts = [];
  if (typReq !== null) {
    parts.push({
      code: DECIDED_PART.headroomRequests,
      score: usedScore(typReq),
      figure: typReq,
      poorAt: AI_HEADROOM_PCT_THRESHOLDS.poor
    });
  }
  if (typTok !== null) {
    parts.push({
      code: DECIDED_PART.headroomTokens,
      score: usedScore(typTok),
      figure: typTok,
      poorAt: AI_HEADROOM_PCT_THRESHOLDS.poor
    });
  }
  const { score, decided } = worstOfParts(parts);
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    settleRule: SETTLE_RULE,
    typicalHeadroomPct: typical,
    ...context,
    ...decidedFieldsOf(decided)
  };
}
const DEPENDENCY_DISTANCE_SETUP_MS_THRESHOLDS = {
  good: 20,
  poor: 150
};
const JOB_MISSED_THRESHOLDS = { good: 0, poor: 3 };
const JOB_OVERLAP_THRESHOLDS = { good: 0, poor: 5 };
function wholeCapacity(rate, windowMs, busy, growing) {
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0) return {};
  if (typeof windowMs !== "number" || !Number.isFinite(windowMs) || windowMs <= 0) {
    return {};
  }
  return {
    capFinishPerMin: rate,
    capBusy: busy === 1 ? 1 : 0,
    capWaitGrowing: growing === 1 ? 1 : 0,
    windowMs
  };
}
function capacityFieldsOf(stats) {
  const finishes = stats?.capFinishes;
  const windowMs = stats?.capWindowMs;
  if (typeof finishes !== "number" || !Number.isFinite(finishes) || finishes < 0) return {};
  if (typeof windowMs !== "number" || !Number.isFinite(windowMs)) return {};
  return wholeCapacity(
    earnedPerMin(finishes, windowMs),
    windowMs,
    stats.capBusy,
    stats.capWaitGrowing
  );
}
function capacityWireFieldsOf(reading) {
  if (!reading) return {};
  return wholeCapacity(
    reading.capFinishPerMin,
    reading.windowMs,
    reading.capBusy,
    reading.capWaitGrowing
  );
}
const JOB_WAIT_MS_THRESHOLDS = { good: 1e3, poor: 6e4 };
const JOB_WORK_MIN_RUNS = MIN_SAMPLES_FOR_AXES;
function computeBackgroundWork(stats) {
  if (!stats) return null;
  const unattachedSystems = Math.max(
    0,
    Math.round(stats.unattachedSystems ?? 0)
  );
  const runs = Math.max(0, Math.round(stats.runs ?? 0));
  const recurring = Math.max(0, Math.round(stats.recurring ?? 0));
  const missed = recurring > 0 ? Math.max(0, Math.round(stats.missed ?? 0)) : null;
  if (runs < JOB_WORK_MIN_RUNS) {
    if (runs === 0 && unattachedSystems === 0) return null;
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      runs,
      jobNames: stats.jobNames ?? 0,
      otherNames: stats.otherNames ?? 0,
      failed: stats.failed ?? 0,
      failPct: 0,
      retried: stats.retried ?? 0,
      retryWorst: Math.max(1, Math.round(stats.retryWorst ?? 1)),
      overlaps: stats.overlaps ?? 0,
      p95Ms: 0,
      worstMs: 0,
      waitRuns: stats.waitRuns ?? 0,
      waitP95Ms: null,
      // NOT the missed count, even when one is known.
      //
      // This branch has already decided it cannot judge: `measurable: 0`, no
      // score, rating "pending". A bare figure published beside that verdict is
      // a number with nothing standing behind it — and it read as reassurance
      // exactly when it should not have, telling a developer "eight runs were
      // missed" on a surface that was simultaneously saying it could not tell.
      // The kit's own answer and Boosthis's answer must be the same answer, so
      // the side that cannot support the number does not publish one.
      missed: null,
      recurring,
      hostedRuns: stats.hostedRuns ?? 0,
      manualRuns: stats.manualRuns ?? 0,
      attachedSystems: stats.attachedSystems ?? 0,
      unattachedSystems
    };
  }
  const failed = Math.max(0, Math.round(stats.failed ?? 0));
  const failPct = Math.round(failed / runs * 1e3) / 10;
  const overlaps = Math.max(0, Math.round(stats.overlaps ?? 0));
  const parts = [
    {
      code: DECIDED_PART.jobFailures,
      score: linearScore(
        failPct,
        JOB_FAIL_PCT_THRESHOLDS.good,
        JOB_FAIL_PCT_THRESHOLDS.poor
      ),
      figure: failPct,
      poorAt: JOB_FAIL_PCT_THRESHOLDS.poor
    },
    {
      code: DECIDED_PART.jobOverlaps,
      score: linearScore(
        overlaps,
        JOB_OVERLAP_THRESHOLDS.good,
        JOB_OVERLAP_THRESHOLDS.poor
      ),
      figure: overlaps,
      poorAt: JOB_OVERLAP_THRESHOLDS.poor
    }
  ];
  if (missed !== null) {
    parts.push({
      code: DECIDED_PART.jobMissed,
      score: linearScore(
        missed,
        JOB_MISSED_THRESHOLDS.good,
        JOB_MISSED_THRESHOLDS.poor
      ),
      figure: missed,
      poorAt: JOB_MISSED_THRESHOLDS.poor
    });
  }
  const waitP95Ms = typeof stats.waitP95Ms === "number" && stats.waitRuns > 0 ? Math.max(0, Math.round(stats.waitP95Ms)) : null;
  if (waitP95Ms !== null) {
    parts.push({
      code: DECIDED_PART.jobWait,
      score: linearScore(
        waitP95Ms,
        JOB_WAIT_MS_THRESHOLDS.good,
        JOB_WAIT_MS_THRESHOLDS.poor
      ),
      figure: waitP95Ms,
      poorAt: JOB_WAIT_MS_THRESHOLDS.poor
    });
  }
  const { score, decided } = worstOfParts(parts);
  const capacity = capacityFieldsOf(stats);
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    ...decidedFieldsOf(decided),
    ...capacity,
    runs,
    jobNames: stats.jobNames ?? 0,
    otherNames: stats.otherNames ?? 0,
    failed,
    failPct,
    retried: Math.max(0, Math.round(stats.retried ?? 0)),
    retryWorst: Math.max(1, Math.round(stats.retryWorst ?? 1)),
    overlaps,
    p95Ms: Math.max(0, Math.round(stats.p95Ms ?? 0)),
    worstMs: Math.max(0, Math.round(stats.worstMs ?? 0)),
    waitRuns: Math.max(0, Math.round(stats.waitRuns ?? 0)),
    waitP95Ms,
    missed,
    recurring,
    hostedRuns: Math.max(0, Math.round(stats.hostedRuns ?? 0)),
    manualRuns: Math.max(0, Math.round(stats.manualRuns ?? 0)),
    attachedSystems: Math.max(0, Math.round(stats.attachedSystems ?? 0)),
    unattachedSystems
  };
}
const DEPENDENCY_DISTANCE_MIN_CONNECTIONS = 5;
function ms1(v) {
  return Math.max(0, Math.round(v * 10) / 10);
}
function computeDependencyDistance(stats) {
  const typical = typeof stats?.typicalRequestMs === "number" && Number.isFinite(stats.typicalRequestMs) && stats.typicalRequestMs > 0 ? stats.typicalRequestMs : 0;
  const shareOf = (setupMs) => typical > 0 ? Math.max(0, Math.min(100, Math.round(setupMs / typical * 1e3) / 10)) : null;
  const rows = [];
  let worstKind = 0;
  let worstSetupMs = 0;
  let judgedKinds = 0;
  let unjudgedKinds = 0;
  let unjudgedWorstSetupMs = null;
  let unjudgedWorstKind = null;
  let unjudgedWorstConnections = null;
  for (const k of stats?.kinds ?? []) {
    if (!k || !Number.isFinite(k.kind) || k.kind <= 0) continue;
    const connections = Math.max(0, Math.round(k.connections ?? 0));
    if (connections <= 0) continue;
    const setupMs = ms1(k.setupMs ?? 0);
    const row = {
      kind: Math.round(k.kind),
      connections,
      setupMs
    };
    const share = shareOf(setupMs);
    if (share !== null) row.sharePct = share;
    rows.push(row);
    if (connections >= DEPENDENCY_DISTANCE_MIN_CONNECTIONS) {
      judgedKinds++;
      if (setupMs > worstSetupMs) {
        worstSetupMs = setupMs;
        worstKind = row.kind;
      }
    } else {
      unjudgedKinds++;
      if (unjudgedWorstSetupMs === null || setupMs > unjudgedWorstSetupMs) {
        unjudgedWorstSetupMs = setupMs;
        unjudgedWorstKind = row.kind;
        unjudgedWorstConnections = connections;
      }
    }
  }
  rows.sort((a, b) => b.setupMs - a.setupMs || a.kind - b.kind);
  const newConnections = Math.max(0, Math.round(stats?.newConnections ?? 0));
  const hostArea = Math.max(0, Math.round(stats?.hostArea ?? 0));
  const ownBackendOnly = stats?.ownBackendOnly ? 1 : 0;
  if (judgedKinds === 0) {
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      newConnections,
      minConnections: DEPENDENCY_DISTANCE_MIN_CONNECTIONS,
      judgedKinds: 0,
      worstKind: 0,
      worstSetupMs: 0,
      worstSharePct: null,
      unjudgedWorstSetupMs,
      unjudgedWorstKind,
      unjudgedWorstConnections,
      unjudgedKinds,
      typicalRequestMs: Math.round(typical),
      hostArea,
      ownBackendOnly,
      kinds: rows
    };
  }
  const score = linearScore(
    worstSetupMs,
    DEPENDENCY_DISTANCE_SETUP_MS_THRESHOLDS.good,
    DEPENDENCY_DISTANCE_SETUP_MS_THRESHOLDS.poor
  );
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    newConnections,
    minConnections: DEPENDENCY_DISTANCE_MIN_CONNECTIONS,
    judgedKinds,
    worstKind,
    worstSetupMs,
    worstSharePct: shareOf(worstSetupMs),
    // Only interesting when it is BIGGER than the published worst — a smaller
    // excluded reading changes nothing about what "worst" means. Sent
    // whenever it is larger, so no surface has to re-derive it from the rows.
    unjudgedWorstSetupMs: unjudgedWorstSetupMs !== null && unjudgedWorstSetupMs > worstSetupMs ? unjudgedWorstSetupMs : null,
    unjudgedWorstKind: unjudgedWorstSetupMs !== null && unjudgedWorstSetupMs > worstSetupMs ? unjudgedWorstKind : null,
    unjudgedWorstConnections: unjudgedWorstSetupMs !== null && unjudgedWorstSetupMs > worstSetupMs ? unjudgedWorstConnections : null,
    unjudgedKinds,
    typicalRequestMs: Math.round(typical),
    hostArea,
    ownBackendOnly,
    kinds: rows
  };
}
const DEPENDENCY_MIN_REQUESTS = 20;
const DEP_WAIT_MS_PER_REQUEST_FLOOR = 100;
function computeDependencies(stats) {
  if (!stats) return null;
  const inAppSignin = stats.inAppSignin === 1 ? 1 : 0;
  const groups = Array.isArray(stats.groups) ? stats.groups : [];
  if (stats.watchedRequests < DEPENDENCY_MIN_REQUESTS) {
    if (inAppSignin === 0) return null;
    return {
      score: null,
      rating: "pending",
      measurable: 0,
      waitPct: 0,
      dbPct: 0,
      aiPct: 0,
      selfPct: 0,
      callCount: stats.callCount ?? 0,
      watchedRequests: stats.watchedRequests ?? 0,
      failCount: 0,
      timeoutCount: 0,
      failPct: 0,
      p75Ms: 0,
      worstMs: 0,
      kindCount: 0,
      flakyKinds: 0,
      unknownCalls: 0,
      signinCalls: 0,
      signinP75Ms: null,
      signinFailed: 0,
      inAppSignin,
      groups: []
    };
  }
  const pctOf = (ms) => {
    const raw = stats.watchedRequestMs > 0 ? ms / stats.watchedRequestMs * 100 : 0;
    return Math.max(0, Math.min(100, Math.round(raw * 10) / 10));
  };
  const waitPct = pctOf(stats.depMs);
  const dbPct = pctOf(stats.dbMs);
  const aiPct = pctOf(stats.aiMs);
  const selfPct = Math.max(
    0,
    Math.round((100 - waitPct - dbPct - aiPct) * 10) / 10
  );
  let failCount = 0;
  let timeoutCount = 0;
  let p75Ms = 0;
  let worstMs = 0;
  let flakyKinds = 0;
  let unknownCalls = 0;
  let signinCalls = 0;
  let signinP75Ms = null;
  let signinFailed = 0;
  for (const g of groups) {
    failCount += g.failed ?? 0;
    timeoutCount += g.timedOut ?? 0;
    if ((g.p75Ms ?? 0) > p75Ms) p75Ms = g.p75Ms;
    if ((g.worstMs ?? 0) > worstMs) worstMs = g.worstMs;
    if (g.flaky === 1) flakyKinds += 1;
    if (g.kind === "other") unknownCalls += g.calls ?? 0;
    if (g.kind === "signin") {
      signinCalls = g.calls ?? 0;
      signinP75Ms = g.p75Ms ?? 0;
      signinFailed = (g.failed ?? 0) + (g.timedOut ?? 0);
    }
  }
  const calls = stats.callCount ?? 0;
  const failPct = calls > 0 ? Math.max(
    0,
    Math.min(
      100,
      Math.round((failCount + timeoutCount) / calls * 1e3) / 10
    )
  ) : 0;
  const waitMsPerRequest = Math.round(stats.depMs / Math.max(1, stats.watchedRequests) * 10) / 10;
  const { score, decided } = worstOfParts([
    {
      code: DECIDED_PART.depWait,
      score: waitMsPerRequest <= DEP_WAIT_MS_PER_REQUEST_FLOOR ? 100 : linearScore(
        waitPct,
        DEP_WAIT_PCT_THRESHOLDS.good,
        DEP_WAIT_PCT_THRESHOLDS.poor
      ),
      figure: waitPct,
      poorAt: DEP_WAIT_PCT_THRESHOLDS.poor
    },
    {
      code: DECIDED_PART.depFailures,
      score: linearScore(
        failPct,
        DEP_FAIL_PCT_THRESHOLDS.good,
        DEP_FAIL_PCT_THRESHOLDS.poor
      ),
      figure: failPct,
      poorAt: DEP_FAIL_PCT_THRESHOLDS.poor
    }
  ]);
  return {
    score,
    rating: ratingFor(score),
    measurable: 1,
    ...decidedFieldsOf(decided),
    waitMsPerRequest,
    waitPct,
    dbPct,
    aiPct,
    selfPct,
    callCount: calls,
    watchedRequests: stats.watchedRequests,
    failCount,
    timeoutCount,
    failPct,
    p75Ms: Math.round(p75Ms),
    worstMs: Math.round(worstMs),
    kindCount: groups.length,
    flakyKinds,
    unknownCalls,
    signinCalls,
    signinP75Ms,
    signinFailed,
    inAppSignin,
    groups
  };
}
const DEP_FAIL_PCT_THRESHOLDS = { good: 0.5, poor: 10 };
const CONTAINMENT_COLLAPSE_PCT_THRESHOLDS = {
  good: 0,
  poor: 50
};
const CONTAINMENT_MIN_JUDGED = 3;
function computeFailureContainment(stats) {
  if (!stats) return null;
  const watchedRequests = Math.max(0, Math.round(stats.watchedRequests ?? 0));
  if (watchedRequests <= 0) return null;
  const containedCount = Math.max(0, Math.round(stats.contained ?? 0));
  const collapsedCount = Math.max(0, Math.round(stats.collapsed ?? 0));
  const allFailedCount = Math.max(0, Math.round(stats.allFailed ?? 0));
  const unattributedCount = Math.max(0, Math.round(stats.unattributed ?? 0));
  const base = {
    measurable: 1,
    containedCount,
    collapsedCount,
    allFailedCount,
    unattributedCount,
    watchedRequests
  };
  const judged = containedCount + collapsedCount;
  if (judged < CONTAINMENT_MIN_JUDGED) {
    return {
      ...base,
      score: null,
      rating: "pending",
      collapsePct: 0,
      // Nothing to divide. Containment is a ratio of salvageable failures, and
      // fewer than CONTAINMENT_MIN_JUDGED of them means there is no denominator
      // yet — which is precisely "the reading compares things this app has only
      // one of", the sixth code in the shared list.
      reasonCode: REASON_NOTHING_TO_COMPARE
    };
  }
  const collapsePct = Math.round(1e3 * collapsedCount / judged) / 10;
  const score = linearScore(
    collapsePct,
    CONTAINMENT_COLLAPSE_PCT_THRESHOLDS.good,
    CONTAINMENT_COLLAPSE_PCT_THRESHOLDS.poor
  );
  return {
    ...base,
    score,
    rating: ratingFor(score),
    collapsePct,
    reasonCode: null
  };
}
export {
  AI_FAIL_PCT_THRESHOLDS,
  AI_HEADROOM_MIN_READS,
  AI_HEADROOM_PCT_THRESHOLDS,
  AI_PROMPT_REPEAT_THRESHOLDS,
  AI_TTFT_MIN_STREAMS,
  AI_TTFT_MS_THRESHOLDS,
  AI_USAGE_MISSING_PCT_THRESHOLDS,
  AI_WORK_MIN_REQUESTS,
  BASELINE_ALGORITHM,
  BASELINE_BASELINE_N,
  BASELINE_MIN_DELTA_MS,
  BASELINE_MIN_SAMPLES,
  BASELINE_RECENT_N,
  BASELINE_THRESHOLDS,
  CONFIDENCE_CUTOFFS,
  CONTAINMENT_COLLAPSE_PCT_THRESHOLDS,
  CONTAINMENT_MIN_JUDGED,
  DB_LARGE_RESULT_ROWS,
  DB_POOL_USED_PCT_THRESHOLDS,
  DB_REPEAT_BURST_THRESHOLDS,
  DB_ROWS_TYPICAL_THRESHOLDS,
  DB_ROWS_WORST_THRESHOLDS,
  DB_WAIT_MS_PER_REQUEST_FLOOR,
  DB_WAIT_PCT_THRESHOLDS,
  DB_WAVE_BURST_THRESHOLDS,
  DB_WORK_MIN_REQUESTS,
  DECIDED_PART,
  DECIDED_PART_AXIS,
  DEPENDENCY_DISTANCE_MIN_CONNECTIONS,
  DEPENDENCY_DISTANCE_SETUP_MS_THRESHOLDS,
  DEPENDENCY_MIN_REQUESTS,
  DEP_FAIL_PCT_THRESHOLDS,
  DEP_WAIT_MS_PER_REQUEST_FLOOR,
  DEP_WAIT_PCT_THRESHOLDS,
  IDLE_EFFICIENCY_THRESHOLDS,
  IDLE_MIN_WALL_MS,
  JOB_FAIL_PCT_THRESHOLDS,
  JOB_MISSED_THRESHOLDS,
  JOB_OVERLAP_THRESHOLDS,
  JOB_WAIT_MS_THRESHOLDS,
  JOB_WORK_MIN_RUNS,
  LATENCY_FLOOR_GOOD_MS,
  LATENCY_FLOOR_MIN_WINDOWS,
  LATENCY_FLOOR_POOR_MS,
  LATENCY_FLOOR_WINDOW_MS,
  MCP_TOOLS_MIN_SAMPLES,
  MCP_TOOLS_THRESHOLDS,
  NETWORK_MIN_ATTEMPTS,
  NETWORK_THRESHOLDS,
  REPEATED_WORK_BURST_THRESHOLDS,
  REPEATED_WORK_MIN_REQUESTS,
  REPEATED_WORK_TIME_PCT_THRESHOLDS,
  capacityFieldsOf,
  capacityWireFieldsOf,
  computeAiCalls,
  computeAiHeadroom,
  computeAiSpend,
  computeBackgroundWork,
  computeBaselineScore,
  computeConfidence,
  computeDbPoolPressure,
  computeDbRowVolume,
  computeDbSequencing,
  computeDbWork,
  computeDependencies,
  computeDependencyDistance,
  computeFailureContainment,
  computeIdleEfficiency,
  computeLatencyFloor,
  computeMcpToolsScore,
  computeNetworkScore,
  computeRepeatedWork,
  confidenceCaptionFor,
  confidenceLevel,
  confidenceRatingFor,
  decidedFieldsOf,
  settledDbPoolPressure,
  worstOfParts
};
