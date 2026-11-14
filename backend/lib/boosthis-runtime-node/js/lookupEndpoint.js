// @ts-nocheck
/* eslint-disable */
// Built from src/lookupEndpoint.ts so plain node can run the kit. Do not edit.
function env() {
  return process.env;
}
function endpointBase() {
  const e = env();
  const raw = e.BOOSTHIS_ENDPOINT || e.BOOSTEN_ENDPOINT || "https://www.boosthis.com/api";
  return raw.replace(/\/+$/, "");
}
function inviteKey() {
  const e = env();
  return e.BOOSTHIS_PROJECT_KEY || e.BOOSTHIS_INVITE_KEY || e.BOOSTEN_INVITE_KEY || void 0;
}
export {
  endpointBase,
  inviteKey
};
