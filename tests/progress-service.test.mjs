import test from "node:test";
import assert from "node:assert/strict";
import { getProgressOverview } from "../src/services/progressService.js";

test("overview requests selected range with authentication and cancellation", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  let call;
  globalThis.fetch = async (url, options) => { call = { url, options }; return Response.json({ periodDays: 30, metrics: {}, plan: null }); };
  try {
    const result = await getProgressOverview("token", 30, { signal: controller.signal });
    assert.match(call.url, /\/progress\/overview\?days=30$/);
    assert.equal(call.options.headers.Authorization, "Bearer token");
    assert.equal(call.options.signal, controller.signal);
    assert.equal(result.periodDays, 30);
  } finally { globalThis.fetch = original; }
});
