// @ts-nocheck
/* eslint-disable */
// Built from src/statusPage.ts so plain node can run the kit. Do not edit.
import { RUNTIME_VERSION } from "./thresholds.js";
import {
  dropSummaryText,
  getDroppedRowCount,
  getUndeliveredRowCount,
  undeliveredSummaryText
} from "./dropReport.js";
import {
  crashDeliveryFacts,
  crashDeliveryNote,
  crashReportingVerdict
} from "./crashDelivery.js";
import {
  getDroppedUploadCount,
  getLastUploadAt,
  getLastUploadFailure,
  getPanelEndpoint,
  getPanelInstallId,
  getPanelProjectKey,
  askRegistration,
  getRegistrationRejection,
  getRegistrationRefusalKind,
  getRegistrationRefusalRetryAfterSeconds,
  getRegistrationRefusalSentence,
  describeRetryWait,
  isFullTelemetryForPanel,
  isLastUploadAttemptFailed,
  isRegisteredForPanel,
  isSharingOnForPanel
} from "./telemetry.js";
import {
  getRegistrationVerdict
} from "./registration.js";
import { describeProjectKeySource } from "./projectKey.js";
import {
  getKitProject,
  projectDisplay,
  PROJECT_LABEL,
  PROJECT_UNKNOWN_TEXT
} from "./projectIdentity.js";
import * as samples from "./samples.js";
import { attachState, cannotAttachShort } from "./attachStatus.js";
import { hostingFacts, hostingLine } from "./hosting.js";
import { serverKindLabel } from "./serverKind.js";
import { tracePropagationSummary } from "./tracePropagation.js";
import { getUploadPause } from "./uploadPause.js";
import {
  UPLOAD_PAUSE_ENDS_LABEL,
  UPLOAD_PAUSE_TITLE,
  uploadPauseBody,
  uploadPauseEndsText
} from "./uploadPauseWords.js";
const STATUS_SUFFIX = "/status";
const STATUS_PATH = "/_boosthis/status";
const RUNTIME_LABEL = "Node";
const SHARE_OPTION = "shareMeterWithAI: true";
const DEFAULT_DASHBOARD_URL = "https://www.boosthis.com/dashboard";
const T = {
  bg: "#0b0c10",
  card: "#15171c",
  br: "#262932",
  fg: "#e6e7eb",
  mut: "#8b8f99",
  pri: "#f97316",
  good: "#4ade80",
  warn: "#fbbf24",
  bad: "#f87171"
};
function dashboardUrlFor(endpoint) {
  try {
    if (!endpoint) return DEFAULT_DASHBOARD_URL;
    return `${new URL(endpoint).origin}/dashboard`;
  } catch {
    return DEFAULT_DASHBOARD_URL;
  }
}
function collectStatusFacts() {
  let installId = null;
  let registered = false;
  let sharing = false;
  let fullTelemetry = false;
  let lastUploadAt = null;
  let lastUploadFailAt = null;
  let lastUploadFailReason = null;
  let uploadsDropped = 0;
  let rowsDropped = 0;
  let rowsDroppedText = "";
  let rowsUndelivered = 0;
  let rowsUndeliveredText = "";
  let crashReporting = "reporting";
  let crashNote = "";
  let crashesHeld = 0;
  let lastAttemptFailed = false;
  let requestsMeasured = 0;
  let rejected = false;
  let verdict = "unknown";
  let endpoint = null;
  let projectKeyDisplay = null;
  let projectKeySource = "no project key configured";
  let projectText = projectDisplay(null);
  let refusalSentence = null;
  let throttled = false;
  let throttleWaitSeconds = null;
  let propagationSummary = "Off — no trace headers are attached to outgoing calls";
  try {
    propagationSummary = tracePropagationSummary();
  } catch {
  }
  try {
    askRegistration();
    verdict = getRegistrationVerdict();
    installId = getPanelInstallId();
    endpoint = getPanelEndpoint();
    registered = isRegisteredForPanel();
    sharing = isSharingOnForPanel();
    fullTelemetry = isFullTelemetryForPanel();
    lastUploadAt = getLastUploadAt();
    const fail = getLastUploadFailure();
    lastUploadFailAt = fail ? fail.at : null;
    lastUploadFailReason = fail ? fail.reason : null;
    uploadsDropped = getDroppedUploadCount();
    rowsDropped = getDroppedRowCount();
    rowsDroppedText = dropSummaryText();
    rowsUndelivered = getUndeliveredRowCount();
    rowsUndeliveredText = undeliveredSummaryText();
    lastAttemptFailed = isLastUploadAttemptFailed();
    rejected = getRegistrationRejection() === "install-id-not-uuid";
    if (verdict === "unknown" && registered) verdict = "registered";
    const projectKey = getPanelProjectKey();
    projectKeyDisplay = projectKey.display;
    projectKeySource = describeProjectKeySource(projectKey.source);
    projectText = projectDisplay(getKitProject());
    refusalSentence = getRegistrationRefusalSentence();
    throttled = getRegistrationRefusalKind() === "throttled";
    throttleWaitSeconds = getRegistrationRefusalRetryAfterSeconds();
  } catch {
  }
  try {
    requestsMeasured = samples.summary().total;
  } catch {
    requestsMeasured = 0;
  }
  try {
    crashReporting = crashReportingVerdict();
    crashNote = crashDeliveryNote();
    crashesHeld = crashDeliveryFacts().held;
  } catch {
    crashReporting = "cannot-keep";
    crashNote = "Boosthis could not read its own crash-delivery record";
    crashesHeld = 0;
  }
  let serverLabel = "Unknown";
  let attachRefusalText = null;
  try {
    const attach = attachState();
    serverLabel = serverKindLabel(attach.serverKind);
    attachRefusalText = attach.called && !attach.attached && attach.reason ? cannotAttachShort(attach.reason) : null;
  } catch {
    serverLabel = "Unknown";
    attachRefusalText = null;
  }
  let whereItRuns = "Could not be read";
  let hostingIsPreview = false;
  try {
    const facts = hostingFacts();
    whereItRuns = hostingLine(facts);
    hostingIsPreview = facts.environment === "preview" || facts.environment === "development";
  } catch {
    whereItRuns = "Could not be read";
    hostingIsPreview = false;
  }
  let pausedUntil = null;
  let pauseScope = null;
  try {
    const pause = getUploadPause();
    pausedUntil = pause ? pause.until : null;
    pauseScope = pause ? pause.scope : null;
  } catch {
    pausedUntil = null;
    pauseScope = null;
  }
  const uploadsFailing = lastAttemptFailed && lastUploadFailAt !== null;
  const state = rejected ? "install-id-not-uuid" : throttled && verdict !== "registered" ? (
    // BEFORE "not-registered", which a throttled install would otherwise
    // reach on the strength of its refusal sentence alone. It is not a
    // failed registration; it is one that has not been allowed to happen
    // yet, and it needs no action.
    "registration-throttled"
  ) : refusalSentence !== null && verdict !== "registered" ? "not-registered" : verdict === "unregistered" ? "not-registered" : verdict === "unknown" ? "registration-unknown" : !sharing ? "sharing-off" : pausedUntil !== null ? (
    // BEFORE "uploads-failing": the uploads are waiting because
    // Boosthis asked, nothing is wrong with the pipe, and the wait
    // is the one fact a reader needs.
    "uploads-paused"
  ) : uploadsFailing ? "uploads-failing" : "measuring";
  return {
    state,
    installId,
    registrationVerdict: verdict,
    registered,
    sharing,
    fullTelemetry,
    lastUploadAt,
    lastUploadFailAt,
    lastUploadFailReason,
    uploadsDropped,
    rowsDropped,
    rowsDroppedText,
    rowsUndelivered,
    rowsUndeliveredText,
    crashReporting,
    crashDeliveryNote: crashNote,
    crashesHeld,
    requestsMeasured,
    kitVersion: RUNTIME_VERSION,
    runtime: RUNTIME_LABEL,
    serverLabel,
    hostingLine: whereItRuns,
    hostingIsPreview,
    attachRefusalText,
    tracePropagation: propagationSummary,
    dashboardUrl: dashboardUrlFor(endpoint),
    projectKeyDisplay,
    projectKeySource,
    projectDisplay: projectText,
    refusalSentence,
    throttleWaitSeconds,
    uploadPausedUntil: pausedUntil,
    uploadPauseScope: pauseScope
  };
}
function statusHeadline(state, refusalSentence, throttleWaitSeconds, pauseScope) {
  if (state === "install-id-not-uuid") {
    return {
      title: "Registration rejected",
      body: "Install ID must be a UUID. Mint a real UUID and restart.",
      tone: "bad"
    };
  }
  if (state === "not-registered") {
    return {
      title: "Not registered yet",
      body: refusalSentence ?? "This app has not registered with Boosthis, so nothing is being sent. Check the project key and this app's outbound network access, then restart.",
      tone: "bad"
    };
  }
  if (state === "registration-throttled") {
    return {
      title: "Waiting — too many new registrations",
      body: "Boosthis is rate-limiting new registrations for this project key, so this app is not on file yet. It is temporary and needs nothing from you: the kit is waiting " + describeRetryWait(throttleWaitSeconds ?? void 0) + " and will register itself, with no restart. Do not change the install line's id while this is showing — a new id is a new registration and makes the wait longer.",
      tone: "warn"
    };
  }
  if (state === "registration-unknown") {
    return {
      title: "Can't check right now",
      body: "Boosthis could not be reached to confirm whether this app is registered, so this page cannot say either way yet. This is not a failed install and it does not mean anything stopped — it settles by itself once the check goes through. Do not change the install line's id while this is showing.",
      tone: "warn"
    };
  }
  if (state === "sharing-off") {
    return {
      title: "Nothing is being uploaded",
      body: `This app is registered, but sharing is off: measurements stay inside this process and your Boosthis dashboard stays empty. Turn sharing on there, or start the kit with ${SHARE_OPTION}.`,
      tone: "warn"
    };
  }
  if (state === "uploads-paused") {
    return {
      title: UPLOAD_PAUSE_TITLE,
      body: uploadPauseBody(pauseScope ?? "measurements"),
      tone: "warn"
    };
  }
  if (state === "uploads-failing") {
    return {
      title: "Uploads are not getting through",
      body: "This app is registered and sharing is on, but the last batch of measurements did not reach Boosthis, so your dashboard is missing the most recent data. The rows below say what happened and how much has been lost.",
      tone: "bad"
    };
  }
  return {
    title: "Registered and measuring",
    body: "This app is registered with Boosthis and its measurements are being uploaded. Open the dashboard below to see them.",
    tone: "good"
  };
}
function uploadFailText(reason) {
  if (reason === "unauthorized") {
    return "Refused — credentials rejected";
  }
  if (reason === "rejected") {
    return "Refused — batch rejected";
  }
  if (reason === "server-error") {
    return "Boosthis failed to store it";
  }
  return "No answer — timed out or unreachable";
}
function esc(v) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}
function formatLastUpload(at, now) {
  if (at === null || !Number.isFinite(at)) return "Nothing uploaded yet";
  const d = new Date(at);
  const stamp = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())} UTC`;
  const secs = Math.max(0, Math.floor((now - at) / 1e3));
  const age = secs < 60 ? `${secs}s ago` : secs < 3600 ? `${Math.floor(secs / 60)}m ago` : `${Math.floor(secs / 3600)}h ago`;
  return `${stamp} (${age})`;
}
function row(label, value, color) {
  return `<div class="r"><span class="k">${esc(label)}</span><span class="v"${color ? ` style="color:${color}"` : ""}>${esc(value)}</span></div>`;
}
function renderStatusPage(facts, now = Date.now()) {
  const h = statusHeadline(
    facts.state,
    facts.refusalSentence,
    facts.throttleWaitSeconds,
    facts.uploadPauseScope
  );
  const toneColor = h.tone === "good" ? T.good : h.tone === "warn" ? T.warn : T.bad;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Boosthis status</title><style>:root{color-scheme:dark}body{margin:0;background:${T.bg};color:${T.fg};font:14px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:32px 20px}main{max-width:620px;margin:0 auto}.kick{color:${T.pri};font-size:11px;letter-spacing:.16em;font-weight:700}h1{font-size:22px;margin:10px 0 8px;font-weight:650}p.lead{color:${T.mut};margin:0 0 22px}.card{background:${T.card};border:1px solid ${T.br};border-radius:16px;padding:6px 16px}.r{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid ${T.br};margin-bottom:0}.r:last-child{border-bottom:none}.k{color:${T.mut}}.v{font-variant-numeric:tabular-nums;text-align:right;word-break:break-all}a.dash{display:inline-block;margin-top:20px;background:${T.pri};color:#0b0c10;font-weight:650;text-decoration:none;padding:11px 18px;border-radius:12px}footer{color:${T.mut};font-size:12px;margin-top:22px}</style></head><body><main><div class="kick">BOOSTHIS</div><h1 style="color:${toneColor}">${esc(h.title)}</h1><p class="lead">${esc(h.body)}</p><div class="card">` + // WHICH PROJECT first: a developer holding two projects in one codebase has
  // to be able to answer "which one am I looking at?" before anything else on
  // this page means much. Same name and short code the AI connection uses.
  row(PROJECT_LABEL, facts.projectDisplay ?? PROJECT_UNKNOWN_TEXT) + row("Install ID", facts.installId ?? "Not assigned yet") + // Three outcomes, never two: "No" is only printed when Boosthis SAID no.
  row(
    "Registered",
    facts.registrationVerdict === "registered" ? "Yes" : facts.registrationVerdict === "unregistered" ? "No" : "Can't tell right now",
    facts.registrationVerdict === "registered" ? T.good : facts.registrationVerdict === "unregistered" ? T.bad : T.warn
  ) + row("Sharing", facts.sharing ? "On" : "Off", facts.sharing ? T.good : T.warn) + row("Telemetry mode", facts.fullTelemetry ? "Full telemetry" : "Private (issues only)") + // WHAT THE KIT ADDS TO THIS APP'S OWN OUTGOING REQUESTS. The one thing on
  // this page that is not about data leaving for Boosthis: it is about the
  // app's own calls to its own next service, and it is here because a
  // developer must be able to READ what is being attached to their traffic
  // rather than discover it in a packet capture.
  row("Trace passed on to", facts.tracePropagation) + row(
    "Project key",
    facts.projectKeyDisplay ? `${facts.projectKeyDisplay} — ${facts.projectKeySource ?? "no project key configured"}` : facts.projectKeySource ?? "no project key configured"
  ) + row("Last upload", formatLastUpload(facts.lastUploadAt, now)) + // Only while Boosthis has asked this app to wait: when the wait ends.
  (facts.uploadPausedUntil != null && facts.uploadPausedUntil > now ? row(
    UPLOAD_PAUSE_ENDS_LABEL,
    uploadPauseEndsText(facts.uploadPausedUntil, now),
    T.warn
  ) : "") + // Only shown once something HAS failed — a clean install must not carry a
  // permanent "Last failure: never" row implying failures are expected.
  (facts.lastUploadFailAt !== null && facts.lastUploadFailReason !== null ? row(
    "Last upload failed",
    `${formatLastUpload(facts.lastUploadFailAt, now)} — ` + uploadFailText(facts.lastUploadFailReason),
    T.bad
  ) + row("Uploads lost", String(facts.uploadsDropped), T.bad) : "") + // Rows the server ACCEPTED the batch for and then refused. Shown only when
  // the server actually reported some: an older server says nothing, and a
  // healthy app must not carry a permanent "0 dropped" row implying loss is
  // normal.
  (facts.rowsDropped > 0 && facts.rowsDroppedText !== "" ? row("Measurements dropped", facts.rowsDroppedText, T.warn) : "") + // Rows this kit NEVER GOT OUT. The other half of the same hole, and until
  // now the invisible half: the counts existed only as fields inside the
  // `serverless` meter page, which a reader has to know to expand and which
  // a long-running server does not even publish. Its own row, never added to
  // the one above — "the server refused what we sent" and "we never sent it"
  // ask for different fixes. Red rather than amber: these rows are confirmed
  // gone, not delayed.
  (facts.rowsUndelivered > 0 && facts.rowsUndeliveredText !== "" ? row("Measurements never delivered", facts.rowsUndeliveredText, T.bad) : "") + // CRASH REPORTING, in the kit's own words, and only when there is
  // something wrong to say. A healthy install shows no row: what this
  // catches is the opposite case, where the dashboard's crash count reads
  // zero because nothing could be kept or nothing was accepted — a silence
  // that otherwise looks exactly like a well-behaved app.
  (facts.crashReporting !== "reporting" && facts.crashDeliveryNote !== "" ? row(
    "Crash reporting",
    `${facts.crashDeliveryNote}. Until this clears, a crash count of zero for this project is not proof it has not crashed.`,
    facts.crashReporting === "cannot-keep" ? T.bad : T.warn
  ) : "") + // WHERE SCHEDULED JOBS LIVE. Always shown, never conditional: a page that
  // simply omits jobs reads as a page reporting there are none, and an AI
  // agent read three healthy jobs as absent that way. Same answer as the
  // in-app page's jobs card; see
  // docs/decisions/kit-page-says-where-jobs-live.md.
  row(
    "Scheduled jobs",
    "Not listed here. This kit reports named job runs to Boosthis, so they appear on your dashboard — this page showing none is not evidence there are none."
  ) + row("Requests measured", String(facts.requestsMeasured)) + row("Kit version", facts.kitVersion) + row("Runtime", facts.runtime) + row("Server", facts.serverLabel ?? "Unknown") + // Where this project runs. Always shown, because every answer here is
  // worth reading — including "nothing here declares a platform", which is
  // what an ordinary server looks like and must not be mistaken for a
  // missing row. Amber when the platform says this is NOT production: these
  // numbers then describe a throwaway copy, and a reader has to know that
  // before the numbers above mean anything.
  row(
    "Where it runs",
    facts.hostingLine,
    facts.hostingIsPreview ? T.warn : void 0
  ) + // Shown only when the attach was asked for and refused. A healthy install
  // carries no "Attached: yes" row — a page full of green confirmations for
  // things that never go wrong is how the one that did goes unnoticed.
  (facts.attachRefusalText ? row("Watching this server", facts.attachRefusalText, T.bad) : "") + `</div><a class="dash" href="${esc(facts.dashboardUrl)}" target="_blank" rel="noopener">Open your Boosthis dashboard</a><footer>This page is served by the Boosthis kit inside your own app, on your own port. It is only reachable from the machine running this app, and it never shows your install token.</footer></main></body></html>`;
}
function statusPageHtml(now = Date.now()) {
  try {
    return renderStatusPage(collectStatusFacts(), now);
  } catch {
    return renderStatusPage(
      {
        state: "registration-unknown",
        installId: null,
        registrationVerdict: "unknown",
        registered: false,
        tracePropagation: tracePropagationSummary(),
        sharing: false,
        fullTelemetry: false,
        lastUploadAt: null,
        lastUploadFailAt: null,
        lastUploadFailReason: null,
        uploadsDropped: 0,
        rowsDropped: 0,
        rowsDroppedText: "",
        rowsUndelivered: 0,
        rowsUndeliveredText: "",
        // Every readout failed, so we cannot claim crash reporting works
        // either — and this is the one place where the healthy answer would be
        // a promise we cannot stand behind.
        crashReporting: "cannot-keep",
        crashDeliveryNote: "Boosthis could not read its own crash-delivery record",
        crashesHeld: 0,
        requestsMeasured: 0,
        kitVersion: RUNTIME_VERSION,
        runtime: RUNTIME_LABEL,
        // Every readout failed, so we cannot claim a framework and cannot
        // claim the attach refused either — say only what is knowable.
        serverLabel: "Unknown",
        // Same rule for where it runs: a failed readout is not evidence that
        // nothing declared a platform, so this must not say "no hosting
        // platform declared". And nothing may be called production here.
        hostingLine: "Could not be read",
        hostingIsPreview: false,
        attachRefusalText: null,
        dashboardUrl: DEFAULT_DASHBOARD_URL,
        projectDisplay: PROJECT_UNKNOWN_TEXT,
        projectKeyDisplay: null,
        projectKeySource: "no project key configured"
      },
      now
    );
  }
}
function renewOnlyHtml(notice) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Boosthis</title><style>:root{color-scheme:dark}body{margin:0;background:${T.bg};color:${T.fg};font:14px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:32px 20px}main{max-width:620px;margin:0 auto}h1{font-size:20px;margin:0 0 8px}p{color:${T.mut};margin:0}</style></head><body><main><h1>${esc(notice.title)}</h1><p>${esc(notice.body)}</p></main></body></html>`;
}
const STATUS_FORBIDDEN_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Boosthis status</title><style>body{margin:0;background:${T.bg};color:${T.fg};font:14px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:32px 20px}main{max-width:620px;margin:0 auto}h1{font-size:20px;margin:0 0 8px}p{color:${T.mut};margin:0}</style></head><body><main><h1>Boosthis status is local-only</h1><p>This page is served only to requests from the machine running this app. Open it from that machine.</p></main></body></html>`;
export {
  STATUS_FORBIDDEN_HTML,
  STATUS_PATH,
  STATUS_SUFFIX,
  collectStatusFacts,
  dashboardUrlFor,
  formatLastUpload,
  renderStatusPage,
  renewOnlyHtml,
  statusHeadline,
  statusPageHtml,
  uploadFailText
};
