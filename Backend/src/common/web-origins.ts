/**
 * Allowed browser origins for CORS (HTTP + websocket gateways).
 *
 * Set WEB_ORIGIN to a single origin or a comma-separated list, e.g.
 *   WEB_ORIGIN="http://localhost:3000,http://10.0.0.5:3000"
 * In addition, localhost and any private-LAN address (10.x, 192.168.x, 172.16–31.x) on any port is
 * always allowed, so the app can be opened from other devices on the same network without editing
 * WEB_ORIGIN every time the machine's DHCP IP changes.
 */
export function webOrigins(): string[] {
  const raw = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

const PRIVATE_LAN =
  /^https?:\/\/(localhost|127\.0\.0\.1|(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)[0-9.]+)(?::\d+)?$/;
const TAILSCALE_FUNNEL = /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net(?::\d+)?$/i;

/** Whether a browser Origin should be allowed. Non-browser callers (no Origin) are allowed.
 * In production ONLY the explicit WEB_ORIGIN allowlist is honored; the private-LAN convenience
 * (any 10.x/192.168.x/172.16-31.x on any port) applies only in dev so a production deployment
 * isn't open to every device on its network. */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (webOrigins().includes(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  return PRIVATE_LAN.test(origin) || TAILSCALE_FUNNEL.test(origin);
}

/** CORS `origin` option (function form) usable by both `app.enableCors` and socket.io. */
export function corsOrigin() {
  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void): void => {
    cb(null, isAllowedOrigin(origin));
  };
}
