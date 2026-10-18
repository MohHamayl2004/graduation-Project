export function resolveApiBase(configured, pageHostname = "") {
  const value = String(configured || "").trim();
  if (!value) return "/api";
  const loopback = (host) => ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
  try {
    const url = new URL(value);
    // A LAN browser's localhost is the phone, not the development computer.
    if (pageHostname && !loopback(pageHostname) && loopback(url.hostname)) return "/api";
  } catch { /* Relative, same-origin API paths are supported. */ }
  return value.replace(/\/$/, "");
}
