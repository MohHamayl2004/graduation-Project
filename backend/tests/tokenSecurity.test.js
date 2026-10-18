import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { signToken, verifyToken } from "../services/tokenService.js";

test("session encrypts the real account ID and role, rejects tampering, wrong keys and expired tokens", async () => {
  const originalSecret = process.env.JWT_SECRET, originalExpiry = process.env.JWT_EXPIRES_IN;
  try {
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    const id = "64b000000000000000000001";
    const token = await signToken(id, "student", "NIP-0000001");
    assert.equal(token.split(".").length, 5); assert.equal(jwt.decode(token), null);
    assert.equal(token.includes(id), false); assert.equal(token.includes("NIP-0000001"), false);
    const identity = await verifyToken(token);
    assert.equal(identity.sub, id); assert.equal(identity.role, "student"); assert.equal(identity.niprasId, "NIP-0000001");
    const altered = token.split("."); altered[3] = (altered[3][0] === "a" ? "b" : "a") + altered[3].slice(1);
    await assert.rejects(verifyToken(altered.join(".")));
    const oldKey = process.env.JWT_SECRET; process.env.JWT_SECRET = randomBytes(48).toString("hex");
    await assert.rejects(verifyToken(token)); process.env.JWT_SECRET = oldKey;
    process.env.JWT_EXPIRES_IN = "-1s";
    await assert.rejects(verifyToken(await signToken(id, "admin")), { name: "TokenExpiredError" });
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = originalSecret;
    if (originalExpiry === undefined) delete process.env.JWT_EXPIRES_IN; else process.env.JWT_EXPIRES_IN = originalExpiry;
  }
});
