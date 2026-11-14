// @ts-nocheck
/* eslint-disable */
// Built from src/mount.ts so plain node can run the kit. Do not edit.
import { isDirectLoopback } from "./loopback.js";
import { ownerFromPass } from "./ownerLink.js";
import { registerApp } from "./routeInventory.js";
import { STATUS_SUFFIX } from "./statusPage.js";
import {
  KIT_BASE_PATH,
  KIT_ERROR_HTML,
  PANEL_PAGE_HTML,
  answerKitRead,
  noteKitPathsRegistered
} from "./kitAnswers.js";
function safeRoute(kind, handler) {
  return function boosthisSafeRoute(req, res, next) {
    try {
      handler(req, res, next);
    } catch {
      try {
        if (res.headersSent === true) return;
        res.status(500);
        if (kind === "json") {
          res.json({ error: "boosthis could not answer this read." });
          return;
        }
        if (res.setHeader) {
          res.setHeader("content-type", "text/html; charset=utf-8");
          res.setHeader("cache-control", "no-store");
        }
        if (res.send) res.send(KIT_ERROR_HTML);
        else if (res.end) res.end(KIT_ERROR_HTML);
      } catch {
      }
    }
  };
}
function mount(app, opts = {}) {
  const base = (opts.basePath ?? KIT_BASE_PATH).replace(/\/$/, "");
  registerApp(app);
  noteKitPathsRegistered(base);
  const sendHtml = (res, html) => {
    if (res.setHeader) res.setHeader("content-type", "text/html; charset=utf-8");
    if (res.send) res.send(html);
    else if (res.end) res.end(html);
  };
  const write = (res, answer) => {
    if (res.headersSent === true) return;
    if (res.setHeader) res.setHeader("cache-control", "no-store");
    if (answer.status !== 200) res.status(answer.status);
    if (answer.kind === "html") {
      sendHtml(res, answer.html ?? KIT_ERROR_HTML);
      return;
    }
    res.json(answer.json);
  };
  const serve = (suffix, kind, path = `${base}${suffix}`) => {
    app.get(path, safeRoute(kind, (req, res, next) => {
      const respond = (owner2) => {
        const answer = answerKitRead(suffix, {
          loopback: isDirectLoopback(req),
          owner: owner2,
          allowRemote: opts.allowRemote ?? false,
          telemetry: opts.telemetry,
          query: req.query
        });
        if (!answer) {
          next?.();
          return;
        }
        write(res, answer);
      };
      const owner = ownerFromPass(req, res);
      if (typeof owner === "boolean") {
        respond(owner);
        return;
      }
      owner.then(respond, () => respond(false)).catch(() => {
        if (res.headersSent !== true) next?.();
      });
    }));
  };
  const servePage = safeRoute(
    "html",
    (_req, res) => sendHtml(res, PANEL_PAGE_HTML)
  );
  app.get(base, servePage);
  app.get(`${base}/`, servePage);
  serve("/dev", "html");
  serve("/healthz", "json");
  serve("/summary", "json");
  serve("/recent", "json");
  serve("/budgets", "json");
  serve("/pulse", "json");
  serve("/panel", "json");
  serve("/connect", "json");
  serve("/account", "json");
  serve(STATUS_SUFFIX, "html");
}
export {
  mount
};
