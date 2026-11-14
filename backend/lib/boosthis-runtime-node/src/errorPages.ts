/**
 * REQUESTS THE APP ANSWERED WITH AN ERROR PAGE.
 *
 * The crash reporter hears an error only when it escapes the whole process.
 * A web framework catches nearly every error raised while it answers a
 * request and sends a 500 page instead, so on a server those errors were seen
 * only as a failed request on a meter: no error name, no line of code, nothing
 * a developer or their AI could act on.
 *
 * This module reports them, as the crash reporter's own `errorPage` kind: the
 * same signature, redaction, app frame, route and bucketed count as a crash,
 * and never counted as one (crashReporter.ts keeps it out of the crash count,
 * the crash-free history and the held-crash count).
 *
 * WHAT COUNTS AS AN ERROR PAGE, and what never does:
 *   - an error was RAISED while answering the request — a 500 the app wrote
 *     on purpose, with nothing thrown, has no error to name and is never
 *     reported;
 *   - the answer was a 5xx. Where the hook can see the status the app really
 *     answered with, that decides. Where it cannot, an error that carries a
 *     status of its own below 500 (a "not found" or "refused" error from
 *     http-errors, Fastify, Nest, Koa or Hono) is not reported: those are
 *     answers, not failures.
 *
 * A GUEST IN THE APP'S ERROR PATH. Every hook here only watches: it hands the
 * same error on unchanged, never answers, never changes the status or the
 * body, and never throws into the framework. Nothing is added at the process
 * level. A hook that cannot read what it needs reports nothing.
 *
 * ONE FAILURE, ONE OCCURRENCE. The framework hook and a `reportErrorPage` call
 * in the app's own handler can both see the same failure; the crash reporter
 * counts an error object once per request.
 */

import {
  captureErrorPage,
  type CrashKind,
} from "./crashReporter";
import {
  failurePartOf,
  failurePartOfRequest,
  type FailurePart,
} from "./failurePart";
import { currentRequestScope } from "./repeatedWork";

/** The kind every report from this module is filed under. */
export const ERROR_PAGE_KIND: CrashKind = "errorPage";

/** What a caller may tell `reportErrorPage` about the request. Every field is
 *  optional; nothing here is sent except the route label the part-name rule
 *  accepts. */
export interface ErrorPageOptions {
  /** The status the app answered with. A status below 500 is never reported. */
  status?: number;
  /** The request's method, when the kit cannot read the request itself. */
  method?: string;
  /** The matched route TEMPLATE (`"/orders/:id"`), never the address asked
   *  for. Without one the report says the kit could not name the part. */
  route?: string;
  /** The request object the error failed in. Used only so one failure two
   *  hooks saw counts once; never read or sent. */
  request?: object;
}

/** A status number in the HTTP range, or null. */
function httpStatus(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 100 && v <= 599 ? v : null;
}

/**
 * The status an error carries for itself — `status` or `statusCode`, the
 * fields http-errors, Fastify, Nest's HttpException, Koa's `ctx.throw` and
 * Hono's HTTPException all set. Read as plain properties: no method of the
 * app's error object is ever called.
 */
export function errorOwnStatus(error: unknown): number | null {
  try {
    if (!error || (typeof error !== "object" && typeof error !== "function")) return null;
    const e = error as { status?: unknown; statusCode?: unknown };
    return httpStatus(e.status) ?? httpStatus(e.statusCode);
  } catch {
    return null;
  }
}

/**
 * Is this failure an error page? The answer's own status decides when it is
 * known; otherwise an error that names a status below 500 is an answer, not a
 * failure. Never true without an error.
 */
export function isErrorPage(error: unknown, status?: unknown): boolean {
  if (error === undefined || error === null) return false;
  const answered = httpStatus(status);
  if (answered !== null) return answered >= 500;
  const own = errorOwnStatus(error);
  return own === null || own >= 500;
}

/** The request object the kit's own scope is holding, when one is open. */
function scopedRequest(): object | null {
  try {
    const trace = currentRequestScope()?.trace;
    return trace && typeof trace === "object" ? (trace as object) : null;
  } catch {
    return null;
  }
}

function placeFrom(opts: ErrorPageOptions): FailurePart | undefined {
  if (typeof opts.route === "string") return failurePartOf(opts.method, opts.route);
  return undefined;
}

/**
 * Report a request your app answered with an error page.
 *
 * The one call to add to your own error handler when the framework's hook
 * below does not apply. Pass the error, and the status you answered with if
 * you know it. Returns whether the report was taken; never throws, and does
 * nothing until the kit is enabled.
 *
 * ```ts
 * app.setErrorHandler((err, req, reply) => {
 *   reportErrorPage(err, { status: 500, method: req.method, route: req.routeOptions.url });
 *   reply.code(500).send({ error: "Something went wrong" });
 * });
 * ```
 */
