// @ts-nocheck
/* eslint-disable */
// Built from src/errorPages.ts so plain node can run the kit. Do not edit.
import {
  captureErrorPage
} from "./crashReporter.js";
import {
  failurePartOf,
  failurePartOfRequest
} from "./failurePart.js";
import { currentRequestScope } from "./repeatedWork.js";
const ERROR_PAGE_KIND = "errorPage";
function httpStatus(v) {
  return typeof v === "number" && Number.isInteger(v) && v >= 100 && v <= 599 ? v : null;
}
function errorOwnStatus(error) {
  try {
    if (!error || typeof error !== "object" && typeof error !== "function") return null;
    const e = error;
    return httpStatus(e.status) ?? httpStatus(e.statusCode);
  } catch {
    return null;
  }
}
function isErrorPage(error, status) {
  if (error === void 0 || error === null) return false;
  const answered = httpStatus(status);
  if (answered !== null) return answered >= 500;
  const own = errorOwnStatus(error);
  return own === null || own >= 500;
}
function scopedRequest() {
  try {
    const trace = currentRequestScope()?.trace;
    return trace && typeof trace === "object" ? trace : null;
  } catch {
    return null;
  }
}
function placeFrom(opts) {
  if (typeof opts.route === "string") return failurePartOf(opts.method, opts.route);
  return void 0;
}
function reportErrorPage(error, opts = {}) {
  try {
    if (!isErrorPage(error, opts.status)) return false;
    return captureErrorPage(error, {
      place: placeFrom(opts),
      request: opts.request ?? scopedRequest()
    });
  } catch {
    return false;
  }
}
function reportWhenAnswered(error, req, res, place) {
  if (error === void 0 || error === null) return;
  if (typeof res?.once !== "function") return;
  res.once("finish", () => {
    try {
      if (!isErrorPage(error, res.statusCode)) return;
      captureErrorPage(error, { place, request: req });
    } catch {
    }
  });
}
function errorPages() {
  return function boosthisErrorPages(err, req, res, next) {
    try {
      reportWhenAnswered(err, req, res, failurePartOfRequest(req));
    } catch {
    }
    next(err);
  };
}
function fastifyRoute(request) {
  try {
    return request.routeOptions?.url ?? request.routerPath;
  } catch {
    return void 0;
  }
}
function fastifyErrorPages(instance) {
  const failed = /* @__PURE__ */ new WeakMap();
  instance.addHook(
    "onError",
    (async (request, _reply, error) => {
      try {
        if (request && typeof request === "object") failed.set(request, error);
      } catch {
      }
    })
  );
  instance.addHook(
    "onResponse",
    (async (request, reply) => {
      try {
        if (!request || typeof request !== "object" || !failed.has(request)) return;
        const error = failed.get(request);
        failed.delete(request);
        if (!isErrorPage(error, reply?.statusCode)) return;
        const raw = request.raw;
        captureErrorPage(error, {
          place: failurePartOf(request.method, fastifyRoute(request)),
          request: raw && typeof raw === "object" ? raw : request
        });
      } catch {
      }
    })
  );
}
function honoErrorPages() {
  return async function boosthisHonoErrorPages(c, next) {
    await next();
    try {
      const error = c?.error;
      if (!isErrorPage(error, c?.res?.status)) return;
      const route = c.req?.routePath;
      const raw = c.req?.raw;
      captureErrorPage(error, {
        // After the chain has run, Hono's route path is the matched route's
        // template; the catch-all a middleware is registered under is not one.
        place: failurePartOf(
          c.req?.method,
          typeof route === "string" && route !== "*" && route !== "/*" ? route : void 0
        ),
        request: raw && typeof raw === "object" ? raw : c
      });
    } catch {
    }
  };
}
function koaErrorPages() {
  return async function boosthisKoaErrorPages(ctx, next) {
    try {
      await next();
    } catch (err) {
      try {
        const req = ctx?.req && typeof ctx.req === "object" ? ctx.req : ctx;
        const res = ctx?.res;
        if (res) {
          reportWhenAnswered(err, req, res, failurePartOf(ctx.method, ctx._matchedRoute));
        }
      } catch {
      }
      throw err;
    }
  };
}
function hapiErrorPages(server) {
  server.events?.on({ name: "request", channels: "error" }, (request, event) => {
    try {
      const error = event?.error;
      if (!isErrorPage(error, 500)) return;
      const r = request;
      const method = typeof r?.method === "string" ? r.method.toUpperCase() : void 0;
      const raw = r?.raw?.req;
      captureErrorPage(error, {
        place: failurePartOf(method, r?.route?.path),
        request: raw && typeof raw === "object" ? raw : r ?? {}
      });
    } catch {
    }
  });
}
function isNextControlFlow(error) {
  try {
    const digest = error?.digest;
    if (typeof digest !== "string") return false;
    return digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE" || digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING";
  } catch {
    return false;
  }
}
async function onRequestError(error, request, context) {
  try {
    if (isNextControlFlow(error)) return;
    const route = context?.routePath;
    reportErrorPage(error, {
      ...typeof request?.method === "string" ? { method: request.method } : {},
      ...typeof route === "string" ? { route } : {},
      ...request && typeof request === "object" ? { request } : {}
    });
  } catch {
  }
}
const _errorPageInternals = { isNextControlFlow, httpStatus };
export {
  ERROR_PAGE_KIND,
  _errorPageInternals,
  errorOwnStatus,
  errorPages,
  fastifyErrorPages,
  hapiErrorPages,
  honoErrorPages,
  isErrorPage,
  koaErrorPages,
  onRequestError,
  reportErrorPage
};
