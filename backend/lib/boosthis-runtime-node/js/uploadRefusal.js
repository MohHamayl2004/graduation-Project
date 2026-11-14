// @ts-nocheck
/* eslint-disable */
// Built from src/uploadRefusal.ts so plain node can run the kit. Do not edit.
import { readAnswerJson } from "./answerRead.js";
import { sayAfterStartupLine } from "./startAnnounce.js";
const CREDENTIAL_REFUSAL_FIELD = "credentialRefusal";
const CREDENTIAL_MISMATCH = "mismatch";
const REFUSAL_BODY_MAX_BYTES = 4096;
const REFUSAL_BODY_READ_MS = 2e3;
async function readCredentialRefusal(res) {
  try {
    if (res.status !== 401 && res.status !== 403) return null;
    const source = typeof res.clone === "function" ? res.clone() : res;
    const body = await readAnswerJson(source, {
      maxBytes: REFUSAL_BODY_MAX_BYTES,
      timeoutMs: REFUSAL_BODY_READ_MS
    });
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}
function isCredentialMismatch(status, body) {
  if (status !== 401 || !body) return false;
  if (body.error === "credentials_cut") return false;
  return body[CREDENTIAL_REFUSAL_FIELD] === CREDENTIAL_MISMATCH;
}
function uploadRefusalOf(status, body) {
  if (status < 400 || status >= 500) return null;
  if (status === 401 || status === 403) {
    if (body?.error === "credentials_cut") return "credentials-cut";
    switch (body?.[CREDENTIAL_REFUSAL_FIELD]) {
      case CREDENTIAL_MISMATCH:
        return status === 401 ? "credential-replaced" : "credential-refused";
      case "missing":
        return "credential-missing";
      case "not_on_file":
        return "credential-not-on-file";
      default:
        return "credential-refused";
    }
  }
  if (status === 404) return "unknown-install";
  if (status === 429) return "rate-limited";
  return "batch-refused";
}
function uploadRefusalText(refusal) {
  switch (refusal) {
    case "credential-replaced":
      return "this process's credential was replaced when another copy of this app reconnected, and renewing it did not bring back one that works";
    case "credential-missing":
      return "the upload reached Boosthis without this install's credential";
    case "credential-not-on-file":
      return "Boosthis holds no credential on file for this install";
    case "credentials-cut":
      return "the project's owner cut off this install's credentials";
    case "credential-refused":
      return "Boosthis did not accept this install's credential";
    case "unknown-install":
      return "Boosthis does not know this install id";
    case "rate-limited":
      return "Boosthis is limiting how often this app may send";
    default:
      return "Boosthis refused the batch itself";
  }
}
function uploadRefusalLine(refusal) {
  return `[boosthis] Uploads are not getting through: ${uploadRefusalText(refusal)}. Open this project's page on your Boosthis dashboard to see what changed.`;
}
const warnedRefusals = /* @__PURE__ */ new Set();
function noteUploadRefusedOnce(status, body) {
  try {
    const refusal = uploadRefusalOf(status, body);
    if (refusal === null || warnedRefusals.has(refusal)) return;
    warnedRefusals.add(refusal);
    sayAfterStartupLine(uploadRefusalLine(refusal));
  } catch {
  }
}
function _resetUploadRefusalWarningsForTests() {
  warnedRefusals.clear();
}
export {
  CREDENTIAL_MISMATCH,
  CREDENTIAL_REFUSAL_FIELD,
  _resetUploadRefusalWarningsForTests,
  isCredentialMismatch,
  noteUploadRefusedOnce,
  readCredentialRefusal,
  uploadRefusalLine,
  uploadRefusalOf,
  uploadRefusalText
};
