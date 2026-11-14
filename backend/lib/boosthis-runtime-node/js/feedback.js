// @ts-nocheck
/* eslint-disable */
// Built from src/feedback.ts so plain node can run the kit. Do not edit.
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { assertNoPII, PIIDetectedError } from "./no-pii.js";
const FEEDBACK_DIR = path.join(os.homedir(), ".boosthis", "feedback");
const FEEDBACK_PATH = path.join(FEEDBACK_DIR, "feedback.jsonl");
const FEEDBACK_MAX_LINES = 5e3;
const FEEDBACK_TRIM_TO = 4e3;
const VALID_KINDS = /* @__PURE__ */ new Set([
  "fix_outcome",
  "unmatched_pattern",
  "rule_improvement"
]);
class FeedbackRejectedError extends Error {
  constructor(message) {
    super(message);
    this.name = "FeedbackRejectedError";
  }
}
let _dir = FEEDBACK_DIR;
let _path = FEEDBACK_PATH;
function _setStorageDirForTests(dir) {
  _dir = dir;
  _path = path.join(dir, "feedback.jsonl");
}
function _resetStorageDirForTests() {
  _dir = FEEDBACK_DIR;
  _path = FEEDBACK_PATH;
}
function ensureDir() {
  try {
    fs.mkdirSync(_dir, { recursive: true });
  } catch (e) {
    throw new FeedbackRejectedError(`cannot create ${_dir}: ${e.message}`);
  }
}
function rotateIfNeeded() {
  try {
    if (!fs.existsSync(_path)) return;
    const data = fs.readFileSync(_path, "utf8");
    const lines = data.split("\n");
    const real = lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines;
    if (real.length <= FEEDBACK_MAX_LINES) return;
    const keep = real.slice(real.length - FEEDBACK_TRIM_TO);
    const tmp = _path + ".tmp";
    fs.writeFileSync(tmp, keep.join("\n") + "\n", "utf8");
    fs.renameSync(tmp, _path);
  } catch {
  }
}
function record(kind, payload, appId = null) {
  if (!VALID_KINDS.has(kind)) {
    throw new FeedbackRejectedError(`unknown kind: ${String(kind)}`);
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new FeedbackRejectedError("payload must be an object");
  }
  try {
    assertNoPII(payload);
  } catch (e) {
    if (e instanceof PIIDetectedError) {
      throw new FeedbackRejectedError(
        `PII guard rejected feedback (field=${JSON.stringify(e.fieldName)})`
      );
    }
    throw e;
  }
  const event = {
    kind,
    timestamp_ms: Date.now(),
    app_id: appId,
    payload
  };
  ensureDir();
  fs.appendFileSync(_path, JSON.stringify(event) + "\n", "utf8");
  rotateIfNeeded();
  return event;
}
function recent(opts = {}) {
  const limit = opts.limit ?? 100;
  const wantKind = opts.kind;
  if (!fs.existsSync(_path)) return [];
  let data;
  try {
    data = fs.readFileSync(_path, "utf8");
  } catch {
    return [];
  }
  const lines = data.split("\n");
  const out = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]?.trim();
    if (!line) continue;
    try {
      const row = JSON.parse(line);
      const k = row.kind;
      if (!k || !VALID_KINDS.has(k)) continue;
      if (wantKind && k !== wantKind) continue;
      const payload = row.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) continue;
      out.push({
        kind: k,
        timestamp_ms: typeof row.timestamp_ms === "number" ? row.timestamp_ms : 0,
        app_id: typeof row.app_id === "string" ? row.app_id : null,
        payload
      });
      if (out.length >= limit) break;
    } catch {
      continue;
    }
  }
  return out;
}
function summary() {
  const events = recent({ limit: FEEDBACK_MAX_LINES });
  const by_kind = {
    fix_outcome: 0,
    unmatched_pattern: 0,
    rule_improvement: 0
  };
  let helpful = 0;
  let unhelpful = 0;
  const byRuleMap = /* @__PURE__ */ new Map();
  for (const e of events) {
    by_kind[e.kind] = (by_kind[e.kind] ?? 0) + 1;
    if (e.kind === "fix_outcome") {
      const ruleId = typeof e.payload["rule_id"] === "string" ? e.payload["rule_id"] : "";
      const was = e.payload["was_helpful"] === true;
      if (was) helpful++;
      else unhelpful++;
      if (ruleId) {
        const bucket = byRuleMap.get(ruleId) ?? { helpful: 0, unhelpful: 0 };
        bucket[was ? "helpful" : "unhelpful"]++;
        byRuleMap.set(ruleId, bucket);
      }
    }
  }
  const by_rule = /* @__PURE__ */ Object.create(null);
  for (const [k, v] of byRuleMap) by_rule[k] = v;
  return { total: events.length, by_kind, fix_outcomes: { helpful, unhelpful }, by_rule };
}
function clear() {
  try {
    fs.unlinkSync(_path);
  } catch {
  }
}
export {
  FEEDBACK_DIR,
  FEEDBACK_MAX_LINES,
  FEEDBACK_PATH,
  FEEDBACK_TRIM_TO,
  FeedbackRejectedError,
  _resetStorageDirForTests,
  _setStorageDirForTests,
  clear,
  recent,
  record,
  summary
};
