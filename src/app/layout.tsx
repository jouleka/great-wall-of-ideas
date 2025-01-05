import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "sonner";
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { AuthProvider } from "@/app/(auth)/auth/components/auth-provider"
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: "Great Wall of Ideas",
  description: "A platform for sharing and exploring innovative ideas",
  icons: {
    icon: [
      {
        url: '/icons/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/icons/favicon-16x16.png',
        type: 'image/png',
        sizes: '16x16',
      },
      {
        url: '/icons/favicon-32x32.png',
        type: 'image/png',
        sizes: '32x32',
      },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/safari-pinned-tab.svg',
        color: '#000000',
      },
    ],
  },
  manifest: '/icons/site.webmanifest',
  appleWebApp: {
    title: "Great Wall of Ideas",
    statusBarStyle: "default",
    startupImage: [
      '/icons/apple-touch-icon.png',
    ],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize the Supabase client
  createServerComponentClient({ cookies })
  
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
