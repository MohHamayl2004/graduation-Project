// @ts-nocheck
/* eslint-disable */
// Built from src/cacheDirectives.ts so plain node can run the kit. Do not edit.
let watched = 0;
let noDirective = 0;
let neverStore = 0;
let noRevalidator = 0;
const MIN_WATCHED = 20;
const DOMINANT_SHARE = 0.6;
const MAX_WATCHED = 1e6;
function headerText(v) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === "string" ? first : "";
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}
function isPresent(v) {
  return headerText(v).trim().length > 0;
}
function noteResponseCacheHeaders(input) {
  try {
    if (watched >= MAX_WATCHED) return;
    const method = String(input.method ?? "").toUpperCase();
    if (method !== "GET") return;
    if (input.statusCode !== 200) return;
    watched++;
    const cc = headerText(input.cacheControl).toLowerCase();
    if (cc.trim().length === 0) {
      noDirective++;
      return;
    }
    if (cc.includes("no-store")) {
      neverStore++;
      return;
    }
    if (!isPresent(input.etag) && !isPresent(input.lastModified)) {
      noRevalidator++;
    }
  } catch {
  }
}
function getCacheDirectiveStats() {
  return { watched, noDirective, neverStore, noRevalidator };
}
function collectCacheDirectiveFindings() {
  const out = [];
  if (watched < MIN_WATCHED) return out;
  const bar = watched * DOMINANT_SHARE;
  if (noDirective >= bar) {
    out.push({
      kind: "cache-headers-missing",
      name: "responses",
      p95: 0,
      count: noDirective,
      hint: "Most successful GET responses carry no Cache-Control at all, so every browser and CDN fetches them again every time."
    });
  }
  if (neverStore >= bar) {
    out.push({
      kind: "cache-never-store",
      name: "responses",
      p95: 0,
      count: neverStore,
      hint: "Most successful GET responses are marked no-store, which forbids every cache from reusing them — correct for private data, waste for anything else."
    });
  }
  if (noRevalidator >= bar) {
    out.push({
      kind: "cache-no-revalidator",
      name: "responses",
      p95: 0,
      count: noRevalidator,
      hint: "Most cacheable GET responses carry no ETag or Last-Modified, so an unchanged resource cannot answer 304 and is re-sent in full."
    });
  }
  return out;
}
function clearCacheDirectives() {
  watched = 0;
  noDirective = 0;
  neverStore = 0;
  noRevalidator = 0;
}
export {
  clearCacheDirectives,
  collectCacheDirectiveFindings,
  getCacheDirectiveStats,
  noteResponseCacheHeaders
};
