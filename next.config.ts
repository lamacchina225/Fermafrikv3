import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
