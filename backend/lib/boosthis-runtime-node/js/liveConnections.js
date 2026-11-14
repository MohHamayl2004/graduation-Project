// @ts-nocheck
/* eslint-disable */
// Built from src/liveConnections.ts so plain node can run the kit. Do not edit.
import * as nodeHttp from "node:http";
import * as nodeHttps from "node:https";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { isHeldOpenContentType, markUpgraded } from "./heldOpen.js";
import { linearScore, ratingFor } from "./healthAxes.js";
import { earnedPerHour, earnedPerMin, windowMinOf } from "./rateHonesty.js";
import { markSettled } from "./settleRule.js";
const LIVECONN_QUIET_MS = 3e4;
const LIVECONN_CADENCE_MIN_GAPS = 5;
const LIVECONN_DEAD_GAP_MULTIPLE = 6;
const LIVECONN_RECONNECT_LINK_MS = 6e4;
const LIVECONN_STORM_WINDOW_MS = 6e4;
const LIVECONN_STORM_THRESHOLD = 5;
const LIVECONN_STORM_BACKOFF_MS = 2e3;
const LIVECONN_MIN_WINDOW_MS = 3e4;
const LIVECONN_LEAK_AGE_MS = 5 * 6e4;
const LIVECONN_LEAK_MIN_OPEN = 8;
const LIVECONN_GROWTH_WINDOW_MS = 30 * 6e4;
const LIVECONN_DROPS_OK_PER_HOUR = 0.5;
const LIVECONN_SAMPLE_MS = 5e3;
const MAX_TRACKED = 500;
const MAX_GAPS = 64;
const MAX_REOPEN_STAMPS = 32;
const PATCH_MARK = /* @__PURE__ */ Symbol.for("boosthis.liveConnections.upgrade");
let started = false;
let observedAny = false;
let firstSeenAt = 0;
let sampler = null;
const conns = [];
const reopens = /* @__PURE__ */ new Map();
const lastEnd = /* @__PURE__ */ new Map();
let opened = 0;
let closed = 0;
let drops = 0;
let reconnects = 0;
let streamMessages = 0;
let peakOpen = 0;
let stormPeak = 0;
let anyOpaque = false;
const undo = [];
let now = () => Date.now();
function fold(input) {
  let h = 2166136261;
  try {
    const s = String(input ?? "");
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
  } catch {
    return 0;
  }
  return h >>> 0;
}
function med(values) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}
function medGap(ascending) {
  if (ascending.length < 2) return 0;
  const gaps = [];
  for (let i = 1; i < ascending.length; i++) {
    gaps.push(ascending[i] - ascending[i - 1]);
  }
  return med(gaps);
}
function openCount() {
  let n = 0;
  for (const c of conns) if (c.closedAt === null) n++;
  return n;
}
function noteReopen(endpoint, at) {
  let stamps = reopens.get(endpoint);
  if (!stamps) {
    if (reopens.size >= MAX_TRACKED) return;
    stamps = [];
    reopens.set(endpoint, stamps);
  }
  stamps.push(at);
  const cutoff = at - LIVECONN_STORM_WINDOW_MS;
  while (stamps.length > 0 && stamps[0] < cutoff) stamps.shift();
  while (stamps.length > MAX_REOPEN_STAMPS) stamps.shift();
  if (stamps.length >= LIVECONN_STORM_THRESHOLD && medGap(stamps) < LIVECONN_STORM_BACKOFF_MS && stamps.length > stormPeak) {
    stormPeak = stamps.length;
  }
}
function open(endpoint, transport, handle) {
  const at = now();
  if (!observedAny) {
    observedAny = true;
    firstSeenAt = at;
  }
  opened++;
  if (transport === "socket") anyOpaque = true;
  const prev = lastEnd.get(endpoint);
  if (prev !== void 0 && at - prev <= LIVECONN_RECONNECT_LINK_MS) {
    reconnects++;
    noteReopen(endpoint, at);
  }
  if (conns.length >= MAX_TRACKED) {
    const idx = conns.findIndex((c) => c.closedAt !== null);
    if (idx >= 0) conns.splice(idx, 1);
    else return null;
  }
  const conn = {
    endpoint,
    transport,
    openedAt: at,
    lastSeenAt: at,
    gaps: [],
    messages: 0,
    closedAt: null,
    clean: false,
    bytes: 0,
    handle
  };
  conns.push(conn);
  const live = openCount();
  if (live > peakOpen) peakOpen = live;
  ensureSampler();
  return conn;
}
function activity(conn, at) {
  const gap = at - conn.lastSeenAt;
  if (gap > 0) {
    conn.gaps.push(gap);
    if (conn.gaps.length > MAX_GAPS) conn.gaps.shift();
  }
  conn.lastSeenAt = at;
}
function close(conn, clean) {
  try {
    if (conn.closedAt !== null) return;
    const at = now();
    conn.closedAt = at;
    conn.clean = clean;
    conn.handle = null;
    closed++;
    if (!clean) drops++;
    lastEnd.set(conn.endpoint, at);
    if (openCount() === 0) stopSampler();
  } catch {
  }
}
function ensureSampler() {
  if (sampler) return;
  try {
    sampler = setInterval(sampleSockets, LIVECONN_SAMPLE_MS);
    sampler.unref?.();
  } catch {
    sampler = null;
  }
}
function stopSampler() {
  try {
    if (sampler) clearInterval(sampler);
  } catch {
  }
  sampler = null;
}
function sampleSockets() {
  try {
    const at = now();
    for (const conn of conns) {
      if (conn.closedAt !== null || conn.transport !== "socket") continue;
      const h = conn.handle;
      if (!h) continue;
      const read = typeof h.bytesRead === "number" ? h.bytesRead : 0;
      const written = typeof h.bytesWritten === "number" ? h.bytesWritten : 0;
      const total = read + written;
      if (total > conn.bytes) {
        conn.bytes = total;
        activity(conn, at);
      }
    }
  } catch {
  }
}
function watchUpgrade(proto) {
  try {
    if (!proto || typeof proto.emit !== "function") return null;
    const original = proto.emit;
    if (original[PATCH_MARK] === true) {
      return () => {
      };
    }
    const patched = function boosthisUpgradeEmit(event, ...args) {
      if (event === "upgrade") {
        try {
          noteUpgrade(args[0], args[1]);
        } catch {
        }
      }
      return original.call(this, event, ...args);
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
function noteUpgrade(req, socket) {
  if (isBoosthisDisabled()) return;
  markUpgraded(req);
  if (!started) return;
  try {
    const url = req?.url;
    const conn = open(fold(url), "socket", socket);
    if (!conn) return;
    const s = socket;
    if (typeof s.once === "function") {
      s.once("close", (hadError) => {
        const errored = hadError === true;
        const finished = s.readableEnded === true;
        close(conn, !errored && finished);
      });
    }
  } catch {
  }
}
function noteResponseForRealtime(req, res) {
  if (isBoosthisDisabled() || !started) return;
  try {
    const r = res;
    if (typeof r.write !== "function" || typeof r.getHeader !== "function") {
      return;
    }
    const endpoint = fold(req?.url);
    let conn = null;
    const origWrite = r.write;
    r.write = function boosthisLiveWrite(...args) {
      try {
        if (!conn) {
          if (isHeldOpenContentType(r.getHeader?.("content-type"))) {
            conn = open(endpoint, "stream", r);
            if (conn && typeof r.on === "function") {
              r.on("close", () => {
                if (conn) close(conn, true);
              });
            }
          }
        }
        if (conn) {
          conn.messages++;
          streamMessages++;
          activity(conn, now());
        }
      } catch {
      }
      return origWrite.apply(this, args);
    };
  } catch {
  }
}
function startLiveConnections() {
  if (started) return;
  started = true;
  try {
    const load = (mod) => {
      try {
        return mod?.Server?.prototype;
      } catch {
        return void 0;
      }
    };
    const httpUndo = watchUpgrade(load(nodeHttp));
    if (httpUndo) undo.push(httpUndo);
    const httpsUndo = watchUpgrade(load(nodeHttps));
    if (httpsUndo) undo.push(httpsUndo);
  } catch {
  }
}
function clearLiveConnections() {
  started = false;
  stopSampler();
  for (const u of undo) {
    try {
      u();
    } catch {
    }
  }
  undo.length = 0;
  conns.length = 0;
  reopens.clear();
  lastEnd.clear();
  observedAny = false;
  firstSeenAt = 0;
  opened = 0;
  closed = 0;
  drops = 0;
  reconnects = 0;
  streamMessages = 0;
  peakOpen = 0;
  stormPeak = 0;
  anyOpaque = false;
}
function judge(at) {
  let quiet = 0;
  let stalled = 0;
  let undecided = 0;
  for (const c of conns) {
    if (c.closedAt !== null) continue;
    const silence = at - c.lastSeenAt;
    if (silence < LIVECONN_QUIET_MS) continue;
    quiet++;
    if (c.gaps.length < LIVECONN_CADENCE_MIN_GAPS) {
      undecided++;
      continue;
    }
    const typical = med(c.gaps);
    if (typical <= 0) {
      undecided++;
      continue;
    }
    if (silence > typical * LIVECONN_DEAD_GAP_MULTIPLE) stalled++;
  }
  return { quiet, stalled, undecided };
}
function caption(s) {
  if (s.storm > 0) {
    return `${s.storm} reconnects in a minute with no widening gap — add back-off`;
  }
  if (s.stalled > 0) {
    return `${s.stalled} open but silent past its own rhythm — likely dead`;
  }
  if (s.neverClosed > 0) {
    return `${s.neverClosed} connections open for minutes and never closed`;
  }
  if (s.undecided > 0) {
    return `${s.undecided} quiet, and nothing arrives regularly enough to tell dead from resting`;
  }
  if (s.dropsNamed) {
    return `${s.open} open · ${s.drops} dropped without a goodbye`;
  }
  if (s.dropsUnjudged) {
    return `${s.open} open · ${s.drops} dropped — too early to say whether that is a normal rate`;
  }
  if (s.drops > 0) {
    return `${s.open} open · ${s.drops} brief drops, within the normal rate`;
  }
  return `${s.open} open · none dropped`;
}
function readLiveConnections() {
  if (isBoosthisDisabled() || !started || !observedAny) return null;
  try {
    const at = now();
    const elapsed = Math.max(0, at - firstSeenAt);
    if (elapsed < LIVECONN_MIN_WINDOW_MS) return null;
    sampleSockets();
    const windowMin = windowMinOf(elapsed);
    const hours = elapsed / 36e5;
    const live = conns.filter((c) => c.closedAt === null);
    const ended = conns.filter((c) => c.closedAt !== null);
    const lives = ended.map((c) => c.closedAt - c.openedAt);
    let longestMs = 0;
    for (const c of conns) {
      const life = (c.closedAt ?? at) - c.openedAt;
      if (life > longestMs) longestMs = life;
    }
    const v = judge(at);
    const storm = stormPeak >= LIVECONN_STORM_THRESHOLD ? stormPeak : 0;
    const aged = live.filter(
      (c) => at - c.openedAt >= LIVECONN_LEAK_AGE_MS
    ).length;
    const ref = Math.max(at - LIVECONN_GROWTH_WINDOW_MS, firstSeenAt + LIVECONN_LEAK_AGE_MS);
    let liveAtRef = 0;
    for (const c of conns) {
      if (c.openedAt <= ref && (c.closedAt === null || c.closedAt > ref)) liveAtRef++;
    }
    const grewBy = live.length - liveAtRef;
    const neverClosed = live.length >= LIVECONN_LEAK_MIN_OPEN && aged >= LIVECONN_LEAK_MIN_OPEN && grewBy >= LIVECONN_LEAK_MIN_OPEN ? aged : 0;
    let backlog = 0;
    for (const c of live) {
      const h = c.handle;
      if (!h) continue;
      const queued = h.writableLength;
      if (typeof queued === "number" && Number.isFinite(queued)) {
        backlog += queued;
      }
    }
    const dropsPerHour = earnedPerHour(drops, elapsed);
    const dropsNamed = dropsPerHour !== null && drops > 0 && dropsPerHour > LIVECONN_DROPS_OK_PER_HOUR;
    const dropsUnjudged = dropsPerHour === null && drops > 0;
    const score = dropsPerHour === null ? null : Math.round(
      0.35 * linearScore(dropsPerHour, LIVECONN_DROPS_OK_PER_HOUR, 12) + 0.3 * (v.stalled === 0 ? 100 : v.stalled === 1 ? 40 : 0) + 0.2 * (storm === 0 ? 100 : 0) + 0.15 * (neverClosed === 0 ? 100 : 0)
    );
    const namesAProblem = storm > 0 || v.stalled > 0 || neverClosed > 0 || dropsNamed;
    const banded = score === null ? "pending" : ratingFor(score);
    const axis = {
      score,
      rating: namesAProblem && banded === "good" ? "needs-work" : banded,
      caption: caption({
        open: live.length,
        drops,
        dropsNamed,
        dropsUnjudged,
        stalled: v.stalled,
        undecided: v.undecided,
        storm,
        neverClosed
      }),
      open: live.length,
      peakOpen,
      opened,
      closed,
      drops,
      reconnects,
      reconnectsPerHour: earnedPerHour(reconnects, elapsed),
      medianLifeMs: Math.round(med(lives)),
      longestMs: Math.round(longestMs),
      stormCount: storm,
      quiet: v.quiet,
      stalled: v.stalled,
      undecided: v.undecided,
      neverClosed,
      backlog,
      windowMin,
      measurable: 1,
      // Message counts are knowable only while every watched connection marks
      // its own boundaries. One upgraded socket in the set and the honest
      // answer for the set is "the transport does not say".
      flowMeasurable: anyOpaque ? 0 : 1
    };
    if (!anyOpaque) {
      axis.msgsPerMin = earnedPerMin(streamMessages, elapsed);
    }
    return markSettled(axis);
  } catch {
    return null;
  }
}
function liveConnectionStorm() {
  return stormPeak >= LIVECONN_STORM_THRESHOLD ? stormPeak : 0;
}
function collectLiveConnectionFindings() {
  if (isBoosthisDisabled() || !started || !observedAny) return [];
  const out = [];
  try {
    const at = now();
    const storm = liveConnectionStorm();
    if (storm > 0) {
      out.push({
        kind: "reconnect-storm",
        name: "realtime",
        p95: LIVECONN_STORM_WINDOW_MS,
        count: storm,
        hint: "A client reconnected repeatedly with no widening gap between attempts."
      });
    }
    const v = judge(at);
    if (v.stalled > 0) {
      out.push({
        kind: "connection-stalled",
        name: "realtime",
        p95: LIVECONN_QUIET_MS,
        count: v.stalled,
        hint: "A connection is open but has gone silent far past its own rhythm."
      });
    }
    const live = conns.filter((c) => c.closedAt === null);
    const aged = live.filter(
      (c) => at - c.openedAt >= LIVECONN_LEAK_AGE_MS
    ).length;
    if (live.length >= LIVECONN_LEAK_MIN_OPEN && aged >= LIVECONN_LEAK_MIN_OPEN) {
      out.push({
        kind: "connection-leak",
        name: "realtime",
        p95: LIVECONN_LEAK_AGE_MS,
        count: aged,
        hint: "Long-lived connections are piling up and nothing is closing them."
      });
    }
  } catch {
    return out;
  }
  return out;
}
function _setLiveConnectionsClockForTests(fn) {
  now = fn ?? (() => Date.now());
}
const _liveConnectionsInternals = {
  open,
  close,
  activity,
  judge,
  markStarted(on) {
    started = on;
  }
};
export {
  LIVECONN_CADENCE_MIN_GAPS,
  LIVECONN_DEAD_GAP_MULTIPLE,
  LIVECONN_DROPS_OK_PER_HOUR,
  LIVECONN_GROWTH_WINDOW_MS,
  LIVECONN_LEAK_AGE_MS,
  LIVECONN_LEAK_MIN_OPEN,
  LIVECONN_MIN_WINDOW_MS,
  LIVECONN_QUIET_MS,
  LIVECONN_RECONNECT_LINK_MS,
  LIVECONN_SAMPLE_MS,
  LIVECONN_STORM_BACKOFF_MS,
  LIVECONN_STORM_THRESHOLD,
  LIVECONN_STORM_WINDOW_MS,
  _liveConnectionsInternals,
  _setLiveConnectionsClockForTests,
  clearLiveConnections,
  collectLiveConnectionFindings,
  liveConnectionStorm,
  noteResponseForRealtime,
  noteUpgrade,
  readLiveConnections,
  sampleSockets,
  startLiveConnections
};
