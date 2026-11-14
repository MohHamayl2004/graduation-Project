// @ts-nocheck
/* eslint-disable */
// Built from src/serverless.ts so plain node can run the kit. Do not edit.
import { createHash } from "node:crypto";
const PLATFORM_UNKNOWN = 0;
const PLATFORM_VERCEL = 1;
const PLATFORM_AWS_LAMBDA = 2;
const PLATFORM_NETLIFY = 3;
const PLATFORM_GCP_FUNCTIONS = 4;
const PLATFORM_AZURE_FUNCTIONS = 5;
const PLATFORM_CLOUD_RUN = 6;
const PLATFORM_FIREBASE_APP_HOSTING = 7;
const PLATFORM_CLOUDFLARE_WORKERS = 8;
const PLATFORM_SUPABASE_EDGE = 9;
const PLATFORM_NAMES = {
  [PLATFORM_UNKNOWN]: "an unrecognised function host",
  [PLATFORM_VERCEL]: "Vercel Functions",
  [PLATFORM_AWS_LAMBDA]: "AWS Lambda",
  [PLATFORM_NETLIFY]: "Netlify Functions",
  [PLATFORM_GCP_FUNCTIONS]: "Google Cloud Functions",
  [PLATFORM_AZURE_FUNCTIONS]: "Azure Functions",
  [PLATFORM_CLOUD_RUN]: "Google Cloud Run",
  [PLATFORM_FIREBASE_APP_HOSTING]: "Firebase App Hosting",
  [PLATFORM_CLOUDFLARE_WORKERS]: "Cloudflare Workers",
  [PLATFORM_SUPABASE_EDGE]: "Supabase Edge Functions"
};
function platformName(code) {
  return PLATFORM_NAMES[code] ?? PLATFORM_NAMES[PLATFORM_UNKNOWN];
}
const PROVEN_PLATFORMS = [
  PLATFORM_VERCEL,
  PLATFORM_AWS_LAMBDA
];
function isProvenPlatform(code) {
  return PROVEN_PLATFORMS.includes(code);
}
const RECOGNISED_FUNCTION_PLATFORMS = [
  PLATFORM_VERCEL,
  PLATFORM_AWS_LAMBDA,
  PLATFORM_NETLIFY,
  PLATFORM_GCP_FUNCTIONS,
  PLATFORM_AZURE_FUNCTIONS
];
function recognisedUnprovenFunctionPlatforms() {
  return RECOGNISED_FUNCTION_PLATFORMS.filter((code) => !isProvenPlatform(code));
}
const env = (name) => {
  try {
    const v = process.env[name];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
};
const num = (name) => {
  const raw = env(name);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
function detectServerlessHost() {
  const none = {
    serverless: false,
    platform: PLATFORM_UNKNOWN,
    proven: false,
    scope: "",
    environment: "",
    memoryLimitMb: null,
    region: "",
    frozenBetweenRequests: false
  };
  try {
    if (env("BOOSTHIS_SERVERLESS") === "0") return none;
    const lambdaMemory = num("AWS_LAMBDA_FUNCTION_MEMORY_SIZE");
    if (env("VERCEL") === "1" || env("VERCEL_ENV")) {
      return {
        serverless: true,
        platform: PLATFORM_VERCEL,
        proven: isProvenPlatform(PLATFORM_VERCEL),
        // VERCEL_PROJECT_ID when the project exposes it, else the production
        // domain, else the git repo. All three are stable ACROSS deploys —
        // VERCEL_URL and VERCEL_DEPLOYMENT_ID deliberately are not, because
        // keying on them would mint a new install on every publish.
        scope: env("VERCEL_PROJECT_ID") || env("VERCEL_PROJECT_PRODUCTION_URL") || `${env("VERCEL_GIT_REPO_OWNER")}/${env("VERCEL_GIT_REPO_SLUG")}`,
        environment: env("VERCEL_ENV") || "production",
        memoryLimitMb: lambdaMemory,
        region: env("VERCEL_REGION"),
        frozenBetweenRequests: false
      };
    }
    if (env("NETLIFY") === "true" || env("NETLIFY_LOCAL") || env("SITE_ID")) {
      if (env("NETLIFY") === "true" || env("SITE_ID")) {
        return {
          serverless: true,
          platform: PLATFORM_NETLIFY,
          proven: isProvenPlatform(PLATFORM_NETLIFY),
          scope: env("SITE_ID") || env("SITE_NAME"),
          environment: env("CONTEXT") || "production",
          memoryLimitMb: lambdaMemory,
          region: env("AWS_REGION"),
          frozenBetweenRequests: false
        };
      }
    }
    if (env("AWS_LAMBDA_FUNCTION_NAME")) {
      return {
        serverless: true,
        platform: PLATFORM_AWS_LAMBDA,
        proven: isProvenPlatform(PLATFORM_AWS_LAMBDA),
        // The function name is stable across cold starts, versions and aliases.
        scope: env("AWS_LAMBDA_FUNCTION_NAME"),
        // Lambda has no environment concept of its own — a stage lives in the
        // function name — so every Lambda install shares one environment label.
        environment: "production",
        memoryLimitMb: lambdaMemory,
        region: env("AWS_REGION") || env("AWS_DEFAULT_REGION"),
        frozenBetweenRequests: false
      };
    }
    if (env("FUNCTION_TARGET")) {
      return {
        serverless: true,
        platform: PLATFORM_GCP_FUNCTIONS,
        proven: isProvenPlatform(PLATFORM_GCP_FUNCTIONS),
        scope: `${env("GOOGLE_CLOUD_PROJECT") || env("GCP_PROJECT")}/${env("K_SERVICE") || env("FUNCTION_TARGET")}`,
        environment: "production",
        memoryLimitMb: num("FUNCTION_MEMORY_MB"),
        region: env("FUNCTION_REGION"),
        frozenBetweenRequests: false
      };
    }
    if (env("FUNCTIONS_WORKER_RUNTIME")) {
      return {
        serverless: true,
        platform: PLATFORM_AZURE_FUNCTIONS,
        proven: isProvenPlatform(PLATFORM_AZURE_FUNCTIONS),
        scope: env("WEBSITE_SITE_NAME"),
        environment: env("AZURE_FUNCTIONS_ENVIRONMENT") || "production",
        memoryLimitMb: null,
        region: env("REGION_NAME"),
        frozenBetweenRequests: false
      };
    }
    if (env("FIREBASE_APP_HOSTING") === "1" || env("FIREBASE_CONFIG")) {
      if (env("K_SERVICE")) {
        return {
          serverless: false,
          platform: PLATFORM_FIREBASE_APP_HOSTING,
          proven: true,
          scope: `${env("GOOGLE_CLOUD_PROJECT") || env("GCP_PROJECT")}/${env("K_SERVICE")}`,
          environment: "production",
          memoryLimitMb: null,
          region: env("GOOGLE_CLOUD_REGION") || env("FUNCTION_REGION"),
          frozenBetweenRequests: true
        };
      }
    }
    if (env("K_SERVICE")) {
      return {
        serverless: false,
        platform: PLATFORM_CLOUD_RUN,
        proven: true,
        scope: `${env("GOOGLE_CLOUD_PROJECT") || env("GCP_PROJECT")}/${env("K_SERVICE")}`,
        environment: "production",
        memoryLimitMb: null,
        region: env("GOOGLE_CLOUD_REGION"),
        frozenBetweenRequests: true
      };
    }
    if (env("BOOSTHIS_SERVERLESS") === "1") {
      return {
        serverless: true,
        platform: PLATFORM_UNKNOWN,
        proven: false,
        scope: "",
        environment: "",
        memoryLimitMb: null,
        region: "",
        frozenBetweenRequests: false
      };
    }
    return none;
  } catch {
    return none;
  }
}
let cached = null;
function serverlessHost() {
  if (cached === null) cached = detectServerlessHost();
  return cached;
}
function isServerlessMode() {
  const h = serverlessHost();
  return h.serverless && h.proven;
}
function isFrozenBetweenRequests() {
  const h = serverlessHost();
  return h.frozenBetweenRequests && !h.serverless;
}
function isPerRunBilled() {
  return isServerlessMode() || isFrozenBetweenRequests();
}
function hasPerRunCostReadings() {
  const h = serverlessHost();
  return h.serverless || h.frozenBetweenRequests;
}
function serverlessRefusal() {
  const h = serverlessHost();
  if (!h.serverless || h.proven) return null;
  return `Boosthis does not start on ${platformName(h.platform)} yet. Measuring from short-lived functions needs work we have proven on that platform, and we have not proven this one — so the kit stops here rather than register an install that would report almost nothing. Ask us to add it at support@boosthis.com, naming the host; nothing else in your app is affected.`;
}
const IDENTITY_NAMESPACE = "boosthis-serverless-install-v1";
function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
function scopeHashFor(host) {
  const material = `${host.platform}|${host.scope}|${host.environment}`;
  return sha256Hex(material).slice(0, 32);
}
function deriveServerlessInstallId(projectKey, host) {
  try {
    if (!projectKey) return null;
    if (!host.scope || host.scope === "/" || host.scope === "undefined") {
      return null;
    }
    const h = sha256Hex(
      `${IDENTITY_NAMESPACE}|${projectKey}|${host.platform}|${scopeHashFor(host)}`
    );
    const variant = (parseInt(h.slice(16, 17), 16) & 3 | 8).toString(16);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
  } catch {
    return null;
  }
}
function _resetServerlessForTests() {
  cached = null;
}
export {
  PLATFORM_AWS_LAMBDA,
  PLATFORM_AZURE_FUNCTIONS,
  PLATFORM_CLOUDFLARE_WORKERS,
  PLATFORM_CLOUD_RUN,
  PLATFORM_FIREBASE_APP_HOSTING,
  PLATFORM_GCP_FUNCTIONS,
  PLATFORM_NETLIFY,
  PLATFORM_SUPABASE_EDGE,
  PLATFORM_UNKNOWN,
  PLATFORM_VERCEL,
  PROVEN_PLATFORMS,
  RECOGNISED_FUNCTION_PLATFORMS,
  _resetServerlessForTests,
  deriveServerlessInstallId,
  detectServerlessHost,
  hasPerRunCostReadings,
  isFrozenBetweenRequests,
  isPerRunBilled,
  isProvenPlatform,
  isServerlessMode,
  platformName,
  recognisedUnprovenFunctionPlatforms,
  scopeHashFor,
  serverlessHost,
  serverlessRefusal
};
