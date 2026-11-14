// @ts-nocheck
/* eslint-disable */
// Built from src/hosting.ts so plain node can run the kit. Do not edit.
const env = (name) => {
  try {
    const v = process.env[name];
    return typeof v === "string" ? v.trim() : "";
  } catch {
    return "";
  }
};
function osFamily(platform = readPlatform()) {
  switch (platform) {
    case "linux":
      return "linux";
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "other";
  }
}
function readPlatform() {
  try {
    return process.platform;
  } catch {
    return void 0;
  }
}
const NOTHING_DECLARED = {
  platform: "undeclared",
  region: "undeclared",
  environment: "unknown"
};
function vercelEnvironment() {
  const v = env("VERCEL_ENV").toLowerCase();
  if (v === "production" || v === "preview" || v === "development") return v;
  return "unknown";
}
function netlifyEnvironment() {
  const c = env("CONTEXT").toLowerCase();
  if (c === "production") return "production";
  if (c === "deploy-preview" || c === "branch-deploy") return "preview";
  if (c === "dev") return "development";
  return "unknown";
}
function detectHosting() {
  try {
    if (env("VERCEL") === "1" || env("VERCEL_ENV")) {
      return {
        platform: "vercel",
        region: env("VERCEL_REGION") || "undeclared",
        environment: vercelEnvironment()
      };
    }
    if (env("NETLIFY") === "true" || env("NETLIFY_LOCAL") || env("SITE_ID")) {
      return {
        platform: "netlify",
        region: env("AWS_REGION") || "undeclared",
        environment: netlifyEnvironment()
      };
    }
    if (env("AWS_LAMBDA_FUNCTION_NAME")) {
      return {
        platform: "aws-lambda",
        region: env("AWS_REGION") || env("AWS_DEFAULT_REGION") || "undeclared",
        // Lambda has no environment concept of its own — a stage lives in the
        // function name, which we neither read nor send. "unknown" is the
        // honest answer; calling every Lambda "production" would be a guess.
        environment: "unknown"
      };
    }
    if (env("FUNCTION_TARGET")) {
      return {
        platform: "gcp-functions",
        region: env("FUNCTION_REGION") || "undeclared",
        environment: "unknown"
      };
    }
    if (env("FUNCTIONS_WORKER_RUNTIME")) {
      return {
        platform: "azure-functions",
        region: env("REGION_NAME") || "undeclared",
        environment: "unknown"
      };
    }
    if (env("K_SERVICE")) {
      return {
        platform: "cloud-run",
        // Cloud Run publishes its region only through its metadata service,
        // which is a network call this must never make. Undeclared it is.
        region: "undeclared",
        environment: "unknown"
      };
    }
    if (env("WEBSITE_SITE_NAME")) {
      return {
        platform: "azure-app-service",
        region: env("REGION_NAME") || "undeclared",
        environment: "unknown"
      };
    }
    if (env("FLY_APP_NAME")) {
      return {
        platform: "fly-io",
        region: env("FLY_REGION") || "undeclared",
        environment: "unknown"
      };
    }
    if (env("RENDER") === "true" || env("RENDER_SERVICE_ID")) {
      return {
        platform: "render",
        region: "undeclared",
        // Render's own marker for a pull-request preview service. Absent means
        // an ordinary service, which Render only ever runs as production.
        environment: env("IS_PULL_REQUEST") === "true" ? "preview" : "production"
      };
    }
    if (env("RAILWAY_ENVIRONMENT") || env("RAILWAY_PROJECT_ID")) {
      const named = (env("RAILWAY_ENVIRONMENT_NAME") || env("RAILWAY_ENVIRONMENT")).toLowerCase();
      return {
        platform: "railway",
        region: env("RAILWAY_REPLICA_REGION") || "undeclared",
        environment: !named ? "unknown" : named === "production" ? "production" : "preview"
      };
    }
    if (env("KOYEB_APP_NAME")) {
      return {
        platform: "koyeb",
        region: env("KOYEB_REGION") || "undeclared",
        environment: "unknown"
      };
    }
    if (env("REPL_ID") || env("REPLIT_DEPLOYMENT")) {
      return {
        platform: "replit",
        region: "undeclared",
        // Replit publishes exactly this distinction: a published app sets the
        // marker, the workspace copy does not. The workspace copy is a
        // development run, not a preview of one.
        environment: env("REPLIT_DEPLOYMENT") === "1" ? "production" : "development"
      };
    }
    if (env("ECS_CONTAINER_METADATA_URI_V4") || env("ECS_CONTAINER_METADATA_URI")) {
      return {
        platform: "aws-ecs",
        region: env("AWS_REGION") || env("AWS_DEFAULT_REGION") || "undeclared",
        environment: "unknown"
      };
    }
    if (env("DYNO")) {
      return {
        platform: "heroku",
        region: "undeclared",
        environment: "unknown"
      };
    }
    if (env("KUBERNETES_SERVICE_HOST")) {
      return {
        platform: "kubernetes",
        region: "undeclared",
        environment: "unknown"
      };
    }
    return NOTHING_DECLARED;
  } catch {
    return NOTHING_DECLARED;
  }
}
let cached = null;
function hostingFacts() {
  if (cached === null) cached = { ...detectHosting(), os: osFamily() };
  return cached;
}
function resetHostingCacheForTests() {
  cached = null;
}
const HOSTING_LABELS = {
  vercel: "Vercel Functions",
  "aws-lambda": "AWS Lambda",
  netlify: "Netlify Functions",
  "gcp-functions": "Google Cloud Functions",
  "azure-functions": "Azure Functions",
  "cloud-run": "Google Cloud Run",
  "azure-app-service": "Azure App Service",
  "aws-ecs": "AWS ECS",
  "fly-io": "Fly.io",
  render: "Render",
  railway: "Railway",
  heroku: "Heroku",
  replit: "Replit",
  koyeb: "Koyeb",
  kubernetes: "Kubernetes",
  unrecognised: "Unrecognised host",
  undeclared: "No hosting platform declared"
};
const ENVIRONMENT_LABELS = {
  production: "Production",
  preview: "Preview",
  development: "Development",
  unknown: "Environment not declared"
};
function hostingLine(facts = hostingFacts()) {
  const platform = HOSTING_LABELS[facts.platform] ?? HOSTING_LABELS.unrecognised;
  const parts = [platform];
  if (facts.environment === "preview" || facts.environment === "development") {
    parts.push(ENVIRONMENT_LABELS[facts.environment]);
  }
  if (facts.region && facts.region !== "undeclared") parts.push(facts.region);
  return parts.join(" · ");
}
export {
  HOSTING_LABELS,
  detectHosting,
  hostingFacts,
  hostingLine,
  osFamily,
  resetHostingCacheForTests
};
