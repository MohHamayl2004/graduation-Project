import test from "node:test";
import assert from "node:assert/strict";
import { effectiveSubscription, nextSubscriptionPeriod, activation, DAY_MS } from "../../shared/subscriptions.js";

test("different packages queue after the current and earlier queued packages without replacing access", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  const current = activation("monthly", now);
  const user = { createdAt: now, status: "ACTIVE", subscription: { ...current, periods: [] } };
  const yearly = nextSubscriptionPeriod(user, "yearly", now);
  assert.equal(+yearly.startsAt, +current.expiresAt); assert.equal(yearly.expiresAt - yearly.startsAt, 365 * DAY_MS);
  user.subscription.periods.push({ ...yearly, paymentId: "one", activationSource: "demo_payment" });
  assert.equal(effectiveSubscription(user, now).tier, "monthly");
  assert.equal(effectiveSubscription(user, now).expiresAt, current.expiresAt.toISOString());
  const quarterly = nextSubscriptionPeriod(user, "quarterly", now);
  assert.equal(+quarterly.startsAt, +yearly.expiresAt);
  user.subscription.periods.push({ ...quarterly, paymentId: "two", activationSource: "demo_payment" });
  assert.equal(effectiveSubscription(user, now).queuedPlans.length, 2);
  assert.equal(effectiveSubscription(user, new Date(+yearly.startsAt - 1)).tier, "monthly");
  assert.equal(effectiveSubscription(user, yearly.startsAt).tier, "yearly");
  assert.equal(effectiveSubscription(user, yearly.startsAt).status, "ACTIVE");
  assert.equal(effectiveSubscription(user, yearly.expiresAt).tier, "quarterly");
  assert.equal(effectiveSubscription(user, quarterly.expiresAt).status, "INACTIVE");
  assert.equal(effectiveSubscription({ ...user, status: "INACTIVE" }, yearly.startsAt).canAccess, false);
});
test("a free trial is preserved; an expired account starts its new plan immediately", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  const trial = { createdAt: now };
  assert.equal(+nextSubscriptionPeriod(trial, "monthly", now).startsAt, +now + 7 * DAY_MS);
  const expired = { createdAt: new Date(+now - 20 * DAY_MS) };
  assert.equal(+nextSubscriptionPeriod(expired, "monthly", now).startsAt, +now);
});
