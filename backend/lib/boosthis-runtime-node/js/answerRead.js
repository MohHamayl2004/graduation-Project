// @ts-nocheck
/* eslint-disable */
// Built from src/answerRead.ts so plain node can run the kit. Do not edit.
const ANSWER_MAX_BYTES = 1048576;
const ANSWER_READ_MS = 1e4;
class AnswerRefused extends Error {
  refusal;
  constructor(refusal) {
    super(`boosthis: answer refused (${refusal})`);
    this.name = "AnswerRefused";
    this.refusal = refusal;
  }
}
function answerRefusal(err) {
  return err instanceof AnswerRefused ? err.refusal : null;
}
function utf8Length(s, stopAt) {
  let n = 0;
  for (let i = 0; i < s.length && n <= stopAt; i++) {
    const c = s.charCodeAt(i);
    if (c < 128) n += 1;
    else if (c < 2048) n += 2;
    else if (c >= 55296 && c <= 56319) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}
function declaredLength(r) {
  try {
    const raw = r.headers && typeof r.headers.get === "function" ? r.headers.get("content-length") : null;
    if (raw === null || raw === void 0) return null;
    const n = Number(String(raw).trim());
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}
function discard(r) {
  try {
    const body = r.body;
    if (body && typeof body.cancel === "function") {
      body.cancel().catch(() => {
      });
    } else if (body && typeof body.destroy === "function") {
      body.destroy();
    }
  } catch {
  }
}
function startClock(timeoutMs) {
  let timer;
  const done = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new AnswerRefused("too-slow")), timeoutMs);
    timer.unref?.();
  });
  done.catch(() => {
  });
  return { done, stop: () => clearTimeout(timer) };
}
function step(p, clock) {
  p.catch(() => {
  });
  return Promise.race([p, clock]);
}
function answerWithin(p, timeoutMs) {
  const clock = startClock(timeoutMs);
  return step(p, clock.done).finally(clock.stop);
}
function chunkBytes(value, maxBytes) {
  if (typeof value === "string") return utf8Length(value, maxBytes);
  const v = value;
  return v && typeof v.byteLength === "number" ? v.byteLength : 0;
}
async function readChunks(next, stop, maxBytes, timeoutMs) {
  const clock = startClock(timeoutMs);
  const decoder = new TextDecoder("utf-8");
  const parts = [];
  let total = 0;
  try {
    for (; ; ) {
      const { done, value } = await step(next(), clock.done);
      if (done) break;
      const n = chunkBytes(value, maxBytes);
      if (total + n > maxBytes) throw new AnswerRefused("too-large");
      total += n;
      parts.push(
        typeof value === "string" ? value : decoder.decode(value, { stream: true })
      );
    }
    parts.push(decoder.decode());
    return parts.join("");
  } catch (err) {
    stop();
    throw err;
  } finally {
    clock.stop();
  }
}
async function readWhole(r, maxBytes, timeoutMs) {
  if (typeof r.text !== "function") throw new AnswerRefused("malformed");
  const clock = startClock(timeoutMs);
  try {
    const text = await step(Promise.resolve().then(() => r.text()), clock.done);
    if (typeof text !== "string") throw new AnswerRefused("malformed");
    if (utf8Length(text, maxBytes) > maxBytes) throw new AnswerRefused("too-large");
    return text;
  } finally {
    clock.stop();
  }
}
async function readAnswerText(res, opts = {}) {
  const maxBytes = opts.maxBytes ?? ANSWER_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? ANSWER_READ_MS;
  const r = res;
  if (!r || typeof r !== "object") throw new AnswerRefused("malformed");
  const declared = declaredLength(r);
  if (declared !== null && declared > maxBytes) {
    discard(r);
    throw new AnswerRefused("too-large");
  }
  const body = r.body;
  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    return readChunks(
      () => reader.read(),
      () => {
        reader.cancel().catch(() => {
        });
      },
      maxBytes,
      timeoutMs
    );
  }
  if (body && typeof body[Symbol.asyncIterator] === "function") {
    const it = body[Symbol.asyncIterator]();
    return readChunks(
      () => it.next(),
      () => {
        try {
          const ended = it.return?.();
          if (ended && typeof ended.catch === "function") {
            ended.catch(() => {
            });
          }
        } catch {
        }
        discard(r);
      },
      maxBytes,
      timeoutMs
    );
  }
  return readWhole(r, maxBytes, timeoutMs);
}
async function readAnswerJson(res, opts = {}) {
  const r = res;
  if (r && typeof r === "object" && !r.body && typeof r.text !== "function" && typeof r.json === "function") {
    const maxBytes = opts.maxBytes ?? ANSWER_MAX_BYTES;
    const clock = startClock(opts.timeoutMs ?? ANSWER_READ_MS);
    try {
      let value;
      try {
        value = await step(Promise.resolve().then(() => r.json()), clock.done);
      } catch (err) {
        if (err instanceof AnswerRefused) throw err;
        throw new AnswerRefused("malformed");
      }
      let size = 0;
      try {
        const s = JSON.stringify(value);
        size = typeof s === "string" ? utf8Length(s, maxBytes) : 0;
      } catch {
        throw new AnswerRefused("malformed");
      }
      if (size > maxBytes) throw new AnswerRefused("too-large");
      return value;
    } finally {
      clock.stop();
    }
  }
  const text = await readAnswerText(res, opts);
  try {
    return JSON.parse(text);
  } catch {
    throw new AnswerRefused("malformed");
  }
}
export {
  ANSWER_MAX_BYTES,
  ANSWER_READ_MS,
  AnswerRefused,
  answerRefusal,
  answerWithin,
  readAnswerJson,
  readAnswerText
};
