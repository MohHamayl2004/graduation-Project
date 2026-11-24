import test from "node:test";
import assert from "node:assert/strict";
import {
  planVoiceAction,
  extractWakeCommand,
} from "../src/companion/voiceActions.js";

test("teacher navigation only permits the exact existing lessons route", () => {
  const context = { allowed: true, pathname: "/math-unit/1-3" };
  assert.equal(planVoiceAction({ type: "navigate", to: "/lectures?subject=math" }, context).to, "/lectures?subject=math");
  for (const to of ["/ai-tutor", "/progress", "/dashboard", "/lectures", "/lesson/1-1", "/math-unit/1-4", "/quizzes", "/study-plan", "/lectures?subject=math&extra=1", "https://evil.test", "javascript:alert(1)"]) {
    assert.equal(planVoiceAction({ type: "navigate", to }, context).type, "unavailable", to);
  }
  for (const type of ["back", "firstLesson", "nextLesson"]) assert.equal(planVoiceAction({ type }, context).type, "unavailable");
  assert.equal(planVoiceAction({ type: "navigate", to: "/lectures?subject=math" }, { allowed: false }).type, "unavailable");
  assert.equal(planVoiceAction({ type: "stop" }).type, "stop");
});
test("contextual question commands use supplied page content and never invent it", () => {
  assert.equal(
    planVoiceAction(
      { type: "explainQuestion" },
      { allowed: true, question: "ما مشتقة س²؟", pathname: "/math-unit/1-2" },
    ).question.includes("ما مشتقة س²؟"),
    true,
  );
  assert.equal(
    planVoiceAction(
      { type: "readQuestion" },
      { allowed: true, question: "احسب ٢+٢" },
    ).text,
    "احسب ٢+٢",
  );
  assert.equal(
    planVoiceAction({ type: "readQuestion" }, { allowed: true }).type,
    "unavailable",
  );
  assert.equal(
    planVoiceAction({ type: "execute", code: "danger" }, { allowed: true })
      .type,
    "unavailable",
  );
});
test("wake gating ignores classroom speech until explicit wake and expires promptly", () => {
  assert.equal(extractWakeCommand("افتح المعلم الذكي", 0, 1000).command, null);
  const armed = extractWakeCommand("يا نبراس", 0, 1000);
  assert.ok(armed.armedUntil > 1000);
  assert.equal(
    extractWakeCommand("افتح المعلم الذكي", armed.armedUntil, 2000).command,
    "افتح المعلم الذكي",
  );
  assert.equal(
    extractWakeCommand("أي كلام", armed.armedUntil, 20000).command,
    null,
  );
  assert.equal(
    extractWakeCommand("يا نبراس، بدي أشوف دروسي", 0, 1000).command,
    "بدي أشوف دروسي",
  );
  assert.equal(
    extractWakeCommand("Hey Nebras, open AI tutor", 0, 1000).command,
    "open AI tutor",
  );
});
