import User from "../models/User.js";
import { DAY_MS } from "../../shared/subscriptions.js";
export async function maintainSubscriptions(now = new Date()) {
  // Existing accounts keep their original registration date; their trial is not
  // restarted on login or deployment. Test accounts are included like other students.
  await User.collection.updateMany({ role: { $ne: "admin" }, subscription: { $exists: false } }, [{ $set: { subscription: {
    tier: "free", status: "FREE", startsAt: { $ifNull: ["$createdAt", now] },
    expiresAt: { $add: [{ $ifNull: ["$createdAt", now] }, 7 * DAY_MS] }, revision: 0, appliedPaymentIds: []
  } } }]);
  const scheduled = await User.find({ "subscription.periods.0": { $exists: true } }).select("subscription");
  for (const user of scheduled) {
    const due = user.subscription.periods.filter((p) => p.startsAt <= now).sort((a, b) => b.startsAt - a.startsAt)[0];
    if (!due || (user.subscription.startsAt && due.startsAt <= user.subscription.startsAt)) continue;
    const expired = due.expiresAt <= now;
    const revision = user.subscription.revision || 0;
    await User.updateOne({ _id: user._id, "subscription.revision": revision }, { $set: {
      "subscription.tier": due.tier, "subscription.startsAt": due.startsAt, "subscription.expiresAt": due.expiresAt,
      "subscription.activationSource": due.activationSource, "subscription.status": expired ? "INACTIVE" : "ACTIVE", "subscription.reason": expired ? "expired" : null
    }, $inc: { "subscription.revision": 1 } });
  }
  await User.updateMany({ role: { $ne: "admin" }, "subscription.status": { $in: ["FREE", "ACTIVE"] }, "subscription.expiresAt": { $lte: now } },
    { $set: { "subscription.status": "INACTIVE", "subscription.reason": "expired" }, $inc: { "subscription.revision": 1 } });
}
