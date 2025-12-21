import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
        <link rel="preconnect" href="https://api.notis.vn" />
        <link rel="preconnect" href="https://tile.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://api.notis.vn" />
        <link rel="dns-prefetch" href="https://tile.openstreetmap.org" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full m-0 p-0`}
      >
        {children}
      </body>
    </html>
  );
}
