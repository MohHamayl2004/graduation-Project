// @ts-nocheck
/* eslint-disable */
// Built from src/exitFlush.ts so plain node can run the kit. Do not edit.
import { endRun } from "./crashDelivery.js";
import { flushCrashesNow, pendingCrashOccurrences } from "./crashReporter.js";
import {
  checkEntitlementNow,
  hasCheckinConfig,
  isActivated
} from "./killSwitch.js";
import { flushJobRunsNow, pendingJobRunCount } from "./jobReporter.js";
import { pendingSampleCount, reportNow } from "./reporting.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { noteRowsDiscarded } from "./serverlessMeters.js";
import { uploadPerfSnapshotNow } from "./snapshot.js";
import { _spanInternals, flushSpansNow } from "./spanEmitter.js";
const EXIT_FLUSH_BUDGET_MS = 2e3;
const EXIT_ACTIVATION_TIMEOUT_MS = 900;
const EXIT_REGISTER_TIMEOUT_MS = 800;
const OWNED_SIGNALS = ["SIGTERM"];
let armed = false;
let ranOnce = false;
let flushing = false;
const takenSignals = /* @__PURE__ */ new Set();
let lastResult = {};
let lastActivationOutcome = "";
let exitReadyHook = null;
function setExitReadyHook(fn) {
  exitReadyHook = fn;
}
async function activateInline(budgetMs) {
  if (isActivated()) return "already";
  if (!hasCheckinConfig()) return "no-config";
  if (budgetMs <= 0) return "no-budget";
  try {
    const status = await checkEntitlementNow(
      Math.min(budgetMs, EXIT_ACTIVATION_TIMEOUT_MS)
    );
    return status ?? "unreachable";
  } catch {
    return "error";
  }
}
function lastExitActivationOutcome() {
  return lastActivationOutcome;
}
async function within(budgetMs, work) {
  if (budgetMs <= 0) return null;
  let timer = null;
  try {
    return await Promise.race([
      work(),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), budgetMs);
        timer.unref?.();
      })
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function runExitFlush(budgetMs = EXIT_FLUSH_BUDGET_MS) {
  if (isBoosthisDisabled()) return {};
  if (flushing) return {};
  flushing = true;
  const deadline = Date.now() + Math.max(0, budgetMs);
  const left = () => Math.max(0, deadline - Date.now());
  try {
    if (exitReadyHook) {
      await within(Math.min(left(), EXIT_REGISTER_TIMEOUT_MS), async () => {
        await exitReadyHook(Math.min(left(), EXIT_REGISTER_TIMEOUT_MS));
        return null;
      });
    }
    lastActivationOutcome = await activateInline(
      Math.min(left(), EXIT_ACTIVATION_TIMEOUT_MS)
    );
    await within(left(), () => flushCrashesNow());
    await within(left(), () => reportNow(true));
    await within(left(), () => flushSpansNow(true));
    await within(left(), () => flushJobRunsNow(true));
    await within(left(), () => uploadPerfSnapshotNow());
  } catch {
  } finally {
    flushing = false;
    try {
      lastResult = {
        samplesLeft: pendingSampleCount(),
        spansLeft: _spanInternals.bufferLen(),
        jobRunsLeft: pendingJobRunCount(),
        crashesLeft: pendingCrashOccurrences()
      };
    } catch {
      lastResult = {};
    }
  }
  return lastResult;
}
function lastExitFlushResult() {
  return { ...lastResult };
}
function isExitFlushRunning() {
  return flushing;
}
async function flushOnce() {
  if (ranOnce) return;
  ranOnce = true;
  const left = await runExitFlush();
  try {
    const rows = Object.values(left).reduce(
      (sum, n) => sum + (Number.isFinite(n) && n > 0 ? n : 0),
      0
    );
    if (rows > 0) noteRowsDiscarded(rows, "processEnded");
  } catch {
  }
}
function onBeforeExit() {
  void flushOnce();
}
function onExit() {
  try {
    endRun("clean");
  } catch {
  }
}
const signalHandlers = /* @__PURE__ */ new Map();
function installSignalFlush() {
  const taken = [];
  for (const signal of OWNED_SIGNALS) {
    if (takenSignals.has(signal)) continue;
    try {
      if (process.listenerCount(signal) > 0) continue;
      const handler = () => {
        const finish = () => {
          try {
            endRun("signal");
            process.removeListener(signal, handler);
            takenSignals.delete(signal);
            signalHandlers.delete(signal);
            process.kill(process.pid, signal);
          } catch {
          }
        };
        if (flushing) {
          finish();
          return;
        }
        void flushOnce().then(finish, finish);
      };
      process.on(signal, handler);
      signalHandlers.set(signal, handler);
      takenSignals.add(signal);
      taken.push(signal);
    } catch {
    }
  }
  return taken;
}
function installExitFlush() {
  if (isBoosthisDisabled()) return;
  try {
    if (!armed) {
      armed = true;
      process.on("beforeExit", onBeforeExit);
      process.on("exit", onExit);
    }
    installSignalFlush();
  } catch {
  }
}
function exitFlushArmed() {
  return { beforeExit: armed, signals: [...takenSignals].sort() };
}
function uninstallExitFlush() {
  try {
    if (armed) {
      process.removeListener("beforeExit", onBeforeExit);
      process.removeListener("exit", onExit);
    }
  } catch {
  }
  for (const [signal, handler] of signalHandlers) {
    try {
      process.removeListener(signal, handler);
    } catch {
    }
  }
  signalHandlers.clear();
  takenSignals.clear();
  armed = false;
}
function _resetExitFlushForTests() {
  uninstallExitFlush();
  ranOnce = false;
  flushing = false;
  lastResult = {};
  lastActivationOutcome = "";
  exitReadyHook = null;
}
export {
  EXIT_ACTIVATION_TIMEOUT_MS,
  EXIT_FLUSH_BUDGET_MS,
  EXIT_REGISTER_TIMEOUT_MS,
  _resetExitFlushForTests,
  exitFlushArmed,
  installExitFlush,
  isExitFlushRunning,
  lastExitActivationOutcome,
  lastExitFlushResult,
  runExitFlush,
  setExitReadyHook,
  uninstallExitFlush
};
