import type { Metadata } from "next";

// The profile route is the signed-in user's own account page (the proxy
// requires a session), so it is never indexed.
export const metadata: Metadata = {
  title: "Your profile",
  robots: { index: false, follow: false },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
