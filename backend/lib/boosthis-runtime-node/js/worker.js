// @ts-nocheck
/* eslint-disable */
// Built from src/worker.ts so plain node can run the kit. Do not edit.
import {
  enableTelemetry
} from "./telemetry.js";
import { setDeclaredServerKind } from "./serverKind.js";
import { armJobSystems } from "./jobAdapters.js";
import { isBoosthisDisabled } from "./runtimeFlags.js";
import { collectStatusFacts } from "./statusPage.js";
import { serverKindLabel } from "./serverKind.js";
import {
  announceKitStart,
  beginStartAnnouncement,
  flushHeldRefusals
} from "./startAnnounce.js";
import { resolveProjectKey } from "./projectKey.js";
import { uploadPauseEndsText } from "./uploadPauseWords.js";
const DEFAULT_ANNOUNCE_MS = 5e3;
function workerStatusText(facts) {
  let f;
  try {
    f = facts ?? collectStatusFacts();
  } catch {
    return "[boosthis] Worker status: cannot tell. The kit could not read its own state, so nothing here should be taken as either working or broken.";
  }
  const lines = [];
  const say = (k, v) => {
    lines.push(`[boosthis]   ${k}: ${v}`);
  };
  const verdict = f.registrationVerdict === "registered" ? "registered" : f.registrationVerdict === "unregistered" ? "NOT registered" : "cannot tell right now";
  lines.push(`[boosthis] Worker status: ${verdict}.`);
  say("Project", f.projectDisplay ?? "not received yet");
  say("Install ID", f.installId ?? "not assigned yet");
  say(
    "Project key",
    f.projectKeyDisplay ? `${f.projectKeyDisplay} — ${f.projectKeySource ?? "source unknown"}` : f.projectKeySource ?? "no project key configured"
  );
  say("Sharing", f.sharing ? "on" : "off");
  say("Mode", f.fullTelemetry ? "full telemetry" : "private (issues only)");
  say(
    "Last upload",
    f.lastUploadAt === null ? "none yet" : new Date(f.lastUploadAt).toISOString()
  );
  const now = Date.now();
  if (f.uploadPausedUntil != null && f.uploadPausedUntil > now) {
    say(
      "Uploads paused",
      `until ${uploadPauseEndsText(f.uploadPausedUntil, now)} — Boosthis asked this app to wait; nothing was rejected, and what is waiting goes out by itself`
    );
  }
  if (f.lastUploadFailAt !== null && f.lastUploadFailReason !== null) {
    say(
      "Last upload FAILED",
      `${new Date(f.lastUploadFailAt).toISOString()} — ${f.lastUploadFailReason} (${f.uploadsDropped} lost so far)`
    );
  }
  if (f.rowsDropped > 0 && f.rowsDroppedText !== "") {
    say("Measurements dropped", f.rowsDroppedText);
  }
  say("Kit version", f.kitVersion);
  say("Runtime", `${f.runtime} · ${f.serverLabel ?? serverKindLabel("worker")}`);
  say(
    "Where it runs",
    f.hostingIsPreview ? `${f.hostingLine} — NOT production` : f.hostingLine
  );
  say("Dashboard", f.dashboardUrl);
  if (f.refusalSentence) say("Refused", f.refusalSentence);
  return lines.join("\n");
}
function boosthisWorker(opts) {
  try {
    beginStartAnnouncement();
    announceKitStart(
      resolveProjectKey(opts.inviteKey).key,
      // A worker has no page to draw a badge on. Reporting it as visible would
      // send a developer looking for something that can never appear.
      "hidden-by-setting"
    );
  } catch {
    try {
      flushHeldRefusals();
    } catch {
    }
  }
  try {
    setDeclaredServerKind("worker");
  } catch {
  }
  const client = enableTelemetry(opts);
  try {
    armJobSystems();
  } catch {
  }
  try {
    void client.consent().catch(() => {
    });
  } catch {
  }
  const announce = opts.announceStatus ?? true;
  if (announce && !isBoosthisDisabled()) {
    try {
      const delay = Math.max(0, opts.announceAfterMs ?? DEFAULT_ANNOUNCE_MS);
      const timer = setTimeout(() => {
        try {
          console.info(workerStatusText());
        } catch {
        }
      }, delay);
      const t = timer;
      if (typeof t.unref === "function") t.unref();
    } catch {
    }
  }
  return client;
}
export {
  boosthisWorker,
  workerStatusText
};
