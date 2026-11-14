// @ts-nocheck
/* eslint-disable */
// Built from src/middleware.ts so plain node can run the kit. Do not edit.
import { isRouteFirst, recordWithDoor } from "./samples.js";
import { isKitDissolved, isKitLocked } from "./killSwitch.js";
import { authorizationPresence, doorWordFor } from "./routeDoor.js";
import { latinDigits, readableLetters, routeLabel } from "./routeInventory.js";
import { rateDuration } from "./thresholds.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import {
  TRACE_HEADER,
  ELAPSED_HEADER,
  adoptTraceId,
  sanitizeTraceId,
  sanitizeTraceElapsed
} from "./trace.js";
import {
  PARENT_HEADER,
  adoptParentSpanId,
  beginSpan,
  markErrorAction,
  runInSpan
} from "./spanScope.js";
import { enqueueSpan, spanLabel } from "./spanEmitter.js";
import { outcomeForStatus } from "./spanWork.js";
import { chargeRunOverhead } from "./kitFootprint.js";
import { noteRequestStart, noteRequestEnd } from "./liveDetectors.js";
import {
  armRunDeathWatch,
  beginInvocation,
  finishInvocation,
  needsFlushBeforeResponse
} from "./serverlessLifecycle.js";
import { noteRunLimits } from "./serverlessMeters.js";
import { chargeKitInterval, openKitInterval } from "./kitFootprint.js";
import { recordLatencySample } from "./serverMeters.js";
import { isHeldOpenCall, noteHeldOpenExcluded } from "./heldOpen.js";
import { noteDeclaredRouteCall, setDeclaredWaits } from "./declaredWaits.js";
import {
  beginRequestWork,
  endRequestWork,
  noteRouteFirst,
  identifiedCallCount,
  runInRequestWork
} from "./repeatedWork.js";
import { armDbClients, endDbWork } from "./dbWork.js";
import { armAiCalls, endAiWork } from "./aiCalls.js";
import { setDeclaredAiEndpoints } from "./aiProviders.js";
import { endDependencyWork } from "./dependencyWork.js";
import { closeLinkedScope, linkedStepSpans, openLinkedScope } from "./linkedSteps.js";
import { noteRequestContainment } from "./failureContainment.js";
import { armJobSystems } from "./jobAdapters.js";
import { noteResponseCacheHeaders } from "./cacheDirectives.js";
import { noteRequest } from "./runtimeVitals.js";
import {
  noteResponseBackpressure,
  noteWorkerRequest,
  noteDeflectionStart,
  noteDeflectionEnd,
  noteLeakFromResponse,
  noteCookiesFromResponse,
  classifyCorsAnswer,
  noteCorsAnswer,
  noteAccessOutcome,
  noteRefusalHonesty,
  leakRouteClass,
  utf8BytePrefix
} from "./extraMeters.js";
import { noteResponseForRealtime } from "./liveConnections.js";
import {
  PULSE_PATH,
  PANEL_PATH,
  resolveBubbleVisibility,
  wrapResponseForInjection
} from "./bubble.js";
import { isDirectLoopback } from "./loopback.js";
import {
  ownerMayHaveBubble,
  settleOwnerRequest
} from "./ownerLink.js";
import {
  KIT_BASE_PATH,
  announceMissingKitAssets,
  answerKitRead,
  answerUnmountedKitRead,
  areKitPathsRegistered,
  kitReadSuffixFor,
  registeredKitBasePaths,
  writeRawKitAnswer
} from "./kitAnswers.js";
import { claimRequest } from "./requestOnce.js";
import {
  announceKitStart,
  beginStartAnnouncement,
  flushHeldRefusals
} from "./startAnnounce.js";
import { announceUnreadableSources } from "./sourceNotice.js";
import { registerApp } from "./routeInventory.js";
import { resolveProjectKey } from "./projectKey.js";
import { isBoosthisDisabled as isBoosthisEnvDisabled } from "./runtimeFlags.js";
import { STATUS_PATH } from "./statusPage.js";
import { isMcpPath, mcpAutoLabel, recordMcpSample } from "./mcpMeasure.js";
import { noteRouteOutcome } from "./routeOutcomes.js";
import { noteServedHost, setForwardedHostHops } from "./servedHostCodes.js";
import { isServerlessMode } from "./serverless.js";
import { noteQueueStartHeader } from "./cpuSchedulingMeters.js";
const MIDDLEWARE_SERVED = /* @__PURE__ */ new Set([
  PULSE_PATH.slice(KIT_BASE_PATH.length),
  PANEL_PATH.slice(KIT_BASE_PATH.length),
  STATUS_PATH.slice(KIT_BASE_PATH.length)
]);
const NUMERIC_SEGMENT = /^\d+$/;
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX24 = /^[0-9a-f]{24}$/i;
const EMAIL_LIKE = /@/;
const HANDLE_LIKE = /^[~@][A-Za-z0-9._-]+$/;
const LONG_TOKEN = /^[A-Za-z0-9_-]{24,}$/;
const SLUG_SEGMENT = /[-_]/;
const MIXED_CASE_SEGMENT = /^(?=.*[A-Z])(?=.*[a-z])[A-Za-z0-9]+$/;
const ALPHANUM_ID_SEGMENT = /^(?=.*[0-9])(?=.*[A-Za-z])[A-Za-z0-9]+$/;
const PURE_LOWER_ALPHA = /^[a-z]+$/;
const SAFE_ROUTE_KEYWORDS = /* @__PURE__ */ new Set([
  // versioning / top-level
  "api",
  "app",
  "web",
  "www",
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  // health / observability
  "health",
  "healthz",
  "status",
  "ping",
  "ready",
  "live",
  "metrics",
  "stats",
  "analytics",
  "logs",
  "log",
  "errors",
  "debug",
  "trace",
  "info",
  // auth
  "auth",
  "oauth",
  "login",
  "logout",
  "signup",
  "signin",
  "register",
  "callback",
  "redirect",
  "verify",
  "confirm",
  "reset",
  "refresh",
  // common resource collections
  "users",
  "user",
  "accounts",
  "account",
  "profile",
  "profiles",
  "orgs",
  "org",
  "organizations",
  "organization",
  "teams",
  "team",
  "members",
  "member",
  "groups",
  "group",
  "roles",
  "role",
  "projects",
  "project",
  "workspaces",
  "workspace",
  "admin",
  "dashboard",
  "self",
  "customers",
  "customer",
  "clients",
  "client",
  "patients",
  "patient",
  "employees",
  "employee",
  "contacts",
  "contact",
  "records",
  "record",
  // commerce / billing
  "billing",
  "subscriptions",
  "subscription",
  "invoices",
  "invoice",
  "payments",
  "payment",
  "charges",
  "charge",
  "orders",
  "order",
  "products",
  "product",
  "items",
  "item",
  "catalog",
  "inventory",
  "coupons",
  "coupon",
  "discounts",
  "discount",
  // content
  "files",
  "file",
  "uploads",
  "upload",
  "downloads",
  "download",
  "attachments",
  "attachment",
  "images",
  "image",
  "media",
  "assets",
  "static",
  "public",
  "messages",
  "message",
  "conversations",
  "conversation",
  "chat",
  "notifications",
  "notification",
  "comments",
  "comment",
  "posts",
  "post",
  "pages",
  "page",
  "tags",
  "tag",
  "categories",
  "category",
  "labels",
  "label",
  // actions / generic segments
  "search",
  "filter",
  "sort",
  "index",
  "list",
  "settings",
  "config",
  "preferences",
  "create",
  "new",
  "edit",
  "update",
  "delete",
  "view",
  "show",
  "home",
  "about",
  "help",
  "support",
  "contact",
  "docs",
  "documentation",
  "reports",
  "report",
  // jobs / queues
  "jobs",
  "job",
  "tasks",
  "task",
  "queues",
  "queue",
  "events",
  "event",
  "webhooks",
  "webhook",
  "integrations",
  "integration",
  "services",
  "service",
  "rules",
  "rule",
  "policies",
  "policy",
  "permissions",
  "permission",
  "sessions",
  "session",
  // Boosthis-specific route segments
  "candidates",
  "resolutions",
  "installs",
  "samples",
  "consent",
  "forget",
  "mcp",
  "context",
  "budgets",
  "recent",
  "summary",
  "community",
  "fix",
  "fixes",
  "keys",
  "privacy",
  "terms"
]);
function normalizePath(path) {
  return readableLetters(path).split("/").map((seg) => {
    if (!seg) return seg;
    if (SAFE_ROUTE_KEYWORDS.has(seg)) return seg;
    const shape = latinDigits(seg);
    if (NUMERIC_SEGMENT.test(shape)) return ":id";
    if (UUID_SEGMENT.test(shape)) return ":id";
    if (HEX24.test(shape)) return ":id";
    if (EMAIL_LIKE.test(shape)) return ":id";
    if (HANDLE_LIKE.test(shape)) return ":id";
    if (LONG_TOKEN.test(shape)) return ":id";
    if (SLUG_SEGMENT.test(shape)) return ":id";
    if (MIXED_CASE_SEGMENT.test(shape)) return ":id";
    if (ALPHANUM_ID_SEGMENT.test(shape)) return ":id";
    if (PURE_LOWER_ALPHA.test(shape) && shape.length >= 3) return ":id";
    return seg;
  }).join("/");
}
function badgeStateForStartupLine(option) {
  try {
    if (isBoosthisEnvDisabled()) return "switched-off";
  } catch {
    return "switched-off";
  }
  try {
    return resolveBubbleVisibility(option) ? "owner-only" : "hidden-by-setting";
  } catch {
    return "owner-only";
  }
}
function boosthis(opts = {}) {
  try {
    beginStartAnnouncement();
    announceKitStart(
      resolveProjectKey(opts.projectKey).key,
      badgeStateForStartupLine(opts.bubble)
    );
    announceUnreadableSources();
    announceMissingKitAssets();
  } catch {
    try {
      flushHeldRefusals();
    } catch {
    }
  }
  try {
    setForwardedHostHops(opts.forwardedHostHops);
  } catch {
  }
  try {
    if (opts.aiEndpoints !== void 0) setDeclaredAiEndpoints(opts.aiEndpoints);
  } catch {
  }
  try {
    if (opts.declaredWaits !== void 0) setDeclaredWaits(opts.declaredWaits);
  } catch {
  }
  const rate = opts.rate ?? rateDuration;
  const fallback = opts.fallbackName ?? "unknown";
  let appSeen = false;
  return function boosthisMiddleware(req, res, next) {
    if (isBoosthisDisabled()) {
      next();
      return;
    }
    if (isKitDissolved()) {
      next();
      return;
    }
    let owner;
    try {
      owner = settleOwnerRequest(req, res);
    } catch {
      owner = false;
    }
    if (owner === "answered") return;
    if (typeof owner === "boolean") {
      serveRequest(req, res, next, owner);
      return;
    }
    owner.then(
      (o) => {
        if (o !== "answered") serveRequest(req, res, next, o);
      },
      () => serveRequest(req, res, next, false)
    );
  };
  function serveRequest(req, res, next, owner) {
    const locked = isKitLocked();
    if (!locked) {
      noteQueueStartHeader(
        req.headers?.["x-request-start"] ?? req.headers?.["x-queue-start"]
      );
    }
    try {
      const rawPath = (req.url ?? req.originalUrl ?? "").split("?")[0];
      const isGet = (req.method ?? "GET").toUpperCase() === "GET";
      const suffix = isGet && typeof res.end === "function" ? kitReadSuffixFor(rawPath) : null;
      const ownerOrMachine = owner || isDirectLoopback(req);
      if (suffix !== null && MIDDLEWARE_SERVED.has(suffix)) {
        const answer = answerKitRead(suffix, {
          loopback: isDirectLoopback(req),
          owner
        });
        if (answer && writeRawKitAnswer(res, answer)) return;
      } else if (suffix !== null && ownerOrMachine && !areKitPathsRegistered()) {
        const answer = answerUnmountedKitRead(suffix, {
          elsewhere: registeredKitBasePaths()[0]
        });
        if (answer && writeRawKitAnswer(res, answer)) return;
      }
    } catch {
    }
    if (claimRequest(req) === "already") {
      next();
      return;
    }
    if (resolveBubbleVisibility(opts.bubble) && ownerMayHaveBubble(req, owner)) {
      try {
        wrapResponseForInjection(res);
      } catch {
      }
    }
    if (locked) {
      next();
      return;
    }
    let requestAction = null;
    try {
      const traceId = adoptTraceId(req.headers?.[TRACE_HEADER]);
      req.boosthisTraceId = traceId;
      req.boosthisTraceElapsedBase = sanitizeTraceElapsed(
        req.headers?.[ELAPSED_HEADER]
      );
      const parentSpanId = adoptParentSpanId(req.headers?.[PARENT_HEADER]);
      const requestSpan = beginSpan({ parentSpanId, traceId });
      requestAction = requestSpan;
      req.boosthisSpanId = requestSpan.spanId;
      if (parentSpanId !== null) req.boosthisParentSpanId = parentSpanId;
      if (typeof res.setHeader === "function") {
        res.setHeader(TRACE_HEADER, traceId);
      }
    } catch {
    }
    noteRequestStart();
    const run = beginInvocation();
    chargeRunOverhead(() => {
      armRunDeathWatch(null, run);
    }, run.kit);
    const deflectionStartInFlight = noteDeflectionStart();
    const workScope = beginRequestWork();
    if (workScope) workScope.trace = req;
    if (workScope) workScope.linked = openLinkedScope();
    armDbClients();
    armAiCalls();
    noteResponseForRealtime(req, res);
    armJobSystems();
    let sawBackpressure = false;
    try {
      res.on("drain", () => {
        sawBackpressure = true;
      });
    } catch {
    }
    let cookieHeader = null;
    let corsShape = void 0;
    const captureCookieHeader = () => {
      try {
        if (corsShape === void 0) {
          corsShape = typeof res.getHeader === "function" ? classifyCorsAnswer(
            req.headers?.origin,
            res.getHeader("access-control-allow-origin"),
            res.getHeader("access-control-allow-credentials")
          ) : null;
        }
      } catch {
        corsShape = null;
      }
      try {
        if (cookieHeader !== null) return;
        cookieHeader = typeof res.getHeader === "function" ? res.getHeader("set-cookie") : void 0;
      } catch {
        cookieHeader = void 0;
      }
    };
    const LEAK_BODY_CAP = 8192;
    let leakChunks = [];
    let leakBufLen = 0;
    let leakDecided = false;
    const appendLeakChunk = (chunk) => {
      try {
        if (leakChunks === null || leakBufLen >= LEAK_BODY_CAP) return;
        if (!leakDecided) {
          leakDecided = true;
          const status = typeof res.statusCode === "number" ? res.statusCode : 0;
          if (status < 400) {
            leakChunks = null;
            return;
          }
        }
        if (chunk == null) return;
        const remaining = LEAK_BODY_CAP - leakBufLen;
        let s;
        let taken;
        if (typeof chunk === "string") {
          if (chunk === "") return;
          s = utf8BytePrefix(chunk, remaining);
          taken = Buffer.byteLength(s, "utf8");
          if (taken === 0) {
            leakBufLen = LEAK_BODY_CAP;
            return;
          }
        } else if (chunk instanceof Uint8Array || Buffer.isBuffer(chunk)) {
          const view = chunk;
          taken = Math.min(view.byteLength, remaining);
          s = Buffer.from(view.subarray(0, taken)).toString("utf8");
        } else return;
        leakChunks.push(s);
        leakBufLen += taken;
      } catch {
      }
    };
    try {
      const origWrite = res.write;
      if (typeof origWrite === "function") {
        res.write = function boosthisLeakWrite(chunk, ...rest) {
          appendLeakChunk(chunk);
          return origWrite.call(
            res,
            chunk,
            ...rest
          );
        };
      }
      const origEnd = res.end;
      if (typeof origEnd === "function") {
        res.end = function boosthisLeakEnd(chunk, ...rest) {
          if (typeof chunk !== "function") appendLeakChunk(chunk);
          captureCookieHeader();
          if (!heldForFlush && needsFlushBeforeResponse()) {
            heldForFlush = true;
            responseCompleted = true;
            const done = () => origEnd.call(
              res,
              chunk,
              ...rest
            );
            void Promise.resolve().then(() => finalize()).catch(() => {
            }).then(done);
            return res;
          }
          return origEnd.call(
            res,
            chunk,
            ...rest
          );
        };
      }
    } catch {
    }
    const start = performance.now();
    if (!appSeen) {
      appSeen = true;
      try {
        registerApp(req.app);
      } catch {
      }
    }
    req.boosthisTraceStart = start;
    if (workScope?.linked) workScope.linked.openedAt = start;
    const method = req.method ?? "GET";
    let recorded = false;
    let heldForFlush = false;
    let responseCompleted = false;
    const finalize = () => {
      if (recorded) return;
      recorded = true;
      const kitWork = openKitInterval();
      const duration = performance.now() - start;
      const heldOpen = isHeldOpenCall(req, res);
      if (heldOpen) noteHeldOpenExcluded(duration);
      let declaredWait = false;
      let authPresence = null;
      try {
        noteRequest(
          typeof res.statusCode === "number" ? res.statusCode : void 0
        );
        try {
          const routeMatched = typeof req.route === "object" && req.route !== null ? true : typeof req.app === "function" || typeof req.app === "object" && req.app !== null ? false : null;
          noteAccessOutcome(
            typeof res.statusCode === "number" ? res.statusCode : void 0,
            req.socket?.remoteAddress,
            routeMatched
          );
        } catch {
        }
        try {
          authPresence = authorizationPresence(req);
          const authorizationPresent = authPresence === true;
          let canReadResponseHeaders = typeof res.getHeader === "function";
          let challengeHeader;
          if (canReadResponseHeaders) {
            try {
              challengeHeader = res.getHeader("www-authenticate");
            } catch {
              canReadResponseHeaders = false;
            }
          }
          const challengePresent = Array.isArray(challengeHeader) ? challengeHeader.some((v) => typeof v === "string" && v.length > 0) : typeof challengeHeader === "string" && challengeHeader.length > 0 || typeof challengeHeader === "number" && Number.isFinite(challengeHeader);
          noteRefusalHonesty(
            typeof res.statusCode === "number" ? res.statusCode : void 0,
            authorizationPresent,
            challengePresent,
            canReadResponseHeaders
          );
        } catch {
        }
        const matched = req.route?.path;
        const baseUrl = normalizePath(req.baseUrl ?? "");
        let pathLabel;
        if (matched) {
          pathLabel = `${baseUrl}${matched}`;
        } else {
          const raw = req.path ?? req.originalUrl ?? req.url ?? fallback;
          const noQuery = raw.split("?")[0];
          let normalized = normalizePath(noQuery);
          if (!normalized.startsWith("/")) normalized = `/${normalized}`;
          pathLabel = normalized;
        }
        const label = routeLabel(method, pathLabel);
        declaredWait = !heldOpen && noteDeclaredRouteCall(
          method,
          label ?? pathLabel,
          duration,
          req.originalUrl ?? req.url
        );
        if (!heldOpen && !declaredWait && label !== null) {
          let door = null;
          try {
            door = doorWordFor(method, authPresence, responseCompleted, res.statusCode);
          } catch {
            door = null;
          }
          noteRouteFirst(
            workScope,
            isRouteFirst(recordWithDoor(label, duration, rate(duration), door))
          );
        }
        try {
          if (!heldOpen && responseCompleted && label !== null) {
            noteRouteOutcome(label, res.statusCode);
          }
        } catch {
        }
        try {
          if (responseCompleted && !isServerlessMode()) noteServedHost(req, res.statusCode);
        } catch {
        }
        try {
          if (!heldOpen && !declaredWait && method.toUpperCase() === "POST") {
            const mcpPath = (req.path ?? req.originalUrl ?? req.url ?? "").split("?")[0];
            if (isMcpPath(mcpPath)) {
              const body = req.body;
              const mcpLabel = mcpAutoLabel(body);
              if (mcpLabel) {
                const failed = typeof res.statusCode === "number" && res.statusCode >= 500;
                recordMcpSample(mcpLabel, duration, failed);
              }
            }
          }
        } catch {
        }
        if (!heldOpen && !declaredWait) recordLatencySample(duration, label);
        try {
          noteResponseBackpressure(sawBackpressure, duration);
          noteWorkerRequest();
        } catch {
        }
        try {
          captureCookieHeader();
          noteCookiesFromResponse(cookieHeader);
          cookieHeader = null;
        } catch {
        }
        try {
          noteCorsAnswer(corsShape ?? null);
          corsShape = void 0;
        } catch {
        }
        try {
          if (typeof res.getHeader === "function") {
            noteResponseCacheHeaders({
              method: req.method,
              statusCode: res.statusCode,
              cacheControl: res.getHeader("cache-control"),
              etag: res.getHeader("etag"),
              lastModified: res.getHeader("last-modified")
            });
          }
        } catch {
        }
        try {
          const chunks = leakChunks;
          leakChunks = null;
          const status = typeof res.statusCode === "number" ? res.statusCode : 0;
          if (chunks && chunks.length > 0 && status >= 400) {
            let ctype = "";
            try {
              const raw = typeof res.getHeader === "function" ? res.getHeader("content-type") : void 0;
              ctype = (Array.isArray(raw) ? raw[0] : String(raw ?? "")).toLowerCase();
            } catch {
              ctype = "";
            }
            const ctOk = ctype === "" || ctype.includes("text/html") || ctype.includes("text/plain") || ctype.includes("application/json");
            if (ctOk) {
              const body = utf8BytePrefix(chunks.join(""), LEAK_BODY_CAP);
              const acceptRaw = req.headers?.["accept"];
              const accept = Array.isArray(acceptRaw) ? String(acceptRaw[0] ?? "") : typeof acceptRaw === "string" ? acceptRaw : void 0;
              const rc = leakRouteClass(
                (req.path ?? req.originalUrl ?? req.url ?? "").split("?")[0],
                accept
              );
              noteLeakFromResponse(body, rc);
            }
          }
        } catch {
        }
        const traceRouteLabel = label === null ? null : spanLabel(label);
        const linkedFolds = closeLinkedScope(workScope?.linked);
        const traceIdForSpan = sanitizeTraceId(req.boosthisTraceId);
        const linkedSpans = traceRouteLabel !== null && linkedFolds.length > 0 && req.boosthisSpanId ? linkedStepSpans(linkedFolds, {
          traceId: traceIdForSpan,
          layer: "node",
          parentSpanId: req.boosthisSpanId,
          baseOffsetMs: req.boosthisTraceElapsedBase ?? 0
        }) : void 0;
        if (traceRouteLabel !== null) enqueueSpan({
          traceId: traceIdForSpan,
          layer: "node",
          routeLabel: traceRouteLabel,
          durationMs: Math.round(duration),
          // Offset from the trace root = the elapsed base adopted on receive
          // (this hop began when the caller sent, per the chained deltas).
          startOffsetMs: req.boosthisTraceElapsedBase ?? 0,
          rating: rate(duration),
          // Causality pair, both set above. `parentSpanId` is undefined when
          // the caller sent none — the span is then top-level, which is a
          // different (and honest) thing from detached.
          spanId: req.boosthisSpanId,
          parentSpanId: req.boosthisParentSpanId,
          // What kind of work this leg was, and whether it worked. The Node
          // kit emits exactly one span per handled request, so the kind is
          // always `handler`: the app's own code answering something. The
          // outcome is read from the status the host actually sent — a 404 or
          // a 401 is the app doing what it was asked, only a 5xx (or a throw
          // the framework turned into one) is the work itself failing. It is
          // NOT the rating: a fast 500 is `poor`-free and still an error.
          kind: "handler",
          outcome: outcomeForStatus(
            typeof res.statusCode === "number" ? res.statusCode : null
          ),
          // A declared wait still sends its step, marked, so the trace page
          // shows the route waited on purpose instead of drawing it as the
          // slow part of the request (the server keeps it out of every
          // duration figure it builds from steps).
          wait: declaredWait ? "declared" : void 0
        }, linkedSpans);
      } catch {
      } finally {
        noteDeflectionEnd(deflectionStartInFlight, duration, heldOpen || declaredWait);
        noteRunLimits(identifiedCallCount(workScope));
        endRequestWork(workScope, duration);
        noteRequestContainment(workScope, res.statusCode);
        endDependencyWork(workScope, duration);
        endDbWork(workScope, duration);
        endAiWork(workScope, duration);
      }
      noteRequestEnd();
      chargeKitInterval(kitWork, run.kit);
      return finishInvocation(Number(res.statusCode) >= 500, run);
    };
    const finalizeListener = () => {
      void finalize();
    };
    res.on("finish", () => {
      responseCompleted = true;
      finalizeListener();
    });
    res.on("close", finalizeListener);
    const continueDownstream = () => runInRequestWork(workScope, next);
    if (requestAction === null) {
      continueDownstream();
      return;
    }
    try {
      runInSpan(requestAction, continueDownstream);
    } catch (err) {
      try {
        const traceId = requestAction.traceId;
        markErrorAction(
          err,
          typeof traceId === "string" ? { traceId, spanId: requestAction.spanId } : null
        );
      } catch {
      }
      throw err;
    }
  }
  ;
}
export {
  boosthis,
  normalizePath
};
