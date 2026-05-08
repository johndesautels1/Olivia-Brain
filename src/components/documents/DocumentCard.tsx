"use client";

import Link from "next/link";
import { DocumentActionBar } from "./DocumentActionBar";
import { canOpenDocumentStudio } from "@/lib/documents/content";

interface DocumentCardProps {
  id: string;
  title: string;
  slug?: string;
  documentType: string;
  audienceType: string;
  purposeType: string;
  formatType: string;
  confidentiality: string;
  contentSourceType?: string;
  isTemplate?: boolean;
  ownerUserId?: string | null;
  currentUserId?: string | null;
  summary: string | null;
  collectionName: string;
  moduleCount: number;
  versionCount: number;
  packageCount: number;
  createdAt?: string;
  /** "template" shows Workspace button, "ecosystem" shows Read Article button */
  variant?: "template" | "ecosystem";
}

const confidentialityColors: Record<string, string> = {
  public_access: "bg-green-900/40 text-green-300 border-green-700",
  internal: "bg-blue-900/40 text-blue-300 border-blue-700",
  confidential: "bg-amber-900/40 text-amber-300 border-amber-700",
  nda_required: "bg-red-900/40 text-red-300 border-red-700",
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function DocumentCard({
  id,
  title,
  slug,
  documentType,
  audienceType,
  purposeType,
  formatType,
  confidentiality,
  contentSourceType,
  isTemplate = false,
  ownerUserId = null,
  currentUserId = null,
  summary,
  collectionName,
  moduleCount,
  versionCount,
  packageCount,
  createdAt,
  variant = "template",
}: DocumentCardProps) {
  const confColors = confidentialityColors[confidentiality] || confidentialityColors.internal;
  const isResearchReport = contentSourceType === "external_link";
  const canOpenStudio = canOpenDocumentStudio({
    formatType,
    contentSourceType,
    isTemplate,
    ownerUserId,
    currentUserId,
  });

  // Determine the display format label
  const formatDisplay = isResearchReport ? "REPORT" : (formatType || "md").toUpperCase();

  return (
    <div
      className="group relative rounded-xl border transition-all duration-300 hover:-translate-y-[2px]"
      style={isResearchReport ? {
        background: "linear-gradient(145deg, rgba(15, 20, 40, 0.85) 0%, rgba(10, 14, 26, 0.95) 100%)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        borderColor: "rgba(168, 85, 247, 0.2)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(168, 85, 247, 0.05) inset, 0 1px 0 rgba(255, 255, 255, 0.04) inset",
      } : {
        background: "linear-gradient(145deg, rgba(15, 23, 42, 0.82) 0%, rgba(10, 14, 26, 0.95) 100%)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        borderColor: "var(--card-border)",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.03) inset, 0 1px 0 rgba(255, 255, 255, 0.04) inset",
      }}
    >
      {/* Top accent shimmer line */}
      <div
        className="absolute inset-x-0 top-0 h-[1px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: isResearchReport
            ? "linear-gradient(90deg, transparent 10%, rgba(168, 85, 247, 0.3) 50%, transparent 90%)"
            : "linear-gradient(90deg, transparent 10%, rgba(99, 102, 241, 0.25) 50%, transparent 90%)",
        }}
      />

      <Link href={`/documents/${id}`} className="block overflow-hidden rounded-xl p-5">
        {/* Research report label */}
        {isResearchReport && (
          <div className="mb-2 flex items-center gap-1.5">
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#d8b4fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#d8b4fe" }}>
              Research Report
            </span>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className={`truncate text-sm font-semibold transition-colors duration-200 ${
                isResearchReport
                  ? "text-[var(--foreground)] group-hover:text-purple-200"
                  : "text-[var(--foreground)] group-hover:text-indigo-200"
              }`}
            >
              {title}
            </h3>
            <p className="mt-1 text-xs text-[var(--foreground)]/60">{collectionName}</p>
          </div>
          <span
            className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase ${confColors}`}
            style={{ boxShadow: "0 1px 4px rgba(0, 0, 0, 0.25)" }}
          >
            {formatLabel(confidentiality)}
          </span>
        </div>

        {summary && (
          <p className="mt-3 line-clamp-2 text-xs text-[var(--foreground)]/50 leading-relaxed">{summary}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span
            className="rounded-md border border-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-300"
            style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.06) 100%)" }}
          >
            {formatLabel(documentType)}
          </span>
          <span
            className="rounded-md border border-purple-500/20 px-2 py-0.5 text-[11px] font-medium text-purple-300"
            style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.06) 100%)" }}
          >
            {formatLabel(audienceType)}
          </span>
          <span
            className="rounded-md border border-cyan-500/20 px-2 py-0.5 text-[11px] font-medium text-cyan-300"
            style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.06) 100%)" }}
          >
            {formatLabel(purposeType)}
          </span>
          <span
            className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
              isResearchReport
                ? "border-purple-500/20 text-purple-300"
                : "border-slate-500/20 text-slate-300"
            }`}
            style={{
              background: isResearchReport
                ? "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(168, 85, 247, 0.06) 100%)"
                : "linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0%, rgba(100, 116, 139, 0.08) 100%)",
            }}
          >
            {formatDisplay}
          </span>
        </div>

        <div className="mt-3 flex gap-4 text-[11px] text-[var(--foreground)]/40">
          {createdAt && (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              {formatDate(createdAt)}
            </span>
          )}
          {moduleCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              {moduleCount} modules
            </span>
          )}
          {versionCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
              v{versionCount}
            </span>
          )}
          {packageCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              In {packageCount} pkg{packageCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </Link>

      {/* Hover glow effect */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: isResearchReport
            ? "radial-gradient(ellipse at 50% 0%, rgba(168, 85, 247, 0.06) 0%, transparent 70%)"
            : "radial-gradient(ellipse at 50% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 70%)",
        }}
      />

      {/* Bottom button — Studio for editable templates/copies, read-only view otherwise */}
      <div className="flex justify-center pb-3 pt-1">
        {isResearchReport ? (
          <Link
            href={`/documents/${id}`}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-200 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/50"
            style={{
              background: "rgba(168, 85, 247, 0.1)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              color: "#d8b4fe",
            }}
            aria-label={`View research report: ${title}`}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            View Report
          </Link>
        ) : variant === "ecosystem" || !canOpenStudio ? (
          <Link
            href={`/documents/${id}`}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-200 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              color: "#a5b4fc",
            }}
            aria-label={`${variant === "ecosystem" ? "Read article" : "View document"}: ${title}`}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {variant === "ecosystem" ? "Read Article" : "View"}
          </Link>
        ) : (
          <Link
            href={`/documents/${id}/studio`}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-200 hover:brightness-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4A96A]/50"
            style={{
              background: "rgba(196, 169, 106, 0.12)",
              border: "1px solid rgba(196, 169, 106, 0.25)",
              color: "#C4A96A",
              backdropFilter: "blur(8px)",
            }}
            aria-label={`Open ${title} in studio`}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Studio
          </Link>
        )}
      </div>

      {/* Action bar — hover-reveal */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <DocumentActionBar
          document={{
            id,
            title,
            slug: slug || id,
            summary: summary || undefined,
            contentSourceType,
            isTemplate,
            ownerUserId,
          }}
          variant="icon-only"
        />
      </div>
    </div>
  );
}
