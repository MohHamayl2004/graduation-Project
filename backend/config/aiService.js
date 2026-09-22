// Where the internal AI service lives and how to call it.
// Read at call time, not import time, so tests can point it at a fake.
export const aiServiceConfig = (env = process.env) => ({
  url: (env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, ""),
  key: env.AI_SERVICE_KEY || "",
  timeoutMs: Number(env.AI_TIMEOUT_MS) || 240000
});
