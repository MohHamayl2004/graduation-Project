import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("signup and login use the real auth API with optional school code", async () => {
  const signupPage = await readFile(new URL("../src/pages/Signup/index.jsx", import.meta.url), "utf8");
  const loginPage = await readFile(new URL("../src/pages/Login/index.jsx", import.meta.url), "utf8");
  assert.match(signupPage, /schoolCode/);
  assert.match(signupPage, /await\s+signup\s*\(/);
  assert.match(signupPage, /signIn\s*\(\s*response\s*\)/);
  assert.doesNotMatch(signupPage, /navigate\s*\(\s*["']\/analysis["']\s*\)/);
  assert.match(loginPage, /await\s+login\s*\(/);
  assert.doesNotMatch(loginPage, /email === "NIPRAS"/);
});
