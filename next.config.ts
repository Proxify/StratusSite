import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Native/dynamic-require packages used by /api/process/* — keep unbundled
  serverExternalPackages: ["@napi-rs/canvas", "jsdom"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },

  // Stripe webhook needs raw body
  experimental: {
    serverActions: { allowedOrigins: ["stratussoftware.net"] },
  },
};

export default nextConfig;
