import type { Metadata } from "next";

import "./globals.css";

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
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
