// @ts-nocheck
/* eslint-disable */
// Built from src/community.ts so plain node can run the kit. Do not edit.
import { mkdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { answerRefusal, readAnswerJson, readAnswerText } from "./answerRead.js";
import { endpointBase, inviteKey } from "./lookupEndpoint.js";
import { isKitLocked } from "./killSwitch.js";
import { checkNoPIIInUrl } from "./no-pii.js";
import {
  refusalAnswer,
  refusalBodyMatters,
  refusalNote
} from "./ruleLookup.js";
const TTL_MS = 6 * 60 * 60 * 1e3;
let refreshing = false;
const FIX_ANSWER_MAX_BYTES = 1e5;
const BOOK_ANSWER_MAX_BYTES = 1e6;
function env() {
  return process.env;
}
function cacheFile(runtime) {
  return join(homedir(), ".boosthis", `community.${runtime}.json`);
}
function describe(sev, ct) {
  const s = sev ? `${sev} severity` : "any severity";
  const c = ct ? `${ct} occurrences` : "any volume";
  return `${s} · ${c}`;
}
function readCommunityCache(runtime) {
  const out = /* @__PURE__ */ new Map();
  try {
    const data = JSON.parse(readFileSync(cacheFile(runtime), "utf8"));
    for (const r of data.rules ?? []) {
      if (!r || typeof r.ruleId !== "string") continue;
      const cur = out.get(r.ruleId) ?? {
        projects: 0,
        evidence: 0,
        circumstances: []
      };
      cur.projects = Math.max(cur.projects, r.projects ?? 0);
      cur.evidence += r.evidence ?? 0;
      const desc = describe(r.severityBucket, r.countBucket);
      if (!cur.circumstances.includes(desc)) cur.circumstances.push(desc);
      out.set(r.ruleId, cur);
    }
  } catch {
  }
  return out;
}
function refreshCommunityCacheIfStale(runtime) {
  const e = env();
  if (e.VITEST || e.NODE_ENV === "test" || e.BOOSTHIS_DISABLED) return;
  if (isKitLocked()) return;
  if (refreshing) return;
  try {
    const st = statSync(cacheFile(runtime));
    if (Date.now() - st.mtimeMs < TTL_MS) return;
  } catch {
  }
  refreshing = true;
  void fetchAndWrite(runtime).finally(() => {
    refreshing = false;
  });
}
function clearCommunityCache(runtime) {
  try {
    unlinkSync(cacheFile(runtime));
  } catch {
  }
}
function refusalFix(refusal) {
  if (refusal.kind === "retired") {
    return {
      fix_available: false,
      fix_lookup: "retired",
      retired_because: refusal.retired_because,
      retired_says: refusal.retired_says,
      replaced_by: refusal.replaced_by,
      fix_note: refusalNote(refusal)
    };
  }
  return {
    fix_available: false,
    fix_lookup: "held",
    held_reason: refusal.held_reason,
    held_says: refusal.held_says,
    fix_note: refusalNote(refusal)
  };
}
function sanitizeCounterparts(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= 5) break;
    if (typeof item !== "object" || item === null) continue;
    const c = item;
    if (typeof c["runtime"] === "string" && typeof c["ruleId"] === "string" && typeof c["concept"] === "string") {
      out.push({
        runtime: c["runtime"].slice(0, 10),
        rule_id: c["ruleId"].slice(0, 100),
        concept: c["concept"].slice(0, 200)
      });
    }
  }
  return out;
}
const BLOCKED_ON_DEVICE_NOTE = "The kit's own privacy check stopped this fix request on this device: its address carried something shaped like personal data, so nothing was sent.";
const NO_KEY_NOTE = "Fix guidance is served per-rule from the Boosthis server and requires a registered (invited) app. Set BOOSTHIS_PROJECT_KEY in this MCP server's environment to receive the fix. Detection (when_to_apply) works fully offline without it.";
async function fetchRuleFix(ruleId, runtime) {
  const key = inviteKey();
  if (!key) return { fix_available: false, fix_note: NO_KEY_NOTE };
  try {
    const url = `${endpointBase()}/rules/fix?ruleId=${encodeURIComponent(
      ruleId
    )}&runtime=${encodeURIComponent(runtime)}`;
    if (checkNoPIIInUrl(url)) return { fix_available: false, fix_note: BLOCKED_ON_DEVICE_NOTE };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5e3);
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${key}` },
        signal: controller.signal
      });
      if (!res.ok && refusalBodyMatters(res.status)) {
        let body = void 0;
        try {
          body = await readAnswerJson(res, { maxBytes: FIX_ANSWER_MAX_BYTES, timeoutMs: 5e3 });
        } catch {
          body = void 0;
        }
        const refusal = refusalAnswer(res.status, body);
        if (refusal) return refusalFix(refusal);
      }
      if (res.status === 401 || res.status === 403) {
        return {
          fix_available: false,
          fix_note: `The Boosthis server rejected this project key (${res.status}). Check BOOSTHIS_PROJECT_KEY.`
        };
      }
      if (res.status === 404) {
        return {
          fix_available: false,
          fix_note: `The server has no fix for rule '${ruleId}'.`
        };
      }
      if (res.status === 429) {
        return {
          fix_available: false,
          fix_note: "Fix endpoint is rate limited right now; retry shortly."
        };
      }
      if (!res.ok) {
        return {
          fix_available: false,
          fix_note: res.status >= 500 ? `The Boosthis server failed to answer (status ${res.status}); the fix can be asked for again later.` : `The Boosthis server refused this fix request (status ${res.status}).`
        };
      }
      let data;
      try {
        data = await readAnswerJson(res, {
          maxBytes: FIX_ANSWER_MAX_BYTES,
          timeoutMs: 5e3
        });
      } catch (err) {
        const refusal = answerRefusal(err);
        if (refusal === "too-large") {
          return { fix_available: false, fix_note: "Unexpected oversized fix response." };
        }
        if (refusal === "too-slow") {
          return {
            fix_available: false,
            fix_note: "The fix response did not finish arriving in time; retry shortly."
          };
        }
        if (refusal === "malformed") {
          return { fix_available: false, fix_note: "Malformed fix response." };
        }
        throw err;
      }
      if (!data || typeof data.fixTemplate !== "string") {
        return { fix_available: false, fix_note: "Malformed fix response." };
      }
      const out = {
        fix_available: true,
        fix_template: data.fixTemplate
      };
      if (data.community && typeof data.community.projects === "number" && data.community.projects > 0) {
        out.community_proven = true;
        out.community_projects = data.community.projects;
        out.community_evidence = typeof data.community.evidence === "number" ? data.community.evidence : 0;
      }
      const counterparts = sanitizeCounterparts(data.counterparts);
      if (counterparts.length > 0) out.counterparts = counterparts;
      return out;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return {
      fix_available: false,
      fix_note: "Could not reach the Boosthis server (offline?). Detection still works offline; fetch the fix when back online."
    };
  }
}
async function fetchAndWrite(runtime) {
  try {
    const url = `${endpointBase()}/rules/community?runtime=${encodeURIComponent(runtime)}`;
    if (checkNoPIIInUrl(url)) return;
    const key = inviteKey();
    const headers = { accept: "application/json" };
    if (key) headers.authorization = `Bearer ${key}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5e3);
    let body;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal
      });
      if (!res.ok) return;
      body = await readAnswerText(res, {
        maxBytes: BOOK_ANSWER_MAX_BYTES,
        timeoutMs: 5e3
      });
    } finally {
      clearTimeout(timer);
    }
    JSON.parse(body);
    if (isKitLocked()) return;
    mkdirSync(join(homedir(), ".boosthis"), { recursive: true });
    writeFileSync(cacheFile(runtime), body, "utf8");
  } catch {
  }
}
export {
  clearCommunityCache,
  fetchRuleFix,
  readCommunityCache,
  refreshCommunityCacheIfStale
};
