// @ts-nocheck
/* eslint-disable */
// Built from src/startAnnounce.ts so plain node can run the kit. Do not edit.
const AUTH_WORDS = ["bearer", "token", "basic", "apikey", "api-key", "key"];
const QUOTE_CHARS = ['"', "'", "`", "‘", "’", "“", "”"];
const KEY_CHARS = /^[A-Za-z0-9_-]+$/;
function findProjectKeyProblem(raw) {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  for (const word of AUTH_WORDS) {
    if (lower.startsWith(word) && /\s/.test(value.charAt(word.length))) {
      return "authWord";
    }
  }
  const first = value.charAt(0);
  const last = value.charAt(value.length - 1);
  if (QUOTE_CHARS.indexOf(first) >= 0 || QUOTE_CHARS.indexOf(last) >= 0 || first === "<" && last === ">") {
    return "quoted";
  }
  if (value.endsWith("...") || value.endsWith("…") || value.startsWith("...") || value.startsWith("…")) {
    return "cutOff";
  }
  if (!KEY_CHARS.test(value) || value.length < 8) return "wrongShape";
  return null;
}
function problemSentence(problem) {
  switch (problem) {
    case "authWord":
      return "it starts with an authorization word. Paste the key on its own, with nothing in front of it.";
    case "quoted":
      return "it is wrapped in quotes. Paste the key on its own, with no quotes around it.";
    case "cutOff":
      return "it looks cut off. Paste the whole key from your Boosthis Setup page.";
    case "wrongShape":
      return "it is not the shape of a project key. A project key is one unbroken value from your Boosthis Setup page.";
  }
}
function projectKeyRefusalLine(problem, source) {
  return `[boosthis] Boosthis will not use the project key from ${source}: ${problemSentence(problem)}`;
}
function projectKeyTail(key) {
  if (typeof key !== "string") return null;
  const value = key.trim();
  if (!value) return null;
  return value.length >= 4 ? value.slice(-4) : value;
}
const OWNER_ONLY_BADGE_SENTENCE = " Badge hidden from visitors; it shows only in a browser switched on with the owner link from your project's page on Boosthis, or with ?boosthis=on from this machine itself.";
function kitStartupLine(tail, badge = "visible") {
  const head = tail ? `[boosthis] Boosthis starting: project key ...${tail}. Registering next.` : "[boosthis] Boosthis starting: no project key. Nothing will register.";
  if (badge === "owner-only") return `${head}${OWNER_ONLY_BADGE_SENTENCE}`;
  if (badge === "hidden-by-setting") {
    return `${head} Badge hidden by a setting; Boosthis is still running.`;
  }
  if (badge === "switched-off") {
    return `${head} Badge hidden: Boosthis is switched off.`;
  }
  return head;
}
let announced = false;
let pendingBadge = null;
let startCallKey;
let pendingTimer = null;
let pendingImmediate = null;
let announcementPending = false;
const refused = /* @__PURE__ */ new Set();
const heldRefusals = [];
function say(line) {
  try {
    console.info(line);
  } catch {
  }
}
function sayRefusal(line) {
  try {
    console.warn(line);
  } catch {
  }
}
function beginStartAnnouncement() {
  if (announced) return;
  announcementPending = true;
}
function sayAfterStartupLine(line) {
  if (announcementPending && !announced) {
    heldRefusals.push({ line, note: false });
    return;
  }
  sayRefusal(line);
}
function sayNoteAfterStartupLine(line) {
  if (announcementPending && !announced) {
    heldRefusals.push({ line, note: true });
    return;
  }
  say(line);
}
function flushHeldRefusals() {
  announcementPending = false;
  if (heldRefusals.length === 0) return;
  const lines = heldRefusals.splice(0, heldRefusals.length);
  for (const held of lines) {
    if (held.note) say(held.line);
    else sayRefusal(held.line);
  }
}
function flushPending() {
  pendingTimer = null;
  pendingImmediate = null;
  if (announced || pendingBadge === null) return;
  const badge = pendingBadge;
  pendingBadge = null;
  announced = true;
  say(kitStartupLine(null, badge));
  flushHeldRefusals();
}
function waitOneMoreTurn() {
  pendingTimer = null;
  if (announced || pendingBadge === null) return;
  if (typeof setImmediate !== "function") {
    flushPending();
    return;
  }
  try {
    pendingImmediate = setImmediate(flushPending);
  } catch {
    flushPending();
  }
}
function cancelPendingWait() {
  if (pendingTimer !== null) {
    try {
      clearTimeout(pendingTimer);
    } catch {
    }
    pendingTimer = null;
  }
  if (pendingImmediate !== null) {
    try {
      clearImmediate(pendingImmediate);
    } catch {
    }
    pendingImmediate = null;
  }
}
function announceKitStart(key, badge) {
  if (announced || pendingBadge !== null) return;
  const tail = projectKeyTail(startCallKey !== void 0 ? startCallKey : key);
  if (tail) {
    announced = true;
    say(kitStartupLine(tail, badge));
    flushHeldRefusals();
    return;
  }
  pendingBadge = badge;
  try {
    pendingTimer = setTimeout(waitOneMoreTurn, 0);
  } catch {
    flushPending();
  }
}
function announceProjectKey(key) {
  startCallKey = typeof key === "string" ? key : null;
  if (announced || pendingBadge === null) return;
  const tail = projectKeyTail(key);
  if (!tail) return;
  const badge = pendingBadge;
  pendingBadge = null;
  cancelPendingWait();
  announced = true;
  say(kitStartupLine(tail, badge));
  flushHeldRefusals();
}
function warnProjectKeyRefused(raw, source) {
  const problem = findProjectKeyProblem(raw);
  if (!problem) return false;
  if (!refused.has(source)) {
    refused.add(source);
    const line = projectKeyRefusalLine(problem, source);
    if (announcementPending && !announced) heldRefusals.push({ line, note: false });
    else sayRefusal(line);
  }
  return true;
}
function _resetStartAnnounceForTests() {
  announced = false;
  startCallKey = void 0;
  pendingBadge = null;
  cancelPendingWait();
  announcementPending = false;
  heldRefusals.length = 0;
  refused.clear();
}
export {
  OWNER_ONLY_BADGE_SENTENCE,
  _resetStartAnnounceForTests,
  announceKitStart,
  announceProjectKey,
  beginStartAnnouncement,
  findProjectKeyProblem,
  flushHeldRefusals,
  kitStartupLine,
  projectKeyRefusalLine,
  projectKeyTail,
  sayAfterStartupLine,
  sayNoteAfterStartupLine,
  warnProjectKeyRefused
};
