import test from "node:test";
import assert from "node:assert/strict";
import { apiRequest } from "../src/services/api.js";

test("connection failures have an Arabic message and remain distinct from wrong passwords", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
    await assert.rejects(apiRequest("/auth/login"), (error) => error.code === "API_UNREACHABLE" && error.message.includes("تعذر الاتصال") && !error.status);
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ code: "AUTH_INVALID", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }) });
    await assert.rejects(apiRequest("/auth/login"), { code: "AUTH_INVALID", status: 401 });
    globalThis.fetch = async () => { throw Object.assign(new Error("cancelled"), { name: "AbortError" }); };
    await assert.rejects(apiRequest("/auth/me"), { name: "AbortError" });
  } finally { globalThis.fetch = originalFetch; }
});
