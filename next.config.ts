import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mysql2"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
