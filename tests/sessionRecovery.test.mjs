import test from "node:test";
import assert from "node:assert/strict";
import { loadSession } from "../shared/sessionRecovery.js";

test("a stalled session request settles and aborts instead of leaving refresh loading forever", async () => {
  let requestSignal;
  await assert.rejects(loadSession((_token, { signal }) => { requestSignal = signal; return new Promise(() => {}); }, "token", { timeoutMs: 15 }), { code: "SESSION_TIMEOUT" });
  assert.equal(requestSignal.aborted, true);
});
test("a recovered session returns its identity and authorization failures keep their status", async () => {
  const profile = { user: { role: "admin" } };
  assert.equal(await loadSession(async () => profile, "token"), profile);
  const forbidden = Object.assign(new Error("blocked"), { status: 403, code: "ACCOUNT_INACTIVE" });
  await assert.rejects(loadSession(async () => { throw forbidden; }, "token"), { status: 403, code: "ACCOUNT_INACTIVE" });
});
