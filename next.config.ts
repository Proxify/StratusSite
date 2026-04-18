import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

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
