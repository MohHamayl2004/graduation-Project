// @ts-nocheck
/* eslint-disable */
// Built from src/kitAnswers.ts so plain node can run the kit. Do not edit.
import * as samples from "./samples.js";
import * as budgets from "./budgets.js";
import * as reporting from "./reporting.js";
import { computePulse, computePanel, computePanelLock, renewNotice } from "./bubble.js";
import { computeDashboardAxes } from "./healthAxes.js";
import { declaredWaitsBlock } from "./declaredWaits.js";
import { RUNTIME_VERSION } from "./thresholds.js";
import {
  forceEntitlementCheck,
  isKitDissolved,
  renewOnly,
  visibleEntitlementStatus
} from "./killSwitch.js";
import { DASHBOARD_MARKUP, PANEL_PAGE_MARKUP } from "./kitPageAssets.js";
import { sayAfterStartupLine } from "./startAnnounce.js";
import { STATUS_FORBIDDEN_HTML, renewOnlyHtml, statusPageHtml } from "./statusPage.js";
function kitPage(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#0b0c10;color:#e6e7eb;font-family:system-ui,sans-serif;padding:40px;line-height:1.55;max-width:46rem">` + body + "</body></html>";
}
const PANEL_PAGE_STANDIN = kitPage(
  "Boosthis",
  "<h1>Boosthis is running</h1><p>This install is measuring normally — this page is the only thing affected. This build of the kit carries no page markup, so there is nothing here to draw. That is our packaging, not your install: nothing you change in your app will restore it, and reinstalling the same version will not either.</p><p>Everything else still works — the status page at <code>/_boosthis/status</code> (localhost only), the badge, and your project's readings on the Boosthis dashboard. Updating to a newer kit version replaces this page; if a newer version does the same, tell us at support@boosthis.com.</p>"
);
const PANEL_PAGE_HTML = PANEL_PAGE_MARKUP || PANEL_PAGE_STANDIN;
const DASHBOARD_HTML = DASHBOARD_MARKUP || kitPage(
  "Boosthis",
  "<h1>Boosthis is running</h1><p>This install is measuring normally. This build of the kit carries no markup for the detailed view, so there is nothing to draw here — our packaging, not your install, and reinstalling the same version will not change it.</p><p>The in-app page at <code>/_boosthis</code> and the status page at <code>/_boosthis/status</code> still work, as do the readings on your Boosthis dashboard. Updating the kit replaces this view; if a newer version does the same, tell us at support@boosthis.com.</p>"
);
function missingKitAssetsLine(panel = PANEL_PAGE_MARKUP, dashboard = DASHBOARD_MARKUP) {
  const missing = [];
  if (!panel) missing.push("the in-app page (/_boosthis)");
  if (!dashboard) missing.push("the detailed local view (/_boosthis/dev)");
  if (!missing.length) return null;
  return `[boosthis] This build of the Boosthis kit carries no markup for ${missing.join(" or ")}, so ${missing.length === 1 ? "that page shows" : "those pages show"} a plain stand-in. Measuring, uploading and the status page are unaffected. This is a packaging fault on our side — reinstalling the same version will not change it; tell us at support@boosthis.com.`;
}
let assetsAnnounced = false;
function announceMissingKitAssets() {
  if (assetsAnnounced) return;
  assetsAnnounced = true;
  try {
    const line = missingKitAssetsLine();
    if (line) {
      try {
        sayAfterStartupLine(line);
      } catch {
      }
    }
  } catch {
  }
}
function _resetKitAssetNoticeForTests() {
  assetsAnnounced = false;
}
const KIT_ERROR_HTML = '<!doctype html><html><head><meta charset="utf-8"><title>Boosthis</title></head><body style="background:#0b0c10;color:#e6e7eb;font-family:system-ui,sans-serif;padding:40px"><h1>Boosthis could not draw this page</h1><p>Something inside the kit failed while building this view. Your app is unaffected — only this page is. Reload to try again.</p></body></html>';
const KIT_BASE_PATH = "/_boosthis";
const KIT_READ_SUFFIXES = [
  "",
  "/",
  "/dev",
  "/healthz",
  "/summary",
  "/recent",
  "/budgets",
  "/pulse",
  "/panel",
  "/connect",
  "/account",
  "/status"
];
function isKitReadSuffix(suffix) {
  return KIT_READ_SUFFIXES.includes(suffix);
}
function kitReadSuffixFor(path, base = KIT_BASE_PATH) {
  if (!path.startsWith(base)) return null;
  const raw = path.slice(base.length);
  const suffix = raw.length > 1 && raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return isKitReadSuffix(suffix) ? suffix : null;
}
const registeredKitBases = /* @__PURE__ */ new Set();
function normaliseBase(base) {
  return base.replace(/\/$/, "");
}
function noteKitPathsRegistered(base = KIT_BASE_PATH) {
  try {
    registeredKitBases.add(normaliseBase(base));
  } catch {
  }
}
function areKitPathsRegistered(base = KIT_BASE_PATH) {
  return registeredKitBases.has(normaliseBase(base));
}
function registeredKitBasePaths() {
  return [...registeredKitBases];
}
function _resetKitPathRegistrationsForTests() {
  registeredKitBases.clear();
}
function unmountedGuidance(base, elsewhere) {
  if (elsewhere) {
    return {
      reason: `Boosthis is installed and measuring, but its pages are served under ${elsewhere} in this app, not under ${base}.`,
      fix: `Use ${elsewhere} instead — same page, same reads.`
    };
  }
  return {
    reason: `Boosthis is installed and measuring. This surface is registered by the optional second call, mount(app), which this app has not made.`,
    fix: `Add mount(app) next to app.use(boosthis()) and restart. A non-Express app uses attach() instead, which needs no mount call.`
  };
}
function answerUnmountedKitRead(suffix, opts = {}) {
  if (!isKitReadSuffix(suffix)) return null;
  const base = normaliseBase(opts.base ?? KIT_BASE_PATH);
  const { reason, fix } = unmountedGuidance(base, opts.elsewhere);
  const statusPath = `${base}/status`;
  const wantsHtml = suffix === "" || suffix === "/" || suffix === "/dev" || suffix === "/status";
  if (!wantsHtml) {
    return {
      status: 404,
      kind: "json",
      json: {
        error: reason,
        fix,
        measuring: true,
        statusPage: statusPath
      }
    };
  }
  return {
    status: 404,
    kind: "html",
    html: kitPage(
      "Boosthis — one line short",
      `<h1>Boosthis is installed and measuring</h1><p>${reason}</p><p>${fix}</p>` + (opts.elsewhere ? "" : '<pre style="background:#15171d;padding:14px;border-radius:8px;overflow:auto"><code>app.use(boosthis());\nmount(app);</code></pre>') + `<p>Nothing is broken and nothing is missing from the install — this app simply skipped a call we describe as optional.</p><p>Working right now, with no mount: the status page at <a style="color:#7cc4ff" href="${statusPath}">${statusPath}</a> (localhost only), and the badge reads at <code>${base}/pulse</code> and <code>${base}/panel</code>.</p>`
    )
  };
}
function buildConnectPayload(tele) {
  if (!tele || !tele.enabled || !tele.readToken) return { connected: false };
  const mcpUrl = tele.endpoint.replace(/\/api\/?$/, "") + "/mcp";
  const mcpConfig = [
    "{",
    '  "mcpServers": {',
    '    "boosthis": {',
    `      "url": "${mcpUrl}",`,
    '      "headers": { "Authorization": "Bearer <YOUR_PROJECT_KEY>" }',
    "    }",
    "  }",
    "}"
  ].join("\n");
  return {
    connected: true,
    installId: tele.installId,
    readToken: tele.readToken,
    mcpUrl,
    mcpConfig
  };
}
function writeRawKitAnswer(res, answer) {
  try {
    if (res.headersSent === true) return false;
    if (typeof res.end !== "function") return false;
    res.statusCode = answer.status;
    if (typeof res.setHeader === "function") {
      res.setHeader(
        "content-type",
        answer.kind === "html" ? "text/html; charset=utf-8" : "application/json; charset=utf-8"
      );
      res.setHeader("cache-control", "no-store");
    }
    res.end(
      answer.kind === "html" ? answer.html ?? KIT_ERROR_HTML : JSON.stringify(answer.json ?? null)
    );
    return true;
  } catch {
    return false;
  }
}
const DASHBOARD_FORBIDDEN = {
  error: "boosthis dashboard is localhost-only by default. Pass { allowRemote: true } to mount() (and put auth in front) to expose it on this host."
};
const HIDDEN_LOCK = { kind: "hidden", title: "", body: "" };
function renewAnswer(kind) {
  const notice = renewNotice();
  return kind === "html" ? { status: 200, kind: "html", html: renewOnlyHtml(notice) } : {
    status: 200,
    kind: "json",
    json: { entitlement: visibleEntitlementStatus(), renewOnly: true, notice }
  };
}
function answerKitRead(suffix, ctx) {
  if (!isKitReadSuffix(suffix)) return null;
  if (isKitDissolved()) return null;
  const allowRemote = ctx.allowRemote === true;
  if (!allowRemote && !ctx.loopback && ctx.owner !== true) return null;
  const perfReadAllowed = allowRemote || ctx.loopback;
  try {
    const renew = renewOnly();
    switch (suffix) {
      // The canonical in-app page (and its slash variant, so neither habit
      // 404s) — the same markup every other kit serves. Gated exactly like
      // the /panel read it fetches its numbers from (the owners-only check at
      // the top): a page that worked while its numbers refused, or the other
      // way round, would only puzzle the owner.
      case "":
      case "/":
        if (renew) return renewAnswer("html");
        return { status: 200, kind: "html", html: PANEL_PAGE_HTML };
      // This kit's richer local view. It renders route labels, learned
      // budgets, raw samples and the read-token card, so it keeps the loopback
      // guard the whole dashboard used to have.
      case "/dev":
        if (!perfReadAllowed) {
          return { status: 403, kind: "json", json: DASHBOARD_FORBIDDEN };
        }
        if (renew) return renewAnswer("html");
        return { status: 200, kind: "html", html: DASHBOARD_HTML };
      case "/healthz":
        if (!perfReadAllowed) {
          return { status: 403, kind: "json", json: DASHBOARD_FORBIDDEN };
        }
        if (renew) return renewAnswer("json");
        return {
          status: 200,
          kind: "json",
          json: {
            ok: true,
            version: RUNTIME_VERSION,
            samples: samples.summary().total
          }
        };
      case "/summary": {
        if (!perfReadAllowed) {
          return { status: 403, kind: "json", json: DASHBOARD_FORBIDDEN };
        }
        if (renew) return renewAnswer("json");
        const sum = samples.summary();
        const axes = computeDashboardAxes(
          samples.settledSummary(),
          budgets.allStatuses(),
          budgets.regressions(),
          reporting.collectFindings()
        );
        return {
          status: 200,
          kind: "json",
          json: { ...sum, axes, declaredWaits: declaredWaitsBlock() }
        };
      }
      case "/recent": {
        if (!perfReadAllowed) {
          return { status: 403, kind: "json", json: DASHBOARD_FORBIDDEN };
        }
        if (renew) return renewAnswer("json");
        const limit = Number(ctx.query?.limit ?? 50);
        return {
          status: 200,
          kind: "json",
          json: samples.recent({
            limit: Number.isFinite(limit) ? limit : 50,
            name: ctx.query?.name
          })
        };
      }
      case "/budgets":
        if (!perfReadAllowed) {
          return { status: 403, kind: "json", json: DASHBOARD_FORBIDDEN };
        }
        if (renew) return renewAnswer("json");
        return {
          status: 200,
          kind: "json",
          json: {
            algorithm: budgets.BUDGET_ALGORITHM,
            rule: `Baseline frozen from ${budgets.BUDGET_BASELINE_N} samples per route after ${budgets.BUDGET_WARMUP_N} warm-up samples, compared against ${budgets.BUDGET_RECENT_N} samples taken strictly later. The two windows share no sample, and each row carries both spans.`,
            all: budgets.allStatuses(),
            regressions: budgets.regressions()
          }
        };
      // The two closed, coarse reads the floating badge polls, from any page
      // the app serves to its owner. Owners only (the check at the top), and
      // the shape carries only scores, ratings, labels and numeric captions —
      // never route labels, URLs, durations or raw samples.
      case "/pulse":
      case "/panel": {
        try {
          forceEntitlementCheck(false);
        } catch {
        }
        const lock = computePanelLock();
        let json;
        if (renew || lock) {
          const shown = lock ?? HIDDEN_LOCK;
          json = suffix === "/panel" ? { lock: shown } : { score: null, rating: null, sampleCount: 0, lock: shown };
        } else {
          json = suffix === "/panel" ? computePanel() : computePulse();
        }
        return { status: 200, kind: "json", json };
      }
      // "Connect your AI" — surfaces the install id + read-only read token + a
      // paste-ready hosted-MCP config. This read emits a CREDENTIAL, so unlike
      // the perf reads it is ALWAYS loopback-only: `allowRemote` never opens
      // it.
      case "/connect":
        if (!ctx.loopback) {
          return {
            status: 403,
            kind: "json",
            json: {
              error: "boosthis /connect is loopback-only — it emits a read token. Copy the credentials from a local session."
            }
          };
        }
        if (renew) return renewAnswer("json");
        return { status: 200, kind: "json", json: buildConnectPayload(ctx.telemetry) };
      // "Connect to your account" auth context for the badge's account card.
      // Also a CREDENTIAL (the install delete token used to claim/link the
      // install), so it is ALWAYS loopback-only too.
      case "/account": {
        if (!ctx.loopback) {
          return {
            status: 403,
            kind: "json",
            json: {
              error: "boosthis /account is loopback-only — it emits an install token. Open this page on the dev machine to sign in."
            }
          };
        }
        if (renew) {
          return { status: 200, kind: "json", json: { lock: computePanelLock() ?? HIDDEN_LOCK } };
        }
        const tele = ctx.telemetry;
        if (!tele || !tele.enabled) {
          return {
            status: 200,
            kind: "json",
            json: { endpoint: null, installId: null, deleteToken: null }
          };
        }
        return {
          status: 200,
          kind: "json",
          json: {
            endpoint: tele.endpoint,
            installId: tele.installId,
            deleteToken: tele.deleteToken ?? null,
            // The kit's current effective full-telemetry mode — the account
            // card's telemetry toggle falls back to this when the claim
            // response omits `fullTelemetry`. Display-only; never a credential.
            fullTelemetry: tele.fullTelemetryEffective === true
          }
        };
      }
      // The standalone "is Boosthis working?" page — the surface a back-end app
      // with no UI has instead of the floating badge. STRICT loopback, same
      // posture as /connect and /account (`allowRemote` never opens it): it is
      // a developer's local diagnostic, not a public health page.
      case "/status":
        if (!ctx.loopback) {
          return { status: 403, kind: "html", html: STATUS_FORBIDDEN_HTML };
        }
        if (renew) return renewAnswer("html");
        return { status: 200, kind: "html", html: statusPageHtml() };
    }
  } catch {
    const kind = suffix === "" || suffix === "/" || suffix === "/dev" || suffix === "/status" ? "html" : "json";
    return kind === "html" ? { status: 500, kind, html: KIT_ERROR_HTML } : { status: 500, kind, json: { error: "boosthis could not answer this read." } };
  }
  return null;
}
export {
  DASHBOARD_HTML,
  KIT_BASE_PATH,
  KIT_ERROR_HTML,
  KIT_READ_SUFFIXES,
  PANEL_PAGE_HTML,
  _resetKitAssetNoticeForTests,
  _resetKitPathRegistrationsForTests,
  announceMissingKitAssets,
  answerKitRead,
  answerUnmountedKitRead,
  areKitPathsRegistered,
  buildConnectPayload,
  isKitReadSuffix,
  kitReadSuffixFor,
  missingKitAssetsLine,
  noteKitPathsRegistered,
  registeredKitBasePaths,
  writeRawKitAnswer
};
