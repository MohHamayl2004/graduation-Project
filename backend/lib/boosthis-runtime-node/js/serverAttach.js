// @ts-nocheck
/* eslint-disable */
// Built from src/serverAttach.ts so plain node can run the kit. Do not edit.
import { boosthis } from "./middleware.js";
import { isDirectLoopback } from "./loopback.js";
import { ownerFromPass } from "./ownerLink.js";
import {
  KIT_BASE_PATH,
  answerKitRead,
  kitReadSuffixFor,
  noteKitPathsRegistered,
  writeRawKitAnswer
} from "./kitAnswers.js";
import { armReadyWatch } from "./readyToServe.js";
import { registerApp } from "./routeInventory.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isKitDissolved, isKitLocked } from "./killSwitch.js";
import { sayAfterStartupLine } from "./startAnnounce.js";
import {
  detectServerKind,
  noteServerListeners,
  setDeclaredServerKind
} from "./serverKind.js";
import { getActiveTelemetryClient } from "./telemetry.js";
import {
  cannotAttachLine,
  noteAttachOutcome,
  noteAttachedRequest,
  noteKitReadServed,
  _resetAttachStatusForTests
} from "./attachStatus.js";
import { attachState, cannotAttachLine as cannotAttachLine2 } from "./attachStatus.js";
const PATCH_MARK = /* @__PURE__ */ Symbol.for("boosthis.serverEmitPatched");
let undoPatches = [];
let liveResult = null;
const serversSeen = /* @__PURE__ */ new WeakSet();
function announceCannotAttach(reason) {
  try {
    sayAfterStartupLine(cannotAttachLine(reason));
  } catch {
  }
}
function preflightRefusal(env) {
  if (env.runtime === "deno") return "deno-runtime";
  if (env.nextRuntime === "edge") return "edge-runtime";
  if (!env.hasNodeHttp) return "no-node-http";
  return null;
}
function foreignRuntime() {
  const g = globalThis;
  if (g.Bun) return "bun";
  if (g.Deno) return "deno";
  return null;
}
function patchPrototype(proto, handle) {
  try {
    if (!proto || typeof proto.emit !== "function") return null;
    const original = proto.emit;
    if (original[PATCH_MARK] === true) {
      return () => {
      };
    }
    const patched = function boosthisServerEmit(event, ...args) {
      if (event !== "request") return original.call(this, event, ...args);
      const self = this;
      return handle(
        self,
        args[0],
        args[1],
        () => original.call(self, "request", ...args)
      );
    };
    Object.defineProperty(patched, PATCH_MARK, { value: true });
    proto.emit = patched;
    if (proto.emit !== patched) return null;
    return () => {
      try {
        if (proto.emit === patched) {
          proto.emit = original;
        }
      } catch {
      }
    };
  } catch {
    return null;
  }
}
function attach(opts = {}) {
  if (liveResult) return liveResult;
  try {
    setDeclaredServerKind(opts.serverKind);
  } catch {
  }
  registerApp(opts.app);
  const middleware = boosthis(opts);
  armReadyWatch();
  let http;
  let https;
  try {
    http = nodeHttp();
    https = nodeHttps();
  } catch {
    http = void 0;
    https = void 0;
  }
  const pre = preflightRefusal({
    hasNodeHttp: typeof http?.Server?.prototype?.emit === "function",
    runtime: foreignRuntime(),
    nextRuntime: typeof process !== "undefined" ? process.env?.NEXT_RUNTIME ?? null : null
  });
  if (pre) {
    noteAttachOutcome({ attached: false, reason: pre });
    announceCannotAttach(pre);
    liveResult = {
      attached: false,
      reason: pre,
      serverKind: detectServerKind(),
      detach: () => {
      }
    };
    return liveResult;
  }
  const base = (opts.basePath ?? KIT_BASE_PATH).replace(/\/$/, "");
  const allowRemote = opts.allowRemote ?? false;
  const handle = (server, req, res, forward) => {
    try {
      if (isBoosthisDisabled()) return forward();
      if (isKitDissolved()) return forward();
    } catch {
      return forward();
    }
    let locked = false;
    try {
      locked = isKitLocked();
    } catch {
      locked = false;
    }
    try {
      if (!locked && !serversSeen.has(server)) {
        serversSeen.add(server);
        noteServerListeners(server.listeners?.("request") ?? []);
      }
    } catch {
    }
    let forwarded = false;
    const forwardOnce = () => {
      if (forwarded) return true;
      forwarded = true;
      return forward();
    };
    const measureAndForward = () => {
      try {
        if (!locked) noteAttachedRequest();
        middleware(
          req,
          res,
          forwardOnce
        );
      } catch {
        forwardOnce();
      }
      return true;
    };
    try {
      const rawPath = String(
        req?.url ?? ""
      ).split("?")[0];
      const method = String(
        req?.method ?? "GET"
      ).toUpperCase();
      const suffix = kitReadSuffixFor(rawPath, base);
      if (suffix !== null && method === "GET") {
        const serveKitRead = (owner2) => {
          const answer = answerKitRead(suffix, {
            loopback: isDirectLoopback(req),
            owner: owner2,
            allowRemote,
            telemetry: opts.telemetry ?? getActiveTelemetryClient() ?? void 0
          });
          if (answer && writeRawKitAnswer(res, answer)) {
            noteKitReadServed();
            return true;
          }
          return false;
        };
        const owner = ownerFromPass(req, res);
        if (typeof owner === "boolean") {
          if (serveKitRead(owner)) return true;
        } else {
          owner.then((o) => {
            if (!serveKitRead(o)) measureAndForward();
          }, () => measureAndForward()).catch(() => measureAndForward());
          return true;
        }
      }
    } catch {
    }
    return measureAndForward();
  };
  const undo = [];
  const httpUndo = patchPrototype(http?.Server?.prototype, handle);
  if (httpUndo) undo.push(httpUndo);
  const httpsUndo = patchPrototype(https?.Server?.prototype, handle);
  if (httpsUndo) undo.push(httpsUndo);
  if (!httpUndo) {
    const locked = "server-dispatch-locked";
    for (const u of undo) u();
    noteAttachOutcome({ attached: false, reason: locked });
    announceCannotAttach(locked);
    liveResult = {
      attached: false,
      reason: locked,
      serverKind: detectServerKind(),
      detach: () => {
      }
    };
    return liveResult;
  }
  undoPatches = undo;
  noteKitPathsRegistered(base);
  noteAttachOutcome({ attached: true });
  liveResult = {
    attached: true,
    serverKind: detectServerKind(),
    detach: () => {
      for (const u of undoPatches) u();
      undoPatches = [];
      _resetAttachStatusForTests();
      liveResult = null;
    }
  };
  return liveResult;
}
import * as nodeHttpModule from "node:http";
import * as nodeHttpsModule from "node:https";
function nodeHttp() {
  return nodeHttpModule;
}
function nodeHttps() {
  return nodeHttpsModule;
}
function _resetAttachForTests() {
  for (const u of undoPatches) u();
  undoPatches = [];
  _resetAttachStatusForTests();
  liveResult = null;
}
export {
  _resetAttachForTests,
  attach,
  attachState,
  cannotAttachLine2 as cannotAttachLine,
  preflightRefusal
};
