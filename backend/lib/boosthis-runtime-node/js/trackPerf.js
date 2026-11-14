// @ts-nocheck
/* eslint-disable */
// Built from src/trackPerf.ts so plain node can run the kit. Do not edit.
import { record } from "./samples.js";
import { rateDuration } from "./thresholds.js";
import { routeLabelHasPII } from "./no-pii.js";
import { callIdentity, noteWatchedCall } from "./repeatedWork.js";
function trackPerf(name, fn) {
  return async (...args) => {
    const start = performance.now();
    try {
      return await fn(...args);
    } finally {
      const dur = performance.now() - start;
      if (routeLabelHasPII(name) === null) {
        record(name, dur, rateDuration(dur));
      }
      noteWatchedCall(callIdentity(name, args), dur);
    }
  };
}
async function perf(name, fn) {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = performance.now() - start;
    if (routeLabelHasPII(name) === null) {
      record(name, dur, rateDuration(dur));
    }
  }
}
export {
  perf,
  trackPerf
};
