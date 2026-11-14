// @ts-nocheck
/* eslint-disable */
// Built from src/runtimeTag.ts so plain node can run the kit. Do not edit.
const NODE_RUNTIME_TAG = "node";
const BUN_RUNTIME_TAG = "bun";
function isBunRuntime() {
  try {
    const versions = process.versions;
    const bun = versions?.bun;
    return typeof bun === "string" && bun.length > 0;
  } catch {
    return false;
  }
}
function bunVersion() {
  try {
    const bun = process.versions?.bun;
    return typeof bun === "string" && bun.length > 0 ? bun : null;
  } catch {
    return null;
  }
}
function kitRuntimeTag() {
  return isBunRuntime() ? BUN_RUNTIME_TAG : NODE_RUNTIME_TAG;
}
export {
  BUN_RUNTIME_TAG,
  NODE_RUNTIME_TAG,
  bunVersion,
  isBunRuntime,
  kitRuntimeTag
};
