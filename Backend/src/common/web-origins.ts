/**
 * Allowed browser origins for CORS (HTTP + websocket gateways).
 *
 * Set WEB_ORIGIN to a single origin or a comma-separated list, e.g.
 *   WEB_ORIGIN="http://localhost:3000,http://10.0.0.5:3000"
 * so the app can be reached both from this machine and from other devices on the LAN.
 */
export function webOrigins(): string[] {
  const raw = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
