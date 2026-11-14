// @ts-nocheck
/* eslint-disable */
// Built from src/appVersionFacts.ts so plain node can run the kit. Do not edit.
const DECLARED_APP_VERSION_SOURCE = "declared";
const MAX_APP_VERSION = 60;
const APP_VERSION_SHAPE_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/;
function isSendableAppVersion(value) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= MAX_APP_VERSION && APP_VERSION_SHAPE_RE.test(value.trim());
}
function declaredAppVersionBlock(declared) {
  if (!isSendableAppVersion(declared)) return {};
  return {
    app: { version: declared.trim(), source: DECLARED_APP_VERSION_SOURCE }
  };
}
export {
  DECLARED_APP_VERSION_SOURCE,
  MAX_APP_VERSION,
  declaredAppVersionBlock,
  isSendableAppVersion
};
