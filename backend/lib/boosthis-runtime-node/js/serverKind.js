// @ts-nocheck
/* eslint-disable */
// Built from src/serverKind.ts so plain node can run the kit. Do not edit.
import { createRequire } from "node:module";
const SERVER_KINDS = [
  "express",
  "fastify",
  "hono",
  "nest",
  "next",
  "node-http",
  // A process with NO web server at all: a queue consumer, a scheduled worker,
  // a nightly import. Never detected — nothing is absent in a way that proves
  // this — so it is only ever DECLARED, by starting the kit in worker mode.
  // Without a tag of its own such a process registers as "unknown", which
  // reads as a web app we failed to recognise rather than as what it is.
  "worker",
  "unknown"
];
function isServerKind(value) {
  return typeof value === "string" && SERVER_KINDS.includes(value);
}
const MODULE_MARKS = [
  ["next", "next"],
  ["nest", "@nestjs/core"],
  ["fastify", "fastify"],
  ["hono", "hono"],
  ["hono", "@hono/node-server"],
  ["express", "express"]
];
const PRECEDENCE = [
  "next",
  "nest",
  "fastify",
  "hono",
  "express"
];
function serverKindFrom(evidence) {
  const stated = evidence.explicit ?? evidence.env ?? null;
  if (isServerKind(stated)) return stated;
  const seen = new Set(evidence.listeners ?? []);
  const modules = evidence.modules ?? [];
  for (const [kind, pkg] of MODULE_MARKS) {
    if (modules.includes(pkg)) seen.add(kind);
  }
  for (const kind of PRECEDENCE) {
    if (seen.has(kind)) return kind;
  }
  return evidence.looked === false ? "unknown" : "node-http";
}
function packageNameFromPath(path) {
  const at = path.lastIndexOf("/node_modules/");
  if (at < 0) return null;
  const rest = path.slice(at + "/node_modules/".length);
  const parts = rest.split("/");
  if (!parts.length) return null;
  if (parts[0].startsWith("@")) {
    return parts.length > 1 ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0] ?? null;
}
function loadedFrameworkModules() {
  try {
    const req = createRequire(import.meta.url);
    const cache = req.cache;
    if (!cache || typeof cache !== "object") return { modules: [], looked: false };
    const wanted = new Set(MODULE_MARKS.map(([, pkg]) => pkg));
    const found = /* @__PURE__ */ new Set();
    for (const key of Object.keys(cache)) {
      const name = packageNameFromPath(key);
      if (name && wanted.has(name)) found.add(name);
    }
    return { modules: [...found], looked: true };
  } catch {
    return { modules: [], looked: false };
  }
}
function listenerMarks(listener) {
  const marks = [];
  try {
    if (typeof listener !== "function") return marks;
    const fn = listener;
    if (typeof fn.handle === "function" && typeof fn.use === "function" && typeof fn.set === "function") {
      marks.push("express");
    }
    if (typeof fn.name === "string" && /nextRequestHandler|nextServer/i.test(fn.name)) {
      marks.push("next");
    }
  } catch {
  }
  return marks;
}
let cached = null;
let explicitOverride = null;
const listenerSeen = /* @__PURE__ */ new Set();
function noteServerListeners(listeners) {
  try {
    let added = false;
    for (const l of listeners) {
      for (const mark of listenerMarks(l)) {
        if (!listenerSeen.has(mark)) {
          listenerSeen.add(mark);
          added = true;
        }
      }
    }
    if (added) cached = null;
  } catch {
  }
}
function setDeclaredServerKind(kind) {
  explicitOverride = typeof kind === "string" && kind ? kind : null;
  cached = null;
}
function detectServerKind() {
  if (cached) return cached;
  let verdict = "unknown";
  try {
    const { modules, looked } = loadedFrameworkModules();
    verdict = serverKindFrom({
      explicit: explicitOverride,
      env: typeof process !== "undefined" ? process.env?.BOOSTHIS_SERVER_KIND ?? null : null,
      modules,
      listeners: [...listenerSeen],
      looked
    });
  } catch {
    verdict = "unknown";
  }
  cached = verdict;
  return verdict;
}
function serverKindLabel(kind) {
  switch (kind) {
    case "express":
      return "Express";
    case "fastify":
      return "Fastify";
    case "hono":
      return "Hono";
    case "nest":
      return "NestJS";
    case "next":
      return "Next.js";
    case "node-http":
      return "Plain Node server";
    case "worker":
      return "Worker process (no web server)";
    case "unknown":
      return "Unrecognised server";
  }
}
function _resetServerKindForTests() {
  cached = null;
  explicitOverride = null;
  listenerSeen.clear();
}
export {
  SERVER_KINDS,
  _resetServerKindForTests,
  detectServerKind,
  isServerKind,
  listenerMarks,
  loadedFrameworkModules,
  noteServerListeners,
  packageNameFromPath,
  serverKindFrom,
  serverKindLabel,
  setDeclaredServerKind
};
