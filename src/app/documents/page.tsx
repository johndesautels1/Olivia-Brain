/**
 * `/documents` — document library index.
 *
 * OB-adapted from `D:\London-Tech-Map\src\app\documents\page.tsx`. The
 * LTM version splits documents into "Core Templates" / "Your Packages" /
 * "Ecosystem" tabs based on `Document.collection.slug` — OB doesn't
 * have DocumentCollection yet, so the "Templates" tab is a flat list
 * of all public templates and the "Ecosystem" tab is hidden until the
 * cascade-collections port. Packages tab is unchanged.
 *
 * Differences from LTM:
 * - `auth()` is async (Clerk v7).
 * - `searchParams` is a Promise (Next 16).
 * - Collection-based grouping dropped; templates render flat.
 * - "Ecosystem" tab hidden (cascade-* docs require DocumentCollection).
 * - DocumentCard collection name + module/version counts fall back to
 *   stub values (DocumentCollection / DocumentModule / DocumentVersion
 *   not in OB).
 * - PackageCard receives `targetList: null` (TargetList not in OB).
 */

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentFilters } from "@/components/documents/DocumentFilters";
import { PackageCard } from "@/components/packages/PackageCard";
import { TEMPLATE_COUNT } from "@/lib/document-registry";
import { getDocuments, getDocumentFilterOptions } from "@/lib/queries/documents";
import { getPackages } from "@/lib/queries/packages";

export const metadata = {
  title: "Document Library — Olivia Brain",
  description:
    "Strategic document library — browse, filter, and add documents to outreach packages.",
};

type DocTab = "templates" | "packages";