export function reportErrorPage(error: unknown, opts: ErrorPageOptions = {}): boolean {
  try {
    if (!isErrorPage(error, opts.status)) return false;
    return captureErrorPage(error, {
      place: placeFrom(opts),
      request: opts.request ?? scopedRequest(),
    });
  } catch {
    return false;
  }
}

/* ─── Express ─────────────────────────────────────────────────────── */

interface ResponseLike {
  statusCode?: unknown;
  once?: (event: string, fn: () => void) => unknown;
}

/** Report `error` once the response has been written, if it went out as a
 *  5xx. The place is read NOW, while the request is still in hand. */
function reportWhenAnswered(
  error: unknown,
  req: object,
  res: ResponseLike,
  place: FailurePart,
): void {
  if (error === undefined || error === null) return;
  if (typeof res?.once !== "function") return;
  res.once("finish", () => {
    try {
      if (!isErrorPage(error, res.statusCode)) return;
      captureErrorPage(error, { place, request: req });
    } catch {
      /* never into the app */
    }
  });
}

/**
 * Express: report the errors your routes raise that Express (or your own
 * error handler) answers with an error page.
 *
 * Mount it AFTER your routes and BEFORE your own error handlers:
 *
 * ```ts
 * app.use(boosthis());
 * // …routes…
 * app.use(errorPages());
 * app.use(yourErrorHandler); // unchanged
 * ```
 *
 * It hands the same error straight on with `next(err)` and decides nothing:
 * whatever answers the error still answers it. The report is made when the
 * response finishes, and only when it went out as a 5xx.
 */
export function errorPages(): (
  err: unknown,
  req: object,
  res: ResponseLike,
  next: (err?: unknown) => void,
) => void {
  // Express tells an error handler from a middleware by its four parameters.
  return function boosthisErrorPages(err, req, res, next) {
    try {
      reportWhenAnswered(err, req, res, failurePartOfRequest(req));
    } catch {
      /* the error still goes on */
    }
    next(err);
  };
}

/* ─── Fastify ─────────────────────────────────────────────────────── */

interface FastifyRequestLike {
  method?: unknown;
  raw?: unknown;
  routeOptions?: { url?: unknown } | null;
  routerPath?: unknown;
}
interface FastifyReplyLike {
  statusCode?: unknown;
}
interface FastifyLike {
  addHook: (name: string, fn: (...args: never[]) => unknown) => unknown;
}

function fastifyRoute(request: FastifyRequestLike): unknown {
  try {
    return request.routeOptions?.url ?? request.routerPath;
  } catch {
    return undefined;
  }
}

/**
 * Fastify: report the errors your routes raise that Fastify answers with an
 * error page, through Fastify's own `onError` hook. Call it on the instance
 * before you register your routes:
 *
 * ```ts
 * const app = Fastify();
 * fastifyErrorPages(app);
 * ```
 *
 * Fastify's error handler — yours or its default — still answers; the report
 * is made when the response is sent, and only when it went out as a 5xx.
 */
export function fastifyErrorPages(instance: FastifyLike): void {
  const failed = new WeakMap<object, unknown>();
  instance.addHook(
    "onError",
    (async (request: FastifyRequestLike, _reply: FastifyReplyLike, error: unknown) => {
      try {
        if (request && typeof request === "object") failed.set(request, error);
      } catch {
        /* never into the app */
      }
    }) as (...args: never[]) => unknown,
  );
  instance.addHook(
    "onResponse",
    (async (request: FastifyRequestLike, reply: FastifyReplyLike) => {
      try {
        if (!request || typeof request !== "object" || !failed.has(request)) return;
        const error = failed.get(request);
        failed.delete(request);
        if (!isErrorPage(error, reply?.statusCode)) return;
        const raw = request.raw;
        captureErrorPage(error, {
          place: failurePartOf(request.method, fastifyRoute(request)),
          request: raw && typeof raw === "object" ? (raw as object) : request,
        });
      } catch {
        /* never into the app */
      }
    }) as (...args: never[]) => unknown,
  );
}

/* ─── Hono (on the Node adapter) ──────────────────────────────────── */

interface HonoContextLike {
  error?: unknown;
  res?: { status?: unknown } | null;
  req?: { method?: unknown; routePath?: unknown; raw?: unknown } | null;
}

/**
 * Hono: report the errors your routes raise that Hono's error handler (yours
 * via `app.onError`, or its default) answers with an error page. Register it
 * first:
 *
 * ```ts
 * app.use(honoErrorPages());
 * ```
 *
 * It reads `c.error` after the rest of the chain has run and the response is
 * set, and changes nothing.
 */
