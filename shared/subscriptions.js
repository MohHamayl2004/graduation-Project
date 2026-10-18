export const subscriptionPlans = [
  { id: "monthly", label: "شهري", days: 30, cents: 3999 },
  { id: "quarterly", label: "فصلي", days: 120, cents: 10999 },
  { id: "yearly", label: "سنوي", days: 365, cents: 39999 }
];
export const tierLabel = (id) => id === "free" ? "مجاني" : subscriptionPlans.find((p) => p.id === id)?.label || id;
export const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
export const DAY_MS = 86400000;
export const palestineDate = (value = new Date()) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jerusalem" }).format(new Date(value));
export const palestinianCities = ["القدس", "رام الله", "البيرة", "نابلس", "الخليل", "بيت لحم", "جنين", "طولكرم", "قلقيلية", "سلفيت", "طوباس", "أريحا", "غزة", "خان يونس", "رفح", "دير البلح", "جباليا", "بيت حانون", "بيت لاهيا", "أخرى"];
export function effectiveSubscription(user, now = new Date()) {
  const original = user.subscription || {};
  const periods = original.periods || original.queuedPlans || [];
  const started = periods.filter((p) => p.startsAt && new Date(p.startsAt) <= new Date(now));
  const sources = [original, ...started].sort((a, b) => new Date(b.startsAt || 0) - new Date(a.startsAt || 0));
  const source = sources[0];
  const startsAt = source.startsAt ? new Date(source.startsAt) : source.tier && source.tier !== "free" ? null : new Date(user.createdAt || now);
  const expiresAt = source.expiresAt ? new Date(source.expiresAt) : source.tier && source.tier !== "free" ? null : new Date(startsAt.getTime() + 7 * DAY_MS);
  const tier = source.tier || "free";
  const expired = !expiresAt || expiresAt.getTime() <= new Date(now).getTime();
  const blocked = user.status === "INACTIVE";
  const status = expired || source.status === "INACTIVE" || blocked ? "INACTIVE" : tier === "free" ? "FREE" : "ACTIVE";
  return { tier, status, activationSource: source.activationSource || null, startsAt: startsAt?.toISOString() || null, expiresAt: expiresAt?.toISOString() || null,
    remainingDays: status === "INACTIVE" ? 0 : Math.ceil((expiresAt.getTime() - new Date(now).getTime()) / DAY_MS),
    reason: blocked ? "admin_block" : source.status === "INACTIVE" ? source.reason || "manual_deactivation" : expired ? "expired" : null,
    canAccess: user.role === "admin" || status !== "INACTIVE", blocked,
    queuedPlans: periods.filter((p) => new Date(p.startsAt) > new Date(now)).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)).map((p) => ({ paymentId: p.paymentId ? String(p.paymentId) : null, tier: p.tier, startsAt: new Date(p.startsAt).toISOString(), expiresAt: new Date(p.expiresAt).toISOString(), activationSource: p.activationSource || null })) };
}
export function nextSubscriptionPeriod(user, tier, now = new Date()) {
  const current = effectiveSubscription(user, now);
  const tail = current.queuedPlans.at(-1);
  const startsAt = tail ? tail.expiresAt : current.status !== "INACTIVE" && current.expiresAt ? current.expiresAt : now;
  return activation(tier, new Date(startsAt) > new Date(now) ? startsAt : now);
}
export function activation(tier, now = new Date(), previousExpiry = null, renew = false) {
  const plan = subscriptionPlans.find((p) => p.id === tier);
  if (!plan) throw new Error("نوع الاشتراك غير صالح");
  const startsAt = new Date(now);
  const base = renew && previousExpiry && new Date(previousExpiry) > startsAt ? new Date(previousExpiry) : startsAt;
  return { tier, status: "ACTIVE", startsAt, expiresAt: new Date(base.getTime() + plan.days * DAY_MS), reason: null };
}
