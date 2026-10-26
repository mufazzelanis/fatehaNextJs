import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      // Admin, accounts and dealer pages are never indexed.
      { source: "/(admin|account|business)/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
  // Keep links from the previous fatehabd.com working.
  async redirects() {
    return [
      { source: "/login", destination: "/account/login", permanent: true },
      { source: "/register", destination: "/account/register", permanent: true },
      { source: "/track-order", destination: "/track", permanent: true },
      { source: "/pages/return-policy", destination: "/refund-policy", permanent: true },
      { source: "/business/login", destination: "/business", permanent: false },
      // Landing content & checkout moved into the per-landing editor.
      { source: "/admin/content", destination: "/admin/landings", permanent: false },
      { source: "/admin/checkout", destination: "/admin/landings", permanent: false },
    ];
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
    serverActions: {
      // several product images per save; each file is capped at 3MB in the action itself
      bodySizeLimit: "25mb",
    },
  },
  // Title/description/Open Graph always go in <head> (not streamed later in <body>), for every crawler and share preview.
  htmlLimitedBots: /.*/,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
