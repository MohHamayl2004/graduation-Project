// @ts-nocheck
/* eslint-disable */
// Built from src/runtimeFlags.ts so plain node can run the kit. Do not edit.
const TRUE_VALUES = /* @__PURE__ */ new Set(["1", "true", "yes", "on"]);
function readFlagValue(name) {
  if (typeof process !== "undefined" && process.env) {
    const v = process.env[name];
    if (typeof v === "string" && v.length > 0) return v;
  }
  const g = globalThis;
  for (const key of [name, `__${name}__`]) {
    const v = g[key];
    if (typeof v === "boolean") return v;
    if (typeof v === "string" && v.length > 0) return v;
  }
  return void 0;
}
function readEnv() {
  for (const name of ["BOOSTHIS_DISABLED", "BOOSTEN_DISABLED"]) {
    const v = readFlagValue(name);
    if (typeof v === "boolean") {
      if (v) return "1";
      continue;
    }
    if (typeof v === "string" && v.length > 0) return v;
  }
  return void 0;
}
function isBoosthisDisabled() {
  const v = readEnv();
  if (!v) return false;
  return TRUE_VALUES.has(v.toLowerCase());
}
function _setBoosthisDisabledForTests(value) {
  const g = globalThis;
  const prev = g.BOOSTHIS_DISABLED;
  if (value === void 0) delete g.BOOSTHIS_DISABLED;
  else g.BOOSTHIS_DISABLED = value;
  return () => {
    if (prev === void 0) delete g.BOOSTHIS_DISABLED;
    else g.BOOSTHIS_DISABLED = prev;
  };
}
export {
  _setBoosthisDisabledForTests,
  isBoosthisDisabled,
  readFlagValue
};
