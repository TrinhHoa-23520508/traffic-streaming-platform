import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.notis.vn',
        port: '',
        pathname: '/v4/**',
      }
    ],
  },
};

export default nextConfig;
