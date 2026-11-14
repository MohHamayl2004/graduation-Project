// @ts-nocheck
/* eslint-disable */
// Built from src/buildIdentity.ts so plain node can run the kit. Do not edit.
import { statSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { linearScore } from "./healthAxes.js";
const PATCH_LAG_FULL_DECAY_DAYS = 60;
const MS_PER_DAY = 864e5;
const PATCH_LAG_GOOD_DAYS = 7;
const PATCH_LAG_NEEDS_WORK_DAYS = 30;
const EPOCH_MS_THRESHOLD = 1e12;
const DEP_INVENTORY_CAP = 150;
const DEP_NAME_RE = /^[A-Za-z0-9@/._:-]{1,100}$/;
const DEP_VERSION_RE = /^[0-9][0-9A-Za-z._+-]{0,49}$/;
let captured = false;
let buildCommit;
let buildTimeMs;
let buildAgeMs;
let deps;
let envReaderOverride = null;
let entryFileOverride = null;
let nowOverride = null;
function readEnv(key) {
  try {
    if (envReaderOverride) return envReaderOverride(key);
    if (typeof process !== "undefined" && process.env) return process.env[key];
  } catch {
  }
  return void 0;
}
function nowMs() {
  return nowOverride ?? Date.now();
}
function normalizeCommit(raw) {
  if (typeof raw !== "string") return void 0;
  const v = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(v)) return void 0;
  return v;
}
function parseBuildTime(raw) {
  if (typeof raw !== "string") return void 0;
  const v = raw.trim();
  if (v === "") return void 0;
  if (/^[+-]/.test(v)) return void 0;
  if (/^[0-9]+(\.[0-9]+)?$/.test(v)) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return void 0;
    const ms = n > EPOCH_MS_THRESHOLD ? n : n * 1e3;
    return Math.round(ms);
  }
  const parsed = Date.parse(v);
  if (!Number.isFinite(parsed) || parsed <= 0) return void 0;
  return parsed;
}
function entryFile() {
  if (entryFileOverride !== null) return entryFileOverride || void 0;
  try {
    return require.main?.filename ?? process.argv[1];
  } catch {
    try {
      return process.argv[1];
    } catch {
      return void 0;
    }
  }
}
function entryFileMtimeMs() {
  const file = entryFile();
  if (!file) return void 0;
  try {
    const st = statSync(file);
    const ms = st.mtimeMs;
    if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) {
      return Math.round(ms);
    }
  } catch {
  }
  return void 0;
}
function depInventoryEnabled() {
  return readEnv("BOOSTHIS_DEP_INVENTORY") === "1";
}
function findNearestPackageJson() {
  const file = entryFile();
  if (!file) return null;
  let dir;
  try {
    dir = dirname(file);
  } catch {
    return null;
  }
  for (let i = 0; i < 40; i++) {
    const candidate = join(dir, "package.json");
    try {
      const raw = readFileSync(candidate, "utf8");
      return { dir, manifest: JSON.parse(raw) };
    } catch {
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
function buildDepInventory() {
  const out = [];
  try {
    const found = findNearestPackageJson();
    if (!found) return out;
    const m = found.manifest;
    if (!m || typeof m !== "object") return out;
    const names = /* @__PURE__ */ new Set();
    for (const field of ["dependencies", "optionalDependencies"]) {
      const block = m[field];
      if (block && typeof block === "object") {
        for (const name of Object.keys(block)) {
          names.add(name);
        }
      }
    }
    for (const name of names) {
      if (!DEP_NAME_RE.test(name)) continue;
      let version;
      try {
        const pkgPath = require.resolve(`${name}/package.json`, {
          paths: [found.dir]
        });
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        if (typeof pkg.version === "string") version = pkg.version.trim();
      } catch {
        continue;
      }
      if (!version || !DEP_VERSION_RE.test(version)) continue;
      out.push({ name, version });
    }
  } catch {
    return [];
  }
  out.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  return out.slice(0, DEP_INVENTORY_CAP);
}
function captureBuildIdentity() {
  if (captured) return;
  captured = true;
  try {
    buildCommit = normalizeCommit(readEnv("BOOSTHIS_BUILD_COMMIT"));
    const envTime = parseBuildTime(readEnv("BOOSTHIS_BUILD_TIME"));
    buildTimeMs = envTime ?? entryFileMtimeMs();
    if (typeof buildTimeMs === "number") {
      buildAgeMs = Math.max(0, nowMs() - buildTimeMs);
    }
    if (depInventoryEnabled()) {
      deps = buildDepInventory();
    }
  } catch {
  }
}
function readBuildIdentity() {
  const out = {};
  if (buildCommit) out.commit = buildCommit;
  if (typeof buildTimeMs === "number") out.buildTimeMs = buildTimeMs;
  if (typeof buildAgeMs === "number") out.buildAgeMs = buildAgeMs;
  return Object.keys(out).length > 0 ? out : null;
}
function readReleaseKey() {
  const build = readBuildIdentity();
  if (!build) return null;
  if (build.commit) return `c:${build.commit}`;
  if (typeof build.buildTimeMs === "number") return `t:${build.buildTimeMs}`;
  return null;
}
function readDepInventory() {
  return deps ?? null;
}
function readPatchLag() {
  try {
    if (typeof buildTimeMs !== "number" || typeof buildAgeMs !== "number") {
      return null;
    }
    const ageDays = buildAgeMs / MS_PER_DAY;
    const score = linearScore(ageDays, 0, PATCH_LAG_FULL_DECAY_DAYS);
    const rating = ageDays < PATCH_LAG_GOOD_DAYS ? "good" : ageDays < PATCH_LAG_NEEDS_WORK_DAYS ? "needs-work" : "poor";
    const axis = {
      score,
      rating,
      buildAgeMs,
      buildTimeMs
    };
    if (deps) axis.depCount = deps.length;
    return axis;
  } catch {
    return null;
  }
}
function clearBuildIdentity() {
  captured = false;
  buildCommit = void 0;
  buildTimeMs = void 0;
  buildAgeMs = void 0;
  deps = void 0;
}
const _buildIdentityInternals = {
  PATCH_LAG_FULL_DECAY_DAYS,
  PATCH_LAG_GOOD_DAYS,
  PATCH_LAG_NEEDS_WORK_DAYS,
  EPOCH_MS_THRESHOLD,
  DEP_INVENTORY_CAP,
  /** Inject an env reader (tests). null restores process.env. */
  setEnvReaderForTests(fn) {
    envReaderOverride = fn;
  },
  /** Force the entry-file path (fallback-source tests). "" = no entry file;
   *  null restores the live require.main/argv resolution. */
  setEntryFileForTests(path) {
    entryFileOverride = path;
  },
  /** Force the capture-time clock (deterministic buildAgeMs). null = live. */
  setNowForTests(ms) {
    nowOverride = ms;
  },
  /** Trigger the ONCE-only frozen capture (same call enableTelemetry makes). */
  capture() {
    captureBuildIdentity();
  },
  get capturedBuildTimeMs() {
    return buildTimeMs;
  },
  get capturedCommit() {
    return buildCommit;
  },
  /** Reset ALL state + seams to hermetic defaults. */
  resetForTests() {
    clearBuildIdentity();
    envReaderOverride = null;
    entryFileOverride = null;
    nowOverride = null;
  }
};
export {
  _buildIdentityInternals,
  buildDepInventory,
  captureBuildIdentity,
  clearBuildIdentity,
  depInventoryEnabled,
  normalizeCommit,
  parseBuildTime,
  readBuildIdentity,
  readDepInventory,
  readPatchLag,
  readReleaseKey
};
