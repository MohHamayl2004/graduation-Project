// @ts-nocheck
/* eslint-disable */
// Built from src/jobAdapters.ts so plain node can run the kit. Do not edit.
import { createRequire } from "node:module";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
import {
  beginJob,
  noteJobSystemAttached,
  noteJobSystemUnattached,
  runInsideMeasuredJob
} from "./jobWork.js";
const ARM_RETRY_MS = 3e4;
const WATCHABLE_JOB_SYSTEMS = [
  { name: "bullmq", files: ["/node_modules/bullmq/dist/cjs/index.js"] },
  {
    name: "pg-boss",
    // v9–v10 ship CommonJS from src/. v11+ publishes ESM only, from dist/ —
    // which a CommonJS app on a recent Node still reaches, because `require()`
    // of an ESM module is supported there and puts the module in the same
    // registry everything else lands in. An app that reaches it with `import`
    // does not, and is counted as a blind spot instead.
    files: [
      "/node_modules/pg-boss/src/index.js",
      "/node_modules/pg-boss/dist/index.js"
    ]
  },
  {
    name: "node-cron",
    // v4 publishes both, and a CommonJS app gets the .cjs build. v3 shipped
    // CommonJS from src/.
    files: [
      "/node_modules/node-cron/dist/node-cron.cjs",
      "/node_modules/node-cron/dist/cjs/index.js",
      "/node_modules/node-cron/src/node-cron.js"
    ]
  }
];
const UNWATCHABLE_JOB_SYSTEMS = [
  // Runs each job in a CHILD PROCESS. The kit in the parent is not inside the
  // process doing the work, so there is nothing here to time.
  "bree",
  // The handler is registered through several equally valid entry points with
  // no single call every run passes through.
  "agenda",
  "bee-queue",
  "graphile-worker",
  // The scheduler is constructed with the callback already inside it, so by
  // the time anything is on a prototype the function is out of reach.
  "croner",
  "toad-scheduler",
  "node-schedule",
  // The original Bull. Superseded by bullmq, still widely deployed.
  "bull"
];
let hostRequire;
function moduleCache() {
  if (hostRequire === void 0) {
    hostRequire = null;
    try {
      const cwd = typeof process?.cwd === "function" ? process.cwd() : "";
      if (cwd) hostRequire = createRequire(`${cwd}/boosthis-job-work.cjs`);
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
function filesFor(name) {
  return WATCHABLE_JOB_SYSTEMS.find((s) => s.name === name)?.files ?? [];
}
function cachedExports(suffixes) {
  const cache = moduleCache();
  if (!cache) return null;
  try {
    for (const key of Object.keys(cache)) {
      const norm = normalizeKey(key);
      if (!suffixes.some((s) => norm.endsWith(s))) continue;
      const mod = cache[key];
      const exp = mod?.exports;
      return exp && typeof exp === "object" ? exp : null;
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
let armAttempted = false;
let lastArmAt = 0;
let active = false;
function surfacesFor(exp, attr) {
  const out = [];
  const consider = (o) => {
    if (!o || typeof o !== "object" && typeof o !== "function") return;
    const owner = o;
    if (typeof owner[attr] !== "function") return;
    if (out.includes(owner)) return;
    out.push(owner);
  };
  consider(exp);
  consider(exp?.default);
  return out;
}
function remember(system, owners, attr, make) {
  let took = false;
  for (const owner of owners) {
    try {
      const original = owner[attr];
      if (typeof original !== "function") continue;
      const wrapper = make(original);
      owner[attr] = wrapper;
      if (owner[attr] !== wrapper) continue;
      patches.push([system, owner, attr, original, wrapper]);
      took = true;
    } catch {
    }
  }
  if (!took) return false;
  installed[system] = true;
  noteJobSystemAttached(system);
  return true;
}
function closeWith(run, out) {
  const maybe = out;
  if (maybe && typeof maybe.then === "function") {
    return out.then(
      (value) => {
        run.done();
        return value;
      },
      (err) => {
        run.failed(err);
        throw err;
      }
    );
  }
  run.done();
  return out;
}
function invokeMeasured(run, fn) {
  let out;
  try {
    out = runInsideMeasuredJob(fn, run);
  } catch (error) {
    if (run) {
      try {
        run.failed(error);
      } catch {
      }
    }
    throw error;
  }
  if (!run) return out;
  try {
    return closeWith(run, out);
  } catch {
    return out;
  }
}
function bullmqReadyAtMs(j, attempt) {
  if (attempt > 1) return Number.NaN;
  const added = j?.timestamp;
  if (typeof added !== "number" || !Number.isFinite(added)) return Number.NaN;
  const delay = typeof j?.delay === "number" ? j.delay : typeof j?.opts?.delay === "number" ? j.opts.delay : Number.NaN;
  if (!Number.isFinite(delay) || delay < 0) return Number.NaN;
  return added + delay;
}
function installBullmq() {
  try {
    const exp = cachedExports(filesFor("bullmq"));
    const Worker = exp?.Worker;
    const proto = Worker?.prototype;
    if (!proto) return false;
    const original = proto.callProcessJob;
    if (typeof original !== "function") return false;
    const call = original;
    const wrapper = function(job, token) {
      let run = null;
      try {
        const j = job;
        const name = typeof j?.name === "string" ? j.name : "bullmq";
        const attempt = typeof j?.attemptsMade === "number" ? j.attemptsMade + 1 : 1;
        run = beginJob(name, {
          system: "bullmq",
          readyAtMs: bullmqReadyAtMs(j, attempt),
          attempt
        });
      } catch {
        run = null;
      }
      return invokeMeasured(run, () => call.call(this, job, token));
    };
    return remember("bullmq", [proto], "callProcessJob", () => wrapper);
  } catch {
    return false;
  }
}
function pgBossTime(v) {
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") return Date.parse(v);
  return Number.NaN;
}
function pgBossReadyAtMs(jobs) {
  let ready = Number.NaN;
  if (jobs.length === 0) return ready;
  for (const raw of jobs) {
    const at = pgBossTime(raw?.startAfter);
    if (!Number.isFinite(at)) return Number.NaN;
    if (!(ready <= at)) ready = at;
  }
  return ready;
}
function installPgBoss() {
  try {
    const exp = cachedExports(filesFor("pg-boss"));
    const Boss = exp?.PgBoss ?? exp?.default ?? exp;
    const proto = Boss?.prototype;
    if (!proto || typeof proto.work !== "function") return false;
    const make = (call) => function(...args) {
      try {
        const last = args.length - 1;
        const handler = args[last];
        const queueName = typeof args[0] === "string" ? args[0] : "pg-boss";
        if (last >= 1 && typeof handler === "function") {
          const fn = handler;
          args[last] = function(...jobArgs) {
            let run = null;
            try {
              const first = jobArgs[0];
              const jobs = Array.isArray(first) ? first : [first];
              let attempt = 1;
              for (const raw of jobs) {
                const j = raw;
                if (typeof j?.retryCount === "number") {
                  attempt = Math.max(attempt, j.retryCount + 1);
                }
              }
              run = beginJob(queueName, {
                system: "pg-boss",
                readyAtMs: pgBossReadyAtMs(jobs),
                attempt
              });
            } catch {
              run = null;
            }
            return invokeMeasured(run, () => fn.apply(this, jobArgs));
          };
        }
      } catch {
      }
      return call.apply(this, args);
    };
    return remember("pg-boss", [proto], "work", make);
  } catch {
    return false;
  }
}
function installNodeCron() {
  try {
    const exp = cachedExports(filesFor("node-cron"));
    const owners = surfacesFor(exp ?? void 0, "schedule");
    if (owners.length === 0) return false;
    const make = (call) => function(...args) {
      try {
        const task = args[1];
        if (typeof task === "function") {
          const fn = task;
          const opts = args[2];
          const name = typeof opts?.name === "string" && opts.name.length > 0 ? opts.name : typeof fn.name === "string" && fn.name.length > 0 ? fn.name : "node-cron";
          args[1] = function(...taskArgs) {
            let run = null;
            try {
              run = beginJob(name, { system: "node-cron" });
            } catch {
              run = null;
            }
            return invokeMeasured(run, () => fn.apply(this, taskArgs));
          };
        }
      } catch {
      }
      return call.apply(this, args);
    };
    return remember("node-cron", owners, "schedule", make);
  } catch {
    return false;
  }
}
function armJobSystems() {
  if (isBoosthisDisabled() || isKitLocked()) return;
  try {
    const now = Date.now();
    if (armAttempted && now - lastArmAt < ARM_RETRY_MS) return;
    lastArmAt = now;
    armAttempted = true;
    active = true;
    for (const system of WATCHABLE_JOB_SYSTEMS) {
      if (installed[system.name]) continue;
      if (!cachedExports(system.files)) continue;
      if (system.name === "bullmq") installBullmq();
      else if (system.name === "pg-boss") installPgBoss();
      else if (system.name === "node-cron") installNodeCron();
    }
    for (const system of WATCHABLE_JOB_SYSTEMS) {
      if (!installed[system.name] && packageIsLoaded(system.name)) {
        noteJobSystemUnattached(system.name);
      }
    }
    for (const name of UNWATCHABLE_JOB_SYSTEMS) {
      if (packageIsLoaded(name)) noteJobSystemUnattached(name);
    }
  } catch {
  }
}
function unpatchJobSystems() {
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
  armAttempted = false;
  lastArmAt = 0;
}
function jobSystemsAttached() {
  if (!active) return false;
  for (const system of WATCHABLE_JOB_SYSTEMS) {
    if (installed[system.name]) return true;
  }
  return false;
}
const _jobAdapterInternals = {
  WATCHABLE_JOB_SYSTEMS,
  UNWATCHABLE_JOB_SYSTEMS,
  installBullmq,
  installPgBoss,
  installNodeCron,
  closeWith,
  packageIsLoaded,
  cachedExports
};
export {
  _jobAdapterInternals,
  armJobSystems,
  bullmqReadyAtMs,
  jobSystemsAttached,
  pgBossReadyAtMs,
  unpatchJobSystems
};
