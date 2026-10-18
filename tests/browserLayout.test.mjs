import test from "node:test";
import assert from "node:assert/strict";
import { resolveApiBase } from "../shared/apiBase.js";
import { visibleViewportMetrics } from "../shared/browserViewport.js";
import { tryEnterFullscreen } from "../shared/fullscreen.js";
test("LAN and production browsers never use their own localhost as the API", () => {
  assert.equal(resolveApiBase(undefined, "192.168.1.10"), "/api");
  for (const host of ["192.168.1.10", "nipras.example", "2001:db8::1"]) {
    for (const url of ["http://localhost:5000/api", "http://127.0.0.1:5000/api", "http://[::1]:5000/api"]) assert.equal(resolveApiBase(url, host), "/api");
  }
  assert.equal(resolveApiBase("https://api.nipras.example/api/", "nipras.example"), "https://api.nipras.example/api");
  assert.equal(resolveApiBase("/api", "localhost"), "/api");
  assert.equal(resolveApiBase("http://localhost:5000/api", "localhost"), "http://localhost:5000/api");
});
test("visible viewport handles keyboard, browser bars and fallback without blocking pinch zoom", () => {
  assert.deepEqual(visibleViewportMetrics({ scale: 1, height: 412, offsetTop: 20 }, 844), { height: 412, top: 20 });
  assert.deepEqual(visibleViewportMetrics(null, 768), { height: 768, top: 0 });
  assert.deepEqual(visibleViewportMetrics({ scale: 1, height: 0, offsetTop: -2 }, 390), { height: 390, top: 0 });
  assert.equal(visibleViewportMetrics({ scale: 2, height: 200, offsetTop: 50 }, 844), null);
});
test("fullscreen supports prefixed Safari and denied/missing APIs without an unhandled rejection", async () => {
  let entered = false;
  const element = { webkitRequestFullscreen() { assert.equal(this, element); entered = true; } };
  assert.equal(await tryEnterFullscreen(element), true); assert.equal(entered, true);
  assert.equal(await tryEnterFullscreen({}), false);
  assert.equal(await tryEnterFullscreen({ requestFullscreen: async () => { throw new Error("NotAllowedError"); } }), false);
});
