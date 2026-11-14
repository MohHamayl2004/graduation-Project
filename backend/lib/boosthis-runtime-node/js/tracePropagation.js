// @ts-nocheck
/* eslint-disable */
// Built from src/tracePropagation.ts so plain node can run the kit. Do not edit.
import { PUBLIC_SUFFIX_RULES } from "./publicSuffixList.js";
const PROPAGATION_ENV = "BOOSTHIS_TRACE_PROPAGATION";
const DEFAULT_PROPAGATION = "internal,same-site";
const INTERNAL_KEYWORD = "internal";
const SAME_SITE_KEYWORD = "same-site";
const SAME_SITE_KEYWORDS = ["same-site", "samesite"];
const OFF_KEYWORDS = ["none", "off"];
const INTERNAL_SUFFIXES = [
  "localhost",
  "local",
  "internal",
  "intranet",
  "home.arpa",
  "lan",
  "test"
];
const PUBLIC_DOTLESS_HOSTS = [
  "ac",
  "ai",
  "cm",
  "dk",
  "gg",
  "hr",
  "io",
  "je",
  "kh",
  "kw",
  "mq",
  "pa",
  "ph",
  "pn",
  "sh",
  "sj",
  "su",
  "tk",
  "tm",
  "to",
  "ua",
  "uz",
  "va",
  "ws"
];
const PROVIDER_METADATA_HOSTS = [
  "metadata",
  // Google Cloud, the short alias
  "metadata.google.internal",
  // Google Cloud
  "metadata.goog",
  // Google Cloud
  "metadata.internal",
  // several providers' short form
  "instance-data",
  // AWS, the documented alias for the IMDS
  "instance-data.ec2.internal"
  // AWS
];
const PROVIDER_METADATA_ADDRESSES = [
  "169.254.169.254",
  // AWS, Azure, Google Cloud, Oracle, DigitalOcean
  "100.100.100.200",
  // Alibaba Cloud — inside CGNAT, which the set permits
  "192.0.0.192",
  // Oracle Cloud Classic
  "fd00:ec2::254"
  // AWS over IPv6 — a unique-local address
];
const SHARED_HOSTING_DOMAINS = [
  "amazonaws.com",
  // AWS service endpoints and load balancers the list has not split
  "on.aws",
  // AWS Lambda function addresses in regions the list has not caught up with
  "awsapprunner.com",
  // AWS App Runner services
  "azure.com",
  // Azure virtual machines' public names, beside Microsoft's own APIs
  "windows.net",
  // Azure storage, databases and Microsoft sign-in
  "azurecontainerapps.io",
  // Azure Container Apps
  "appdomain.cloud",
  // IBM Cloud Code Engine apps
  "linode.com",
  // Akamai (Linode) NodeBalancers
  "koyeb.app",
  // Koyeb apps
  "modal.run",
  // Modal web endpoints
  "railway.app",
  // Railway's older app addresses
  "scalingo.io",
  // Scalingo apps
  "shinyapps.io",
  // Posit shinyapps.io accounts
  "anvil.app",
  // Anvil apps
  "github.dev",
  // GitHub Codespaces forwarded ports
  "gitpod.io",
  // Gitpod workspaces
  "codesandbox.io",
  // CodeSandbox previews at their older addresses
  "stackblitz.io",
  // StackBlitz projects
  "webcontainer.io",
  // StackBlitz previews
  "glitch.me",
  // Glitch projects
  "gradio.live",
  // Gradio share links
  "loca.lt"
  // localtunnel tunnels
];
const MAX_PROPAGATION_ENTRIES = 64;
const DEFAULT_POLICY = Object.freeze({
  off: false,
  internal: true,
  sameSite: true,
  hosts: Object.freeze([]),
  suffixes: Object.freeze([]),
  refused: Object.freeze([]),
  isDefault: true
});
const OFF_POLICY = Object.freeze({
  off: true,
  internal: false,
  sameSite: false,
  hosts: Object.freeze([]),
  suffixes: Object.freeze([]),
  refused: Object.freeze([]),
  isDefault: false
});
function looksLikeHost(value) {
  if (value.length === 0 || value.length > 253) return false;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    const ok = c >= 97 && c <= 122 || // a-z
    c >= 48 && c <= 57 || // 0-9
    c === 45 || // -
    c === 46 || // .
    c === 58;
    if (!ok) return false;
  }
  return true;
}
function parseTracePropagation(raw) {
  if (raw === void 0 || raw === null) return DEFAULT_POLICY;
  const text = String(raw).trim();
  if (text.length === 0) return DEFAULT_POLICY;
  let internal = false;
  let sameSite = false;
  const hosts = [];
  const suffixes = [];
  const refused = [];
  let seen = 0;
  for (const piece of text.split(",")) {
    const entry = piece.trim().toLowerCase();
    if (entry.length === 0) continue;
    if (OFF_KEYWORDS.includes(entry)) return OFF_POLICY;
    if (++seen > MAX_PROPAGATION_ENTRIES) {
      if (refused.length < MAX_PROPAGATION_ENTRIES) refused.push(entry);
      continue;
    }
    if (entry === INTERNAL_KEYWORD) {
      internal = true;
      continue;
    }
    if (SAME_SITE_KEYWORDS.includes(entry)) {
      sameSite = true;
      continue;
    }
    if (entry.startsWith(".")) {
      const suffix = entry.slice(1);
      if (suffix.length > 0 && looksLikeHost(suffix)) suffixes.push(suffix);
      else refused.push(entry);
      continue;
    }
    if (looksLikeHost(entry)) hosts.push(entry);
    else refused.push(entry);
  }
  if (!internal && !sameSite && hosts.length === 0 && suffixes.length === 0) {
    return Object.freeze({
      off: false,
      internal: true,
      sameSite: true,
      hosts: Object.freeze([]),
      suffixes: Object.freeze([]),
      refused: Object.freeze(refused),
      isDefault: true
    });
  }
  return Object.freeze({
    off: false,
    internal,
    sameSite,
    hosts: Object.freeze(hosts),
    suffixes: Object.freeze(suffixes),
    refused: Object.freeze(refused),
    isDefault: false
  });
}
let cached = null;
function tracePropagationPolicy() {
  if (cached !== null) return cached;
  try {
    cached = parseTracePropagation(process.env[PROPAGATION_ENV]);
  } catch {
    cached = OFF_POLICY;
  }
  return cached;
}
function resetTracePropagationPolicy() {
  cached = null;
}
function isNumericAddressForm(host) {
  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return false;
  for (const part of parts) {
    const hexed = part.slice(0, 2) === "0x" || part.slice(0, 2) === "0X";
    const body = hexed ? part.slice(2) : part;
    if (body.length === 0) return false;
    for (let i = 0; i < body.length; i++) {
      const c = body.charCodeAt(i);
      const dec = c >= 48 && c <= 57;
      const hex = hexed && (c >= 97 && c <= 102 || c >= 65 && c <= 70);
      if (!dec && !hex) return false;
    }
  }
  return true;
}
function readIPv4(host, out) {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const part = parts[i];
    if (part.length === 0 || part.length > 3) return false;
    if (part.length > 1 && part.charCodeAt(0) === 48) return false;
    let value = 0;
    for (let j = 0; j < part.length; j++) {
      const c = part.charCodeAt(j);
      if (c < 48 || c > 57) return false;
      value = value * 10 + (c - 48);
    }
    if (value > 255) return false;
    out[i] = value;
  }
  return true;
}
function readHexGroup(text) {
  if (typeof text !== "string" || text.length === 0 || text.length > 4) {
    return -1;
  }
  let value = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    let digit;
    if (c >= 48 && c <= 57) digit = c - 48;
    else if (c >= 97 && c <= 102) digit = c - 87;
    else if (c >= 65 && c <= 70) digit = c - 55;
    else return -1;
    value = value * 16 + digit;
  }
  return value;
}
function isProviderMetadataHost(host) {
  if (host.length === 0) return false;
  const bare = host.charCodeAt(0) === 91 ? host.slice(1, host.endsWith("]") ? -1 : void 0) : host;
  for (const name of PROVIDER_METADATA_HOSTS) {
    if (bare === name) return true;
  }
  if (bare.includes(":")) {
    const groups = bare.split(":");
    const first = readHexGroup(groups[0]);
    const second = readHexGroup(groups[1]);
    if (first < 0 || second < 0) return false;
    for (const listed2 of PROVIDER_METADATA_ADDRESSES) {
      if (!listed2.includes(":")) continue;
      const parts = listed2.split(":");
      if (readHexGroup(parts[0]) === first && readHexGroup(parts[1]) === second) {
        return true;
      }
    }
    return false;
  }
  const quad = [0, 0, 0, 0];
  if (!readIPv4(bare, quad)) return false;
  const listed = [0, 0, 0, 0];
  for (const address of PROVIDER_METADATA_ADDRESSES) {
    if (address.includes(":")) continue;
    if (!readIPv4(address, listed)) continue;
    if (quad[0] === listed[0] && quad[1] === listed[1] && quad[2] === listed[2] && quad[3] === listed[3]) {
      return true;
    }
  }
  return quad[0] === 169 && quad[1] === 254;
}
function isInternalHost(host) {
  if (host.length === 0) return false;
  if (isProviderMetadataHost(host)) return false;
  if (host.charCodeAt(0) === 91 || host.includes(":")) {
    const bare = host.startsWith("[") ? host.slice(1, host.endsWith("]") ? -1 : void 0) : host;
    if (bare === "::1") return true;
    if (bare.indexOf(":") === 4) {
      const lead = bare.slice(0, 2);
      if (lead === "fc" || lead === "fd") {
        const c = bare.charCodeAt(2);
        const d = bare.charCodeAt(3);
        const hex = (n) => n >= 48 && n <= 57 || n >= 97 && n <= 102;
        if (hex(c) && hex(d)) return true;
      }
    }
    return false;
  }
  const quad = [0, 0, 0, 0];
  if (readIPv4(host, quad)) {
    const a = quad[0];
    const b = quad[1];
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (isNumericAddressForm(host)) return false;
  if (!host.includes(".")) {
    for (const dotless of PUBLIC_DOTLESS_HOSTS) {
      if (host === dotless) return false;
    }
    return true;
  }
  for (const suffix of INTERNAL_SUFFIXES) {
    if (host === suffix) return true;
    if (host.length > suffix.length + 1 && host.endsWith(`.${suffix}`)) {
      return true;
    }
  }
  return false;
}
let suffixRules = null;
function readSuffixRules() {
  if (suffixRules !== null) return suffixRules;
  const normal = /* @__PURE__ */ new Set();
  const wildcard = /* @__PURE__ */ new Set();
  const exception = /* @__PURE__ */ new Set();
  for (const line of PUBLIC_SUFFIX_RULES.split("\n")) {
    if (line.length === 0) continue;
    if (line.charCodeAt(0) === 33) exception.add(line.slice(1));
    else if (line.startsWith("*.")) wildcard.add(line.slice(2));
    else normal.add(line);
  }
  suffixRules = { normal, wildcard, exception };
  return suffixRules;
}
function isAsciiName(host) {
  for (let i = 0; i < host.length; i++) {
    const c = host.charCodeAt(i);
    const ok = c >= 97 && c <= 122 || // a-z
    c >= 48 && c <= 57 || // 0-9
    c === 45 || // -
    c === 46;
    if (!ok) return false;
  }
  return true;
}
function registrableDomain(host) {
  try {
    if (typeof host !== "string" || host.length === 0 || host.length > 253) {
      return null;
    }
    if (!isAsciiName(host) || isNumericAddressForm(host)) return null;
    const starts = [0];
    for (let i = 0; i < host.length; i++) {
      if (host.charCodeAt(i) === 46) starts.push(i + 1);
    }
    const labels = starts.length;
    if (labels < 2) return null;
    for (let i = 0; i < labels; i++) {
      const start = starts[i];
      const end = i + 1 < labels ? starts[i + 1] - 1 : host.length;
      if (end - start < 1 || end - start > 63) return null;
    }
    const rules = readSuffixRules();
    let suffixLabels = 0;
    for (let i = 0; i < labels; i++) {
      const candidate = host.slice(starts[i]);
      const span = labels - i;
      if (rules.exception.has(candidate)) {
        suffixLabels = span - 1;
        break;
      }
      if (suffixLabels !== 0) continue;
      if (rules.normal.has(candidate)) {
        suffixLabels = span;
      } else if (i + 1 < labels && rules.wildcard.has(host.slice(starts[i + 1]))) {
        suffixLabels = span;
      }
    }
    if (suffixLabels === 0 || suffixLabels >= labels) return null;
    return host.slice(starts[labels - suffixLabels - 1]);
  } catch {
    return null;
  }
}
const SERVED_SITE_LIMIT = 32;
const servedSites = /* @__PURE__ */ new Map();
function servedSiteOf(served) {
  const known = servedSites.get(served);
  if (known !== void 0) return known;
  let site = registrableDomain(served);
  if (site !== null && SHARED_HOSTING_DOMAINS.includes(site)) site = null;
  if (servedSites.size >= SERVED_SITE_LIMIT) servedSites.clear();
  servedSites.set(served, site);
  return site;
}
function isSameSiteHost(host, served) {
  try {
    if (host.length === 0 || served.length === 0) return false;
    if (sharedTrailingLabels(host, served) < 2) return false;
    const site = servedSiteOf(served);
    if (site === null) return false;
    if (host !== site) {
      if (host.length <= site.length + 1) return false;
      if (!host.endsWith(site) || host.charCodeAt(host.length - site.length - 1) !== 46) {
        return false;
      }
    }
    return registrableDomain(host) === site;
  } catch {
    return false;
  }
}
function sharedTrailingLabels(a, b) {
  let i = a.length - 1;
  let j = b.length - 1;
  let labels = 0;
  while (i >= 0 && j >= 0) {
    const c = a.charCodeAt(i);
    if (c !== b.charCodeAt(j)) return labels;
    if (c === 46) labels++;
    i--;
    j--;
  }
  if (i < 0 && j < 0) return labels + 1;
  if (i < 0 && b.charCodeAt(j) === 46) return labels + 1;
  if (j < 0 && a.charCodeAt(i) === 46) return labels + 1;
  return labels;
}
function servedHostOf(request) {
  try {
    if (request === null || typeof request !== "object") return "";
    const headers = request.headers;
    if (headers === null || typeof headers !== "object") return "";
    let raw;
    const get = headers.get;
    if (typeof get === "function") {
      raw = get.call(headers, "host");
    } else {
      const map = headers;
      raw = map.host ?? map[":authority"];
    }
    if (Array.isArray(raw)) raw = raw[0];
    if (typeof raw !== "string" || raw.length === 0 || raw.length > 260) return "";
    let text = raw.trim().toLowerCase();
    if (text.startsWith("[")) return "";
    const colon = text.indexOf(":");
    if (colon >= 0) {
      const port = text.slice(colon + 1);
      for (let i = 0; i < port.length; i++) {
        const c = port.charCodeAt(i);
        if (c < 48 || c > 57) return "";
      }
      text = text.slice(0, colon);
    }
    return isAsciiName(text) ? text : "";
  } catch {
    return "";
  }
}
function shouldPropagateTo(host, served) {
  try {
    if (typeof host !== "string" || host.length === 0) return false;
    const policy = tracePropagationPolicy();
    if (policy.off) return false;
    const lower = host.toLowerCase();
    if (policy.internal && isInternalHost(lower)) return true;
    for (const named of policy.hosts) {
      if (lower === named) return true;
    }
    for (const suffix of policy.suffixes) {
      if (lower === suffix) return true;
      if (lower.length > suffix.length + 1 && lower.endsWith(`.${suffix}`)) {
        return true;
      }
    }
    if (policy.sameSite && typeof served === "string" && served.length > 0) {
      if (isSameSiteHost(lower, served.toLowerCase())) return true;
    }
    return false;
  } catch {
    return false;
  }
}
function describeTracePropagation() {
  let policy;
  try {
    policy = tracePropagationPolicy();
  } catch {
    policy = OFF_POLICY;
  }
  const named = [
    ...policy.hosts,
    ...policy.suffixes.map((suffix) => `.${suffix}`)
  ];
  return {
    mode: policy.off ? "off" : named.length > 0 ? "named" : "built-in",
    internal: policy.internal,
    sameSite: policy.sameSite,
    named,
    refused: policy.refused,
    setting: PROPAGATION_ENV
  };
}
const SUMMARY_NAMED_LIMIT = 4;
function builtInWords(d) {
  if (d.internal && d.sameSite) {
    return "Internal destinations and hosts on the same site as the request being served";
  }
  if (d.internal) return "Internal destinations";
  if (d.sameSite) return "Hosts on the same site as the request being served";
  return "";
}
function tracePropagationSummary() {
  let d;
  try {
    d = describeTracePropagation();
  } catch {
    return "Off — no trace headers are attached to outgoing calls";
  }
  const ignored = d.refused.length > 0 ? ` (ignored, not a hostname: ${d.refused.slice(0, SUMMARY_NAMED_LIMIT).join(", ")}${d.refused.length > SUMMARY_NAMED_LIMIT ? ", …" : ""})` : "";
  if (d.mode === "off") {
    return `Off — no trace headers are attached to outgoing calls${ignored}`;
  }
  const builtIn = builtInWords(d);
  if (d.mode === "built-in") {
    if (d.internal && d.sameSite) return `${builtIn} — the default${ignored}`;
    if (d.internal) return `Internal destinations only${ignored}`;
    return `Only hosts on the same site as the request being served${ignored}`;
  }
  const shown = d.named.slice(0, SUMMARY_NAMED_LIMIT).join(", ");
  const more = d.named.length > SUMMARY_NAMED_LIMIT ? ` and ${d.named.length - SUMMARY_NAMED_LIMIT} more` : "";
  if (builtIn.length > 0) return `${builtIn}, plus ${shown}${more}${ignored}`;
  return `Only ${shown}${more}${ignored}`;
}
export {
  DEFAULT_PROPAGATION,
  INTERNAL_KEYWORD,
  INTERNAL_SUFFIXES,
  MAX_PROPAGATION_ENTRIES,
  OFF_KEYWORDS,
  PROPAGATION_ENV,
  PROVIDER_METADATA_ADDRESSES,
  PROVIDER_METADATA_HOSTS,
  PUBLIC_DOTLESS_HOSTS,
  SAME_SITE_KEYWORD,
  SAME_SITE_KEYWORDS,
  SHARED_HOSTING_DOMAINS,
  describeTracePropagation,
  isInternalHost,
  isProviderMetadataHost,
  isSameSiteHost,
  parseTracePropagation,
  registrableDomain,
  resetTracePropagationPolicy,
  servedHostOf,
  shouldPropagateTo,
  tracePropagationPolicy,
  tracePropagationSummary
};
