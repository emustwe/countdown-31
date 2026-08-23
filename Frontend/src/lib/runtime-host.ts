// Resolve the backend base URL at runtime from the address the page was opened on. This means the
// app automatically talks to the right host whether it's loaded via localhost, a LAN IP, or any
// other address — no rebuild needed when the machine's DHCP IP changes. The env vars are only a
// fallback for server-side rendering (where there is no window).
const API_PORT = "4000";
const FUNNEL_API_PORT = "8443";

function browserApiBaseUrl(): string {
  const { hostname, protocol } = window.location;
  if (protocol === "https:" && hostname.endsWith(".ts.net")) {
    return `https://${hostname}:${FUNNEL_API_PORT}`;
  }
  return `${protocol}//${hostname}:${API_PORT}`;
}

export function apiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return browserApiBaseUrl();
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export function wsBaseUrl(): string {
  if (typeof window !== "undefined") {
    return browserApiBaseUrl();
  }
  return process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";
}
