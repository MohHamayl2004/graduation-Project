// @ts-nocheck
/* eslint-disable */
// Built from src/uploadPauseWords.ts so plain node can run the kit. Do not edit.
const UPLOAD_PAUSE_TITLE = "Paused — Boosthis asked this app to wait";
const UPLOAD_PAUSE_ENDS_LABEL = "Pause ends";
function heldText(scope) {
  switch (scope) {
    case "everything":
      return "nothing is sent to Boosthis until the wait is over";
    case "all-but-crashes":
      return "measurements, job runs and panel snapshots wait until it is over; crash reports still go, in the room Boosthis keeps for them";
    default:
      return "measurements wait until it is over; crash reports, job runs and panel snapshots still go, in the room Boosthis keeps for them";
  }
}
function uploadPauseBody(scope) {
  return `This is a pause Boosthis asked for, not a refusal: this app's uploads reached Boosthis's allowance for the moment, so ${heldText(scope)}. Nothing was rejected — what this app was about to send stays in this process, as much as the kit's queues hold, and goes out by itself when the pause ends. Anything over that is counted, never lost silently.`;
}
function uploadPauseEndsText(until, now = Date.now()) {
  const at = new Date(until);
  const clock = [at.getUTCHours(), at.getUTCMinutes(), at.getUTCSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  return `${clock} UTC (${inAbout(until - now)})`;
}
function inAbout(ms) {
  const seconds = Math.max(1, Math.ceil(ms / 1e3));
  if (seconds < 90) return `in about ${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.round(seconds / 60);
  return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}
export {
  UPLOAD_PAUSE_ENDS_LABEL,
  UPLOAD_PAUSE_TITLE,
  uploadPauseBody,
  uploadPauseEndsText
};
