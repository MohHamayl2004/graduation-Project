// Where the internal AI service lives and how to call it.
// Read at call time, not import time, so tests can point it at a fake.
export const aiServiceConfig = (env = process.env) => ({
  provider: env.AI_SERVICE_PROVIDER || "rag",
  model: env.AI_MODEL_ID || "qwen3.5-9b",
  url: (env.AI_SERVICE_URL || "http://127.0.0.1:8000").replace(/\/+$/, ""),
  key: env.AI_SERVICE_KEY || "",
  localTunnel: env.AI_AUTH_MODE === "ssh-tunnel",
  timeoutMs: Number(env.AI_TIMEOUT_MS) || 240000
});
