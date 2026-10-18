import test from "node:test";
import assert from "node:assert/strict";
import { signupFieldErrors } from "../shared/signupFields.js";
const valid = { fullName: "طالب نبراس", email: "student@example.invalid", password: "Password123", confirmPassword: "Password123", birthDate: "2008-06-15", stream: "scientific", city: "نابلس", schoolCode: "", agreed: true };
test("blank signup identifies each missing field in form order; optional school code stays valid", () => {
  const blank = Object.fromEntries(Object.keys(valid).map((key) => [key, key === "agreed" ? false : ""]));
  assert.deepEqual(Object.keys(signupFieldErrors(blank)), ["fullName", "email", "password", "confirmPassword", "birthDate", "stream", "city", "agreed"]);
  assert.deepEqual(signupFieldErrors(valid), {});
});
test("signup points to malformed values and clears a corrected field", () => {
  const errors = signupFieldErrors({ ...valid, email: "bad", confirmPassword: "different", birthDate: "2008-02-31", schoolCode: "?" });
  assert.deepEqual(Object.keys(errors), ["email", "confirmPassword", "birthDate", "schoolCode"]);
  assert.equal(signupFieldErrors({ ...valid, password: "x" }).password.includes("8"), true);
  assert.equal(signupFieldErrors({ ...valid, password: "ع".repeat(37) }).password.includes("إنجليزية"), true);
  assert.equal(signupFieldErrors({ ...valid, password: "Password 123" }).password.includes("مسافات"), true);
  assert.equal(signupFieldErrors({ ...valid, password: "x".repeat(73) }).password.includes("طويلة"), true);
});
