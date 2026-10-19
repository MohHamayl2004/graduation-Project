import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { createApp } from "../app.js";

test("hosted SPA supports direct page links without masking API, uploads or asset failures", async () => {
  const frontendDirectory = await mkdtemp(path.join(tmpdir(), "nipras-hosting-"));
  try {
    await writeFile(path.join(frontendDirectory, "index.html"), "<!doctype html><title>NIPRAS</title>");
    const app = createApp({ serveFrontend: true, frontendDirectory });
    for (const route of ["/", "/login", "/admin", "/study-plan"]) {
      const response = await request(app).get(route);
      assert.equal(response.status, 200);
      assert.match(response.text, /<title>NIPRAS<\/title>/);
    }
    assert.equal((await request(app).get("/api/auth/me")).status, 401);
    for (const route of ["/api/missing", "/uploads/missing.png", "/assets/missing.js"]) {
      const response = await request(app).get(route);
      assert.equal(response.status, 404);
      assert.doesNotMatch(response.text, /<title>NIPRAS/);
    }
    assert.deepEqual((await request(app).get("/api/health")).body, { status: "ok" });
  } finally {
    await rm(frontendDirectory, { recursive: true, force: true });
  }
});
