// @ts-nocheck
/* eslint-disable */
// Built from src/coverageInventory.ts so plain node can run the kit. Do not edit.
import { attachState } from "./attachStatus.js";
import { unwatchedAiClientCount } from "./aiCalls.js";
import { getCacheDirectiveStats } from "./cacheDirectives.js";
import { getDbWorkStats, unwatchedDbClientCount } from "./dbWork.js";
import {
  attachedJobSystemCount,
  getJobWorkStats,
  unattachedJobSystemCount
} from "./jobWork.js";
import { outboundAttemptsObserved } from "./liveDetectors.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { summary } from "./samples.js";
import { isServerlessMode } from "./serverless.js";
import { serverlessCounters } from "./serverlessMeters.js";
function safeNumber(read) {
  try {
    const n = read();
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}
function safeFlag(read) {
  try {
    return read() === true;
  } catch {
    return false;
  }
}
function coverageInventory() {
  if (safeFlag(isBoosthisDisabled)) return { watched: [], unwatched: [] };
  const watched = [];
  const unwatched = [];
  const gap = (surface, reason, detected) => {
    if (detected > 0) unwatched.push({ surface, reason, detected });
  };
  const attach = (() => {
    try {
      return attachState();
    } catch {
      return null;
    }
  })();
  const timedRequests = safeNumber(() => summary().total) + safeNumber(() => attach?.requestsObserved ?? 0);
  if (timedRequests > 0) watched.push("request-handling");
  else if (attach?.called === true && attach.attached !== true) {
    gap("request-handling", "attach-refused", 1);
  }
  if (safeNumber(outboundAttemptsObserved) > 0) watched.push("outbound-calls");
  gap("outbound-calls", "no-adapter-yet", safeNumber(unwatchedAiClientCount));
  if (safeNumber(() => getDbWorkStats().callCount) > 0)
    watched.push("database-work");
  gap("database-work", "no-adapter-yet", safeNumber(unwatchedDbClientCount));
  if (safeNumber(attachedJobSystemCount) > 0 || safeNumber(() => getJobWorkStats().runs) > 0) {
    watched.push("background-jobs");
  }
  gap("background-jobs", "no-adapter-yet", safeNumber(unattachedJobSystemCount));
  if (safeNumber(() => getCacheDirectiveStats().watched) > 0)
    watched.push("response-caching");
  if (safeFlag(isServerlessMode)) {
    if (safeNumber(() => serverlessCounters().invocations) > 0)
      watched.push("serverless-handlers");
    else gap("serverless-handlers", "not-wrapped", 1);
  }
  return { watched: watched.sort(), unwatched: sortGaps(unwatched) };
}
function sortGaps(gaps) {
  return gaps.slice().sort(
    (a, b) => a.surface === b.surface ? a.reason.localeCompare(b.reason) : a.surface.localeCompare(b.surface)
  );
}
function coverageFingerprint(inv) {
  return [
    inv.watched.join(","),
    inv.unwatched.map((g) => `${g.surface}:${g.reason}:${g.detected}`).join(",")
  ].join("|");
}
export {
  coverageFingerprint,
  coverageInventory,
  sortGaps
};
