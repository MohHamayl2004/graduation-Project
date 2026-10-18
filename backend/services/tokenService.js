import jwt from "jsonwebtoken";
import { CompactEncrypt, compactDecrypt } from "jose";
import { hkdfSync } from "node:crypto";

const encryptionKey = () => new Uint8Array(hkdfSync("sha256", process.env.JWT_SECRET, "nipras-session-v1", "jwe-encryption", 32));

export const signToken = async (userId, role = "student", niprasId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  if (!["student", "admin"].includes(role)) throw new Error("Unsupported account role");
  const signed = jwt.sign({ sub: String(userId), role, ...(niprasId ? { niprasId } : {}) }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
  return new CompactEncrypt(new TextEncoder().encode(signed)).setProtectedHeader({ alg: "dir", enc: "A256GCM", cty: "JWT" }).encrypt(encryptionKey());
};

export const verifyToken = async (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required");
  }

  const { plaintext, protectedHeader } = await compactDecrypt(token, encryptionKey(), { keyManagementAlgorithms: ["dir"], contentEncryptionAlgorithms: ["A256GCM"] });
  if (protectedHeader.cty !== "JWT") throw new Error("Invalid token content type");
  const decoded = jwt.verify(new TextDecoder().decode(plaintext), process.env.JWT_SECRET, { algorithms: ["HS256"] });
  if (!decoded || typeof decoded !== "object" || !/^[a-f\d]{24}$/i.test(decoded.sub || "") || !["student", "admin"].includes(decoded.role)) throw new Error("Invalid identity claims");
  return decoded;
};
