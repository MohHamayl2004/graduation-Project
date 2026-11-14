// @ts-nocheck
/* eslint-disable */
// Built from src/requestOnce.ts so plain node can run the kit. Do not edit.
const OBSERVED = /* @__PURE__ */ Symbol.for("boosthis.requestObserved");
function isRequestObserved(req) {
  try {
    if (!req || typeof req !== "object" && typeof req !== "function") return false;
    return req[OBSERVED] === true;
  } catch {
    return false;
  }
}
function claimRequest(req) {
  try {
    if (!req || typeof req !== "object" && typeof req !== "function") {
      return "claimed";
    }
    const target = req;
    if (target[OBSERVED] === true) return "already";
    Object.defineProperty(target, OBSERVED, {
      value: true,
      enumerable: false,
      configurable: true,
      writable: true
    });
    return "claimed";
  } catch {
    return "claimed";
  }
}
function _unclaimRequest(req) {
  try {
    if (req && typeof req === "object") {
      delete req[OBSERVED];
    }
  } catch {
  }
}
export {
  _unclaimRequest,
  claimRequest,
  isRequestObserved
};
