// @ts-nocheck
/* eslint-disable */
// Built from src/no-pii.ts so plain node can run the kit. Do not edit.
const PII_DENYLIST = [
  // identity
  "email",
  "mail",
  "username",
  "userid",
  "user_id",
  "uid",
  "firstname",
  "first_name",
  "lastname",
  "last_name",
  "fullname",
  "full_name",
  "phone",
  "mobile",
  "tel",
  "ssn",
  "nationalid",
  "national_id",
  "taxid",
  "tax_id",
  "dob",
  "birthdate",
  "birthday",
  // account/auth secrets
  "password",
  "passwd",
  "secret",
  "apikey",
  "api_key",
  "token",
  "auth",
  "authorization",
  "session",
  "cookie",
  "bearer",
  "jwt",
  "creditcard",
  "credit_card",
  "cardnumber",
  "card_number",
  "cvv",
  "iban",
  "swift",
  "routingnumber",
  "routing_number",
  // device-as-identity
  "deviceid",
  "device_id",
  "advertisingid",
  "advertising_id",
  "idfa",
  "idfv",
  "macaddress",
  "mac_address",
  "imei",
  // network identity
  "ipaddress",
  "ip_address",
  "ip",
  "ipv4",
  "ipv6",
  "useragent",
  "user_agent",
  // location
  "latitude",
  "longitude",
  "lat",
  "lng",
  "lon",
  "geohash",
  "address",
  "street",
  "city",
  "zipcode",
  "zip_code",
  "postalcode",
  "postal_code",
  // free-form content (high-risk for incidental PII)
  "message",
  "content",
  "body",
  "text",
  "comment",
  "note",
  "value",
  "input",
  "query",
  "search"
];
const ALLOWLIST = /* @__PURE__ */ new Set([
  "screen",
  "screenname",
  "screen_name",
  "appversion",
  "app_version",
  "osversion",
  "os_version",
  "osname",
  "os_name",
  "findingid",
  "finding_id",
  "ruleid",
  "rule_id",
  "score",
  "rating",
  "perception",
  "sessionid",
  "session_id",
  // leakWatch (shared additive "Leak Watch" axis, Aug 2026) emits per-category
  // COUNTERS whose contract-mandated camelCase key names embed denied fragments
  // ("secret" in `secretCount`). These are integers — never any matched value —
  // so the field NAMES are allowlisted here. Kept in lock-step across runtimes.
  "secretcount",
  "stackcount",
  "piicount",
  // cookieExposure axis KEY itself collides with the denied cookie fragment
  // via the pass-2 substring check. Code-defined axis identifier whose sub-
  // object is counts-only (no cookie name, value or header text ever rides it).
  // Without this entry the guard drops the ENTIRE snapshot the moment the app
  // sets its first cookie. Kept in lock-step across every kit allowlist.
  "cookieexposure",
  // AI-call visibility (Aug 2026). A provider reports how much of the prompt
  // it read and how much answer it wrote in units it calls TOKENS, and the
  // headroom it publishes is counted in the same units. The field names below
  // therefore collide with the denied `token` fragment while carrying nothing
  // but integers and percentages — never a credential, never a prompt, never
  // an answer. Allowlisted by exact name so the collision cannot widen: any
  // other `*token*` field is still refused. Byte-identical to the same entry
  // in the server guard, so the two can never disagree about one payload.
  "tokensin",
  "tokensout",
  "worsttokenspct"
]);
const DENY_NORMALIZED = PII_DENYLIST.map((d) => ({ denied: d, norm: normalize(d) }));
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/;
const IPV6_FULL_RE = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$/i;
const IPV6_HEX_ONLY_RE = /^[0-9a-f:]+$/i;
const IPV6_CANDIDATE_RE = /[0-9a-f:]{4,45}/gi;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/;
const BEARER_RE = /bearer\s+\S{8,}/i;
const PHONE_RE = /(?<![0-9a-fA-F])(?:\+\d{1,3}[\s\-.])?\(?\d{3}\)?[\s\-.]\d{3}[\s\-.]\d{4}(?![0-9a-fA-F])/;
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function tokenize(name) {
  const s = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return s.split(/[^a-zA-Z0-9]+/).filter(Boolean).map((t) => t.toLowerCase());
}
function looksLikeIPv6(val) {
  if (val.length < 3) return false;
  if (IPV6_FULL_RE.test(val)) return true;
  if (!val.includes("::")) return false;
  if (!IPV6_HEX_ONLY_RE.test(val)) return false;
  if (val.indexOf("::") !== val.lastIndexOf("::")) return false;
  const groups = val.split(":").filter((g) => g.length > 0);
  return groups.length >= 1 && groups.length <= 7;
}
function containsEmbeddedIPv6(val) {
  const matches = val.match(IPV6_CANDIDATE_RE);
  if (!matches) return false;
  for (const m of matches) if (looksLikeIPv6(m)) return true;
  return false;
}
function findDeniedFragment(name) {
  const norm = normalize(name);
  if (ALLOWLIST.has(norm)) return null;
  const tokens = tokenize(name);
  for (const { denied, norm: dNorm } of DENY_NORMALIZED) {
    if (norm === dNorm) return denied;
    for (const tok of tokens) if (tok === dNorm) return denied;
  }
  for (const { denied, norm: dNorm } of DENY_NORMALIZED) {
    if (dNorm.length < 5) continue;
    if (norm.includes(dNorm)) return denied;
  }
  return null;
}
function findDeniedValue(val) {
  if (val.length < 5) return null;
  if (EMAIL_RE.test(val)) return "~email";
  if (JWT_RE.test(val)) return "~jwt";
  if (BEARER_RE.test(val)) return "~bearer";
  if (IPV4_RE.test(val)) return "~ipv4";
  if (containsEmbeddedIPv6(val)) return "~ipv6";
  if (PHONE_RE.test(val)) return "~phone";
  return null;
}
class PIIDetectedError extends Error {
  path;
  fieldName;
  matchedFragment;
  constructor(path, fieldName, matchedFragment) {
    super(
      `Boosthis no-PII guard refused outgoing payload: field "${path}" (name "${fieldName}") matches denied fragment "${matchedFragment}". Boosthis's privacy contract forbids transmitting personally identifying data. If this field is genuinely non-PII, rename it; otherwise remove it.`
    );
    this.name = "PIIDetectedError";
    this.path = path;
    this.fieldName = fieldName;
    this.matchedFragment = matchedFragment;
  }
}
function walk(payload, path, seen) {
  if (typeof payload === "string") {
    const denied = findDeniedValue(payload);
    if (denied !== null) {
      const fieldName = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1) : path;
      return new PIIDetectedError(path, fieldName, denied);
    }
    return null;
  }
  if (payload === null || typeof payload !== "object") return null;
  if (seen.has(payload)) return null;
  seen.add(payload);
  if (Array.isArray(payload)) {
    for (let i = 0; i < payload.length; i++) {
      const inner = walk(payload[i], `${path}[${i}]`, seen);
      if (inner) return inner;
    }
    return null;
  }
  for (const [key, val] of Object.entries(payload)) {
    const childPath = `${path}.${key}`;
    const matched = findDeniedFragment(key);
    if (matched !== null) return new PIIDetectedError(childPath, key, matched);
    const inner = walk(val, childPath, seen);
    if (inner) return inner;
  }
  return null;
}
function checkNoPII(payload) {
  return walk(payload, "$", /* @__PURE__ */ new WeakSet());
}
function assertNoPII(payload) {
  const hit = checkNoPII(payload);
  if (hit) throw hit;
}
function checkNoPIIInUrl(url) {
  let parsed;
  try {
    parsed = new URL(url, "https://boosthis.invalid");
  } catch {
    return new PIIDetectedError("$url", "url", "~unparseable-url");
  }
  let found = null;
  parsed.searchParams.forEach((value, name) => {
    if (found !== null) return;
    const nameHit = checkNoPII({ [name]: null });
    if (nameHit !== null) {
      found = new PIIDetectedError(`$url.query.${name}`, name, nameHit.matchedFragment);
      return;
    }
    const valueHit = checkNoPII(value);
    if (valueHit !== null) {
      found = new PIIDetectedError(`$url.query.${name}`, name, valueHit.matchedFragment);
    }
  });
  return found;
}
function assertNoPIIInUrl(url) {
  const hit = checkNoPIIInUrl(url);
  if (hit) throw hit;
}
const ROUTE_LABEL_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const ROUTE_LABEL_NUMERIC_RE = /\b\d{6,}\b/;
const LABEL_HAS_SPACE_RE = /\s/;
function routeLabelHasPII(label) {
  if (LABEL_HAS_SPACE_RE.test(label)) return "~space-separated-label";
  return transmitLabelHasPII(label);
}
const HTTP_METHOD_PATH_RE = /^(?:screen:)?(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|TRACE|CONNECT) \/\S*$/;
function transmitLabelHasPII(label) {
  if (LABEL_HAS_SPACE_RE.test(label) && !HTTP_METHOD_PATH_RE.test(label)) {
    return "~space-separated-label";
  }
  const existing = findDeniedValue(label);
  if (existing !== null) return existing;
  if (ROUTE_LABEL_UUID_RE.test(label)) return "~uuid";
  if (ROUTE_LABEL_NUMERIC_RE.test(label)) return "~numeric-id";
  return null;
}
const NAME_CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;
function jobNameHasPII(name) {
  if (NAME_CONTROL_CHAR_RE.test(name)) return "~control-characters";
  const existing = findDeniedValue(name);
  if (existing !== null) return existing;
  if (ROUTE_LABEL_UUID_RE.test(name)) return "~uuid";
  if (ROUTE_LABEL_NUMERIC_RE.test(name)) return "~numeric-id";
  return null;
}
export {
  EMAIL_RE,
  PIIDetectedError,
  PII_DENYLIST,
  assertNoPII,
  assertNoPIIInUrl,
  checkNoPII,
  checkNoPIIInUrl,
  jobNameHasPII,
  routeLabelHasPII,
  transmitLabelHasPII
};
