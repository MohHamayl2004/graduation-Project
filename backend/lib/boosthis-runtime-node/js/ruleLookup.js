// @ts-nocheck
/* eslint-disable */
// Built from src/ruleLookup.ts so plain node can run the kit. Do not edit.
import { answerRefusal, readAnswerJson } from "./answerRead.js";
import { endpointBase, inviteKey } from "./lookupEndpoint.js";
import { checkNoPIIInUrl } from "./no-pii.js";
const FOUND_DATED_LEAD = "Approved by a person on ";
const FOUND_DATED_TAIL = ", not built into this kit release.";
const FOUND_UNDATED = "Served by Boosthis, not built into this kit release. Boosthis sent no approval date with it.";
const ABSENT_LEAD = "unknown rule id: ";
const ABSENT_TAIL = " (not built into this kit release, and Boosthis has no live rule with this id for this language)";
const UNCHECKED_NOTE = "Not built into this kit release, and Boosthis could not be asked about it, so this rule may still exist: a person may have approved it since this release. lookup_reason says why Boosthis could not be asked.";
const LIST_LISTED_NOTE = "Built-in rules of this kit release first, then the rules a person approved since, as Boosthis listed them just now. Each of those carries built_in false and its own note.";
const LIST_UNCHECKED_NOTE = "Built-in rules of this kit release only. Rules a person approved since this release may be missing, because Boosthis could not be asked for them. approved_rules_reason says why.";
const LIST_NOT_ASKED_NOTE = "Built-in rules of this kit release only. Rules a person approved since this release carry no category, so a category filter never lists them. Ask without one to see them.";
const RETIRED_NOTE = "Retired from the Boosthis rule book, so its advice is not to be followed. retired_because says why, retired_says gives the reason in the words Boosthis sent, and replaced_by names the rule to fetch instead, or is null when nothing replaces it.";
const HELD_NOTE = "Boosthis did not hand this fix over to this project just now. held_reason and held_says give the reason in the words Boosthis sent, so this is not a sign that the rule is missing.";
const LIST_CUT_NOTE = "Boosthis has more rules a person approved for this language than this list carries. approved_rules_left_out says at least how many were left out, because Boosthis did not send the exact number.";
const FIX_PATH = "/rules/fix";
const APPROVED_LIST_PATH = "/rules/approved";
const FIX_TIMEOUT_MS = 5e3;
const LIST_TIMEOUT_MS = 1500;
const FIX_MAX_BYTES = 1e5;
const LIST_MAX_BYTES = 512e3;
const LIST_MAX_RULES = 200;
const RULE_ID_MAX = 64;
function isRuleIdShape(id) {
  if (id.length === 0 || id.length > RULE_ID_MAX) return false;
  if (id.startsWith("-") || id.endsWith("-") || id.includes("--")) return false;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    const lower = c >= 97 && c <= 122;
    const digit = c >= 48 && c <= 57;
    if (!lower && !digit && c !== 45) return false;
  }
  return true;
}
function approvalDate(value) {
  if (typeof value !== "string" || value.length < 10) return null;
  for (let i = 0; i < 10; i++) {
    const c = value.charCodeAt(i);
    if (i === 4 || i === 7) {
      if (c !== 45) return null;
    } else if (c < 48 || c > 57) {
      return null;
    }
  }
  return value.slice(0, 10);
}
function approvalNote(date) {
  return date === null ? FOUND_UNDATED : FOUND_DATED_LEAD + date + FOUND_DATED_TAIL;
}
function absentMessage(id) {
  return ABSENT_LEAD + id + ABSENT_TAIL;
}
function refusalAnswer(status, body) {
  const b = isRecord(body) ? body : {};
  if (status === 410) {
    const state = b.state;
    const replaced = isRecord(b.replacedBy) ? b.replacedBy.ruleId : void 0;
    return {
      kind: "retired",
      retired_because: state === "wrong" || state === "superseded" ? state : null,
      retired_says: text(b.detail),
      replaced_by: typeof replaced === "string" && isRuleIdShape(replaced) ? replaced : null
    };
  }
  const reason = b.reason;
  const held = status === 403 && reason === "rule_not_reported" || status === 429 && (reason === "rule_book_sweep_limit" || reason === "rule_book_held") || status === 503 && reason === "take_not_recorded";
  if (!held) return null;
  return { kind: "held", held_reason: reason, held_says: text(b.detail) };
}
function refusalNote(refusal) {
  return refusal.kind === "retired" ? RETIRED_NOTE : HELD_NOTE;
}
function refusalBodyMatters(status) {
  return status === 410 || status === 403 || status === 429 || status === 503;
}
function refusalRule(id, refusal) {
  if (refusal.kind === "retired") {
    return {
      id,
      built_in: false,
      fix_available: false,
      lookup: "retired",
      retired_because: refusal.retired_because,
      retired_says: refusal.retired_says,
      replaced_by: refusal.replaced_by,
      note: refusalNote(refusal)
    };
  }
  return {
    id,
    built_in: false,
    fix_available: false,
    lookup: "held",
    held_reason: refusal.held_reason,
    held_says: refusal.held_says,
    note: refusalNote(refusal)
  };
}
function statusReason(status) {
  if (status === 401 || status === 403) return "refused";
  if (status === 429) return "rate-limited";
  return "unreadable";
}
function text(value) {
  return typeof value === "string" ? value : null;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
async function ask(url, key, timeoutMs, maxBytes) {
  if (checkNoPIIInUrl(url)) return { kind: "failed", reason: "unreachable" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    let res;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${key}` },
        signal: controller.signal
      });
    } catch {
      return { kind: "failed", reason: "unreachable" };
    }
    if (res.status !== 200) {
      let body = void 0;
      if (refusalBodyMatters(res.status)) {
        try {
          const left = Math.max(1, timeoutMs - (Date.now() - started));
          body = await readAnswerJson(res, { maxBytes, timeoutMs: left });
        } catch {
          body = void 0;
        }
      }
      return { kind: "status", status: res.status, body };
    }
    try {
      const left = Math.max(1, timeoutMs - (Date.now() - started));
      return { kind: "body", body: await readAnswerJson(res, { maxBytes, timeoutMs: left }) };
    } catch (err) {
      const refusal = answerRefusal(err);
      return {
        kind: "failed",
        reason: refusal === "too-large" || refusal === "malformed" ? "unreadable" : "unreachable"
      };
    }
  } finally {
    clearTimeout(timer);
  }
}
function unchecked(id, reason) {
  return {
    id,
    built_in: false,
    fix_available: false,
    lookup: "unchecked",
    lookup_reason: reason,
    note: UNCHECKED_NOTE
  };
}
async function lookupUnbuiltRule(id, runtime) {
  if (!isRuleIdShape(id)) throw new Error(absentMessage(id));
  const key = inviteKey();
  if (!key) return unchecked(id, "no-key");
  const url = `${endpointBase()}${FIX_PATH}?ruleId=${encodeURIComponent(id)}&runtime=${encodeURIComponent(runtime)}`;
  const got = await ask(url, key, FIX_TIMEOUT_MS, FIX_MAX_BYTES);
  if (got.kind === "failed") return unchecked(id, got.reason);
  if (got.kind === "status") {
    const refusal = refusalAnswer(got.status, got.body);
    if (refusal) return refusalRule(id, refusal);
    if (got.status === 404) throw new Error(absentMessage(id));
    return unchecked(id, statusReason(got.status));
  }
  const body = got.body;
  if (!isRecord(body) || typeof body.fixTemplate !== "string") {
    return unchecked(id, "unreadable");
  }
  const approved = isRecord(body.approved) ? body.approved : {};
  const date = approvalDate(approved.approvedAt);
  return {
    id,
    title: text(body.title),
    when_to_apply: text(approved.whenToApply),
    fix_available: true,
    fix_template: body.fixTemplate,
    built_in: false,
    approved_on: date,
    lookup: "found",
    note: approvalNote(date)
  };
}
function uncheckedList(builtIn, reason) {
  return {
    count: builtIn.length,
    rules: builtIn,
    approved_rules: "unchecked",
    approved_rules_reason: reason,
    note: LIST_UNCHECKED_NOTE
  };
}
async function listWithApprovedRules(builtIn, opts) {
  if (opts.filtered) {
    return {
      count: builtIn.length,
      rules: builtIn,
      approved_rules: "not-asked",
      note: LIST_NOT_ASKED_NOTE
    };
  }
  const key = inviteKey();
  if (!key) return uncheckedList(builtIn, "no-key");
  const url = `${endpointBase()}${APPROVED_LIST_PATH}?runtime=${encodeURIComponent(opts.runtime)}`;
  const got = await ask(url, key, LIST_TIMEOUT_MS, LIST_MAX_BYTES);
  if (got.kind === "failed") return uncheckedList(builtIn, got.reason);
  if (got.kind === "status") return uncheckedList(builtIn, statusReason(got.status));
  const listed = isRecord(got.body) ? got.body.rules : void 0;
  if (!Array.isArray(listed)) return uncheckedList(builtIn, "unreadable");
  const seen = new Set(opts.builtInIds);
  const approved = [];
  let leftOut = 0;
  for (const item of listed) {
    if (!isRecord(item)) continue;
    const id = item.ruleId;
    if (typeof id !== "string" || !isRuleIdShape(id) || seen.has(id)) continue;
    seen.add(id);
    if (approved.length >= LIST_MAX_RULES) {
      leftOut += 1;
      continue;
    }
    const date = approvalDate(item.approvedAt);
    approved.push({
      id,
      title: text(item.title),
      when_to_apply: text(item.whenToApply),
      built_in: false,
      approved_on: date,
      note: approvalNote(date)
    });
  }
  if (isRecord(got.body) && got.body.truncated === true) leftOut += 1;
  const rules = [...builtIn, ...approved];
  const answer = {
    count: rules.length,
    rules,
    approved_rules: "listed",
    note: LIST_LISTED_NOTE
  };
  if (leftOut > 0) {
    answer.approved_rules_left_out = leftOut;
    answer.approved_rules_left_out_note = LIST_CUT_NOTE;
  }
  return answer;
}
export {
  ABSENT_LEAD,
  ABSENT_TAIL,
  APPROVED_LIST_PATH,
  FIX_PATH,
  FOUND_DATED_LEAD,
  FOUND_DATED_TAIL,
  FOUND_UNDATED,
  HELD_NOTE,
  LIST_CUT_NOTE,
  LIST_LISTED_NOTE,
  LIST_NOT_ASKED_NOTE,
  LIST_UNCHECKED_NOTE,
  RETIRED_NOTE,
  UNCHECKED_NOTE,
  absentMessage,
  approvalDate,
  approvalNote,
  isRuleIdShape,
  listWithApprovedRules,
  lookupUnbuiltRule,
  refusalAnswer,
  refusalBodyMatters,
  refusalNote
};
