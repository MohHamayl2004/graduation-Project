// @ts-nocheck
/* eslint-disable */
// Built from src/callFailures.ts so plain node can run the kit. Do not edit.
const CALL_FAILURE_KINDS = [
  // boosthis:call-failure-kinds:begin
  "could-not-connect",
  "no-answer",
  "turned-away",
  "too-many-requests",
  "server-error",
  "timed-out",
  "cancelled"
  // boosthis:call-failure-kinds:end
];
const emptyFailures = () => ({
  couldNotConnect: 0,
  noAnswer: 0,
  turnedAway: 0,
  tooManyRequests: 0,
  serverError: 0,
  cancelled: 0
});
function callFailure(status, error) {
  try {
    if (typeof status === "number" && status > 0) {
      if (status >= 500 && status < 600) return "server-error";
      if (status === 429) return "too-many-requests";
      if (status >= 400 && status < 500) return "turned-away";
      return void 0;
    }
    if (error == null) return void 0;
    const e = error;
    const classify = (v) => {
      if (v.name === "TimeoutError" || ["ETIMEDOUT", "ESOCKETTIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"].includes(String(v.code))) return "timed-out";
      if (v.name === "AbortError" || v.code === "ABORT_ERR" || v.code === "UND_ERR_ABORTED") return "cancelled";
      if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "EHOSTUNREACH", "ENETUNREACH"].includes(String(v.code))) return "could-not-connect";
      return void 0;
    };
    return classify(e) ?? (e.cause ? classify(e.cause) : void 0) ?? "no-answer";
  } catch {
    return error == null ? void 0 : "no-answer";
  }
}
function countFailure(t, word, failed, timedOut) {
  if (word === "turned-away") {
    if (!failed && !timedOut) t.turnedAway++;
    return;
  }
  if (!failed || timedOut) return;
  if (word === "could-not-connect") t.couldNotConnect++;
  if (word === "no-answer") t.noAnswer++;
  if (word === "too-many-requests") t.tooManyRequests++;
  if (word === "server-error") t.serverError++;
  if (word === "cancelled") t.cancelled++;
}
function countService(services, name, failed, timedOut) {
  if (!name) return;
  let s = services.get(name);
  if (!s && services.size < 8) {
    s = { name, calls: 0, failed: 0, timedOut: 0 };
    services.set(name, s);
  }
  if (s) {
    s.calls++;
    if (failed) s.failed++;
    if (timedOut) s.timedOut++;
  }
}
function topServices(services) {
  const rows = [...services.values()].sort((a, b) => b.calls - a.calls || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)).slice(0, 4).map((s) => ({ ...s }));
  return rows.length ? { services: rows } : {};
}
const emptyDbFailures = () => ({
  dbFailed: 0,
  dbCouldNotConnect: 0,
  dbNoAnswer: 0,
  dbTurnedAway: 0,
  dbTooManyRequests: 0,
  dbServerError: 0,
  dbTimedOut: 0,
  dbCancelled: 0
});
function dbFailure(error) {
  if (error == null) return void 0;
  try {
    const network = callFailure(void 0, error);
    if (network !== "no-answer") return network;
    const code = error.code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) && /\d/.test(code)) {
      if (code === "53300") return "too-many-requests";
      if (code === "57014") return "cancelled";
      if (code === "08001" || code === "08004") return "could-not-connect";
      if (code.startsWith("08")) return "no-answer";
      if (["22", "23", "25", "28", "2B", "2D", "3D", "3F", "42", "44", "0A"].includes(code.slice(0, 2))) return "turned-away";
      return "server-error";
    }
    return callFailure(void 0, error);
  } catch {
    return void 0;
  }
}
function countDbFailure(t, word) {
  t.dbFailed++;
  if (word === "could-not-connect") t.dbCouldNotConnect++;
  if (word === "no-answer") t.dbNoAnswer++;
  if (word === "turned-away") t.dbTurnedAway++;
  if (word === "too-many-requests") t.dbTooManyRequests++;
  if (word === "server-error") t.dbServerError++;
  if (word === "timed-out") t.dbTimedOut++;
  if (word === "cancelled") t.dbCancelled++;
}
export {
  CALL_FAILURE_KINDS,
  callFailure,
  countDbFailure,
  countFailure,
  countService,
  dbFailure,
  emptyDbFailures,
  emptyFailures,
  topServices
};
