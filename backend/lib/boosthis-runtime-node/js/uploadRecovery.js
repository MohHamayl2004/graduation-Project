// @ts-nocheck
/* eslint-disable */
// Built from src/uploadRecovery.ts so plain node can run the kit. Do not edit.
let readiness = null;
function setUploadReadiness(check) {
  readiness = check;
}
function uploadsReady(ending = false) {
  if (ending) return true;
  try {
    return readiness ? readiness() : true;
  } catch {
    return false;
  }
}
export {
  setUploadReadiness,
  uploadsReady
};
