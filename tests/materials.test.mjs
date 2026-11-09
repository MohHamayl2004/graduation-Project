import test from "node:test";
import assert from "node:assert/strict";
import { getMaterials } from "../src/services/materialService.js";
import { materialStatusLabel } from "../src/services/materialStatus.js";

test("saved materials use the authenticated API, preserve server data and propagate cancellation", async () => {
  const original = globalThis.fetch;
  const controller = new AbortController();
  const material = { _id: "material-1", title: "ملفي", status: "uploaded" };
  try {
    globalThis.fetch = async (url, options) => {
      assert.match(url, /\/materials$/);
      assert.equal(options.headers.Authorization, "Bearer test-session");
      assert.equal(options.signal, controller.signal);
      return new Response(JSON.stringify({ materials: [material] }));
    };
    assert.deepEqual(await getMaterials("test-session", { signal: controller.signal }), { materials: [material] });
    globalThis.fetch = async () => new Response(JSON.stringify({ materials: [] }));
    assert.deepEqual(await getMaterials("test-session"), { materials: [] });
    globalThis.fetch = async () => new Response(JSON.stringify({ unexpected: [] }));
    await assert.rejects(getMaterials("test-session"), /تعذّر قراءة قائمة المواد/);
    globalThis.fetch = async () => new Response(JSON.stringify({ materials: [null] }));
    await assert.rejects(getMaterials("test-session"), /تعذّر قراءة قائمة المواد/);
    globalThis.fetch = async () => new Response(JSON.stringify({ code: "AUTH_INVALID", message: "انتهت الجلسة" }), { status: 401 });
    await assert.rejects(getMaterials("expired"), { status: 401, code: "AUTH_INVALID", message: "انتهت الجلسة" });
    globalThis.fetch = async () => { throw Object.assign(new Error("cancelled"), { name: "AbortError" }); };
    await assert.rejects(getMaterials("test-session", { signal: controller.signal }), { name: "AbortError" });
  } finally { globalThis.fetch = original; }
});

test("material statuses never imply generated lessons or invented processing percentages", () => {
  assert.equal(materialStatusLabel("uploaded"), "تم حفظ الملف فقط");
  assert.match(materialStatusLabel("analyzing"), /حالة الخادم/);
  assert.match(materialStatusLabel("analyzed"), /في الخادم/);
  assert.equal(materialStatusLabel("failed"), "فشلت المعالجة");
  assert.equal(materialStatusLabel("new-status"), "حالة المعالجة غير معروفة");
  assert.equal(materialStatusLabel("toString"), "حالة المعالجة غير معروفة");
});
