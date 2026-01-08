import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["192.168.1.*", "localhost"],
};

export default nextConfig;
