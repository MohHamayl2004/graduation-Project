// @ts-nocheck
/* eslint-disable */
// Built from src/liveData.ts so plain node can run the kit. Do not edit.
import { checkNoPII, checkNoPIIInUrl } from "./no-pii.js";
import { readAnswerJson } from "./answerRead.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { SCORE_THRESHOLDS } from "./thresholds.js";
let config = null;
function normalizeCreds(c) {
  const installId = (c.installId ?? "").trim();
  const token = (c.token ?? "").trim();
  if (!installId || !token) return null;
  const base = c.baseUrl && c.baseUrl.trim() || "https://www.boosthis.com/api";
  return { installId, token, baseUrl: base.replace(/\/+$/, "") };
}
function resolveCreds(override) {
  if (override) return normalizeCreds(override);
  return config;
}
function configureLiveData(opts) {
  config = normalizeCreds(opts);
}
function isLiveDataConfigured() {
  return config !== null;
}
function _resetLiveDataForTests() {
  config = null;
}
function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
const LIVE_ANSWER_MAX_BYTES = 2e6;
async function fetchJson(path, cfg) {
  if (isBoosthisDisabled()) return null;
  try {
    const url = `${cfg.baseUrl}${path}`;
    if (checkNoPIIInUrl(url)) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5e3);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${cfg.token}`
        },
        signal: controller.signal
      });
      if (!res.ok) return null;
      return await readAnswerJson(res, {
        maxBytes: LIVE_ANSWER_MAX_BYTES,
        timeoutMs: 5e3
      });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}
function piiSafe(row) {
  return checkNoPII(row) === null;
}
const FIX_ANSWERS_MISSING_NOTE = "Boosthis handed over no fix answer for some of the problems in this read, so they carry none. For a project an account has claimed, the hosted Boosthis connection attaches the rule or the reason to the findings in its what_should_i_look_at_next answer and to the cross-cutting findings in its snapshot answer.";
const RULE_POINTING_FIELDS = ["rule_id", "rule", "fetch", "when_to_apply"];
function servedFixBlock(row, opts = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const fix = row.fix;
  if (!fix || typeof fix !== "object" || Array.isArray(fix)) return null;
  const block = fix;
  if (typeof block.status !== "string") return null;
  for (const v of Object.values(block)) {
    if (v !== null && typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") return null;
  }
  if (opts.route && RULE_POINTING_FIELDS.some((f) => f in block)) return null;
  if (!piiSafe(block)) return null;
  return block;
}
function fixAnswersFields(missing) {
  return missing > 0 ? { fixAnswersMissing: missing, fixAnswersNote: FIX_ANSWERS_MISSING_NOTE } : {};
}
function isProblemRoute(rating) {
  return rating !== "good";
}
async function fetchSnapshotObj(cfg) {
  const snap = await fetchJson(
    `/snapshot?installId=${encodeURIComponent(cfg.installId)}`,
    cfg
  );
  if (snap === null || typeof snap !== "object" || Array.isArray(snap)) {
    return null;
  }
  if (!piiSafe(snap)) return null;
  return snap;
}
const SCREEN_PREFIX = "screen:";
const NOTE_LIVE = "Live per-route data read from your Boosthis server (full-details telemetry). Worst routes first.";
const NOTE_SNAPSHOT_FALLBACK = "Derived from your app's latest uploaded Boosthis SNAPSHOT (the full meter page). The raw per-sample stream is off (private / issues-only mode with shareMeterWithAI), so these are the snapshot's per-route aggregates, worst-first. For the complete meter page call boosthis.snapshot.";
function rateMs(ms) {
  if (ms <= SCORE_THRESHOLDS.tti.good) return "good";
  if (ms >= SCORE_THRESHOLDS.tti.poor) return "poor";
  return "needs-work";
}
async function fetchScreens(windowDays, cfg) {
  const data = await fetchJson(
    `/screens/summary?installId=${encodeURIComponent(cfg.installId)}&windowDays=${encodeURIComponent(String(windowDays))}`,
    cfg
  );
  if (!data || !Array.isArray(data.screens)) return null;
  return data.screens;
}
function snapScreenRows(snap) {
  const rows = Array.isArray(snap.rows) ? snap.rows : [];
  const out = [];
  for (const r of rows) {
    if (!r || typeof r !== "object") continue;
    const key = typeof r.key === "string" ? r.key : "";
    if (!key.startsWith(SCREEN_PREFIX)) continue;
    const p95 = num(r.p95);
    const p50 = num(r.p50);
    const p99 = typeof r.p99 === "number" && isFinite(r.p99) ? r.p99 : void 0;
    const stdev = typeof r.stdev === "number" && isFinite(r.stdev) ? r.stdev : void 0;
    const row = {
      screen: key.slice(SCREEN_PREFIX.length),
      p50Ms: p50,
      p95Ms: p95,
      sampleCount: num(r.count),
      worstRating: rateMs(p95),
      ...p99 !== void 0 ? { p99Ms: p99 } : {},
      ...stdev !== void 0 ? { stdevMs: stdev } : {},
      ...p99 !== void 0 && p50 > 0 ? { spikeRatio: Math.round(p99 / p50 * 10) / 10 } : {}
    };
    if (!piiSafe(row)) continue;
    const fix = servedFixBlock(r, { route: true });
    out.push(fix ? { ...row, fix } : row);
  }
  out.sort((a, b) => b.p95Ms - a.p95Ms);
  return out;
}
function snapFindings(snap) {
  const arr = Array.isArray(snap.crossCutting) ? snap.crossCutting : [];
  const out = [];
  for (const f of arr) {
    if (!f || typeof f !== "object") continue;
    const item = {
      kind: typeof f.kind === "string" ? f.kind : "unknown",
      name: typeof f.name === "string" ? f.name : "",
      p95Ms: num(f.p95),
      count: num(f.count)
    };
    if (!piiSafe(item)) continue;
    const fix = servedFixBlock(f);
    out.push(fix ? { ...item, fix } : item);
  }
  return out;
}
async function getLiveSessionSummary(windowDays = 7, creds) {
  const cfg = resolveCreds(creds);
  if (!cfg) return null;
  const screens = await fetchScreens(windowDays, cfg);
  if (screens && screens.length > 0) {
    const mapped = screens.filter((s) => typeof s.routeLabel === "string").map((s) => ({
      screen: s.routeLabel,
      sampleCount: s.sampleCount ?? 0,
      p50Ms: s.p50Ms ?? 0,
      p75Ms: s.p75Ms ?? 0,
      p95Ms: s.p95Ms ?? 0,
      worstRating: s.worstRating ?? "good",
      ...typeof s.p99Ms === "number" ? { p99Ms: s.p99Ms } : {},
      ...typeof s.stdevMs === "number" ? { stdevMs: s.stdevMs } : {},
      ...typeof s.spikeRatio === "number" ? { spikeRatio: s.spikeRatio } : {}
    })).filter(piiSafe);
    return {
      available: true,
      source: "boosthis-server",
      windowDays,
      screens: mapped,
      note: NOTE_LIVE
    };
  }
  const snap = await fetchSnapshotObj(cfg);
  if (snap) {
    const rows = snapScreenRows(snap);
    if (rows.length > 0) {
      return {
        available: true,
        source: "boosthis-snapshot",
        windowDays,
        screens: rows.map((r) => ({
          screen: r.screen,
          sampleCount: r.sampleCount,
          p50Ms: r.p50Ms,
          p95Ms: r.p95Ms,
          worstRating: r.worstRating,
          ...typeof r.p99Ms === "number" ? { p99Ms: r.p99Ms } : {},
          ...typeof r.stdevMs === "number" ? { stdevMs: r.stdevMs } : {},
          ...typeof r.spikeRatio === "number" ? { spikeRatio: r.spikeRatio } : {}
        })),
        note: NOTE_SNAPSHOT_FALLBACK
      };
    }
  }
  return null;
}
async function getLiveRecentSamples(limit = 20, name, creds) {
  const cfg = resolveCreds(creds);
  if (!cfg) return null;
  const lim = Math.max(1, Math.min(200, Math.floor(limit) || 20));
  let path = `/samples/list?installId=${encodeURIComponent(cfg.installId)}&limit=${encodeURIComponent(String(lim))}`;
  if (typeof name === "string" && name.length > 0) {
    path += `&routeLabel=${encodeURIComponent(name)}`;
  }
  const data = await fetchJson(path, cfg);
  if (data && Array.isArray(data.items) && data.items.length > 0) {
    const samples = data.items.filter((s) => typeof s.routeLabel === "string").map((s) => ({
      screen: s.routeLabel,
      durationMs: s.durationMs ?? 0,
      rating: s.rating ?? "good",
      ruleId: s.ruleId ?? null,
      at: s.createdAt ?? null
    })).filter(piiSafe);
    return {
      available: true,
      source: "boosthis-server",
      samples,
      count: samples.length
    };
  }
  const snap = await fetchSnapshotObj(cfg);
  if (snap) {
    return {
      available: true,
      source: "boosthis-snapshot",
      samples: [],
      count: 0,
      note: "No individual perf samples are available for this install. The raw per-sample stream is uploaded only in full-telemetry mode; private / issues-only apps (even with shareMeterWithAI) upload only the aggregate snapshot. Use boosthis.session_summary for per-route aggregates or boosthis.snapshot for the full meter page."
    };
  }
  return null;
}
async function getLiveBudgets(windowDays = 7, creds) {
  const cfg = resolveCreds(creds);
  if (!cfg) return null;
  const screens = await fetchScreens(windowDays, cfg);
  if (screens && screens.length > 0) {
    const all = screens.filter((s) => typeof s.routeLabel === "string").map((s) => ({
      screen: s.routeLabel,
      recentP95Ms: s.recentP95Ms ?? null,
      baselineP95Ms: s.olderP95Ms ?? null,
      trend: s.trend ?? "insufficient-data"
    })).filter(piiSafe);
    const regressions = all.filter((r) => r.trend === "regressed");
    return {
      available: true,
      source: "boosthis-server",
      // A DIFFERENT algorithm from the kit's own learned budget, over
      // different data: Boosthis splits the window's uploaded readings into
      // an older and a recent half per route. Named so a reader never mixes
      // its numbers with the device's frozen-baseline verdicts.
      algorithm: "server-window",
      span: `the last ${windowDays} days of readings uploaded from every install of this project`,
      windowDays,
      all,
      regressions
    };
  }
  const snap = await fetchSnapshotObj(cfg);
  if (snap) {
    const all = snapScreenRows(snap).map((r) => ({
      screen: r.screen,
      recentP95Ms: r.p95Ms,
      baselineP95Ms: null,
      trend: "insufficient-data"
    }));
    const cc = Array.isArray(snap.crossCutting) ? snap.crossCutting : [];
    const regressions = [];
    for (const f of cc) {
      if (!f || typeof f !== "object" || f.kind !== "regression") continue;
      const base = f.baseline;
      if (!base || typeof base !== "object") continue;
      const b = base;
      const reg = {
        screen: typeof f.name === "string" ? f.name : "",
        recentP95Ms: num(f.p95),
        baselineP95Ms: num(b.p95),
        deltaPct: num(b.deltaPct),
        trend: "regressed"
      };
      if (piiSafe(reg)) regressions.push(reg);
    }
    if (all.length > 0 || regressions.length > 0) {
      return {
        available: true,
        source: "boosthis-snapshot",
        // A third answer again: the snapshot's Baseline axis, computed by the
        // reporting install itself over its own session. Not comparable with
        // either of the other two.
        algorithm: "snapshot-baseline-axis",
        span: "the reporting install's most recent snapshot",
        windowDays,
        all,
        regressions,
        note: NOTE_SNAPSHOT_FALLBACK
      };
    }
  }
  return null;
}
function routeShortfall(reporting, shown) {
  const omitted = Math.max(0, reporting - shown);
  if (omitted <= 0) return { routesOmitted: 0, routesReporting: reporting };
  return {
    routesReporting: reporting,
    routesOmitted: omitted,
    routesOmittedNote: `Showing ${shown} of ${reporting} routes that reported here — ${omitted} route${omitted === 1 ? " is" : "s are"} not listed. Raise the limit to see more.`
  };
}
async function getLiveWhatNext(limit = 5, creds) {
  const cfg = resolveCreds(creds);
  if (!cfg) return null;
  const lim = Math.max(1, Math.min(50, Math.floor(limit) || 5));
  const screens = await fetchScreens(7, cfg);
  if (screens && screens.length > 0) {
    const labelled = screens.filter((s) => typeof s.routeLabel === "string");
    const routes = labelled.map((s) => {
      const p95 = s.p95Ms ?? 0;
      const rating = s.worstRating ?? "good";
      const trend = s.trend ?? "insufficient-data";
      const reason = `p95 ${p95}ms · rated ${rating}` + (trend === "regressed" ? " · regressing" : "");
      const row = { screen: s.routeLabel, p95Ms: p95, worstRating: rating, trend, reason };
      return { row, fix: servedFixBlock(s, { route: true }) };
    }).filter((e) => piiSafe(e.row)).slice(0, lim).map((e) => e.fix ? { ...e.row, fix: e.fix } : e.row);
    const missing = routes.filter((r) => isProblemRoute(r.worstRating) && !("fix" in r)).length;
    return {
      available: true,
      source: "boosthis-server",
      routes,
      ...routeShortfall(labelled.length, routes.length),
      ...fixAnswersFields(missing)
    };
  }
  const snap = await fetchSnapshotObj(cfg);
  if (snap) {
    const rows = snapScreenRows(snap);
    const findings = snapFindings(snap);
    if (rows.length > 0 || findings.length > 0) {
      const routes = rows.slice(0, lim).map((r) => ({
        screen: r.screen,
        p95Ms: r.p95Ms,
        worstRating: r.worstRating,
        trend: "insufficient-data",
        reason: `p95 ${r.p95Ms}ms · rated ${r.worstRating}`,
        ...r.fix ? { fix: r.fix } : {}
      }));
      const shownFindings = findings.slice(0, lim);
      const missing = routes.filter((r) => isProblemRoute(r.worstRating) && !("fix" in r)).length + shownFindings.filter((f) => !f.fix).length;
      return {
        available: true,
        source: "boosthis-snapshot",
        routes,
        ...routeShortfall(rows.length, routes.length),
        findings: shownFindings,
        findingsOmitted: Math.max(0, findings.length - lim),
        note: NOTE_SNAPSHOT_FALLBACK,
        ...fixAnswersFields(missing)
      };
    }
  }
  return null;
}
const NOTE_SNAPSHOT = "Live full-bubble snapshot read from your Boosthis server (the whole meter page — boot ladder, per-route rows, cross-cutting findings, axes, summary).";
async function getLiveSnapshot(creds) {
  const cfg = resolveCreds(creds);
  if (!cfg) return null;
  const snap = await fetchSnapshotObj(cfg);
  if (snap === null) return null;
  const crossCutting = Array.isArray(snap.crossCutting) ? snap.crossCutting : [];
  const missing = crossCutting.filter(
    (f) => f !== null && typeof f === "object" && servedFixBlock(f) === null
  ).length;
  return {
    available: true,
    source: "boosthis-server",
    snapshot: snap,
    note: NOTE_SNAPSHOT,
    ...fixAnswersFields(missing)
  };
}
const NOTE_CRASH_RISK = "Potential-crashes risk feed read from your Boosthis server: the crash classes your app has ALREADY recorded (uncaught errors, unhandled promise rejections, and caught render near-misses), newest-first, joined with the event-loop (ANR-style) Stability summary from your latest snapshot. Each crash class carries relatedRules — fetch them with boosthis.get_rule for the fix. Signatures are code-derived (error name + redacted frame), never the raw error message, so no user value is exposed.";
const DEFAULT_CRASH_RULES = [
  "unbounded-json-body",
  "regex-redos",
  "fetch-no-timeout-node"
];
const CRASH_KIND_RULES = {
  uncaught: DEFAULT_CRASH_RULES,
  unhandledRejection: [
    "fetch-no-timeout-node",
    "db-query-no-timeout",
    "client-retry-storm"
  ],
  render: DEFAULT_CRASH_RULES
};
const STABILITY_RULES = [
  "event-loop-monitoring-missing",
  "sync-fs-in-handler",
  "sync-crypto-on-hot-path"
];
async function getLiveCrashRisk(creds) {
  const cfg = resolveCreds(creds);
  if (!cfg) return null;
  const data = await fetchJson(
    `/crashes/risk?installId=${encodeURIComponent(cfg.installId)}`,
    cfg
  );
  if (!data) return null;
  const crashesIn = Array.isArray(data.crashes) ? data.crashes : [];
  const crashes = crashesIn.map((c) => {
    const kind = typeof c.kind === "string" ? c.kind : "uncaught";
    return {
      signature: typeof c.signature === "string" ? c.signature : "",
      errorName: typeof c.errorName === "string" ? c.errorName : "",
      kind,
      redactedFrame: typeof c.redactedFrame === "string" ? c.redactedFrame : "",
      countBucket: typeof c.countBucket === "string" ? c.countBucket : "",
      occurrences: num(c.occurrences),
      firstSeenAt: typeof c.firstSeenAt === "string" ? c.firstSeenAt : null,
      lastSeenAt: typeof c.lastSeenAt === "string" ? c.lastSeenAt : null,
      relatedRules: CRASH_KIND_RULES[kind] ?? DEFAULT_CRASH_RULES
    };
  }).filter(piiSafe);
  const stabilityRaw = data.stability && typeof data.stability === "object" && !Array.isArray(data.stability) ? data.stability : null;
  const stability = stabilityRaw && piiSafe(stabilityRaw) ? stabilityRaw : null;
  if (!piiSafe({ crashes, stability })) return null;
  return {
    available: true,
    source: "boosthis-server",
    crashClasses: num(data.crashClasses),
    totalOccurrences: num(data.totalOccurrences),
    crashes,
    stability,
    stabilityRules: STABILITY_RULES,
    note: NOTE_CRASH_RISK
  };
}
const NOTE_FULL_STACK_TRACE = "Latest full-stack trace read from your Boosthis server: one user action stitched across the layers this install recorded, as a waterfall of spans (layer, code-defined route label, duration, start offset, rating) plus an honest full-stack score rated against the shared TTI thresholds. Each span's slowestLayerRules point at the rules most likely to fix that layer — fetch them with boosthis.get_rule. NOTE: a per-install read token is self-scoped, so this shows only THIS install's own spans; pass an account_token on the hosted MCP to unlock the full stitched RN → Node → Python waterfall across all your apps.";
const LAYER_RULES = {
  rn: [
    "per-item-fetch-waterfall",
    "client-refetch-no-cache",
    "screen-load-budget-500ms-p75",
    "oversized-thumbnail-fetch"
  ],
  node: [
    "sync-fs-in-handler",
    "await-in-loop",
    "n-plus-one-orm-node",
    "no-keepalive-outbound"
  ],
  py: [
    "n-plus-one-orm-query",
    "sync-io-in-async-handler",
    "fastapi-sync-route-blocks-event-loop",
    "db-statement-timeout-missing"
  ]
};
async function getLiveFullStackTrace(creds) {
  const cfg = resolveCreds(creds);
  if (!cfg) return null;
  const data = await fetchJson(
    `/traces/latest?installId=${encodeURIComponent(cfg.installId)}`,
    cfg
  );
  if (!data) return null;
  const mapSpan = (s) => ({
    layer: typeof s.layer === "string" ? s.layer : "",
    routeLabel: typeof s.routeLabel === "string" ? s.routeLabel : "",
    durationMs: num(s.durationMs),
    startOffsetMs: num(s.startOffsetMs),
    rating: typeof s.rating === "string" ? s.rating : "",
    isRoot: s.isRoot === true
  });
  const spansIn = Array.isArray(data.spans) ? data.spans : [];
  const spans = spansIn.map(mapSpan).filter(piiSafe);
  const slowestRaw = data.slowest && typeof data.slowest === "object" ? data.slowest : null;
  const slowestMapped = slowestRaw ? mapSpan(slowestRaw) : null;
  const slowest = slowestMapped && piiSafe(slowestMapped) ? slowestMapped : null;
  const layers = (Array.isArray(data.layers) ? data.layers : []).filter(
    (l) => typeof l === "string"
  );
  const traceId = typeof data.traceId === "string" ? data.traceId : "";
  const summary = typeof data.summary === "string" ? data.summary : "";
  if (!piiSafe({ traceId, layers, summary, slowest, spans })) return null;
  return {
    available: true,
    source: "boosthis-server",
    traceId,
    spanCount: num(data.spanCount),
    layers,
    rootLayer: typeof data.rootLayer === "string" ? data.rootLayer : null,
    rootDurationMs: num(data.rootDurationMs),
    score: num(data.score),
    scoreRating: typeof data.scoreRating === "string" ? data.scoreRating : null,
    summary,
    slowest,
    slowestLayerRules: slowest && LAYER_RULES[slowest.layer] ? LAYER_RULES[slowest.layer] : [],
    spans,
    note: NOTE_FULL_STACK_TRACE
  };
}
export {
  _resetLiveDataForTests,
  configureLiveData,
  fixAnswersFields,
  getLiveBudgets,
  getLiveCrashRisk,
  getLiveFullStackTrace,
  getLiveRecentSamples,
  getLiveSessionSummary,
  getLiveSnapshot,
  getLiveWhatNext,
  isLiveDataConfigured,
  servedFixBlock
};
