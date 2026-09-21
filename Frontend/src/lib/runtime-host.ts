// Resolve the backend base URL at runtime from the address the page was opened on. This means the
// app automatically talks to the right host whether it's loaded via localhost, a LAN IP, or any
// other address — no rebuild needed when the machine's DHCP IP changes. The env vars are only a
// fallback for server-side rendering (where there is no window).
const API_PORT = "4000";
const FUNNEL_API_PORT = "8443";

// An explicitly configured PUBLIC origin for the API, e.g. https://api.vera31.com. A production
// deployment serves the backend from its own hostname behind TLS, where the derive-from-page-URL
// rule below cannot reach it: `https://vera31.com:4000` isn't proxied by Cloudflare, port 4000
// isn't publicly open, and an HTTPS page may not call a plaintext origin.
//
// These are deliberately SEPARATE from NEXT_PUBLIC_API_URL/WS_URL, which dev already sets to a LAN
// address and which must stay an SSR-only fallback — letting those win in the browser would undo
// the auto-derive that keeps localhost / LAN / Tailscale working without a rebuild. Nothing but
// production sets the two below, so every existing setup behaves exactly as before.
const CONFIGURED_API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN;
const CONFIGURED_WS_ORIGIN = process.env.NEXT_PUBLIC_WS_ORIGIN;

function browserApiBaseUrl(): string {
  const { hostname, protocol } = window.location;
  if (protocol === "https:" && hostname.endsWith(".ts.net")) {
    return `https://${hostname}:${FUNNEL_API_PORT}`;
  }
  return `${protocol}//${hostname}:${API_PORT}`;
}

export function apiBaseUrl(): string {
  if (CONFIGURED_API_ORIGIN) return CONFIGURED_API_ORIGIN;
  if (typeof window !== "undefined") {
    return browserApiBaseUrl();
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function wsBaseUrl(): string {
  if (CONFIGURED_WS_ORIGIN) return CONFIGURED_WS_ORIGIN;
  if (typeof window !== "undefined") {
    return browserApiBaseUrl();
  }
  return process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
}
