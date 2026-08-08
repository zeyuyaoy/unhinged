import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.0.1", "10.143.164.132"],
  devIndicators: false,
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
