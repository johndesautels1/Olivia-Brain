import { Metadata } from "next";
import Link from "next/link";
import { CalendarPageClient } from "./CalendarPageClient";

export const metadata: Metadata = {
  title: "Calendar — Olivia Brain",
  description:
    "Olivia's calendar surface — voice + text scheduling, daily briefs, sync with Google/Outlook/Calendly.",
};

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-xs text-[var(--muted)]">
        <Link
          href="/"
          className="hover:text-[var(--foreground)] transition-colors"
        >
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--foreground)]">Calendar</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
      </div>

      <CalendarPageClient />
    </div>
  );
}
