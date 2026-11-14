// @ts-nocheck
/* eslint-disable */
// Built from src/retrySchedule.ts so plain node can run the kit. Do not edit.
const REGISTRATION_RETRY_SCHEDULE_MS = [15e3, 45e3, 12e4, 3e5];
const FIRST_VERDICT_SCHEDULE_MS = [1e3, 2e3, 4e3, 8e3];
const RENEWAL_RETRY_SCHEDULE_MS = [6e4, 12e4, 3e5];
const RENEWAL_ANSWERED_WAIT_MS = 36e5;
let scale = 1;
function _setRecoveryWaitScaleForTests(value) {
  scale = value;
}
function retryWait(schedule, step, floor = 0) {
  const base = schedule[Math.min(step, schedule.length - 1)] * scale;
  return Math.round(floor > 0 ? Math.max(base, floor) * (1 + Math.random() * 0.2) : base * (0.8 + Math.random() * 0.4));
}
function temporaryConsentStatus(status) {
  return status === 0 || status === 404 || status === 429 || status >= 500;
}
export {
  FIRST_VERDICT_SCHEDULE_MS,
  REGISTRATION_RETRY_SCHEDULE_MS,
  RENEWAL_ANSWERED_WAIT_MS,
  RENEWAL_RETRY_SCHEDULE_MS,
  _setRecoveryWaitScaleForTests,
  retryWait,
  temporaryConsentStatus
};
