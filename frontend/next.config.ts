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
  // Performance optimizations
  reactStrictMode: false, // Disable double-rendering in dev for better perceived performance
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console.logs in production
  },
  experimental: {
    optimizePackageImports: ['react-icons', 'lucide-react', 'recharts', 'date-fns'], // Tree-shake these packages
  },
  // Prefetch pages for instant navigation
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // Keep pages in memory for 1 hour
    pagesBufferLength: 5, // Keep more pages in memory
  },
};

export default nextConfig;
