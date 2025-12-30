import type { NextConfig } from "next";

/**
 * Extract hostname from NEXT_PUBLIC_CAMERA_API_URL for image configuration
 * SECURITY: No hardcoded URLs - environment variable must be configured
 */
const getCameraApiHostname = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_CAMERA_API_URL;
  if (!apiUrl) {
    console.warn('⚠️ NEXT_PUBLIC_CAMERA_API_URL is not set. Images from camera API may not load.');
    return '';
  }
  try {
    const url = new URL(apiUrl);
    return url.hostname;
  } catch {
    console.error('❌ Invalid NEXT_PUBLIC_CAMERA_API_URL format');
    return '';
  }
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: getCameraApiHostname(),
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
