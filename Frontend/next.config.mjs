/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "invictus.tail81be07.ts.net",
    "*.ts.net",
    "*.tailscale.net",
  ],
  // Security response headers that do not change any app behavior: nosniff prevents MIME-type
  // confusion, and a referrer policy limits referrer leakage. Deliberately NOT setting a CSP or
  // X-Frame-Options here — those can affect rendering/embedding and would need testing.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
