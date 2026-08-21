/** @type {import('next').NextConfig} */

// Security headers applied to every response. The CSP blocks the classic XSS payload of loading an
// external <script src=…> and disallows framing/plugins.
//
// Two deliberate residual allowances, both tied to how this app is deployed today:
//   • 'unsafe-eval' is permitted ONLY in development (Next's Fast Refresh needs it); production
//     builds don't, so it's dropped there.
//   • connect-src can't be pinned to a single origin because the API/websocket host is derived at
//     runtime from the current LAN address (http + ws on a private IP). We therefore restrict it to
//     the transport schemes actually used instead of the previous wildcard `*` (which also allowed
//     data:/blob: exfiltration channels). Pinning connect-src to one https origin — and moving to a
//     nonce-based script-src to drop 'unsafe-inline' — is the remaining hardening once the API is
//     served from a fixed HTTPS origin (an infra decision).
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' http: https: ws: wss:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
