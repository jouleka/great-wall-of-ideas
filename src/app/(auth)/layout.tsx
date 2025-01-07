import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: "Great Wall of Ideas - Authentication",
  description: "Sign in or create an account for Great Wall of Ideas",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 