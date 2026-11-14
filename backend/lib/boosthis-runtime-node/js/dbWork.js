// @ts-nocheck
/* eslint-disable */
// Built from src/dbWork.ts so plain node can run the kit. Do not edit.
import { requestSettled } from "./repeatedWork.js";
import { createRequire } from "node:module";
import { callFailure, dbFailure, countDbFailure, emptyDbFailures } from "./callFailures.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import {
  callIdentity,
  currentRequestScope
} from "./repeatedWork.js";
import {
  currentLinkedScope,
  noteLinkedCall
} from "./linkedSteps.js";
const MAX_DISTINCT_STATEMENTS = 512;
const DB_WAVE_MAX_CALLS = 256;
const MAX_SQL_CHARS = 512;
const WATCHABLE_DB_CLIENTS = [
  { name: "pg", file: "/node_modules/pg/lib/index.js" }
];
const UNWATCHABLE_DB_CLIENTS = [
  // Queries execute inside a Rust query engine; there is no JS call site every
  // query passes through.
  "@prisma/client",
  // postgres.js writes to its own socket with no single JS round-trip funnel.
  "postgres",
  // Not Postgres, and no funnel located yet — but still database work a
  // request waits on, so the blind spot is real and must be counted.
  "mysql2",
  "mysql",
  "mongodb",
  "better-sqlite3",
  "sqlite3",
  "oracledb",
  "tedious",
  "@libsql/client"
];
const HOSTED_DB_HOST_SUFFIXES = [
  ".supabase.co",
  ".supabase.in",
  ".supabase.net",
  ".firebaseio.com",
  ".firebasedatabase.app",
  "firestore.googleapis.com",
  ".neon.tech",
  ".upstash.io",
  ".turso.io",
  ".turso.tech",
  ".planetscale.com",
  ".psdb.cloud",
  ".cockroachlabs.cloud",
  ".mongodb-api.com",
  ".fauna.com",
  ".xata.sh",
  ".prisma-data.net"
];
const HOSTED_DB_PATH_PREFIXES = ["/rest/v1/"];
function isHostedDatabaseCall(host, path) {
  try {
    const h = typeof host === "string" ? host.toLowerCase() : "";
    if (h) {
      for (const suffix of HOSTED_DB_HOST_SUFFIXES) {
        if (h === suffix || h.endsWith(suffix)) return true;
        if (suffix.startsWith(".") && h === suffix.slice(1)) return true;
      }
    }
    const p = typeof path === "string" ? path : "";
    if (p) {
      for (const prefix of HOSTED_DB_PATH_PREFIXES) {
        if (p.startsWith(prefix)) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
function tallyFor(scope) {
  let t = scope.db;
  if (!t) {
    t = {
      statements: /* @__PURE__ */ new Map(),
      failures: emptyDbFailures(),
      count: 0,
      failed: 0,
      ms: 0,
      hosted: 0,
      rowsWorst: 0,
      spans: [],
      spansOver: false,
      rowsSum: 0,
      rowsCalls: 0
    };
    scope.db = t;
  }
  return t;
}
function noteSpanAt(t, start, end) {
  if (t.spansOver) return;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return;
  if (t.spans.length >= DB_WAVE_MAX_CALLS * 2) {
    t.spansOver = true;
    return;
  }
  t.spans.push(start, end);
}
function sortSpansByStart(spans) {
  for (let i = 2; i < spans.length; i += 2) {
    const s = spans[i];
    const e = spans[i + 1];
    let j = i - 2;
    while (j >= 0 && (spans[j] > s || spans[j] === s && spans[j + 1] > e)) {
      spans[j + 2] = spans[j];
      spans[j + 3] = spans[j + 1];
      j -= 2;
    }
    spans[j + 2] = s;
    spans[j + 3] = e;
  }
}
function sweepWaves(spans) {
  sortSpansByStart(spans);
  let waves = 0;
  let spanMs = 0;
  let sumMs = 0;
  let segStart = 0;
  let segEnd = 0;
  let open = false;
  for (let i = 0; i < spans.length; i += 2) {
    const s = spans[i];
    const e = spans[i + 1];
    sumMs += e - s;
    if (!open) {
      open = true;
      waves += 1;
      segStart = s;
      segEnd = e;
      continue;
    }
    if (s < segEnd) {
      if (e > segEnd) segEnd = e;
      continue;
    }
    spanMs += segEnd - segStart;
    waves += 1;
    segStart = s;
    segEnd = e;
  }
  if (open) spanMs += segEnd - segStart;
  return { waves, spanMs, sumMs };
}
let watchedRequests = 0;
let watchedRequestMs = 0;
let dbMs = 0;
let callCount = 0;
let hostedCalls = 0;
let repeatWorst = 0;
let repeatRequests = 0;
let repeatMs = 0;
let rowsWorst = 0;
let rowsSum = 0;
let rowsCalls = 0;
let waveRequests = 0;
let wavesTotal = 0;
let wavesWorst = 0;
let waveSpanMs = 0;
let waveSumMs = 0;
function noteDbCallIn(scope, identity, durationMs, hosted, rows, failed, error) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    if (!scope) return;
    const t = tallyFor(scope);
    const ms = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
    t.count += 1;
    if (failed === true) {
      t.failed += 1;
      countDbFailure(t.failures, dbFailure(error));
    }
    t.ms += ms;
    if (hosted) t.hosted += 1;
    const finishedAt = performance.now();
    noteSpanAt(t, finishedAt - ms, finishedAt);
    if (typeof rows === "number" && Number.isFinite(rows) && rows >= 0) {
      const n = Math.floor(rows);
      if (n > t.rowsWorst) t.rowsWorst = n;
      t.rowsSum += n;
      t.rowsCalls += 1;
    }
    const seen = t.statements.get(identity);
    if (seen) {
      seen.n += 1;
      seen.ms += ms;
      return;
    }
    if (t.statements.size >= MAX_DISTINCT_STATEMENTS) return;
    t.statements.set(identity, { n: 1, ms });
  } catch {
  }
}
function noteDbCall(identity, durationMs, hosted, rows, failed, error) {
  noteDbCallIn(
    currentRequestScope(),
    identity,
    durationMs,
    hosted,
    rows,
    failed,
    error
  );
}
const pendingHosted = /* @__PURE__ */ new WeakMap();
function noteHostedDbStart(token, target) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const scope = currentRequestScope();
    const linked = currentLinkedScope();
    if (!scope && !linked) return;
    pendingHosted.set(token, {
      scope,
      linked,
      identity: callIdentity(target, []),
      start: performance.now()
    });
  } catch {
  }
}
function noteHostedDbEnd(token, failed, detail) {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const p = pendingHosted.get(token);
    if (!p) return;
    pendingHosted.delete(token);
    const ms = performance.now() - p.start;
    noteLinkedCall(p.linked, "database", p.start, p.start + (ms > 0 ? ms : 0), failed === true);
    if (!p.scope) return;
    const t = tallyFor(p.scope);
    t.count += 1;
    if (failed === true) {
      t.failed += 1;
      countDbFailure(t.failures, callFailure(detail?.status, detail?.error));
    }
    t.ms += ms > 0 ? ms : 0;
    t.hosted += 1;
    noteSpanAt(t, p.start, p.start + (ms > 0 ? ms : 0));
    const seen = t.statements.get(p.identity);
    if (seen) {
      seen.n += 1;
      seen.ms += ms > 0 ? ms : 0;
      return;
    }
    if (t.statements.size >= MAX_DISTINCT_STATEMENTS) return;
    t.statements.set(p.identity, { n: 1, ms: ms > 0 ? ms : 0 });
  } catch {
  }
}
function endDbWork(scope, requestMs) {
  if (!scope) return;
  try {
    const t = scope.db;
    if (!t) return;
    scope.db = void 0;
    if (t.count === 0) return;
    if (isBoosthisDisabled() || isKitLocked()) return;
    if (!requestSettled(scope, "latencyTail")) {
      settlingRequestCount += 1;
      t.statements.clear();
      t.spans.length = 0;
      return;
    }
    const wall = Number.isFinite(requestMs) && requestMs > 0 ? requestMs : 0;
    let worst = 0;
    let redundant = 0;
    for (const s of t.statements.values()) {
      if (s.n > worst) worst = s.n;
      if (s.n > 1) redundant += s.ms / s.n * (s.n - 1);
    }
    t.statements.clear();
    watchedRequests += 1;
    watchedRequestMs += wall;
    dbMs += wall > 0 ? Math.min(t.ms, wall) : 0;
    callCount += t.count;
    for (const key of Object.keys(dbFailures)) dbFailures[key] += t.failures[key];
    hostedCalls += t.hosted;
    if (worst > repeatWorst) repeatWorst = worst;
    if (t.rowsWorst > rowsWorst) rowsWorst = t.rowsWorst;
    rowsSum += t.rowsSum;
    rowsCalls += t.rowsCalls;
    if (worst > 1) {
      repeatRequests += 1;
      repeatMs += wall > 0 ? Math.min(redundant, wall) : 0;
    }
    if (!t.spansOver && t.spans.length > 0) {
      const sweep = sweepWaves(t.spans);
      waveRequests += 1;
      wavesTotal += sweep.waves;
      if (sweep.waves > wavesWorst) wavesWorst = sweep.waves;
      waveSpanMs += wall > 0 ? Math.min(sweep.spanMs, wall) : sweep.spanMs;
      waveSumMs += sweep.sumMs;
    }
    t.spans.length = 0;
  } catch {
  }
}
let hostRequire;
function moduleCache() {
  if (hostRequire === void 0) {
    hostRequire = null;
    try {
      const cwd = typeof process?.cwd === "function" ? process.cwd() : "";
      if (cwd) hostRequire = createRequire(`${cwd}/boosthis-db-work.cjs`);
    } catch {
      hostRequire = null;
    }
  }
  try {
    const cache = hostRequire?.cache;
    return cache ? cache : null;
  } catch {
    return null;
  }
}
function normalizeKey(key) {
  return key.replace(/\\/g, "/");
}
function cachedKeyEndingWith(suffix) {
  const cache = moduleCache();
  if (!cache) return null;
  try {
    for (const key of Object.keys(cache)) {
      if (normalizeKey(key).endsWith(suffix)) return key;
    }
  } catch {
  }
  return null;
}
function packageIsLoaded(name) {
  const cache = moduleCache();
  if (!cache) return false;
  const needle = `/node_modules/${name}/`;
  try {
    for (const key of Object.keys(cache)) {
      if (normalizeKey(key).includes(needle)) return true;
    }
  } catch {
  }
  return false;
}
const installed = {};
const patches = [];
const observedPools = /* @__PURE__ */ new Set();
let observedPoolSeen = /* @__PURE__ */ new WeakSet();
const poolFinalizer = typeof FinalizationRegistry === "function" ? new FinalizationRegistry(
  (ref) => observedPools.delete(ref)
) : null;
function observePgPool(pool) {
  try {
    if (observedPoolSeen.has(pool)) return;
    observedPoolSeen.add(pool);
    const ref = new WeakRef(pool);
    observedPools.add(ref);
    poolFinalizer?.register(pool, ref, ref);
  } catch {
  }
}
let armAttempted = false;
let active = false;
const ARM_RETRY_MS = 1e3;
let lastArmAt = 0;
function statementIdentity(args) {
  try {
    const first = args[0];
    let text = "";
    let values = [];
    if (typeof first === "string") {
      text = first;
      if (Array.isArray(args[1])) values = args[1];
    } else if (first && typeof first === "object") {
      const cfg = first;
      if (typeof cfg.text === "string") text = cfg.text;
      else if (typeof cfg.name === "string") text = cfg.name;
      if (Array.isArray(cfg.values)) values = cfg.values;
    }
    if (!text) return null;
    if (text.length > MAX_SQL_CHARS) text = text.slice(0, MAX_SQL_CHARS);
    return callIdentity(text, values);
  } catch {
    return null;
  }
}
function rowCountOf(result) {
  try {
    if (!result || typeof result !== "object") return void 0;
    const r = result;
    if (typeof r.rowCount === "number" && Number.isFinite(r.rowCount)) {
      return r.rowCount;
    }
    if (Array.isArray(r.rows)) return r.rows.length;
    return void 0;
  } catch {
    return void 0;
  }
}
function installPg(entryKey) {
  const req = hostRequire;
  if (!req) return false;
  let mod;
  try {
    mod = req(entryKey);
  } catch {
    return false;
  }
  const pkg = mod && typeof mod === "object" ? mod.default ?? mod : null;
  const proto = pkg?.Client?.prototype;
  if (!proto) return false;
  const original = proto.query;
  if (typeof original !== "function") return false;
  const real = original;
  const observed = makeObservedQuery(real);
  patches.push(["pg", proto, "query", original, observed]);
  proto.query = observed;
  const RealPool = pkg?.Pool;
  if (pkg && typeof RealPool === "function") {
    try {
      const ObservedPool = class extends RealPool {
        constructor(...args) {
          super(...args);
          observePgPool(this);
        }
      };
      patches.push([
        "pg",
        pkg,
        "Pool",
        RealPool,
        ObservedPool
      ]);
      pkg.Pool = ObservedPool;
    } catch {
    }
    const poolProto = RealPool.prototype;
    if (poolProto) {
      for (const name of ["connect", "query"]) {
        try {
          const originalMethod = poolProto[name];
          if (typeof originalMethod !== "function") continue;
          const realMethod = originalMethod;
          const remembered = function(...args) {
            observePgPool(this);
            return realMethod.apply(this, args);
          };
          patches.push(["pg", poolProto, name, originalMethod, remembered]);
          poolProto[name] = remembered;
        } catch {
        }
      }
    }
  }
  return true;
}
function makeObservedQuery(real) {
  return function observed(...args) {
    if (!active) return real.apply(this, args);
    const started = performance.now();
    const scope = currentRequestScope();
    const linked = currentLinkedScope();
    let identity = null;
    try {
      identity = statementIdentity(args);
    } catch {
      identity = null;
    }
    let filed = false;
    const file = (rows, failed, error) => {
      if (filed) return;
      filed = true;
      noteLinkedCall(linked, "database", started, performance.now(), failed === true);
      if (identity === null) return;
      noteDbCallIn(
        scope,
        identity,
        performance.now() - started,
        false,
        rows,
        failed,
        error
      );
    };
    let wrapped = false;
    try {
      const last = args.length > 0 ? args[args.length - 1] : void 0;
      if (typeof last === "function") {
        const cb = last;
        args[args.length - 1] = function(...cbArgs) {
          try {
            file(
              cbArgs[0] == null ? rowCountOf(cbArgs[1]) : void 0,
              cbArgs[0] != null,
              cbArgs[0]
            );
          } catch {
          }
          return cb.apply(this, cbArgs);
        };
        wrapped = true;
      }
    } catch {
    }
    if (wrapped) {
      try {
        return real.apply(this, args);
      } catch (err) {
        try {
          file(void 0, true, err);
        } catch {
        }
        throw err;
      }
    }
    let out;
    try {
      out = real.apply(this, args);
    } catch (err) {
      try {
        file(void 0, true, err);
      } catch {
      }
      throw err;
    }
    try {
      const thenable = out;
      if (thenable && typeof thenable.then === "function") {
        return out.then(
          (v) => {
            try {
              file(rowCountOf(v));
            } catch {
            }
            return v;
          },
          (err) => {
            try {
              file(void 0, true, err);
            } catch {
            }
            throw err;
          }
        );
      }
      const emitter = out;
      if (emitter && typeof emitter.once === "function") {
        let done = false;
        const finish = (failed, error) => {
          if (done) return;
          done = true;
          try {
            file(void 0, failed, error);
          } catch {
          }
        };
        const once = emitter.once;
        once.call(emitter, "end", () => finish(false));
        once.call(emitter, "error", (error) => finish(true, error));
        once.call(emitter, "close", () => finish(false));
      }
    } catch {
    }
    return out;
  };
}
function armDbClients() {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const now = Date.now();
    if (armAttempted && now - lastArmAt < ARM_RETRY_MS) return;
    lastArmAt = now;
    armAttempted = true;
    active = true;
    for (const client of WATCHABLE_DB_CLIENTS) {
      if (installed[client.name]) continue;
      const key = cachedKeyEndingWith(client.file);
      if (!key) continue;
      if (client.name === "pg") installed[client.name] = installPg(key);
    }
  } catch {
  }
}
function unpatchDbClients() {
  active = false;
  try {
    for (const [name, owner, attr, original, wrapper] of patches.splice(0)) {
      try {
        if (owner[attr] === wrapper) owner[attr] = original;
      } catch {
      }
      installed[name] = false;
    }
  } catch {
  }
}
function unwatchedDbClientCount() {
  if (!armAttempted || !active || isBoosthisDisabled()) return 0;
  let n = 0;
  try {
    for (const client of WATCHABLE_DB_CLIENTS) {
      if (!installed[client.name] && cachedKeyEndingWith(client.file)) n += 1;
    }
    for (const name of UNWATCHABLE_DB_CLIENTS) {
      if (packageIsLoaded(name)) n += 1;
    }
  } catch {
    return 0;
  }
  return n;
}
function hostPackageIsLoaded(name) {
  return packageIsLoaded(name);
}
let settlingRequestCount = 0;
let dbFailures = emptyDbFailures();
function getDbFailures() {
  return { ...dbFailures };
}
function dbWorkSettlingRequests() {
  return settlingRequestCount;
}
function getDbWorkStats() {
  return {
    watchedRequests,
    watchedRequestMs,
    dbMs,
    callCount,
    hostedCalls,
    repeatWorst,
    repeatRequests,
    repeatMs,
    rowsWorst,
    unwatchedClients: unwatchedDbClientCount()
  };
}
function getDbSequencingStats() {
  return {
    waveRequests,
    wavesTotal,
    wavesWorst,
    spanMs: waveSpanMs,
    sumMs: waveSumMs,
    unwatchedClients: unwatchedDbClientCount()
  };
}
function getDbRowVolumeStats() {
  return {
    watchedRequests,
    rowsWorst,
    rowsSum,
    rowsCalls,
    unwatchedClients: unwatchedDbClientCount()
  };
}
function getDbPoolPressureStats() {
  if (!active || isBoosthisDisabled()) return null;
  let busy = 0;
  let idle = 0;
  let waiting = 0;
  let size = 0;
  let read = false;
  try {
    for (const ref of [...observedPools]) {
      const pool = ref.deref();
      if (!pool) {
        observedPools.delete(ref);
        continue;
      }
      if (pool.ended === true) continue;
      const totalN = Number(pool.totalCount);
      const idleN = Number(pool.idleCount);
      const waitingN = Number(pool.waitingCount);
      const sizeN = Number(pool.options?.max);
      if (!Number.isFinite(totalN) || !Number.isFinite(idleN) || !Number.isFinite(waitingN) || !Number.isFinite(sizeN) || sizeN <= 0) {
        continue;
      }
      busy += Math.max(0, Math.round(totalN - idleN));
      idle += Math.max(0, Math.round(idleN));
      size += Math.max(1, Math.round(sizeN));
      waiting = Math.max(waiting, Math.max(0, Math.round(waitingN)));
      read = true;
    }
  } catch {
    return null;
  }
  return read ? { busy, idle, waiting, size } : null;
}
function clearDbWork() {
  dbFailures = emptyDbFailures();
  settlingRequestCount = 0;
  unpatchDbClients();
  armAttempted = false;
  lastArmAt = 0;
  watchedRequests = 0;
  watchedRequestMs = 0;
  dbMs = 0;
  callCount = 0;
  hostedCalls = 0;
  repeatWorst = 0;
  repeatRequests = 0;
  repeatMs = 0;
  rowsWorst = 0;
  rowsSum = 0;
  rowsCalls = 0;
  waveRequests = 0;
  wavesTotal = 0;
  wavesWorst = 0;
  waveSpanMs = 0;
  waveSumMs = 0;
  for (const ref of observedPools) {
    const pool = ref.deref();
    if (pool) poolFinalizer?.unregister(ref);
  }
  observedPools.clear();
  observedPoolSeen = /* @__PURE__ */ new WeakSet();
}
const _dbWorkInternals = {
  MAX_DISTINCT_STATEMENTS,
  MAX_SQL_CHARS,
  DB_WAVE_MAX_CALLS,
  sweepWaves,
  WATCHABLE_DB_CLIENTS,
  UNWATCHABLE_DB_CLIENTS,
  statementIdentity,
  makeObservedQuery,
  observePgPool,
  isArmed: () => active,
  isInstalled: (name) => installed[name] === true
};
export {
  DB_WAVE_MAX_CALLS,
  HOSTED_DB_HOST_SUFFIXES,
  HOSTED_DB_PATH_PREFIXES,
  _dbWorkInternals,
  armDbClients,
  clearDbWork,
  dbWorkSettlingRequests,
  endDbWork,
  getDbFailures,
  getDbPoolPressureStats,
  getDbRowVolumeStats,
  getDbSequencingStats,
  getDbWorkStats,
  hostPackageIsLoaded,
  isHostedDatabaseCall,
  noteDbCall,
  noteDbCallIn,
  noteHostedDbEnd,
  noteHostedDbStart,
  sweepWaves,
  unpatchDbClients,
  unwatchedDbClientCount
};