interface DocumentsPageProps {
  searchParams: Promise<{
    tab?: string;
    collection?: string;
    audience?: string;
    purpose?: string;
    confidentiality?: string;
    search?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const params = await searchParams;
  const { userId } = await auth();

  const [documents, filterOptions, userPackages] = await Promise.all([
    getDocuments({
      collectionId: params.collection,
      audienceType: params.audience,
      purposeType: params.purpose,
      confidentiality: params.confidentiality,
      search: params.search,
    }),
    getDocumentFilterOptions(),
    userId ? getPackages({ ownerUserId: userId }) : Promise.resolve([]),
  ]);

  const validTabs: DocTab[] = ["templates", "packages"];
  const activeTab: DocTab = validTabs.includes(params.tab as DocTab)
    ? (params.tab as DocTab)
    : "templates";

  const activeTabCount =
    activeTab === "templates" ? documents.length : userPackages.length;

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Document Library</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Browse strategic documents — filter by audience, purpose, or confidentiality level.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/documents/saved"
            className="flex items-center gap-2 rounded-md border border-[var(--card-border)] px-3 py-2 text-xs text-[var(--muted)] hover:text-amber-300 hover:border-amber-500/30 transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
            </svg>
            Saved
          </Link>
          <Link
            href="/documents/new"
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New
          </Link>
        </div>
      </div>

      <Suspense fallback={null}>
        <DocumentFilters
          businessCollections={filterOptions.collections}
          generalCollections={[]}
          resultCount={activeTabCount}
        />
      </Suspense>

      {activeTab === "templates" && (
        <div className="mt-8">
          <div
            className="relative rounded-xl px-6 py-5 mb-6 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(10, 14, 26, 0.95) 100%)",
              border: "1px solid rgba(196, 169, 106, 0.15)",
              boxShadow:
                "0 2px 12px rgba(0, 0, 0, 0.3), 0 0 20px rgba(196, 169, 106, 0.03)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent 5%, rgba(196,169,106,0.3) 30%, rgba(196,169,106,0.45) 50%, rgba(196,169,106,0.3) 70%, transparent 95%)",
              }}
            />
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(196, 169, 106, 0.15) 0%, rgba(196, 169, 106, 0.06) 100%)",
                  border: "1px solid rgba(196, 169, 106, 0.25)",
                }}
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(196,169,106,1)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M5 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H5Z" />
                  <path d="M12 18v-6" />
                  <path d="M9 15h6" />
                </svg>
              </div>
              <div>
                <h2
                  className="text-base font-semibold"
                  style={{ color: "rgba(196, 169, 106, 1)" }}
                >
                  Core Templates
                </h2>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "#b0bec5" }}>
                  {TEMPLATE_COUNT} turn-key company document templates for investors,
                  partners, acquirers, and fund managers. Fill in each template with
                  your company data — Olivia can help you complete them from
                  conversation. Once filled, assemble them into professional outreach
                  packages.
                </p>
                <p
                  className="mt-1.5 text-[11px] font-medium tabular-nums"
                  style={{ color: "rgba(196, 169, 106, 0.7)" }}
                >
                  {documents.length} templates
                </p>
              </div>
            </div>
          </div>

          {documents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  id={doc.id}
                  title={doc.title}
                  slug={doc.slug}
                  documentType={doc.documentType}
                  audienceType={doc.audienceType}
                  purposeType={doc.purposeType}
                  formatType={doc.formatType}
                  confidentiality={doc.confidentiality}
                  isTemplate={doc.isTemplate}
                  ownerUserId={doc.ownerUserId}
                  summary={doc.summary}
                  collectionName="Document Library"
                  moduleCount={0}
                  versionCount={0}
                  packageCount={doc._count.packageDocs}
                  contentSourceType={doc.contentSourceType}
                  createdAt={doc.createdAt.toISOString()}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
              <p className="text-sm text-[var(--muted)]">
                No documents in the library yet. Create one via{" "}
                <Link
                  href="/documents/new"
                  className="text-brand-400 hover:underline"
                >
                  /documents/new
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "packages" && (
        <div className="mt-8">
          <div
            className="relative rounded-xl px-6 py-5 mb-6 overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(10, 14, 26, 0.95) 100%)",
              border: "1px solid rgba(52, 211, 153, 0.15)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent 5%, rgba(52,211,153,0.3) 30%, rgba(52,211,153,0.45) 50%, rgba(52,211,153,0.3) 70%, transparent 95%)",
              }}
            />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(52, 211, 153, 0.15) 0%, rgba(52, 211, 153, 0.06) 100%)",
                    border: "1px solid rgba(52, 211, 153, 0.25)",
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgba(52,211,153,1)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M16 16h6" />
                    <path d="M19 13v6" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M5 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H5Z" />
                  </svg>
                </div>
                <div>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: "rgba(52, 211, 153, 1)" }}
                  >
                    Your Packages
                  </h2>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: "#b0bec5" }}
                  >
                    Curated bundles of your private documents, ready to share with
                    investors, partners, or acquirers via tracked links.
                  </p>
                  <p
                    className="mt-1.5 text-[11px] font-medium tabular-nums"
                    style={{ color: "rgba(52, 211, 153, 0.7)" }}
                  >
                    {userPackages.length}{" "}
                    {userPackages.length === 1 ? "package" : "packages"}
                  </p>
                </div>
              </div>
              {userId && (
                <Link
                  href="/packages/new"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 transition-colors"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                  New Package
                </Link>
              )}
            </div>
          </div>

          {!userId ? (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
              <p className="text-sm text-[var(--muted)] mb-4">
                Sign in to view your outreach packages.
              </p>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Sign In
              </Link>
            </div>
          ) : userPackages.length === 0 ? (
            <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
              <p className="text-sm text-[var(--muted)] mb-4">
                No packages yet. Add documents to a package from the dashboard My
                Documents tile, or build one from scratch.
              </p>
              <Link
                href="/packages/new"
                className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Create First Package
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-5">
              {userPackages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={{
                    ...pkg,
                    targetList: null,
                    // PackageCard expects `_count.recipients` + `_count.events`,
                    // but OB doesn't have PackageRecipient or PackageEvent
                    // tables yet (LTM-only). Synthesize as 0 until those
                    // tables port.
                    _count: {
                      ...pkg._count,
                      recipients: 0,
                      events: 0,
                    },
                  }}
                  layout="wrap"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
