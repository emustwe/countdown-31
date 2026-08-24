/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "invictus.tail81be07.ts.net",
    "*.ts.net",
    "*.tailscale.net",
  ],
};

export default nextConfig;