export function honoErrorPages(): (
  c: HonoContextLike,
  next: () => Promise<void>,
) => Promise<void> {
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
          typeof route === "string" && route !== "*" && route !== "/*" ? route : undefined,
        ),
        request: raw && typeof raw === "object" ? (raw as object) : (c as object),
      });
    } catch {
      /* never into the app */
    }
  };
}

/* ─── Koa ─────────────────────────────────────────────────────────── */

interface KoaContextLike {
  method?: unknown;
  _matchedRoute?: unknown;
  req?: unknown;
  res?: ResponseLike;
}

/**
 * Koa: report the errors your middleware raises that Koa answers with an
 * error page. Register it FIRST, before your own error-handling middleware:
 *
 * ```ts
 * app.use(koaErrorPages());
 * ```
 *
 * It rethrows the same error at once, so Koa's own handling (and yours) runs
 * exactly as before; the report is made when the response finishes, and only
 * when it went out as a 5xx. It adds no `app.on("error")` listener, which
 * would switch off Koa's own error logging.
 */
export function koaErrorPages(): (
  ctx: KoaContextLike,
  next: () => Promise<unknown>,
) => Promise<void> {
  return async function boosthisKoaErrorPages(ctx, next) {
    try {
      await next();
    } catch (err) {
      try {
        const req = ctx?.req && typeof ctx.req === "object" ? (ctx.req as object) : (ctx as object);
        const res = ctx?.res;
        if (res) {
          reportWhenAnswered(err, req, res, failurePartOf(ctx.method, ctx._matchedRoute));
        }
      } catch {
        /* the error still goes on */
      }
      throw err;
    }
  };
}

/* ─── hapi ────────────────────────────────────────────────────────── */

interface HapiServerLike {
  events?: {
    // The criteria are typed as the one subscription made below, literally:
    // hapi's own `on` is overloaded per event name, and only its `request`
    // overload accepts a two-argument listener, so a looser `name: string`
    // shape would refuse the real server.
    on: (
      criteria: { name: "request"; channels: "error" },
      fn: (request: unknown, event: unknown) => void,
    ) => unknown;
  };
}

/**
 * hapi: report the errors your handlers raise that hapi answers with a 500,
 * through hapi's own `request` event on its `error` channel — the channel hapi
 * raises only for an error it turns into a 500.
 *
 * ```ts
 * hapiErrorPages(server);
 * ```
 */
export function hapiErrorPages(server: HapiServerLike): void {
  server.events?.on({ name: "request", channels: "error" }, (request, event) => {
    try {
      const error = (event as { error?: unknown } | null)?.error;
      if (!isErrorPage(error, 500)) return;
      const r = request as {
        method?: unknown;
        route?: { path?: unknown } | null;
        raw?: { req?: unknown } | null;
      } | null;
      const method = typeof r?.method === "string" ? r.method.toUpperCase() : undefined;
      const raw = r?.raw?.req;
      captureErrorPage(error, {
        place: failurePartOf(method, r?.route?.path),
        request: raw && typeof raw === "object" ? (raw as object) : ((r ?? {}) as object),
      });
    } catch {
      /* never into the app */
    }
  });
}

/* ─── Next.js ─────────────────────────────────────────────────────── */

/** Next's own control flow — `notFound()`, `redirect()`, a dynamic bail-out —
 *  travels as a thrown error carrying a digest. None of it is an error page. */
function isNextControlFlow(error: unknown): boolean {
  try {
    const digest = (error as { digest?: unknown } | null)?.digest;
    if (typeof digest !== "string") return false;
    return (
      digest.startsWith("NEXT_") ||
      digest === "DYNAMIC_SERVER_USAGE" ||
      digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING"
    );
  } catch {
    return false;
  }
}

/**
 * Next.js: Next calls `onRequestError` from your `instrumentation.ts` for
 * every error it catches while rendering a page or running a route handler,
 * server action or middleware. Re-export this one:
 *
 * ```ts
 * // instrumentation.ts
 * export { onRequestError } from "@workspace/boosthis-runtime-node";
 * ```
 *
 * Next's own `notFound()` and `redirect()` are never reported.
 */
export async function onRequestError(
  error: unknown,
  request: { method?: unknown } | null | undefined,
  context: { routePath?: unknown } | null | undefined,
): Promise<void> {
  try {
    if (isNextControlFlow(error)) return;
    const route = context?.routePath;
    reportErrorPage(error, {
      ...(typeof request?.method === "string" ? { method: request.method } : {}),
      ...(typeof route === "string" ? { route } : {}),
      ...(request && typeof request === "object" ? { request } : {}),
    });
  } catch {
    /* never into the app */
  }
}

export const _errorPageInternals = { isNextControlFlow, httpStatus };
