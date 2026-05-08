import Link from "next/link";
import { PackageDeleteButton } from "./PackageDeleteButton";

/**
 * Shape this card needs from a Prisma Package row. Loose enough to
 * accept the result of `getPackages()` from `lib/queries/packages.ts`
 * without forcing every caller to re-shape — but tight enough that a
 * caller passing the wrong join shape gets a TS error.
 */
export interface PackageCardData {
  id: string;
  name: string;
  packageStatus: string;
  outreachGoal: string;
  summary: string | null;
  targetList: { id: string; name: string } | null;
  _count: {
    packageDocuments: number;
    recipients: number;
    events: number;
  };
}

interface PackageCardProps {
  pkg: PackageCardData;
  /**
   * Visual width preset. The dedicated `/packages` page uses
   * `wrap` (3-up at lg) where the card flexes within a wrap row.
   * The `/documents` Packages tab uses `grid` so the cards align
   * to the existing 3-column document-card grid on that page.
   */
  layout?: "wrap" | "grid";
}

const statusColors: Record<string, string> = {
  draft: "bg-slate-700/50 text-slate-300",
  ready: "bg-indigo-900/30 text-indigo-300",
  sent: "bg-cyan-900/30 text-cyan-300",
  viewed: "bg-emerald-900/30 text-emerald-300",
  engaged: "bg-green-900/30 text-green-300",
  closed: "bg-purple-900/30 text-purple-300",
  package_archived: "bg-red-900/30 text-red-300",
};

const goalColors: Record<string, string> = {
  fundraising: "bg-emerald-900/30 text-emerald-300",
  strategic_partnership: "bg-indigo-900/30 text-indigo-300",
  white_label: "bg-purple-900/30 text-purple-300",
  pilot: "bg-cyan-900/30 text-cyan-300",
  reseller: "bg-amber-900/30 text-amber-300",
  acquisition: "bg-red-900/30 text-red-300",
  enterprise_sales: "bg-blue-900/30 text-blue-300",
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PackageCard({ pkg, layout = "wrap" }: PackageCardProps) {
  const widthClass =
    layout === "wrap"
      ? "w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.875rem)]"
      : "";

  return (
    <Link
      href={`/packages/${pkg.id}`}
      className={`group relative block ${widthClass} rounded-lg border border-[var(--card-border)] border-l-[3px] border-l-purple-500/60 bg-[var(--card-bg)] p-6 shadow-sm transition-all hover:border-indigo-500/50 hover:shadow-md hover:shadow-indigo-950/20`}
    >
      <PackageDeleteButton packageId={pkg.id} packageName={pkg.name} />

      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          {pkg.name}
        </h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
              statusColors[pkg.packageStatus] ?? "bg-slate-700/50 text-slate-300"
            }`}
          >
            {formatLabel(pkg.packageStatus)}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
            goalColors[pkg.outreachGoal] ?? "bg-slate-700/50 text-slate-300"
          }`}
        >
          {formatLabel(pkg.outreachGoal)}
        </span>
      </div>

      {pkg.summary && (
        <p className="mt-2 line-clamp-2 text-xs text-[var(--muted)]">
          {pkg.summary}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3 text-purple-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
              <path d="M14 2v4a2 2 0 0 0 2 2h4" />
            </svg>
            {pkg._count.packageDocuments} docs
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3 text-purple-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {pkg._count.recipients} recipients
          </span>
          <span className="flex items-center gap-1">
            <svg
              className="h-3 w-3 text-purple-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
            </svg>
            {pkg._count.events} events
          </span>
        </div>
        <svg
          className="h-4 w-4 text-[var(--muted)] opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>

      {pkg.targetList && (
        <div className="mt-3 border-t border-[var(--card-border)] pt-3 text-xs text-[var(--muted)]">
          Target list: <span className="text-[var(--foreground)]">{pkg.targetList.name}</span>
        </div>
      )}
    </Link>
  );
}
