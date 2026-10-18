import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import request from "supertest";
import { createApp } from "../app.js";
import { validateSignupInput } from "../validation/authValidation.js";
import { connectTestDatabase } from "./helpers/testDatabase.js";

test("unknown API route responds without a stack trace", async () => {
  const response = await request(createApp()).get("/api/missing");
  assert.equal(response.status, 404);
  assert.equal(response.body.code, "NOT_FOUND");
  assert.equal("stack" in response.body, false);
});

test("protected route rejects a missing token with a safe response", async () => {
  const response = await request(createApp()).get("/api/auth/me");
  assert.equal(response.status, 401);
  assert.equal(response.body.code, "AUTH_INVALID");
  assert.equal("stack" in response.body, false);
});

test("signup validation normalizes email and school code", () => {
  assert.deepEqual(
    validateSignupInput({ fullName: "أحمد", email: " A@EXAMPLE.COM ", password: "12345678", birthDate: "2008-05-10", stream: "scientific", schoolCode: " ens-123 ", city: "نابلس" }),
    { fullName: "أحمد", email: "a@example.com", password: "12345678", birthDate: "2008-05-10", stream: "scientific", grade: "12", schoolCode: "ENS-123", city: "نابلس", subscriptionTier: "free" }
  );
  assert.throws(() => validateSignupInput({ fullName: "أحمد", email: "a@example.com", password: "short" }), { code: "VALIDATION_ERROR" });
});

test("test database guard rejects unsafe cleanup settings", async () => {
  await assert.rejects(() => connectTestDatabase({}), /MONGO_URI_TEST is required/);
  await assert.rejects(
    () => connectTestDatabase({ MONGO_URI_TEST: "mongodb://127.0.0.1/nipras_test", NODE_ENV: "development" }),
    /NODE_ENV=test is required/
  );
  await assert.rejects(
    () => connectTestDatabase({ MONGO_URI_TEST: "mongodb://127.0.0.1/nipras", NODE_ENV: "test" }),
    /non-test database/
  );
});

test("environment template documents JWT and the isolated test database", async () => {
  const source = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(source, /^JWT_SECRET=/m);
  assert.match(source, /^MONGO_URI_TEST=/m);
});

test("registration creates the personal workspace in a way that keeps the session", async () => {
  // Mongoose silently ignores { session } unless the first argument is an
  // array, and the failure only appears on a replica set (every Atlas
  // cluster): the workspace comes back without an _id and the whole signup
  // is rolled back. Asserted on the source because the bug lives in the call
  // shape, and the databases available to the tests here do not have
  // transactions.
  const source = await readFile(new URL("../services/registrationService.js", import.meta.url), "utf8");
  assert.match(source, /Workspace\.create\(\[data\], options\)/);
  assert.doesNotMatch(source, /Workspace\.create\(data, options\)/);
});
