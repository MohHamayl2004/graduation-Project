// @ts-nocheck
/* eslint-disable */
// Built from src/readyToServe.ts so plain node can run the kit. Do not edit.
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitLocked } from "./killSwitch.js";
const MEASURED_TO_SERVING = 1;
const MEASURED_TO_FIRST_FRAME = 2;
const MEASURED_TO_FIRST_RESPONSE = 3;
const MEASURED_TO_KIT_ENABLE = 4;
const PATCH_MARK = /* @__PURE__ */ Symbol.for("boosthis.serverListenPatched");
let readyMs = null;
let undoPatch = null;
let clockOverride = null;
function processAgeMs() {
  if (clockOverride) return clockOverride();
  return Math.round(process.uptime() * 1e3);
}
function noteReadyToServe() {
  try {
    if (readyMs !== null) return;
    if (isBoosthisDisabled() || isKitLocked()) return;
    const age = processAgeMs();
    if (typeof age === "number" && Number.isFinite(age)) readyMs = Math.round(age);
  } catch {
  }
}
function readyToServeMs() {
  return readyMs;
}
function armReadyWatch() {
  try {
    if (undoPatch) return;
    if (isBoosthisDisabled() || isKitLocked()) return;
    const proto = netServerProto();
    if (!proto || typeof proto.listen !== "function") return;
    const original = proto.listen;
    if (original[PATCH_MARK] === true) {
      undoPatch = () => {
      };
      return;
    }
    const armed = /* @__PURE__ */ new WeakSet();
    const patched = function boosthisListen(...args) {
      try {
        const self = this;
        if (self && !armed.has(self) && typeof this.once === "function") {
          armed.add(self);
          this.once("listening", () => noteReadyToServe());
        }
      } catch {
      }
      return original.apply(this, args);
    };
    Object.defineProperty(patched, PATCH_MARK, { value: true });
    proto.listen = patched;
    if (proto.listen !== patched) return;
    undoPatch = () => {
      try {
        if (proto.listen === patched) {
          proto.listen = original;
        }
      } catch {
      }
    };
  } catch {
  }
}
function clearReadyMark() {
  readyMs = null;
}
function disarmReadyWatch() {
  try {
    if (undoPatch) undoPatch();
  } catch {
  }
  undoPatch = null;
  readyMs = null;
}
import * as nodeNetModule from "node:net";
function netServerProto() {
  try {
    const net = nodeNetModule;
    return net.Server?.prototype;
  } catch {
    return void 0;
  }
}
const _readyToServeInternals = {
  /** Pin the clock the mark is taken from (ms of process age). */
  setClockForTest(fn) {
    clockOverride = fn;
  },
  /** Unpatch and forget — a full reset between tests. */
  reset() {
    try {
      if (undoPatch) undoPatch();
    } catch {
    }
    undoPatch = null;
    readyMs = null;
    clockOverride = null;
  },
  /** True while the prototype patch is in place. */
  get armed() {
    return undoPatch !== null;
  }
};
export {
  MEASURED_TO_FIRST_FRAME,
  MEASURED_TO_FIRST_RESPONSE,
  MEASURED_TO_KIT_ENABLE,
  MEASURED_TO_SERVING,
  _readyToServeInternals,
  armReadyWatch,
  clearReadyMark,
  disarmReadyWatch,
  noteReadyToServe,
  readyToServeMs
};
