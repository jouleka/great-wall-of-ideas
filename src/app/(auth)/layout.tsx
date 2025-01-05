import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: "Great Wall of Ideas - Authentication",
  description: "Sign in or create an account for Great Wall of Ideas",
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

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 