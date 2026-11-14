// @ts-nocheck
/* eslint-disable */
// Built from src/serverlessLifecycle.ts so plain node can run the kit. Do not edit.
import {
  noteFlushCost,
  noteInvocation,
  noteRowsDiscarded,
  noteRunEnd,
  noteStranded,
  noteTimeRemaining
} from "./serverlessMeters.js";
import { suspendTouchedInterval } from "./suspendSensor.js";
import { isKitLocked } from "./killSwitch.js";
import {
  isFrozenBetweenRequests,
  isPerRunBilled,
  isServerlessMode,
  serverlessHost
} from "./serverless.js";
import {
  armDeathWatch,
  disarmDeathWatch,
  setDeathReporter,
  settleWarnedRunAtNewRun
} from "./serverlessDeath.js";
import {
  chargeRunOverhead,
  closeRunOverhead,
  openKitRun
} from "./kitFootprint.js";
const DEFAULT_FLUSH_BUDGET_MS = 300;
const MAX_FLUSH_BUDGET_MS = 1e3;
const MIN_FLUSH_BUDGET_MS = 50;
const FROZEN_FLUSH_BUDGET_MS = 200;
function configuredFlushBudgetMs() {
  const raw = process.env.BOOSTHIS_SERVERLESS_BUDGET_MS;
  if (!raw) return DEFAULT_FLUSH_BUDGET_MS;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_FLUSH_BUDGET_MS;
  return Math.min(MAX_FLUSH_BUDGET_MS, Math.max(MIN_FLUSH_BUDGET_MS, Math.round(n)));
}
function flushBudgetMs() {
  const configured = configuredFlushBudgetMs();
  if (!isServerlessMode() && isFrozenBetweenRequests()) {
    return Math.min(configured, FROZEN_FLUSH_BUDGET_MS);
  }
  return configured;
}
const SERVERLESS_SNAPSHOT_MIN_MS = 6e4;
let flushImpl = null;
let pendingImpl = null;
let giveUpImpl = null;
const BACKLOG_MAX_HOLD_MS = 5 * 6e4;
const BACKLOG_MIN_HELD_FLUSHES = 10;
let backlogSinceMs = null;
let backlogHeldFlushes = 0;
function setInvocationFlush(fn, pending, giveUp) {
  flushImpl = fn;
  pendingImpl = pending ?? null;
  giveUpImpl = giveUp ?? null;
  backlogSinceMs = null;
  backlogHeldFlushes = 0;
  setDeathReporter(fn ? () => startBoundedFlush("after-response").wait : null);
}
function resolveWaitUntil() {
  try {
    const holder = globalThis[/* @__PURE__ */ Symbol.for("@vercel/request-context")];
    const ctx = typeof holder?.get === "function" ? holder.get() : void 0;
    const w = ctx?.waitUntil;
    return typeof w === "function" ? w : null;
  } catch {
    return null;
  }
}
let inFlight = null;
let reallyRunning = null;
let reallyRunningSinceMs = 0;
const RUNNING_STALE_MS = 6e4;
let watchingRuns = 0;
let lastRun = null;
const FROZEN_FLUSH_MIN_MS = 1e3;
let lastFrozenFlushAtMs = 0;
function beginInvocation() {
  const kit = openKitRun();
  const mark = chargeRunOverhead(
    () => isPerRunBilled() ? noteInvocation() : null,
    kit
  );
  const run = { mark, kit, watchArmed: false, finished: false };
  lastRun = run;
  return run;
}
function noteInvocationContext(context, configuredLimitMs) {
  try {
    if (typeof context?.getRemainingTimeInMillis !== "function") return;
    const remaining = context.getRemainingTimeInMillis();
    const limit = configuredLimitMs ?? remaining;
    noteTimeRemaining(remaining, limit);
  } catch {
  }
}
function armRunDeathWatch(remainingMsAtStart, run) {
  try {
    if (!isPerRunBilled()) return;
    if (run?.watchArmed) return;
    if (run) run.watchArmed = true;
    if (settleWarnedRunAtNewRun()) watchingRuns = 0;
    watchingRuns++;
    if (watchingRuns > 1) return;
    armDeathWatch(remainingMsAtStart, serverlessHost().memoryLimitMb);
  } catch {
  }
}
function timeout(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve("timeout"), ms);
    t.unref?.();
  });
}
function readPending() {
  try {
    const n = pendingImpl ? pendingImpl() : 0;
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}
function cpuMsNow() {
  try {
    const u = process.cpuUsage();
    return (u.user + u.system) / 1e3;
  } catch {
    return null;
  }
}
function endBacklogIfStuck(stillHeld) {
  try {
    if (stillHeld <= 0) {
      backlogSinceMs = null;
      backlogHeldFlushes = 0;
      return;
    }
    const now = Date.now();
    if (backlogSinceMs === null) backlogSinceMs = now;
    backlogHeldFlushes++;
    if (backlogHeldFlushes < BACKLOG_MIN_HELD_FLUSHES || now - backlogSinceMs < BACKLOG_MAX_HOLD_MS) {
      return;
    }
    backlogSinceMs = null;
    backlogHeldFlushes = 0;
    if (!giveUpImpl) return;
    const discarded = giveUpImpl();
    if (discarded > 0) noteRowsDiscarded(discarded, "heldTooLong");
  } catch {
  }
}
function startBoundedFlush(placement) {
  const budget = flushBudgetMs();
  const started = Date.now();
  const cpuStart = cpuMsNow();
  const deadlineAt = started + budget;
  const deadline = {
    expired: () => Date.now() >= deadlineAt,
    remainingMs: () => Math.max(0, deadlineAt - Date.now())
  };
  const real = (async () => {
    try {
      return flushImpl ? await flushImpl(deadline) : 0;
    } catch {
      return "threw";
    }
  })();
  return {
    wait: accountForFlush(real, { placement, budget, started, cpuStart }),
    // Never rejects: `real` already swallowed its own failure, and a promise
    // nobody awaits must not take the host down.
    work: real.then(
      () => {
      },
      () => {
      }
    )
  };
}
async function accountForFlush(real, ctx) {
  const { placement, budget, started, cpuStart } = ctx;
  let stranded = 0;
  try {
    const outcome = await Promise.race([real, timeout(budget)]);
    stranded = typeof outcome === "number" ? outcome : readPending();
  } catch {
    stranded = readPending();
  }
  const endedAtMs = Date.now();
  const wallMs = endedAtMs - started;
  const cpuEnd = cpuMsNow();
  const cpuMs = cpuStart !== null && cpuEnd !== null ? Math.max(0, cpuEnd - cpuStart) : null;
  const suspended = suspendTouchedInterval({ endedAtMs, wallMs, cpuMs });
  const costMs = suspended && cpuMs !== null ? cpuMs : wallMs;
  noteFlushCost(costMs, placement);
  if (stranded > 0) noteStranded(stranded);
  endBacklogIfStuck(stranded);
}
function finishInvocation(failed = false, run) {
  const handle = run ?? lastRun;
  const kit = handle?.kit ?? null;
  const frozenContainer = isFrozenBetweenRequests();
  if (handle && !handle.finished) {
    handle.finished = true;
    try {
      chargeRunOverhead(() => {
        noteRunEnd(handle.mark, failed);
        if (handle.watchArmed) {
          handle.watchArmed = false;
          watchingRuns = Math.max(0, watchingRuns - 1);
          if (watchingRuns === 0) disarmDeathWatch(serverlessHost().memoryLimitMb);
        }
      }, kit);
    } catch {
    }
  }
  try {
    closeRunOverhead(kit);
  } catch {
  }
  if (!isPerRunBilled() || !handle?.mark) return Promise.resolve();
  if (inFlight) return inFlight;
  if (reallyRunning && Date.now() - reallyRunningSinceMs < RUNNING_STALE_MS) {
    return Promise.resolve();
  }
  if (frozenContainer) {
    const now = Date.now();
    if (now - lastFrozenFlushAtMs < FROZEN_FLUSH_MIN_MS) return Promise.resolve();
    lastFrozenFlushAtMs = now;
  }
  const waitUntil = resolveWaitUntil();
  if (waitUntil) {
    const { wait: wait2, work: work2 } = startBoundedFlush("platform");
    track(wait2, work2);
    try {
      waitUntil(wait2);
    } catch {
      return wait2;
    }
    return Promise.resolve();
  }
  const blocking = needsFlushBeforeResponse();
  const { wait, work } = startBoundedFlush(
    blocking ? "blocking" : "after-response"
  );
  track(wait, work);
  if (blocking) return wait;
  wait.catch(() => {
  });
  return Promise.resolve();
}
function track(wait, work) {
  const waited = wait.finally(() => {
    if (inFlight === waited) inFlight = null;
  });
  inFlight = waited;
  waited.catch(() => {
  });
  const running = work.finally(() => {
    if (reallyRunning === running) reallyRunning = null;
  });
  reallyRunning = running;
  reallyRunningSinceMs = Date.now();
  running.catch(() => {
  });
}
function hasAfterResponseMechanism() {
  return resolveWaitUntil() !== null;
}
function needsFlushBeforeResponse() {
  if (resolveWaitUntil() !== null) return false;
  return isServerlessMode() || isFrozenBetweenRequests();
}
function withBoosthis(handler) {
  return async function boosthisHandler(...args) {
    let locked = false;
    try {
      locked = isKitLocked();
    } catch {
      locked = false;
    }
    if (locked) return await handler(...args);
    let limitAtStart = null;
    let failed = false;
    const context = args[1];
    let run = null;
    try {
      run = beginInvocation();
      chargeRunOverhead(() => {
        if (typeof context?.getRemainingTimeInMillis === "function") {
          limitAtStart = context.getRemainingTimeInMillis();
        }
        armRunDeathWatch(limitAtStart, run);
      }, run.kit);
    } catch {
    }
    try {
      return await handler(...args);
    } catch (err) {
      failed = true;
      throw err;
    } finally {
      try {
        chargeRunOverhead(
          () => noteInvocationContext(context, limitAtStart),
          run?.kit
        );
      } catch {
      }
      await finishInvocation(failed, run);
    }
  };
}
function _resetLifecycleForTests() {
  inFlight = null;
  reallyRunning = null;
  reallyRunningSinceMs = 0;
  watchingRuns = 0;
  lastRun = null;
  lastFrozenFlushAtMs = 0;
  flushImpl = null;
  pendingImpl = null;
  setDeathReporter(null);
}
export {
  BACKLOG_MAX_HOLD_MS,
  BACKLOG_MIN_HELD_FLUSHES,
  DEFAULT_FLUSH_BUDGET_MS,
  FROZEN_FLUSH_BUDGET_MS,
  MAX_FLUSH_BUDGET_MS,
  SERVERLESS_SNAPSHOT_MIN_MS,
  _resetLifecycleForTests,
  armRunDeathWatch,
  beginInvocation,
  finishInvocation,
  flushBudgetMs,
  hasAfterResponseMechanism,
  needsFlushBeforeResponse,
  noteInvocationContext,
  resolveWaitUntil,
  setInvocationFlush,
  withBoosthis
};
