import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    "192.168.0.*", "192.168.1.*", "10.0.0.*", "127.0.0.1", "localhost"
  ],
};

export default nextConfig;
