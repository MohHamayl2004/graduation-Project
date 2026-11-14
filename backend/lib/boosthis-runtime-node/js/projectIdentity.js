// @ts-nocheck
/* eslint-disable */
// Built from src/projectIdentity.ts so plain node can run the kit. Do not edit.
const MAX_NAME_CHARS = 60;
const MAX_CODE_CHARS = 16;
const PROJECT_UNNAMED_TEXT = "Unnamed project";
const PROJECT_UNKNOWN_TEXT = "Not received from Boosthis yet";
const PROJECT_LABEL = "Project";
const INSTALL_ID_LABEL = "Install ID";
const INSTALL_ID_UNKNOWN_TEXT = "not assigned yet";
const SCORE_CAPTION = "Measured on this device. Not proof anything reached Boosthis.";
function sanitizeProjectName(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME_CHARS).trim();
  return cleaned.length > 0 ? cleaned : null;
}
function sanitizeProjectCode(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_CODE_CHARS);
  return cleaned.length > 0 ? cleaned : null;
}
function projectDisplay(p) {
  const code = p?.code ?? null;
  if (!code) return PROJECT_UNKNOWN_TEXT;
  return `${p?.name ?? PROJECT_UNNAMED_TEXT} (${code})`;
}
let current = { name: null, code: null };
function setKitProject(name, code) {
  const nextCode = sanitizeProjectCode(code);
  const nextName = sanitizeProjectName(name);
  if (nextCode) current = { name: nextName, code: nextCode };
  else if (nextName) current = { name: nextName, code: current.code };
}
function getKitProject() {
  return { name: current.name, code: current.code };
}
function clearKitProject() {
  current = { name: null, code: null };
  currentPromises = [];
  currentPromiseTotal = 0;
}
function _resetKitProject() {
  clearKitProject();
}
const MAX_PROMISE_CHARS = 240;
const MAX_PROMISES = 6;
let currentPromises = [];
let currentPromiseTotal = 0;
function sanitizePromiseText(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length === 0 || cleaned.length > MAX_PROMISE_CHARS) return null;
  return cleaned;
}
function setKitPromises(raw) {
  const obj = raw;
  const items = Array.isArray(obj?.items) ? obj.items : null;
  if (!items) {
    currentPromises = [];
    currentPromiseTotal = 0;
    return;
  }
  const next = [];
  for (const item of items.slice(0, MAX_PROMISES)) {
    const entry = item;
    const text = sanitizePromiseText(entry?.text);
    const standing = entry?.standing;
    if (!text) continue;
    if (standing !== "watched" && standing !== "remembered-only") continue;
    next.push({ text, standing });
  }
  currentPromises = next;
  const total = typeof obj?.total === "number" ? Math.floor(obj.total) : 0;
  currentPromiseTotal = Math.max(next.length, total > 0 ? total : 0);
}
function getKitPromises() {
  return {
    total: currentPromiseTotal,
    items: currentPromises.map((p) => ({ text: p.text, standing: p.standing }))
  };
}
function serializeKitPromises() {
  return JSON.stringify(getKitPromises());
}
function parseKitPromises(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function serializeKitProject(p) {
  return JSON.stringify({ name: p.name, code: p.code });
}
function parseKitProject(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const obj = JSON.parse(raw);
    const code = sanitizeProjectCode(obj?.code);
    const name = sanitizeProjectName(obj?.name);
    if (!code && !name) return null;
    return { name, code };
  } catch {
    return null;
  }
}
export {
  INSTALL_ID_LABEL,
  INSTALL_ID_UNKNOWN_TEXT,
  PROJECT_LABEL,
  PROJECT_UNKNOWN_TEXT,
  PROJECT_UNNAMED_TEXT,
  SCORE_CAPTION,
  _resetKitProject,
  clearKitProject,
  getKitProject,
  getKitPromises,
  parseKitProject,
  parseKitPromises,
  projectDisplay,
  sanitizeProjectCode,
  sanitizeProjectName,
  sanitizePromiseText,
  serializeKitProject,
  serializeKitPromises,
  setKitProject,
  setKitPromises
};
