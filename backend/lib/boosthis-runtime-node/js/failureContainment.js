// @ts-nocheck
/* eslint-disable */
// Built from src/failureContainment.ts so plain node can run the kit. Do not edit.
import { isBoosthisDisabled } from "./runtimeFlags.js";
let watchedRequests = 0;
let contained = 0;
let collapsed = 0;
let allFailed = 0;
let unattributed = 0;
function responseFailed(status) {
  const s = typeof status === "number" && Number.isFinite(status) ? status : 0;
  return s >= 500;
}
function noteRequestContainment(scope, status) {
  if (!scope) return;
  try {
    if (isBoosthisDisabled()) return;
    const db = scope.db;
    const dep = scope.dep;
    const calls = (db?.count ?? 0) + (dep?.count ?? 0);
    if (calls <= 0) return;
    const failed = (db?.failed ?? 0) + (dep?.failed ?? 0);
    watchedRequests += 1;
    const lost = responseFailed(status);
    if (failed <= 0) {
      if (lost) unattributed += 1;
      return;
    }
    if (!lost) {
      contained += 1;
      return;
    }
    if (failed >= calls) {
      allFailed += 1;
      return;
    }
    collapsed += 1;
  } catch {
  }
}
function getFailureContainmentStats() {
  return { watchedRequests, contained, collapsed, allFailed, unattributed };
}
function clearFailureContainment() {
  watchedRequests = 0;
  contained = 0;
  collapsed = 0;
  allFailed = 0;
  unattributed = 0;
}
export {
  clearFailureContainment,
  getFailureContainmentStats,
  noteRequestContainment
};
