// Bound authentication attempts per direct client address.
export function authRateLimit(maximum = 30, windowMs = 15 * 60 * 1000) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    let entry = clients.get(key);
    if (!entry || entry.until <= now) {
      if (clients.size >= 10000) clients.delete(clients.keys().next().value);
      entry = { count: 0, until: now + windowMs };
      clients.set(key, entry);
    }
    if (++entry.count > maximum) {
      res.setHeader("Retry-After", String(Math.ceil((entry.until - now) / 1000)));
      return res.status(429).json({ code: "AUTH_RATE_LIMITED", message: "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى" });
    }
    next();
  };
}
