import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";

const HAS_CLERK = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const metadata: Metadata = {
  title: "Olivia Brain | Phase 1 Foundation",
  description:
    "Phase 1 implementation for Olivia Brain: React shell, model routing, memory, orchestration, and readiness tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tree = (
    <html lang="en">
      <body>{children}</body>
    </html>
  );

  // Conditional <ClerkProvider>: when the publishable key is unset (local
  // dev / fresh checkouts) the layout still renders. With the key set,
  // Clerk's session context is available to client components and route
  // handlers can call `auth()` end-to-end.
  if (HAS_CLERK) {
    return <ClerkProvider>{tree}</ClerkProvider>;
  }

  return tree;
}
