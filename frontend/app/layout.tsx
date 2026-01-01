import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ComponentPreloader from "@/components/preloader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap", // Optimize font loading
});

export const metadata: Metadata = {
  title: "Traffic Streaming Platform",
  description: "Real-time traffic monitoring for Ho Chi Minh City",
};

// Optimize viewport for better mobile performance
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* Preconnect to external resources for faster loading */}
        {/* SECURITY: All URLs configured via environment variables - no hardcoded URLs */}
        {process.env.NEXT_PUBLIC_CAMERA_API_URL && (
          <link rel="preconnect" href={process.env.NEXT_PUBLIC_CAMERA_API_URL.replace('/v4', '')} />
        )}
        {process.env.NEXT_PUBLIC_OPENSTREETMAP_TILE_URL && (
          <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_OPENSTREETMAP_TILE_URL.replace('{s}', 'a')).origin} />
        )}
        {process.env.NEXT_PUBLIC_CAMERA_API_URL && (
          <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_CAMERA_API_URL.replace('/v4', '')} />
        )}
        {process.env.NEXT_PUBLIC_OPENSTREETMAP_TILE_URL && (
          <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_OPENSTREETMAP_TILE_URL.replace('{s}', 'a')).origin} />
        )}
        {/* Prefetch camera data for faster map load */}
        <link rel="prefetch" href="/camera_api.json" as="fetch" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full m-0 p-0`}
      >
        {children}
        <ComponentPreloader />
      </body>
    </html>
  );
}
