// @ts-nocheck
/* eslint-disable */
// Built from src/aiCalls.ts so plain node can run the kit. Do not edit.
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import { currentRequestScope } from "./repeatedWork.js";
import {
  aiProviderCodeOrDeclared,
  declaredAiEndpointCount,
  AI_PROVIDERS,
  DECLARED_PROVIDER_CODE
} from "./aiProviders.js";
import {
  estimateCostMicros,
  readAiHeaders,
  readAiOutcome,
  readAiUsage,
  streamLineIsInteresting,
  streamLineIsTerminal
} from "./aiUsage.js";
import { settledFromMs } from "./settleRule.js";
const MAX_DISTINCT_PROMPTS = 128;
const MAX_PROMPT_CHARS = 4096;
const DURATION_RING = 256;
const MAX_STREAM_CARRY = 8192;
const MAX_ERROR_BODY_CHARS = 8192;
const AI_STREAM_STALL_MS = 1e4;
const AI_CACHEABLE_INPUT_TOKENS = 2048;
const AI_SERIAL_THRESHOLD = 2;
const UNWATCHABLE_HTTP_CLIENTS = [
  "axios",
  "node-fetch",
  "got",
  "superagent",
  "request",
  "needle"
];
function tallyFor(scope) {
  if (!scope) return null;
  if (!scope.ai) {
    scope.ai = {
      prompts: /* @__PURE__ */ new Map(),
      calls: 0,
      ms: 0,
      serialRun: 0,
      runLength: 0,
      lastEndAt: -1,
      costMicros: 0
    };
  }
  return scope.ai;
}
let watchedRequests = 0;
let watchedRequestMs = 0;
let aiMs = 0;
let callCount = 0;
let streamCount = 0;
let stallCount = 0;
let failCount = 0;
let rateLimitedCount = 0;
let quotaCount = 0;
let timeoutCount = 0;
let truncatedCount = 0;
let filteredCount = 0;
let noTimeLimitCalls = 0;
let retryNoBackoffCount = 0;
let tokensIn = 0;
let tokensOut = 0;
let cachedIn = 0;
let costMicros = 0;
let reportedCostCalls = 0;
let pricedCalls = 0;
let unpricedCalls = 0;
let worstRequestCostMicros = 0;
let usageMissingCalls = 0;
let streamUsageMissingCalls = 0;
let declaredCalls = 0;
let declaredUnpricedCalls = 0;
let promptRepeatWorst = 0;
let promptRepeatRequests = 0;
let serialWorst = 0;
let serialRequests = 0;
let headroomReads = 0;
let worstRequestsPct = null;
let worstTokensPct = null;
const HEADROOM_RING = 512;
const HEADROOM_WINDOW_MS = 30 * 6e4;
const headroomSamples = [];
function settledHeadroom() {
  const now = Date.now();
  const edge = Math.max(settledFromMs("startupEvent"), now - HEADROOM_WINDOW_MS);
  const judged = headroomSamples.filter((r) => r.t >= edge && r.t <= now);
  const median = (xs) => {
    if (xs.length === 0) return null;
    const sorted = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  return {
    headroomSettledReads: judged.length,
    typicalRequestsPct: median(judged.flatMap((r) => r.req === null ? [] : [r.req])),
    typicalTokensPct: median(judged.flatMap((r) => r.tok === null ? [] : [r.tok]))
  };
}
let worstRetryAfterMs = 0;
let serverMsTotal = 0;
let serverMsCalls = 0;
const AI_SHAPED_PATHS = [
  // OpenAI-compatible — the shape almost every self-hosted server exposes.
  "/v1/chat/completions",
  "/v1/completions",
  "/v1/responses",
  "/v1/embeddings",
  // Anthropic-compatible.
  "/v1/messages",
  // Ollama's native API.
  "/api/generate",
  "/api/chat",
  "/api/embeddings",
  // Hugging Face text-generation-inference.
  "/generate_stream"
];
let unclassifiedAiShaped = 0;
const providersSeen = /* @__PURE__ */ new Set();
const callsByProvider = /* @__PURE__ */ new Map();
const durations = [];
const ttfts = [];
const settledTtfts = [];
const ttftSeenProviders = /* @__PURE__ */ new Set();
let windowStartedAt = 0;
const lastRefusal = /* @__PURE__ */ new Map();
function fnv1a(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function promptIdentity(body) {
  try {
    if (typeof body !== "string" || !body) return 0;
    const head = body.length > MAX_PROMPT_CHARS ? body.slice(0, MAX_PROMPT_CHARS) : body;
    return fnv1a(`${body.length}:${head}`) || 1;
  } catch {
    return 0;
  }
}
function nowMs() {
  try {
    const p = globalThis.performance;
    if (typeof p?.now === "function") return p.now();
  } catch {
  }
  return Date.now();
}
function pushRing(ring, value) {
  ring.push(value);
  if (ring.length > DURATION_RING) ring.shift();
}
function fileCall(ctx) {
  if (ctx.filed) return;
  ctx.filed = true;
  try {
    const end = nowMs();
    const totalMs = Math.max(0, end - ctx.startedAt);
    callCount++;
    providersSeen.add(ctx.provider);
    callsByProvider.set(
      ctx.provider,
      (callsByProvider.get(ctx.provider) ?? 0) + 1
    );
    pushRing(durations, totalMs);
    if (!ctx.hadTimeLimit) noTimeLimitCalls++;
    if (ctx.streamed) {
      streamCount++;
      if (ctx.firstChunkAt > 0) {
        const ttft = Math.max(0, ctx.firstChunkAt - ctx.startedAt);
        pushRing(ttfts, ttft);
        const firstForProvider = !ttftSeenProviders.has(ctx.provider);
        if (firstForProvider && ttftSeenProviders.size < 1e3) ttftSeenProviders.add(ctx.provider);
        const startedEpochMs = Date.now() - totalMs;
        if (!firstForProvider && startedEpochMs >= settledFromMs("latencyTail")) {
          pushRing(settledTtfts, ttft);
        }
      }
      if (ctx.worstGapMs >= AI_STREAM_STALL_MS) stallCount++;
      if (!ctx.sawTerminator) truncatedCount++;
      if (!ctx.usage || ctx.usage.reported === 0) streamUsageMissingCalls++;
    }
    const declared = ctx.provider === DECLARED_PROVIDER_CODE;
    if (declared) declaredCalls++;
    if (!ctx.usage || ctx.usage.reported === 0) {
      usageMissingCalls++;
      unpricedCalls++;
    } else {
      const u = ctx.usage;
      tokensIn += u.tokensIn;
      tokensOut += u.tokensOut;
      cachedIn += u.cachedIn;
      let micros = u.reportedCostMicros;
      if (micros !== null) {
        reportedCostCalls++;
        pricedCalls++;
      } else if (declared) {
        micros = null;
        unpricedCalls++;
        declaredUnpricedCalls++;
      } else {
        micros = estimateCostMicros(u);
        if (micros !== null) pricedCalls++;
        else unpricedCalls++;
      }
      if (micros !== null && micros > 0) {
        costMicros += micros;
        const t = tallyFor(ctx.scope);
        if (t) t.costMicros += micros;
      }
    }
    const tally = tallyFor(ctx.scope);
    if (tally) {
      tally.calls++;
      tally.ms += totalMs;
      if (ctx.promptId !== 0) {
        if (tally.prompts.has(ctx.promptId) || tally.prompts.size < MAX_DISTINCT_PROMPTS) {
          tally.prompts.set(
            ctx.promptId,
            (tally.prompts.get(ctx.promptId) ?? 0) + 1
          );
        }
      }
      if (tally.lastEndAt >= 0 && ctx.startedAt >= tally.lastEndAt) {
        tally.runLength = Math.max(2, tally.runLength + 1);
      } else {
        tally.runLength = 1;
      }
      if (tally.runLength > tally.serialRun) tally.serialRun = tally.runLength;
      tally.lastEndAt = end;
      if (tally.costMicros > worstRequestCostMicros) {
        worstRequestCostMicros = tally.costMicros;
      }
    }
  } catch {
  }
}
function noteTransportFailure(err) {
  try {
    const name = String(err?.name ?? "");
    const code = String(err?.code ?? "");
    failCount++;
    if (/timeout/i.test(name) || /timeout/i.test(code) || name === "AbortError" || name === "TimeoutError") {
      timeoutCount++;
    }
  } catch {
  }
}
function noteQuietSinceLastChunk(ctx) {
  try {
    if (ctx.lastChunkAt > 0) {
      ctx.worstGapMs = Math.max(ctx.worstGapMs, nowMs() - ctx.lastChunkAt);
    }
  } catch {
  }
}
function noteHeadroom(ctx, res) {
  try {
    const read = readAiHeaders((name) => res.headers.get(name));
    let sawAny = false;
    if (read.requestsRemaining !== null && read.requestsLimit) {
      const pct = Math.max(
        0,
        Math.min(100, read.requestsRemaining / read.requestsLimit * 100)
      );
      worstRequestsPct = worstRequestsPct === null ? pct : Math.min(worstRequestsPct, pct);
      sawAny = true;
    }
    if (read.tokensRemaining !== null && read.tokensLimit) {
      const pct = Math.max(
        0,
        Math.min(100, read.tokensRemaining / read.tokensLimit * 100)
      );
      worstTokensPct = worstTokensPct === null ? pct : Math.min(worstTokensPct, pct);
      sawAny = true;
    }
    if (read.retryAfterMs !== null) {
      worstRetryAfterMs = Math.max(worstRetryAfterMs, read.retryAfterMs);
      sawAny = true;
    }
    if (sawAny) headroomReads++;
    if (sawAny) {
      headroomSamples.push({
        t: Date.now(),
        req: read.requestsRemaining !== null && read.requestsLimit ? Math.max(0, Math.min(100, read.requestsRemaining / read.requestsLimit * 100)) : null,
        tok: read.tokensRemaining !== null && read.tokensLimit ? Math.max(0, Math.min(100, read.tokensRemaining / read.tokensLimit * 100)) : null
      });
      if (headroomSamples.length > HEADROOM_RING) headroomSamples.shift();
    }
    if (read.serverMs !== null) {
      serverMsTotal += read.serverMs;
      serverMsCalls++;
    }
    if (res.status === 429) {
      const prev = lastRefusal.get(ctx.provider);
      const waited = prev ? ctx.startedAt - prev.at : Infinity;
      if (prev && waited < prev.waitMs) retryNoBackoffCount++;
      lastRefusal.set(ctx.provider, {
        at: nowMs(),
        waitMs: read.retryAfterMs ?? 1e3
      });
    }
  } catch {
  }
}
function classifyRefusal(ctx, res) {
  failCount++;
  if (res.status === 429) rateLimitedCount++;
  if (res.status === 402) quotaCount++;
  let copy = null;
  try {
    copy = res.clone();
  } catch {
    copy = null;
  }
  if (!copy) return;
  void copy.text().then((text) => {
    try {
      if (!text || text.length > MAX_ERROR_BODY_CHARS) return;
      const parsed = JSON.parse(text);
      const outcome = readAiOutcome(parsed);
      if (outcome.quota) quotaCount++;
      else if (outcome.rateLimited && res.status !== 429) rateLimitedCount++;
      if (outcome.filtered) filteredCount++;
    } catch {
    }
  }).catch(() => {
  });
}
function noteBody(ctx, parsed) {
  try {
    const usage = readAiUsage(parsed);
    if (usage.reported === 1) {
      ctx.usage = ctx.usage ? {
        reported: 1,
        tokensIn: Math.max(ctx.usage.tokensIn, usage.tokensIn),
        tokensOut: Math.max(ctx.usage.tokensOut, usage.tokensOut),
        cachedIn: Math.max(ctx.usage.cachedIn, usage.cachedIn),
        reportedCostMicros: usage.reportedCostMicros ?? ctx.usage.reportedCostMicros,
        priceCode: usage.priceCode || ctx.usage.priceCode
      } : usage;
    }
    const outcome = readAiOutcome(parsed);
    if (outcome.truncated) truncatedCount++;
    if (outcome.filtered) filteredCount++;
    if (outcome.ended) ctx.sawTerminator = true;
  } catch {
  }
}
function observeStream(ctx, res) {
  let wrapped;
  const original = res.body;
  if (!original) {
    fileCall(ctx);
    return;
  }
  const build = () => {
    if (wrapped !== void 0) return wrapped ?? null;
    try {
      const reader = original.getReader();
      const decoder = new TextDecoder();
      let carry = "";
      wrapped = new ReadableStream({
        async pull(controller) {
          let out;
          try {
            out = await reader.read();
          } catch (err) {
            noteQuietSinceLastChunk(ctx);
            noteTransportFailure(err);
            fileCall(ctx);
            controller.error(err);
            return;
          }
          if (out.done) {
            noteQuietSinceLastChunk(ctx);
            try {
              controller.close();
            } finally {
              fileCall(ctx);
            }
            return;
          }
          try {
            const at = nowMs();
            if (ctx.firstChunkAt === 0) ctx.firstChunkAt = at;
            else ctx.worstGapMs = Math.max(ctx.worstGapMs, at - ctx.lastChunkAt);
            ctx.lastChunkAt = at;
            carry += decoder.decode(out.value, { stream: true });
            if (carry.length > MAX_STREAM_CARRY && !carry.includes("\n")) {
              carry = "";
            }
            let nl = carry.indexOf("\n");
            while (nl >= 0) {
              const line = carry.slice(0, nl);
              carry = carry.slice(nl + 1);
              if (streamLineIsTerminal(line)) ctx.sawTerminator = true;
              if (streamLineIsInteresting(line)) {
                const brace = line.indexOf("{");
                if (brace >= 0) {
                  try {
                    noteBody(ctx, JSON.parse(line.slice(brace)));
                  } catch {
                  }
                }
              }
              nl = carry.indexOf("\n");
            }
          } catch {
          }
          if (out.value !== void 0) controller.enqueue(out.value);
        },
        cancel(reason) {
          try {
            void reader.cancel(reason);
          } finally {
            fileCall(ctx);
          }
        }
      });
    } catch {
      wrapped = null;
    }
    return wrapped ?? null;
  };
  try {
    Object.defineProperty(res, "body", {
      configurable: true,
      get() {
        return build() ?? original;
      }
    });
  } catch {
    fileCall(ctx);
  }
}
function observeBody(ctx, res) {
  let done = false;
  let reading = false;
  const finish = () => {
    if (done) return;
    done = true;
    fileCall(ctx);
  };
  const shadow = (name) => {
    try {
      const original = res[name];
      if (typeof original !== "function") return;
      Object.defineProperty(res, name, {
        configurable: true,
        writable: true,
        value: async function(...args) {
          reading = true;
          let value;
          try {
            value = await original.apply(
              res,
              args
            );
          } catch (err) {
            finish();
            throw err;
          }
          try {
            if (name === "json") noteBody(ctx, value);
            else if (typeof value === "string" && value.length <= MAX_ERROR_BODY_CHARS) {
              noteBody(ctx, JSON.parse(value));
            }
          } catch {
          }
          finish();
          return value;
        }
      });
    } catch {
    }
  };
  shadow("json");
  shadow("text");
  queueMicrotask(() => {
    setTimeout(() => {
      if (!reading) finish();
    }, 0).unref?.();
  });
}
let realFetch = null;
let installedFetch = null;
let armed = false;
let feedOn = false;
function providerFor(input, init) {
  const target = targetOf(input);
  return target && target.absolute ? aiProviderCodeOrDeclared(target.host) : 0;
  void init;
}
function targetOf(input) {
  try {
    let href = null;
    if (typeof input === "string") href = input;
    else if (input && typeof input === "object") {
      const asUrl = input;
      if (typeof asUrl.href === "string") href = asUrl.href;
      else if (typeof asUrl.url === "string") href = asUrl.url;
    }
    if (!href) return null;
    let url;
    let absolute = true;
    try {
      url = new URL(href);
    } catch {
      absolute = false;
      url = new URL(href, "http://localhost");
    }
    return { host: url.hostname, path: url.pathname, absolute };
  } catch {
    return null;
  }
}
function methodOf(input, init) {
  try {
    const fromInit = init?.method;
    if (typeof fromInit === "string" && fromInit) return fromInit.toUpperCase();
    const fromInput = input?.method;
    if (typeof fromInput === "string" && fromInput) {
      return fromInput.toUpperCase();
    }
    return "GET";
  } catch {
    return "GET";
  }
}
function noteUnclassifiedAiShape(target, method) {
  try {
    if (!target || !target.absolute) return;
    if (method !== "POST") return;
    const path = target.path.toLowerCase().replace(/\/+$/, "");
    if (!path || !AI_SHAPED_PATHS.includes(path)) return;
    unclassifiedAiShaped++;
  } catch {
  }
}
function armAiCalls() {
  if (armed || isBoosthisDisabled()) return;
  armed = true;
  feedOn = true;
  if (windowStartedAt === 0) windowStartedAt = nowMs();
  try {
    const current = globalThis.fetch;
    if (typeof current !== "function") return;
    realFetch = current;
    const original = current;
    const wrapper = function(input, init) {
      const call = original;
      if (!feedOn || installedFetch !== wrapper || isKitLocked()) {
        return call.call(globalThis, input, init);
      }
      let provider = 0;
      let target = null;
      try {
        target = targetOf(input);
        provider = target && target.absolute ? aiProviderCodeOrDeclared(target.host) : 0;
      } catch {
        provider = 0;
        target = null;
      }
      if (provider === 0) {
        noteUnclassifiedAiShape(target, methodOf(input, init));
        return call.call(globalThis, input, init);
      }
      return observedCall(call, provider, input, init);
    };
    installedFetch = wrapper;
    globalThis.fetch = wrapper;
  } catch {
    realFetch = null;
    installedFetch = null;
  }
}
async function observedCall(call, provider, input, init) {
  let ctx = null;
  try {
    const opts = init ?? null;
    ctx = {
      provider,
      scope: currentRequestScope(),
      startedAt: nowMs(),
      headersAt: 0,
      firstChunkAt: 0,
      lastChunkAt: 0,
      worstGapMs: 0,
      promptId: promptIdentity(opts?.body),
      // A `Request` object always carries a signal of its own, so only the
      // options form can honestly answer "did this call have a time limit?".
      hadTimeLimit: !!opts && opts.signal != null,
      streamed: false,
      sawTerminator: false,
      usage: null,
      filed: false
    };
  } catch {
    ctx = null;
  }
  if (!ctx) return call.call(globalThis, input, init);
  let res;
  try {
    res = await call.call(globalThis, input, init);
  } catch (err) {
    try {
      noteTransportFailure(err);
      fileCall(ctx);
    } catch {
    }
    throw err;
  }
  try {
    ctx.headersAt = nowMs();
    noteHeadroom(ctx, res);
    if (res.status >= 400) {
      classifyRefusal(ctx, res);
      fileCall(ctx);
      return res;
    }
    const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
    ctx.streamed = ctype.includes("event-stream") || ctype.includes("x-ndjson");
    if (ctx.streamed) observeStream(ctx, res);
    else observeBody(ctx, res);
  } catch {
    fileCall(ctx);
  }
  return res;
}
function unarmAiCalls() {
  feedOn = false;
  try {
    const g = globalThis;
    if (realFetch && g.fetch === installedFetch) g.fetch = realFetch;
  } catch {
  }
  realFetch = null;
  installedFetch = null;
  armed = false;
}
function endAiWork(scope, requestMs) {
  try {
    if (!scope) return;
    const tally = scope.ai;
    scope.ai = void 0;
    if (!tally || tally.calls === 0) return;
    const wall = Number.isFinite(requestMs) && requestMs > 0 ? requestMs : 0;
    watchedRequests++;
    watchedRequestMs += wall;
    aiMs += wall > 0 ? Math.min(tally.ms, wall) : tally.ms;
    let worst = 0;
    for (const n of tally.prompts.values()) if (n > worst) worst = n;
    if (worst > promptRepeatWorst) promptRepeatWorst = worst;
    if (worst > 1) promptRepeatRequests++;
    if (tally.serialRun > serialWorst) serialWorst = tally.serialRun;
    if (tally.serialRun >= AI_SERIAL_THRESHOLD) serialRequests++;
  } catch {
  }
}
let cachedUnwatched = -1;
let cachedUnwatchedAt = 0;
const UNWATCHED_RECHECK_MS = 1e4;
function unwatchedAiClientCount() {
  if (!armed) return 0;
  const now = Date.now();
  if (cachedUnwatched >= 0 && now - cachedUnwatchedAt < UNWATCHED_RECHECK_MS) {
    return cachedUnwatched;
  }
  let n = 0;
  try {
    const cache = globalThis.require?.cache;
    const keys = cache ? Object.keys(cache) : (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.keys(globalThis.__boosthisModuleCache ?? {})
    );
    for (const name of UNWATCHABLE_HTTP_CLIENTS) {
      const needle = `/node_modules/${name}/`;
      if (keys.some((k) => k.includes(needle))) n++;
    }
  } catch {
    n = 0;
  }
  cachedUnwatched = n;
  cachedUnwatchedAt = Date.now();
  return n;
}
function percentile(ring, p) {
  if (ring.length === 0) return 0;
  const sorted = [...ring].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(p / 100 * sorted.length) - 1)
  );
  return Math.round(sorted[idx]);
}
function getAiCallStats() {
  let topProvider = 0;
  let topCalls = 0;
  for (const [code, n] of callsByProvider) {
    if (n > topCalls) {
      topCalls = n;
      topProvider = code;
    }
  }
  return {
    watchedRequests,
    watchedRequestMs,
    aiMs,
    callCount,
    providerCount: providersSeen.size,
    topProvider,
    p75Ms: percentile(durations, 75),
    worstMs: durations.length ? Math.max(...durations) : 0,
    streamCount,
    ttftP75Ms: percentile(settledTtfts, 75),
    ttftSettledCount: settledTtfts.length,
    stallCount,
    failCount,
    rateLimitedCount,
    quotaCount,
    timeoutCount,
    truncatedCount,
    filteredCount,
    serverMsP75: serverMsCalls > 0 ? Math.round(serverMsTotal / serverMsCalls) : 0,
    serverMsCalls,
    unwatchedClients: unwatchedAiClientCount(),
    unclassifiedCalls: unclassifiedAiShaped,
    tokensIn,
    tokensOut,
    cachedIn,
    costMicros,
    reportedCostCalls,
    pricedCalls,
    unpricedCalls,
    worstRequestCostMicros,
    windowMs: windowStartedAt > 0 ? Math.max(0, nowMs() - windowStartedAt) : 0,
    usageMissingCalls,
    streamUsageMissingCalls,
    declaredCalls,
    declaredUnpricedCalls,
    declaredEndpoints: declaredAiEndpointCount(),
    promptRepeatWorst,
    promptRepeatRequests,
    serialWorst,
    serialRequests,
    noTimeLimitCalls,
    retryNoBackoffCount,
    headroomReads,
    ...settledHeadroom(),
    worstRequestsPct,
    worstTokensPct,
    worstRetryAfterMs
  };
}
function clearAiCalls() {
  unarmAiCalls();
  watchedRequests = 0;
  watchedRequestMs = 0;
  aiMs = 0;
  callCount = 0;
  streamCount = 0;
  stallCount = 0;
  failCount = 0;
  rateLimitedCount = 0;
  quotaCount = 0;
  timeoutCount = 0;
  truncatedCount = 0;
  filteredCount = 0;
  noTimeLimitCalls = 0;
  retryNoBackoffCount = 0;
  tokensIn = 0;
  tokensOut = 0;
  cachedIn = 0;
  costMicros = 0;
  reportedCostCalls = 0;
  pricedCalls = 0;
  unpricedCalls = 0;
  worstRequestCostMicros = 0;
  usageMissingCalls = 0;
  streamUsageMissingCalls = 0;
  declaredCalls = 0;
  declaredUnpricedCalls = 0;
  promptRepeatWorst = 0;
  promptRepeatRequests = 0;
  serialWorst = 0;
  serialRequests = 0;
  headroomReads = 0;
  headroomSamples.length = 0;
  settledTtfts.length = 0;
  ttftSeenProviders.clear();
  worstRequestsPct = null;
  worstTokensPct = null;
  worstRetryAfterMs = 0;
  serverMsTotal = 0;
  serverMsCalls = 0;
  unclassifiedAiShaped = 0;
  providersSeen.clear();
  callsByProvider.clear();
  lastRefusal.clear();
  durations.length = 0;
  ttfts.length = 0;
  windowStartedAt = 0;
  cachedUnwatched = -1;
  cachedUnwatchedAt = 0;
}
function collectAiFindings() {
  if (isBoosthisDisabled()) return [];
  const out = [];
  try {
    if (callCount === 0) return out;
    if (noTimeLimitCalls > 0) {
      out.push({
        kind: "ai-no-timeout",
        name: "AI call",
        p95: worstRing(durations),
        count: noTimeLimitCalls,
        hint: "AI calls were made with no time limit, so one slow answer can hold a request open indefinitely."
      });
    }
    if (retryNoBackoffCount > 0) {
      out.push({
        kind: "ai-retry-no-backoff",
        name: "AI call",
        p95: worstRetryAfterMs,
        count: retryNoBackoffCount,
        hint: "A refused AI call was retried sooner than the provider asked, which extends the refusal instead of clearing it."
      });
    }
    if (serialRequests > 0 && serialWorst >= AI_SERIAL_THRESHOLD) {
      out.push({
        kind: "ai-serial-calls",
        name: "AI call",
        p95: serialWorst,
        count: serialRequests,
        hint: "Several AI calls ran one after another inside one request when they could have run together."
      });
    }
    if (promptRepeatWorst > 1) {
      out.push({
        kind: "ai-duplicate-prompt",
        name: "AI call",
        p95: promptRepeatWorst,
        count: promptRepeatRequests,
        hint: "The same prompt was sent more than once inside one request, so the same tokens were paid for twice."
      });
    }
    const usageCalls = Math.max(0, callCount - usageMissingCalls);
    if (cachedIn === 0 && tokensIn > 0 && usageCalls >= 2 && tokensIn / usageCalls >= AI_CACHEABLE_INPUT_TOKENS) {
      out.push({
        kind: "ai-cache-cold",
        name: "AI call",
        p95: Math.round(tokensIn / usageCalls),
        count: usageCalls,
        hint: "Large prompts are being sent with the provider's prompt cache never hit, so the shared prefix is paid for in full every time."
      });
    }
    if (streamUsageMissingCalls > 0) {
      out.push({
        kind: "ai-stream-usage-missing",
        name: "AI call",
        p95: streamCount,
        count: streamUsageMissingCalls,
        hint: "Streamed answers reported no usage because the call never asked for it, so their cost cannot be seen."
      });
    }
  } catch {
  }
  return out;
}
function worstRing(ring) {
  return ring.length ? Math.max(...ring) : 0;
}
const __aiCallsInternals = {
  promptIdentity,
  providerFor,
  fileCall,
  tallyFor,
  isArmed: () => armed,
  providerCount: () => AI_PROVIDERS.length,
  /** File one already-measured call without going through `fetch`. Used by the
   *  tests and by the Python-parity fixtures; never on a live path. */
  /** Fold one reply's published rate-limit headers, as a reply would (the
   *  start-up rule's pair tests). */
  noteHeadroomHeaders(provider, headers, status = 200) {
    noteHeadroom(
      { provider, startedAt: nowMs() },
      { status, headers: new Headers(headers) }
    );
  },
  fileSynthetic(ctx) {
    fileCall({
      provider: ctx.provider,
      scope: ctx.scope ?? currentRequestScope(),
      startedAt: ctx.startedAt ?? nowMs(),
      headersAt: ctx.headersAt ?? 0,
      firstChunkAt: ctx.firstChunkAt ?? 0,
      lastChunkAt: ctx.lastChunkAt ?? 0,
      worstGapMs: ctx.worstGapMs ?? 0,
      promptId: ctx.promptId ?? 0,
      hadTimeLimit: ctx.hadTimeLimit ?? true,
      streamed: ctx.streamed ?? false,
      sawTerminator: ctx.sawTerminator ?? true,
      usage: ctx.usage ?? null,
      filed: false
    });
  }
};
export {
  AI_CACHEABLE_INPUT_TOKENS,
  AI_SERIAL_THRESHOLD,
  AI_STREAM_STALL_MS,
  __aiCallsInternals,
  armAiCalls,
  clearAiCalls,
  collectAiFindings,
  endAiWork,
  getAiCallStats,
  unarmAiCalls,
  unwatchedAiClientCount
};
