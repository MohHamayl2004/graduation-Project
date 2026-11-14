// @ts-nocheck
/* eslint-disable */
// Built from src/aiUsage.ts so plain node can run the kit. Do not edit.
const AI_USAGE_PATHS = {
  /** Tokens the app sent. */
  tokensIn: [
    ["usage", "prompt_tokens"],
    // OpenAI chat/completions, Groq, Together, …
    ["usage", "input_tokens"],
    // OpenAI responses API, Anthropic
    ["usageMetadata", "promptTokenCount"],
    // Google
    ["meta", "billed_units", "input_tokens"]
    // Cohere
  ],
  /** Tokens the model produced. */
  tokensOut: [
    ["usage", "completion_tokens"],
    ["usage", "output_tokens"],
    ["usageMetadata", "candidatesTokenCount"],
    ["meta", "billed_units", "output_tokens"]
  ],
  /** Of the input tokens, the ones served from the provider's prompt cache. */
  cachedIn: [
    ["usage", "prompt_tokens_details", "cached_tokens"],
    // OpenAI chat
    ["usage", "input_tokens_details", "cached_tokens"],
    // OpenAI responses
    ["usage", "cache_read_input_tokens"],
    // Anthropic
    ["usageMetadata", "cachedContentTokenCount"]
    // Google
  ],
  /** A cost the provider put in the reply itself, in US dollars. */
  costUsd: [
    ["usage", "cost"],
    // OpenRouter
    ["usage", "total_cost"]
    // OpenRouter (older shape)
  ]
};
const AI_MODEL_PATHS = [
  ["model"],
  ["modelVersion"],
  ["message", "model"]
  // Anthropic streamed `message_start`
];
const MAX_MODEL_CHARS = 64;
function readNumberAt(body, path) {
  try {
    let cur = body;
    for (const key of path) {
      if (cur === null || typeof cur !== "object" || Array.isArray(cur)) {
        return null;
      }
      cur = cur[key];
    }
    return typeof cur === "number" && Number.isFinite(cur) ? cur : null;
  } catch {
    return null;
  }
}
function firstNumber(body, paths) {
  for (const p of paths) {
    const v = readNumberAt(body, p);
    if (v !== null) return v;
  }
  return null;
}
const NO_USAGE = {
  reported: 0,
  tokensIn: 0,
  tokensOut: 0,
  cachedIn: 0,
  reportedCostMicros: null,
  priceCode: 0
};
function readAiUsage(body) {
  try {
    if (body === null || typeof body !== "object") return NO_USAGE;
    const tokensIn = firstNumber(body, AI_USAGE_PATHS.tokensIn);
    const tokensOut = firstNumber(body, AI_USAGE_PATHS.tokensOut);
    const cachedIn = firstNumber(body, AI_USAGE_PATHS.cachedIn);
    const costUsd = firstNumber(body, AI_USAGE_PATHS.costUsd);
    if (tokensIn === null && tokensOut === null && costUsd === null) {
      return NO_USAGE;
    }
    return {
      reported: 1,
      tokensIn: Math.max(0, Math.round(tokensIn ?? 0)),
      tokensOut: Math.max(0, Math.round(tokensOut ?? 0)),
      cachedIn: Math.max(0, Math.round(cachedIn ?? 0)),
      reportedCostMicros: costUsd !== null && costUsd >= 0 ? Math.round(costUsd * 1e6) : null,
      priceCode: priceCodeForBody(body)
    };
  } catch {
    return NO_USAGE;
  }
}
const AI_PRICE_AS_OF = "2026-08-01";
const AI_PRICE_TABLE_DAY = Math.floor(
  Date.parse(`${AI_PRICE_AS_OF}T00:00:00Z`) / 864e5
);
const AI_MODEL_PRICES = [
  { prefix: "gpt-4o-mini", inPerM: 0.15, outPerM: 0.6, cachedPerM: 0.075 },
  { prefix: "gpt-4o", inPerM: 2.5, outPerM: 10, cachedPerM: 1.25 },
  { prefix: "gpt-4.1-nano", inPerM: 0.1, outPerM: 0.4, cachedPerM: 0.025 },
  { prefix: "gpt-4.1-mini", inPerM: 0.4, outPerM: 1.6, cachedPerM: 0.1 },
  { prefix: "gpt-4.1", inPerM: 2, outPerM: 8, cachedPerM: 0.5 },
  { prefix: "gpt-5-mini", inPerM: 0.25, outPerM: 2, cachedPerM: 0.025 },
  { prefix: "gpt-5-nano", inPerM: 0.05, outPerM: 0.4, cachedPerM: 5e-3 },
  { prefix: "gpt-5", inPerM: 1.25, outPerM: 10, cachedPerM: 0.125 },
  { prefix: "o4-mini", inPerM: 1.1, outPerM: 4.4, cachedPerM: 0.275 },
  { prefix: "o3-mini", inPerM: 1.1, outPerM: 4.4, cachedPerM: 0.55 },
  { prefix: "o3", inPerM: 2, outPerM: 8, cachedPerM: 0.5 },
  { prefix: "claude-3-5-haiku", inPerM: 0.8, outPerM: 4, cachedPerM: 0.08 },
  { prefix: "claude-3-5-sonnet", inPerM: 3, outPerM: 15, cachedPerM: 0.3 },
  { prefix: "claude-haiku-4", inPerM: 1, outPerM: 5, cachedPerM: 0.1 },
  { prefix: "claude-sonnet-4", inPerM: 3, outPerM: 15, cachedPerM: 0.3 },
  { prefix: "claude-opus-4", inPerM: 15, outPerM: 75, cachedPerM: 1.5 },
  { prefix: "gemini-2.5-pro", inPerM: 1.25, outPerM: 10, cachedPerM: 0.31 },
  { prefix: "gemini-2.5-flash", inPerM: 0.3, outPerM: 2.5, cachedPerM: 0.075 },
  { prefix: "gemini-2.0-flash", inPerM: 0.1, outPerM: 0.4, cachedPerM: 0.025 },
  { prefix: "deepseek-chat", inPerM: 0.27, outPerM: 1.1, cachedPerM: 0.07 },
  { prefix: "mistral-large", inPerM: 2, outPerM: 6, cachedPerM: 2 },
  { prefix: "mistral-small", inPerM: 0.2, outPerM: 0.6, cachedPerM: 0.2 }
];
function priceCodeForBody(body) {
  try {
    let raw = null;
    for (const path of AI_MODEL_PATHS) {
      let cur = body;
      let ok = true;
      for (const key of path) {
        if (cur === null || typeof cur !== "object" || Array.isArray(cur)) {
          ok = false;
          break;
        }
        cur = cur[key];
      }
      if (ok && typeof cur === "string" && cur) {
        raw = cur;
        break;
      }
    }
    if (!raw) return 0;
    const model = raw.slice(0, MAX_MODEL_CHARS).toLowerCase();
    let bestIdx = 0;
    let bestLen = 0;
    for (let i = 0; i < AI_MODEL_PRICES.length; i++) {
      const p = AI_MODEL_PRICES[i].prefix;
      if (model.includes(p) && p.length > bestLen) {
        bestLen = p.length;
        bestIdx = i + 1;
      }
    }
    return bestIdx;
  } catch {
    return 0;
  }
}
function estimateCostMicros(read) {
  try {
    if (read.priceCode <= 0) return null;
    const p = AI_MODEL_PRICES[read.priceCode - 1];
    if (!p) return null;
    const cached = Math.min(read.cachedIn, read.tokensIn);
    const fresh = Math.max(0, read.tokensIn - cached);
    const usd = (fresh * p.inPerM + cached * p.cachedPerM + read.tokensOut * p.outPerM) / 1e6;
    if (!Number.isFinite(usd) || usd < 0) return null;
    return Math.round(usd * 1e6);
  } catch {
    return null;
  }
}
const TRUNCATED_CODES = /* @__PURE__ */ new Set([
  "length",
  "max_tokens",
  "MAX_TOKENS",
  "model_length"
]);
const FILTERED_CODES = /* @__PURE__ */ new Set([
  "content_filter",
  "refusal",
  "SAFETY",
  "BLOCKLIST",
  "PROHIBITED_CONTENT",
  "SPII",
  "IMAGE_SAFETY",
  "RECITATION"
]);
const QUOTA_CODES = /* @__PURE__ */ new Set([
  "insufficient_quota",
  "billing_hard_limit_reached",
  "billing_not_active",
  "quota_exceeded",
  "credit_limit_exceeded",
  "RESOURCE_EXHAUSTED"
]);
const RATE_CODES = /* @__PURE__ */ new Set([
  "rate_limit_error",
  "rate_limit_exceeded",
  "requests",
  "tokens",
  "overloaded_error"
]);
const CLEAN_FINISH_CODES = /* @__PURE__ */ new Set([
  "stop",
  // OpenAI-shaped (OpenAI, Mistral, Groq, DeepSeek, xAI, Together)
  "tool_calls",
  // OpenAI-shaped: ended to call a tool
  "function_call",
  // OpenAI-shaped (legacy)
  "STOP",
  // Gemini / Vertex
  "end_turn",
  // Anthropic
  "stop_sequence",
  // Anthropic
  "tool_use",
  // Anthropic
  "COMPLETE",
  // Cohere
  "STOP_SEQUENCE",
  // Cohere
  "TOOL_CALL"
  // Cohere
]);
const OUTCOME_CODE_PATHS = [
  ["choices", "0", "finish_reason"],
  ["stop_reason"],
  ["delta", "stop_reason"],
  ["candidates", "0", "finishReason"],
  ["promptFeedback", "blockReason"],
  ["error", "code"],
  ["error", "type"],
  ["error", "status"],
  ["type"]
  // Anthropic streamed `error` envelope
];
const NO_OUTCOME = {
  truncated: 0,
  filtered: 0,
  quota: 0,
  rateLimited: 0,
  ended: 0
};
function readAiOutcome(body) {
  try {
    if (body === null || typeof body !== "object") return NO_OUTCOME;
    let truncated = 0;
    let filtered = 0;
    let quota = 0;
    let rateLimited = 0;
    let ended = 0;
    for (const path of OUTCOME_CODE_PATHS) {
      let cur = body;
      let ok = true;
      for (const key of path) {
        if (cur === null || typeof cur !== "object") {
          ok = false;
          break;
        }
        cur = Array.isArray(cur) ? cur[Number(key)] : cur[key];
      }
      if (!ok || typeof cur !== "string" || !cur) continue;
      const code = cur.slice(0, 64);
      if (TRUNCATED_CODES.has(code)) truncated = 1;
      if (FILTERED_CODES.has(code)) filtered = 1;
      if (QUOTA_CODES.has(code)) quota = 1;
      if (RATE_CODES.has(code)) rateLimited = 1;
      if (CLEAN_FINISH_CODES.has(code) || TRUNCATED_CODES.has(code) || FILTERED_CODES.has(code)) {
        ended = 1;
      }
    }
    return {
      truncated,
      filtered,
      quota,
      rateLimited,
      ended
    };
  } catch {
    return NO_OUTCOME;
  }
}
const AI_HEADER_NAMES = {
  requestsRemaining: [
    "x-ratelimit-remaining-requests",
    "anthropic-ratelimit-requests-remaining"
  ],
  requestsLimit: [
    "x-ratelimit-limit-requests",
    "anthropic-ratelimit-requests-limit"
  ],
  tokensRemaining: [
    "x-ratelimit-remaining-tokens",
    "anthropic-ratelimit-tokens-remaining",
    "anthropic-ratelimit-input-tokens-remaining"
  ],
  tokensLimit: [
    "x-ratelimit-limit-tokens",
    "anthropic-ratelimit-tokens-limit",
    "anthropic-ratelimit-input-tokens-limit"
  ],
  retryAfter: ["retry-after", "x-ratelimit-reset-requests"],
  /** One major provider reports its own service-side processing time. */
  serverMs: ["openai-processing-ms", "x-envoy-upstream-service-time"]
};
const NO_HEADERS = {
  requestsRemaining: null,
  requestsLimit: null,
  tokensRemaining: null,
  tokensLimit: null,
  retryAfterMs: null,
  serverMs: null
};
function parseDurationMs(raw) {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 1e3) : null;
  }
  const m = s.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?$/);
  if (!m || !m.slice(1).some(Boolean)) return null;
  const ms = Number(m[1] ?? 0) * 36e5 + Number(m[2] ?? 0) * 6e4 + Number(m[3] ?? 0) * 1e3 + Number(m[4] ?? 0);
  return Number.isFinite(ms) ? Math.round(ms) : null;
}
function readAiHeaders(get) {
  const num = (names) => {
    for (const n of names) {
      try {
        const raw = get(n);
        if (typeof raw !== "string" || !raw.trim()) continue;
        const v = Number(raw.trim());
        if (Number.isFinite(v) && v >= 0) return v;
      } catch {
      }
    }
    return null;
  };
  const dur = (names) => {
    for (const n of names) {
      try {
        const raw = get(n);
        if (typeof raw !== "string" || !raw.trim()) continue;
        const v = parseDurationMs(raw);
        if (v !== null && v >= 0) return v;
      } catch {
      }
    }
    return null;
  };
  return {
    requestsRemaining: num(AI_HEADER_NAMES.requestsRemaining),
    requestsLimit: num(AI_HEADER_NAMES.requestsLimit),
    tokensRemaining: num(AI_HEADER_NAMES.tokensRemaining),
    tokensLimit: num(AI_HEADER_NAMES.tokensLimit),
    retryAfterMs: dur(AI_HEADER_NAMES.retryAfter),
    serverMs: num(AI_HEADER_NAMES.serverMs)
  };
}
const STREAM_MARKERS = [
  '"usage"',
  '"usageMetadata"',
  '"finish_reason"',
  '"stop_reason"',
  '"finishReason"',
  '"billed_units"',
  '"blockReason"',
  '"error"'
];
function streamLineIsInteresting(line) {
  for (const marker of STREAM_MARKERS) {
    if (line.includes(marker)) return true;
  }
  return false;
}
const STREAM_TERMINATORS = [
  "[DONE]",
  '"message_stop"',
  '"response.completed"'
];
function streamLineIsTerminal(line) {
  for (const marker of STREAM_TERMINATORS) {
    if (line.includes(marker)) return true;
  }
  return false;
}
export {
  AI_HEADER_NAMES,
  AI_MODEL_PRICES,
  AI_PRICE_AS_OF,
  AI_PRICE_TABLE_DAY,
  AI_USAGE_PATHS,
  NO_HEADERS,
  NO_OUTCOME,
  NO_USAGE,
  estimateCostMicros,
  readAiHeaders,
  readAiOutcome,
  readAiUsage,
  streamLineIsInteresting,
  streamLineIsTerminal
};
