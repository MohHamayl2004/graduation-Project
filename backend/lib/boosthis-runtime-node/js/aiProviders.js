// @ts-nocheck
/* eslint-disable */
// Built from src/aiProviders.ts so plain node can run the kit. Do not edit.
const AI_PROVIDERS = [
  { id: "openai", hosts: ["api.openai.com"] },
  { id: "anthropic", hosts: ["api.anthropic.com"] },
  {
    id: "google",
    hosts: [
      "generativelanguage.googleapis.com",
      "aiplatform.googleapis.com",
      ".aiplatform.googleapis.com"
    ]
  },
  {
    id: "azure-openai",
    hosts: [".openai.azure.com", ".cognitiveservices.azure.com"]
  },
  { id: "aws-bedrock", hosts: [".amazonaws.com"] },
  { id: "mistral", hosts: ["api.mistral.ai", "codestral.mistral.ai"] },
  { id: "cohere", hosts: ["api.cohere.ai", "api.cohere.com"] },
  { id: "groq", hosts: ["api.groq.com"] },
  { id: "together", hosts: ["api.together.xyz", "api.together.ai"] },
  { id: "perplexity", hosts: ["api.perplexity.ai"] },
  { id: "deepseek", hosts: ["api.deepseek.com"] },
  { id: "xai", hosts: ["api.x.ai"] },
  { id: "fireworks", hosts: ["api.fireworks.ai"] },
  { id: "openrouter", hosts: ["openrouter.ai"] },
  { id: "replicate", hosts: ["api.replicate.com"] },
  {
    id: "huggingface",
    hosts: ["api-inference.huggingface.co", "router.huggingface.co"]
  },
  { id: "voyage", hosts: ["api.voyageai.com"] },
  { id: "cerebras", hosts: ["api.cerebras.ai"] },
  // THE ENDPOINT THE CUSTOMER RUNS THEMSELVES. Carries no hosts of its own:
  // the table walk can never reach it, and it is assigned only when the
  // destination matches an address the app DECLARED (see below). One code for
  // every such endpoint, so a private address can never be reconstructed from
  // a reading — see {@link declaredAiProviderCode}.
  { id: "declared", hosts: [] }
];
const DECLARED_PROVIDER_CODE = AI_PROVIDERS.findIndex((p) => p.id === "declared") + 1;
const AWS_BEDROCK_PREFIXES = ["bedrock-runtime.", "bedrock."];
function aiProviderCode(host) {
  try {
    const h = typeof host === "string" ? host.toLowerCase() : "";
    if (!h) return 0;
    for (let i = 0; i < AI_PROVIDERS.length; i++) {
      const entry = AI_PROVIDERS[i];
      for (const suffix of entry.hosts) {
        const hit = suffix.startsWith(".") ? h.endsWith(suffix) || h === suffix.slice(1) : h === suffix;
        if (!hit) continue;
        if (entry.id === "aws-bedrock") {
          if (!AWS_BEDROCK_PREFIXES.some((p) => h.startsWith(p))) continue;
        }
        return i + 1;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}
function aiProviderId(code) {
  if (!Number.isFinite(code)) return null;
  const idx = Math.round(code) - 1;
  return AI_PROVIDERS[idx]?.id ?? null;
}
const MAX_DECLARED_AI_ENDPOINTS = 8;
const MAX_HOST_LENGTH = 253;
const DECLARED_ENV_VAR = "BOOSTHIS_AI_ENDPOINTS";
let declaredHosts = [];
let envRead = false;
function normaliseDeclaredEndpoint(raw) {
  try {
    if (typeof raw !== "string") return null;
    let value = raw.trim().toLowerCase();
    if (!value) return null;
    if (/\s/.test(value)) return null;
    if (value.includes("://")) {
      try {
        value = new URL(value).hostname;
      } catch {
        return null;
      }
    } else {
      const slash = value.indexOf("/");
      if (slash >= 0) value = value.slice(0, slash);
      const at = value.lastIndexOf("@");
      if (at >= 0) value = value.slice(at + 1);
      if (value.startsWith("[")) {
        const close = value.indexOf("]");
        if (close < 0) return null;
        value = value.slice(1, close);
      } else {
        const colon = value.lastIndexOf(":");
        if (colon >= 0) value = value.slice(0, colon);
      }
    }
    if (value.startsWith("[") && value.endsWith("]")) value = value.slice(1, -1);
    if (!value || value.length > MAX_HOST_LENGTH) return null;
    if (value.includes("*")) return null;
    return value;
  } catch {
    return null;
  }
}
function readEnvDeclarations() {
  try {
    const raw = process.env[DECLARED_ENV_VAR];
    if (typeof raw !== "string" || !raw.trim()) return [];
    return raw.split(",");
  } catch {
    return [];
  }
}
function rebuild(extra) {
  const out = [];
  for (const candidate of [...readEnvDeclarations(), ...extra]) {
    const host = normaliseDeclaredEndpoint(candidate);
    if (!host) continue;
    if (out.includes(host)) continue;
    if (out.length >= MAX_DECLARED_AI_ENDPOINTS) break;
    out.push(host);
  }
  declaredHosts = out;
}
function ensureEnvRead() {
  if (envRead) return;
  envRead = true;
  rebuild([]);
}
function setDeclaredAiEndpoints(list) {
  envRead = true;
  rebuild(Array.isArray(list) ? list : list == null ? [] : [list]);
  return declaredHosts.length;
}
function declaredAiEndpointCount() {
  ensureEnvRead();
  return declaredHosts.length;
}
function declaredAiProviderCode(host) {
  try {
    ensureEnvRead();
    if (declaredHosts.length === 0) return 0;
    const h = typeof host === "string" ? host.toLowerCase() : "";
    if (!h) return 0;
    const bare = h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;
    return declaredHosts.includes(bare) ? DECLARED_PROVIDER_CODE : 0;
  } catch {
    return 0;
  }
}
function aiProviderCodeOrDeclared(host) {
  const known = aiProviderCode(host);
  if (known !== 0) return known;
  return declaredAiProviderCode(host);
}
function _resetDeclaredAiEndpointsForTests() {
  declaredHosts = [];
  envRead = false;
}
export {
  AI_PROVIDERS,
  DECLARED_PROVIDER_CODE,
  MAX_DECLARED_AI_ENDPOINTS,
  _resetDeclaredAiEndpointsForTests,
  aiProviderCode,
  aiProviderCodeOrDeclared,
  aiProviderId,
  declaredAiEndpointCount,
  declaredAiProviderCode,
  normaliseDeclaredEndpoint,
  setDeclaredAiEndpoints
};
