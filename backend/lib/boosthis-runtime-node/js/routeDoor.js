// @ts-nocheck
/* eslint-disable */
// Built from src/routeDoor.ts so plain node can run the kit. Do not edit.
const DOOR_WORD_REFUSED = "refused";
const DOOR_WORD_ANSWERED = "answered";
const DOOR_WORD_OTHER = "other";
const DOOR_WORDS = [DOOR_WORD_REFUSED, DOOR_WORD_ANSWERED, DOOR_WORD_OTHER];
const DOOR_WORD_SET = new Set(DOOR_WORDS);
function isDoorWord(v) {
  return typeof v === "string" && DOOR_WORD_SET.has(v);
}
function authorizationPresence(req) {
  const headers = req?.headers;
  if (headers == null || typeof headers !== "object") return null;
  const h = headers;
  const v = h.authorization ?? h.Authorization;
  if (Array.isArray(v)) return v.some((x) => typeof x === "string" && x.length > 0);
  return typeof v === "string" && v.length > 0;
}
function doorWordFor(method, authorizationPresent, completed, status) {
  if (authorizationPresent !== false) return null;
  if (typeof method === "string" && method.toUpperCase() === "OPTIONS") return null;
  if (!completed) return DOOR_WORD_OTHER;
  if (typeof status !== "number" || !Number.isInteger(status)) return DOOR_WORD_OTHER;
  if (status === 401 || status === 403) return DOOR_WORD_REFUSED;
  if (status >= 200 && status < 300 || status === 304) return DOOR_WORD_ANSWERED;
  return DOOR_WORD_OTHER;
}
export {
  DOOR_WORDS,
  DOOR_WORD_ANSWERED,
  DOOR_WORD_OTHER,
  DOOR_WORD_REFUSED,
  authorizationPresence,
  doorWordFor,
  isDoorWord
};
