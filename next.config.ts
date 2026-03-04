import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Skip static generation for all pages - required for Clerk authentication
  output: "standalone",
};

export default nextConfig;
