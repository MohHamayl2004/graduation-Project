// @ts-nocheck
/* eslint-disable */
// Built from src/snapshot.ts so plain node can run the kit. Do not edit.
import { isRouteFirst, recent, routeHead, settledSummary, summary } from "./samples.js";
import {
  SETTLE_FAMILIES,
  SETTLE_RULE,
  isSettling,
  markSettled,
  processStartMs,
  settledFromMs,
  settlingReading
} from "./settleRule.js";
import {
  allStatuses,
  isJudgedBudget,
  BUDGET_WARMUP_N,
  BUDGET_BASELINE_N
} from "./budgets.js";
import { collectFindings } from "./reporting.js";
import {
  readRecurrenceRows
} from "./candidateRules.js";
import { storageDurable } from "./storage.js";
import { ratingFor, linearScore, MIN_SAMPLES_FOR_AXES } from "./healthAxes.js";
import { readBlockingAsync, readEventLoopLag, readWorstFreeze } from "./eventLoopLag.js";
import { readCpuSchedulingMeters } from "./cpuSchedulingMeters.js";
import { readExtraMeters } from "./extraMeters.js";
import { hostFactObservations, readServerlessMeters } from "./serverlessMeters.js";
import { readConnectionSetup } from "./networkSampler.js";
import { peakRetryBurst } from "./liveDetectors.js";
import { routeListForSnapshot } from "./routeInventory.js";
import { readVitals } from "./runtimeVitals.js";
import {
  readBuildIdentity,
  readDepInventory,
  readPatchLag
} from "./buildIdentity.js";
import {
  SCORE_THRESHOLDS,
  RUNTIME_VERSION,
  EDGE_CACHE_THRESHOLDS,
  readResilienceTail
} from "./thresholds.js";
import {
  computeConfidence,
  computeBaselineScore,
  computeNetworkScore,
  computeIdleEfficiency,
  computeLatencyFloor,
  computeMcpToolsScore,
  computeRepeatedWork,
  computeDbWork,
  computeDbSequencing,
  computeDbRowVolume,
  settledDbPoolPressure,
  computeDependencies,
  computeFailureContainment,
  computeAiCalls,
  computeAiSpend,
  computeAiHeadroom,
  computeBackgroundWork,
  computeDependencyDistance,
  decidedFieldsOf,
  capacityWireFieldsOf
} from "./meterAxes.js";
import { getDependencyDistanceStats } from "./networkSampler.js";
import { declaredHostArea } from "./hostArea.js";
import { getRepeatedWorkStats } from "./repeatedWork.js";
import {
  getDbWorkStats,
  getDbFailures,
  getDbSequencingStats,
  getDbRowVolumeStats,
  getDbPoolPressureStats,
  dbWorkSettlingRequests
} from "./dbWork.js";
import { getAiCallStats } from "./aiCalls.js";
import { dependencySettlingRequests, getDependencyStats } from "./dependencyWork.js";
import { getFailureContainmentStats } from "./failureContainment.js";
import { AI_PRICE_TABLE_DAY } from "./aiUsage.js";
import { getJobWorkStats, jobWorkSettlingRuns } from "./jobWork.js";
import { edgeCacheSettlingVerdicts, getEdgeCacheStats } from "./edgeCache.js";
import { MCP_CALL_PREFIX, MCP_ERROR_SUFFIX } from "./mcpMeasure.js";
import { NETWORK_SETTLED_FLOOR, getNetworkStats, getSettledNetworkStats } from "./networkSampler.js";
import {
  getIdleStats,
  getLatencyFloorSettledSamples,
  getLatencyFloorStats,
  getLatencyFloorSuspendStats
} from "./serverMeters.js";
import { getHeldOpenStats } from "./heldOpen.js";
import {
  declaredCallCounts,
  declaredRoutesKeptOut,
  declaredWaitsBlock,
  hasDeclaredCalls
} from "./declaredWaits.js";
import { isBunRuntime } from "./runtimeTag.js";
import { getRouteOutcomeTotals, routeOutcomeFor } from "./routeOutcomes.js";
const SNAPSHOT_FLUSH_MS = 6e4;
function nextSnapshotDelayMs(sessionAgeMs) {
  if (sessionAgeMs < 3e4) return 1e4;
  if (sessionAgeMs < 9e4) return 2e4;
  if (sessionAgeMs < 18e4) return 4e4;
  return SNAPSHOT_FLUSH_MS;
}
let sessionStartedAt = 0;
function turboDisabled() {
  try {
    return process.env.BOOSTHIS_TURBO === "0";
  } catch {
    return false;
  }
}
function currentScheduleDelayMs(now = Date.now()) {
  if (turboDisabled() || sessionStartedAt === 0) return SNAPSHOT_FLUSH_MS;
  return nextSnapshotDelayMs(now - sessionStartedAt);
}
const SCREEN_PREFIX = "screen:";
const MAX_SNAPSHOT_ROWS = 60;
const MAX_SNAPSHOT_FINDINGS = 30;
const SAMPLE_WINDOW = 1e3;
const READING_TRIGGER_ON_DEMAND = "on-demand";
const FINDING_KIND_MAP = {
  "slow-route": "slow-api",
  "budget-regression": "regression"
};
function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor(sortedAsc.length * p));
  return sortedAsc[idx];
}
function buildRows() {
  const buf = recent({ limit: SAMPLE_WINDOW });
  const durationsByRoute = /* @__PURE__ */ new Map();
  const lastByRoute = /* @__PURE__ */ new Map();
  for (const s of buf) {
    let durs = durationsByRoute.get(s.name);
    if (!durs) {
      durs = [];
      durationsByRoute.set(s.name, durs);
      lastByRoute.set(s.name, s.duration_ms);
    }
    durs.push(s.duration_ms);
  }
  const rows = [];
  for (const [route, durs] of durationsByRoute) {
    const asc = durs.slice().sort((a, b) => a - b);
    const outcome = routeOutcomeFor(route);
    rows.push({
      key: `${SCREEN_PREFIX}${route}`,
      count: durs.length,
      p50: percentile(asc, 0.5),
      p95: percentile(asc, 0.95),
      max: asc[asc.length - 1],
      last: lastByRoute.get(route) ?? 0,
      // Both or neither. A part the outcome tracker never saw (or that the
      // label cap turned away) gets no pair at all, so the server renders
      // "nothing seen" rather than inventing a clean bill of health.
      ...outcome ? { observed: outcome.observed, failed: outcome.failed } : {}
    });
  }
  rows.sort((a, b) => b.p95 - a.p95);
  if (rows.length <= MAX_SNAPSHOT_ROWS) return rows;
  const failedOf = (r) => typeof r.failed === "number" ? r.failed : 0;
  const failing = rows.filter((r) => failedOf(r) > 0).sort((a, b) => failedOf(b) - failedOf(a) || b.p95 - a.p95);
  const picked = failing.length >= MAX_SNAPSHOT_ROWS ? failing.slice(0, MAX_SNAPSHOT_ROWS) : [
    ...failing,
    ...rows.filter((r) => failedOf(r) === 0).slice(0, MAX_SNAPSHOT_ROWS - failing.length)
  ];
  picked.sort((a, b) => b.p95 - a.p95);
  return picked;
}
function buildCrossCutting(findings) {
  return findings.slice(0, MAX_SNAPSHOT_FINDINGS).map((f) => ({
    kind: FINDING_KIND_MAP[f.kind] ?? f.kind,
    name: f.name,
    p95: f.p95,
    count: f.count
  }));
}
function buildRouteSeries() {
  const buf = recent({ limit: SAMPLE_WINDOW });
  const byRoute = /* @__PURE__ */ new Map();
  for (const s of buf) {
    let arr = byRoute.get(s.name);
    if (!arr) {
      arr = [];
      byRoute.set(s.name, arr);
    }
    arr.unshift(s);
  }
  const series = [];
  for (const [name, rows] of byRoute) {
    const head = routeHead(name);
    if (!head || head.head.length < BUDGET_WARMUP_N + BUDGET_BASELINE_N) {
      continue;
    }
    const baselineSlice = head.head.slice(
      BUDGET_WARMUP_N,
      BUDGET_WARMUP_N + BUDGET_BASELINE_N
    );
    const closedAtMs = baselineSlice[baselineSlice.length - 1].timestamp_ms;
    const after = rows.filter((s) => s.timestamp_ms > closedAtMs);
    series.push({
      baseline: baselineSlice.map((s) => s.duration_ms),
      durations: after.map((s) => s.duration_ms)
    });
  }
  return series;
}
function leastScoredRouteSamples(sum) {
  const scored = Object.values(sum.byRoute).map((r) => r.count).filter((c) => c >= MIN_SAMPLES_FOR_AXES);
  return scored.length ? Math.min(...scored) : 0;
}
function buildAxes(sum, budgets) {
  const axes = {};
  const settled = settledSummary();
  const tailFloor = SETTLE_FAMILIES.latencyTail.minSamples;
  if (settled.total >= tailFloor && settled.p75_ms != null) {
    const score = linearScore(
      settled.p75_ms,
      SCORE_THRESHOLDS.tti.good,
      SCORE_THRESHOLDS.tti.poor
    );
    axes.responsiveness = markSettled({
      score,
      rating: ratingFor(score),
      p75Ms: settled.p75_ms,
      count: settled.total
    });
  } else if (sum.total > 0 && isSettling("latencyTail")) {
    axes.responsiveness = settlingReading({ score: null, p75Ms: null, count: settled.total });
  }
  {
    const tail = readResilienceTail(settled.p50_ms, settled.p99_ms, settled.total);
    if (tail.state === "insufficient" && sum.total > 0 && isSettling("latencyTail")) {
      axes.resilience = settlingReading({
        score: null,
        tailRatio: null,
        p50Ms: null,
        p99Ms: null,
        sampleCount: settled.total
      });
    }
    if (tail.state !== "insufficient") {
      const p50 = settled.p50_ms;
      const p99 = settled.p99_ms;
      if (tail.state === "unmeasurable") {
        axes.resilience = {
          score: null,
          rating: "pending",
          tailRatio: null,
          p50Ms: p50,
          p99Ms: p99,
          sampleCount: settled.total,
          settleRule: SETTLE_RULE
        };
      } else {
        const tailScore = tail.state === "flat" ? 100 : linearScore(tail.ratio, 3, 8);
        const poorRate = settled.total > 0 ? settled.poor / settled.total : 0;
        const poorRateScore = linearScore(poorRate, 0.05, 0.25);
        const score = Math.round(0.6 * tailScore + 0.4 * poorRateScore);
        axes.resilience = {
          score,
          rating: ratingFor(score),
          tailRatio: tail.ratio == null ? null : Math.round(tail.ratio * 10) / 10,
          p50Ms: p50,
          p99Ms: p99,
          sampleCount: settled.total,
          settleRule: SETTLE_RULE
        };
      }
      const held = getHeldOpenStats();
      if (held.heldOpenExcluded > 0) {
        axes.resilience.heldOpenExcluded = held.heldOpenExcluded;
        axes.resilience.heldOpenWorstMs = held.heldOpenWorstMs;
      }
    }
  }
  if (!axes.resilience && sum.total === 0 && declaredRoutesKeptOut() > 0) {
    axes.resilience = {
      score: null,
      rating: "pending",
      tailRatio: null,
      p50Ms: null,
      p99Ms: null,
      sampleCount: 0,
      settleRule: SETTLE_RULE
    };
  }
  const budgeted = budgets.filter(isJudgedBudget);
  if (budgeted.length > 0) {
    const onBudget = budgeted.filter((b) => b.state !== "regressed").length;
    const pct = Math.round(100 * onBudget / budgeted.length);
    axes.budget = markSettled({
      score: pct,
      rating: ratingFor(pct),
      onBudget,
      total: budgeted.length,
      pct
    });
  } else if (budgets.length > 0 && isSettling("latencyTail")) {
    axes.budget = settlingReading({ score: null, onBudget: 0, total: 0, pct: null });
  }
  const lag = readEventLoopLag();
  if (lag) {
    axes.eventLoopLag = { ...lag };
  }
  Object.assign(axes, readVitals());
  const freeze = readWorstFreeze();
  if (freeze) axes.worstFreeze = { ...freeze };
  const blocking = readBlockingAsync();
  if (blocking) axes.blockingAsync = { ...blocking };
  const scheduling = readCpuSchedulingMeters();
  if (scheduling.cpuEntitlement)
    axes.cpuEntitlement = scheduling.cpuEntitlement;
  if (scheduling.contextSwitching)
    axes.contextSwitching = scheduling.contextSwitching;
  if (scheduling.threadFootprint)
    axes.threadFootprint = scheduling.threadFootprint;
  if (scheduling.queueTime)
    axes.queueTime = scheduling.queueTime;
  if (scheduling.forkChurn)
    axes.forkChurn = scheduling.forkChurn;
  Object.assign(axes, readExtraMeters());
  Object.assign(axes, readServerlessMeters());
  const connSetup = readConnectionSetup();
  if (connSetup) axes.connectionSetup = { ...connSetup };
  const distance = computeDependencyDistance({
    ...getDependencyDistanceStats(),
    typicalRequestMs: sum.p50_ms ?? null,
    hostArea: declaredHostArea(),
    // A server IS the backend; this limit belongs to the browser kit.
    ownBackendOnly: 0
  });
  axes.dependencyDistance = {
    score: distance.score,
    rating: distance.rating,
    measurable: distance.measurable,
    // The start-up rule's guard (declared steady): the boot pool fill and
    // each kind's first connection are never in a median.
    settleRule: SETTLE_RULE,
    newConnections: distance.newConnections,
    minConnections: distance.minConnections,
    judgedKinds: distance.judgedKinds,
    worstKind: distance.worstKind,
    worstSetupMs: distance.worstSetupMs,
    worstSharePct: distance.worstSharePct,
    // An excluded reading LARGER than the published worst, so no tile can
    // print a "worst" smaller than a number this same axis is holding.
    unjudgedWorstSetupMs: distance.unjudgedWorstSetupMs,
    unjudgedWorstKind: distance.unjudgedWorstKind,
    unjudgedWorstConnections: distance.unjudgedWorstConnections,
    unjudgedKinds: distance.unjudgedKinds,
    typicalRequestMs: distance.typicalRequestMs,
    hostArea: distance.hostArea,
    ownBackendOnly: distance.ownBackendOnly,
    kinds: distance.kinds
  };
  const conf = computeConfidence(leastScoredRouteSamples(sum));
  if (conf.confidence !== "none") {
    axes.confidence = conf.confidence;
    axes.confidenceMounts = conf.confidenceMounts;
    axes.confidenceCaption = conf.confidenceCaption;
  }
  const baseline = computeBaselineScore(buildRouteSeries());
  if (baseline.score !== null || baseline.unscoredRoutes > 0) {
    axes.baseline = markSettled({
      score: baseline.score,
      rating: baseline.rating,
      // worst* are null when nothing regressed; ship 0 in that case so the wire
      // stays numeric-only (the server treats 0 ratio/ms as "no anomaly").
      worstRatio: baseline.worstRatio ?? 0,
      worstBaselineMs: baseline.worstBaselineMs ?? 0,
      worstCurrentMs: baseline.worstCurrentMs ?? 0,
      anomalyCount: baseline.anomalyCount,
      scoredRoutes: baseline.scoredRoutes,
      unscoredRoutes: baseline.unscoredRoutes,
      measurable: baseline.measurable
    });
  }
  const settledNet = getSettledNetworkStats();
  const network = settledNet.judged >= NETWORK_SETTLED_FLOOR && settledNet.p75Ms !== null ? computeNetworkScore({ ...settledNet, p75Ms: settledNet.p75Ms }) : null;
  if (network && network.score !== null && network.p75Ms !== null) {
    axes.network = markSettled({
      score: network.score,
      rating: network.rating,
      stallPct: network.stallPct ?? 0,
      attemptCount: network.attemptCount,
      failedCount: network.failedCount,
      timeoutCount: network.timeoutCount,
      stallCount: network.stallCount,
      p75Ms: network.p75Ms,
      worstMs: network.worstMs,
      // Which part set the score (meterAxes.ts, DECIDED_PART). Absent when
      // nothing pulled it below 100.
      ...decidedFieldsOf(network)
    });
  } else if (getNetworkStats().attemptCount > 0 && isSettling("latencyTail")) {
    axes.network = settlingReading({
      score: null,
      attemptCount: settledNet.attemptCount,
      p75Ms: null,
      worstMs: Math.round(settledNet.worstMs)
    });
  }
  const callCounts = declaredCallCounts();
  if (axes.network) {
    Object.assign(axes.network, callCounts);
  } else if (hasDeclaredCalls() && !isBunRuntime()) {
    axes.network = settlingReading({
      score: null,
      attemptCount: settledNet.attemptCount,
      p75Ms: null,
      worstMs: Math.round(settledNet.worstMs),
      ...callCounts
    });
  }
  const idle = computeIdleEfficiency(getIdleStats());
  if (idle.score !== null && idle.idleBusyPct !== null) {
    axes.idle = markSettled({
      score: idle.score,
      rating: idle.rating,
      idleBusyPct: idle.idleBusyPct,
      idleLongTaskCount: idle.idleLongTaskCount
    });
  } else if (isSettling("peakRate")) {
    axes.idle = settlingReading({
      score: null,
      rating: "pending",
      idleBusyPct: null,
      idleLongTaskCount: idle.idleLongTaskCount
    });
  }
  const floorSettled = getLatencyFloorSettledSamples();
  const latencyFloor = computeLatencyFloor(getLatencyFloorStats());
  if (floorSettled < SETTLE_FAMILIES.latencyTail.minSamples && isSettling("latencyTail")) {
    axes.latencyFloor = settlingReading({
      score: null,
      windowCount: latencyFloor.windowCount
    });
  } else if (floorSettled >= SETTLE_FAMILIES.latencyTail.minSamples && latencyFloor.score !== null && latencyFloor.worstMs !== null) {
    axes.latencyFloor = markSettled({
      score: latencyFloor.score,
      rating: latencyFloor.rating,
      worstMs: latencyFloor.worstMs,
      windowCount: latencyFloor.windowCount
    });
    const susp = getLatencyFloorSuspendStats();
    if (susp.suspendDiscounts > 0) {
      axes.latencyFloor.suspendDiscounts = susp.suspendDiscounts;
      axes.latencyFloor.suspendUnit = susp.suspendUnit;
      axes.latencyFloor.suspendWorstMs = susp.suspendWorstMs;
    }
    const held = getHeldOpenStats();
    if (held.heldOpenExcluded > 0) {
      axes.latencyFloor.heldOpenExcluded = held.heldOpenExcluded;
      axes.latencyFloor.heldOpenWorstMs = held.heldOpenWorstMs;
    }
  }
  const mcpSeries = buildMcpToolSeries();
  const mcp = computeMcpToolsScore(mcpSeries);
  const mcpFloor = SETTLE_FAMILIES.latencyTail.minSamples;
  if (mcp.score !== null && mcp.worstMs !== null && mcp.sampleCount >= mcpFloor) {
    axes.mcpTools = markSettled({
      score: mcp.score,
      rating: mcp.rating,
      worstMs: mcp.worstMs,
      toolCount: mcp.toolCount,
      errorPct: mcp.errorPct ?? 0,
      sampleCount: mcp.sampleCount,
      ...decidedFieldsOf(mcp)
    });
  } else if (isSettling("latencyTail") && hasMcpCalls()) {
    axes.mcpTools = settlingReading({
      score: null,
      sampleCount: mcp.sampleCount
    });
  }
  const repeatedStats = getRepeatedWorkStats();
  const repeated = computeRepeatedWork(repeatedStats);
  if (repeated.score === null && isSettling("startupEvent") && (repeatedStats.settlingRequests ?? 0) > 0) {
    axes.repeatedWork = settlingReading({ score: null });
  }
  if (repeated.score !== null && repeated.worstRepeats !== null) {
    axes.repeatedWork = {
      score: repeated.score,
      rating: repeated.rating,
      settleRule: SETTLE_RULE,
      worstRepeats: repeated.worstRepeats,
      requestsWithRepeat: repeated.requestsWithRepeat,
      watchedRequests: repeated.watchedRequests,
      repeatTimePct: repeated.repeatTimePct,
      ...decidedFieldsOf(repeated)
    };
  }
  const dbWork = computeDbWork(getDbWorkStats());
  const dbSettling = isSettling("latencyTail") && dbWorkSettlingRequests() > 0;
  if (dbWork) {
    const axis = {
      score: dbWork.score,
      rating: dbWork.rating,
      measurable: dbWork.measurable,
      settleRule: SETTLE_RULE,
      waitPct: dbWork.waitPct,
      callCount: dbWork.callCount,
      watchedRequests: dbWork.watchedRequests,
      hostedCalls: dbWork.hostedCalls,
      repeatWorst: dbWork.repeatWorst,
      repeatRequests: dbWork.repeatRequests,
      repeatWastePct: dbWork.repeatWastePct,
      unwatchedClients: dbWork.unwatchedClients
    };
    if (dbWork.rowsWorst !== null) axis.rowsWorst = dbWork.rowsWorst;
    if (dbWork.waitMsPerRequest !== void 0) axis.waitMsPerRequest = dbWork.waitMsPerRequest;
    if (dbWork.measurable === 1) Object.assign(axis, getDbFailures());
    Object.assign(axis, decidedFieldsOf(dbWork));
    axes.dbWork = axis;
  } else if (dbSettling) {
    axes.dbWork = settlingReading({ score: null });
  }
  const dbSequencing = computeDbSequencing(getDbSequencingStats());
  if (dbSequencing) {
    axes.dbSequencing = {
      score: dbSequencing.score,
      rating: dbSequencing.rating,
      measurable: dbSequencing.measurable,
      settleRule: SETTLE_RULE,
      wavesWorst: dbSequencing.wavesWorst,
      wavesAvg: dbSequencing.wavesAvg,
      seriesPct: dbSequencing.seriesPct,
      watchedRequests: dbSequencing.watchedRequests,
      unwatchedClients: dbSequencing.unwatchedClients
    };
  } else if (dbSettling) {
    axes.dbSequencing = settlingReading({ score: null });
  }
  const dbRowVolume = computeDbRowVolume(getDbRowVolumeStats());
  if (dbRowVolume) {
    axes.dbRowVolume = {
      score: dbRowVolume.score,
      rating: dbRowVolume.rating,
      measurable: dbRowVolume.measurable,
      settleRule: SETTLE_RULE,
      worstRows: dbRowVolume.worstRows,
      rowsAvg: dbRowVolume.rowsAvg,
      sizedCalls: dbRowVolume.sizedCalls,
      watchedRequests: dbRowVolume.watchedRequests,
      unwatchedClients: dbRowVolume.unwatchedClients,
      ...decidedFieldsOf(dbRowVolume)
    };
  } else if (dbSettling) {
    axes.dbRowVolume = settlingReading({ score: null });
  }
  const dbPoolPressure = settledDbPoolPressure(getDbPoolPressureStats());
  if (dbPoolPressure && dbPoolPressure.score === null) {
    axes.dbPoolPressure = dbPoolPressure;
  } else if (dbPoolPressure) {
    axes.dbPoolPressure = {
      score: dbPoolPressure.score,
      rating: dbPoolPressure.rating,
      usedPct: dbPoolPressure.usedPct,
      busy: dbPoolPressure.busy,
      idle: dbPoolPressure.idle,
      waiting: dbPoolPressure.waiting,
      size: dbPoolPressure.size,
      settleRule: dbPoolPressure.settleRule
    };
  }
  const dependencies = computeDependencies(getDependencyStats());
  if (dependencies) {
    const axis = {
      score: dependencies.score,
      rating: dependencies.rating,
      measurable: dependencies.measurable,
      waitPct: dependencies.waitPct,
      dbPct: dependencies.dbPct,
      aiPct: dependencies.aiPct,
      selfPct: dependencies.selfPct,
      callCount: dependencies.callCount,
      watchedRequests: dependencies.watchedRequests,
      failCount: dependencies.failCount,
      timeoutCount: dependencies.timeoutCount,
      failPct: dependencies.failPct,
      p75Ms: dependencies.p75Ms,
      worstMs: dependencies.worstMs,
      kindCount: dependencies.kindCount,
      flakyKinds: dependencies.flakyKinds,
      unknownCalls: dependencies.unknownCalls,
      signinCalls: dependencies.signinCalls,
      signinFailed: dependencies.signinFailed,
      inAppSignin: dependencies.inAppSignin
    };
    if (dependencies.signinP75Ms !== null)
      axis.signinP75Ms = dependencies.signinP75Ms;
    if (dependencies.groups.length > 0) axis.groups = dependencies.groups;
    axis.settleRule = SETTLE_RULE;
    if (dependencies.waitMsPerRequest !== void 0) axis.waitMsPerRequest = dependencies.waitMsPerRequest;
    Object.assign(axis, decidedFieldsOf(dependencies));
    axes.dependencies = axis;
  } else if (isSettling("latencyTail") && dependencySettlingRequests() > 0) {
    axes.dependencies = settlingReading({ score: null });
  }
  const containment = computeFailureContainment(getFailureContainmentStats());
  if (containment) {
    axes.failureContainment = {
      score: containment.score,
      rating: containment.rating,
      measurable: containment.measurable,
      collapsedCount: containment.collapsedCount,
      containedCount: containment.containedCount,
      allFailedCount: containment.allFailedCount,
      unattributedCount: containment.unattributedCount,
      collapsePct: containment.collapsePct,
      watchedRequests: containment.watchedRequests,
      // Present only while the verdict is withheld, so a scored reading carries
      // no stray "why not" — and a withheld one is never a blank tile.
      ...containment.reasonCode === null ? {} : { reasonCode: containment.reasonCode }
    };
  }
  const aiStats = getAiCallStats();
  const aiCalls = computeAiCalls(aiStats);
  const remembers = storageDurable() ? 1 : 0;
  const rememberedPatterns = remembers === 1 ? readRecurrenceRows() : null;
  const hasRememberedPatterns = !!(rememberedPatterns && rememberedPatterns.length > 0);
  if (aiCalls) {
    axes.aiCalls = {
      score: aiCalls.score,
      rating: aiCalls.rating,
      measurable: aiCalls.measurable,
      // The start-up rule: time to first token waits for settled streams.
      settleRule: SETTLE_RULE,
      waitPct: aiCalls.waitPct,
      callCount: aiCalls.callCount,
      watchedRequests: aiCalls.watchedRequests,
      providerCount: aiCalls.providerCount,
      topProvider: aiCalls.topProvider,
      p75Ms: aiCalls.p75Ms,
      worstMs: aiCalls.worstMs,
      streamCount: aiCalls.streamCount,
      // Absent, never 0, until a settled streamed answer was timed.
      ...aiCalls.ttftP75Ms !== void 0 ? { ttftP75Ms: aiCalls.ttftP75Ms } : {},
      stallCount: aiCalls.stallCount,
      failCount: aiCalls.failCount,
      rateLimitedCount: aiCalls.rateLimitedCount,
      quotaCount: aiCalls.quotaCount,
      timeoutCount: aiCalls.timeoutCount,
      truncatedCount: aiCalls.truncatedCount,
      filteredCount: aiCalls.filteredCount,
      serverMsP75: aiCalls.serverMsP75,
      serverMsCalls: aiCalls.serverMsCalls,
      unwatchedClients: aiCalls.unwatchedClients,
      unclassifiedCalls: aiCalls.unclassifiedCalls,
      ...decidedFieldsOf(aiCalls)
    };
    axes.aiCalls.patternMemory = remembers;
    if (hasRememberedPatterns) {
      axes.aiCalls.patterns = rememberedPatterns;
    }
  } else if (hasRememberedPatterns) {
    axes.aiCalls = {
      score: null,
      rating: "pending",
      measurable: 0,
      waitPct: 0,
      callCount: 0,
      watchedRequests: 0,
      providerCount: 0,
      topProvider: 0,
      p75Ms: 0,
      worstMs: 0,
      streamCount: 0,
      stallCount: 0,
      failCount: 0,
      rateLimitedCount: 0,
      quotaCount: 0,
      timeoutCount: 0,
      truncatedCount: 0,
      filteredCount: 0,
      serverMsP75: 0,
      serverMsCalls: 0,
      unwatchedClients: Math.max(
        0,
        Math.round(aiStats?.unwatchedClients ?? 0)
      ),
      unclassifiedCalls: 0,
      patternMemory: remembers,
      patterns: rememberedPatterns
    };
  }
  const aiSpend = computeAiSpend(aiStats, AI_PRICE_TABLE_DAY);
  if (aiSpend) {
    const spend = {
      score: aiSpend.score,
      rating: aiSpend.rating,
      measurable: aiSpend.measurable,
      // The shared decision: reported, never graded, in every kit.
      settleRule: SETTLE_RULE,
      calls: aiSpend.calls,
      tokensIn: aiSpend.tokensIn,
      tokensOut: aiSpend.tokensOut,
      cachedIn: aiSpend.cachedIn,
      cacheHitPct: aiSpend.cacheHitPct,
      costMicros: aiSpend.costMicros,
      reportedCostCalls: aiSpend.reportedCostCalls,
      pricedCalls: aiSpend.pricedCalls,
      unpricedCalls: aiSpend.unpricedCalls,
      costPerRequestMicros: aiSpend.costPerRequestMicros,
      worstRequestCostMicros: aiSpend.worstRequestCostMicros,
      windowMs: aiSpend.windowMs,
      usageMissingCalls: aiSpend.usageMissingCalls,
      usageMissingPct: aiSpend.usageMissingPct,
      streamUsageMissingCalls: aiSpend.streamUsageMissingCalls,
      declaredCalls: aiSpend.declaredCalls,
      declaredUnpricedCalls: aiSpend.declaredUnpricedCalls,
      repeatWorst: aiSpend.repeatWorst,
      repeatRequests: aiSpend.repeatRequests,
      priceTableDay: aiSpend.priceTableDay
    };
    axes.aiSpend = spend;
  }
  const aiHeadroom = computeAiHeadroom(aiStats);
  if (aiHeadroom) {
    axes.aiHeadroom = {
      score: aiHeadroom.score,
      rating: aiHeadroom.rating,
      measurable: aiHeadroom.measurable,
      // The start-up rule: graded on the typical settled reading.
      ...aiHeadroom.settleRule !== void 0 ? { settleRule: aiHeadroom.settleRule } : {},
      ...aiHeadroom.typicalHeadroomPct !== void 0 ? { typicalHeadroomPct: aiHeadroom.typicalHeadroomPct } : {},
      reads: aiHeadroom.reads,
      worstRequestsPct: aiHeadroom.worstRequestsPct,
      worstTokensPct: aiHeadroom.worstTokensPct,
      refusals: aiHeadroom.refusals,
      worstRetryAfterMs: aiHeadroom.worstRetryAfterMs,
      ...decidedFieldsOf(aiHeadroom)
    };
  }
  const backgroundWork = computeBackgroundWork(getJobWorkStats());
  if (backgroundWork) {
    const axis = {
      score: backgroundWork.score,
      rating: backgroundWork.rating,
      measurable: backgroundWork.measurable,
      // The start-up rule (startupEvent): runs started before the process
      // settled are counted apart and never graded.
      settleRule: SETTLE_RULE,
      runs: backgroundWork.runs,
      jobNames: backgroundWork.jobNames,
      otherNames: backgroundWork.otherNames,
      failed: backgroundWork.failed,
      failPct: backgroundWork.failPct,
      retried: backgroundWork.retried,
      retryWorst: backgroundWork.retryWorst,
      overlaps: backgroundWork.overlaps,
      p95Ms: backgroundWork.p95Ms,
      worstMs: backgroundWork.worstMs,
      waitRuns: backgroundWork.waitRuns,
      recurring: backgroundWork.recurring,
      hostedRuns: backgroundWork.hostedRuns,
      manualRuns: backgroundWork.manualRuns,
      attachedSystems: backgroundWork.attachedSystems,
      unattachedSystems: backgroundWork.unattachedSystems
    };
    if (backgroundWork.waitP95Ms !== null) {
      axis.waitP95Ms = backgroundWork.waitP95Ms;
    }
    if (backgroundWork.missed !== null) axis.missed = backgroundWork.missed;
    Object.assign(axis, decidedFieldsOf(backgroundWork), capacityWireFieldsOf(backgroundWork));
    axes.backgroundWork = axis;
  }
  if ((!backgroundWork || backgroundWork.score === null) && isSettling("startupEvent") && jobWorkSettlingRuns() > 0) {
    const declared = getJobWorkStats();
    axes.backgroundWork = settlingReading({
      score: null,
      jobNames: declared.jobNames,
      otherNames: declared.otherNames,
      recurring: declared.recurring,
      attachedSystems: declared.attachedSystems,
      unattachedSystems: declared.unattachedSystems
    });
  }
  const edge = getEdgeCacheStats();
  if (edge) {
    const score = linearScore(
      100 - edge.hitPct,
      100 - EDGE_CACHE_THRESHOLDS.good,
      100 - EDGE_CACHE_THRESHOLDS.poor
    );
    axes.upstreamCache = {
      score,
      rating: ratingFor(score),
      // The start-up rule (startupEvent): counters start after settling.
      settleRule: SETTLE_RULE,
      hitPct: edge.hitPct,
      checked: edge.checked,
      hits: edge.hits,
      misses: edge.misses,
      stale: edge.stale,
      bypass: edge.bypass
    };
  } else if (isSettling("startupEvent") && edgeCacheSettlingVerdicts() > 0) {
    axes.upstreamCache = settlingReading({ score: null });
  }
  const patchLag = readPatchLag();
  if (patchLag) {
    const axis = {
      score: null,
      rating: "not-scored",
      buildAgeMs: patchLag.buildAgeMs,
      buildTimeMs: patchLag.buildTimeMs
    };
    if (typeof patchLag.depCount === "number")
      axis.depCount = patchLag.depCount;
    axes.patchLag = axis;
  }
  {
    const t = getRouteOutcomeTotals();
    if (t.parts > 0 || t.untracked > 0) {
      axes.routeFailures = {
        score: null,
        rating: "not-scored",
        parts: t.parts,
        observed: t.observed,
        failed: t.failed,
        // Observations the per-label cap turned away. Reported so the cap is
        // visible rather than silently shrinking the denominator.
        untracked: t.untracked
        // NO CAPTION, deliberately. Every other axis may ship a worded
        // caption; this one may not. What travels here is a closed set of
        // counts, and a string field is exactly how a closed shape grows to
        // hold a message — a route, a status line, an error. The panel words
        // these numbers itself, in the process that already has them.
      };
    }
  }
  return axes;
}
function hasMcpCalls() {
  return recent({ limit: SAMPLE_WINDOW }).some((s) => s.name.startsWith(MCP_CALL_PREFIX));
}
function buildMcpToolSeries() {
  const buf = recent({ limit: SAMPLE_WINDOW });
  const byTool = /* @__PURE__ */ new Map();
  for (const s of buf) {
    if (!s.name.startsWith(MCP_CALL_PREFIX)) continue;
    const isError = s.name.endsWith(MCP_ERROR_SUFFIX);
    if (s.timestamp_ms < settledFromMs("latencyTail")) continue;
    if (!isError && isRouteFirst(s)) continue;
    const key = isError ? s.name.slice(0, -MCP_ERROR_SUFFIX.length) : s.name;
    let t = byTool.get(key);
    if (!t) {
      t = { durations: [], errorCount: 0 };
      byTool.set(key, t);
    }
    t.durations.push(s.duration_ms);
    if (isError) t.errorCount++;
  }
  return [...byTool.values()];
}
function capturePerfSnapshot() {
  const sum = summary();
  const budgets = allStatuses();
  const findings = collectFindings();
  const now = Date.now();
  const build = readBuildIdentity();
  const deps = readDepInventory();
  const hostFacts = hostFactObservations();
  const routeList = routeListForSnapshot();
  return {
    capturedAt: now,
    runtimeVersion: RUNTIME_VERSION,
    platform: "node",
    // Approximate process boot time from uptime so the meter page can show
    // "running for N" without collecting any timestamp of user activity.
    // The start-up rule's own clock, so the age the server reads is the age
    // every meter judged by.
    startedAt: processStartMs(),
    totalEvents: sum.total,
    rows: buildRows(),
    crossCutting: buildCrossCutting(findings),
    axes: buildAxes(sum, budgets),
    ...build ? { build } : {},
    ...deps ? { deps } : {},
    ...peakRetryBurst() > 0 ? { events: { retryBurstMax10s: peakRetryBurst() } } : {},
    ...Object.keys(hostFacts).length > 0 ? { hostFacts } : {},
    // ALWAYS present, whatever the answer was. A kit that can do this says so
    // every time; an absent block means the kit is older than the feature,
    // and that is the only thing it may ever mean.
    routeList,
    // ALWAYS present for the same reason: `routes: []` is "declared nothing".
    declaredWaits: declaredWaitsBlock()
  };
}
function keptOutDeclaredWaits(snap) {
  if (snap.declaredWaits?.routes.some((r) => r.excluded > 0)) return true;
  const net = snap.axes.network;
  return typeof net?.waitDeclaredExcluded === "number" && net.waitDeclaredExcluded > 0;
}
function hasData(snap) {
  return snap.totalEvents > 0 || snap.rows.length > 0 || snap.axes.serverless !== void 0 || keptOutDeclaredWaits(snap);
}
let routeListOnlySent = false;
let submitter = null;
let timer = null;
let inFlight = false;
function setSnapshotSubmitter(fn) {
  submitter = fn;
}
async function uploadPerfSnapshotNow() {
  if (!submitter || inFlight) return 0;
  const snap = capturePerfSnapshot();
  const measured = hasData(snap);
  const listOnly = !measured && routeListWorthSendingAlone(snap);
  if (!measured && !listOnly) return 0;
  inFlight = true;
  try {
    const shipped = await submitter(snap);
    if (listOnly && shipped > 0) routeListOnlySent = true;
    return shipped;
  } catch {
    return 0;
  } finally {
    inFlight = false;
  }
}
async function readNow() {
  if (!submitter) {
    return { sent: false, reason: "not-started", measuredRequests: 0 };
  }
  if (inFlight) {
    return { sent: false, reason: "already-reading", measuredRequests: 0 };
  }
  const snap = {
    ...capturePerfSnapshot(),
    readingTrigger: READING_TRIGGER_ON_DEMAND
  };
  const measuredRequests = snap.totalEvents;
  inFlight = true;
  try {
    const shipped = await submitter(snap);
    if (shipped > 0 && !hasData(snap)) routeListOnlySent = true;
    return shipped > 0 ? { sent: true, reason: null, measuredRequests } : { sent: false, reason: "refused", measuredRequests };
  } catch {
    return { sent: false, reason: "failed", measuredRequests };
  } finally {
    inFlight = false;
  }
}
function scheduleNext() {
  if (timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    void uploadPerfSnapshotNow().catch(() => {
    }).finally(() => {
      if (submitter) scheduleNext();
    });
  }, currentScheduleDelayMs());
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}
function startSnapshotAutoUpload() {
  if (sessionStartedAt === 0) sessionStartedAt = Date.now();
  void uploadPerfSnapshotNow();
  scheduleNext();
}
function stopSnapshotAutoUpload() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}
const _snapshotInternals = {
  reset() {
    submitter = null;
    inFlight = false;
    sessionStartedAt = 0;
    routeListOnlySent = false;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  },
  /** @internal test hook — force the turbo session-start clock. */
  setSessionStartedAt(ts) {
    sessionStartedAt = ts;
  },
  get currentScheduleDelayMs() {
    return currentScheduleDelayMs();
  },
  get hasSubmitter() {
    return submitter !== null;
  },
  get isRunning() {
    return timer !== null;
  }
};
function routeListWorthSendingAlone(snap) {
  if (routeListOnlySent) return false;
  return (snap.routeList?.entries.length ?? 0) > 0;
}
export {
  READING_TRIGGER_ON_DEMAND,
  SNAPSHOT_FLUSH_MS,
  _snapshotInternals,
  capturePerfSnapshot,
  nextSnapshotDelayMs,
  readNow,
  setSnapshotSubmitter,
  startSnapshotAutoUpload,
  stopSnapshotAutoUpload,
  uploadPerfSnapshotNow
};
