/**
 * `/documents/saved` — bookmarked documents.
 *
 * OB-adapted from `D:\London-Tech-Map\src\app\documents\saved\page.tsx`.
 * Differences from LTM:
 * - `auth()` is async (Clerk v7).
 * - `Document.collection` relation doesn't exist in OB (DocumentCollection
 *   not ported). Bookmark fetch drops the include; DocumentCard renders
 *   with a generic collectionName fallback.
 * - `_count.modules` / `_count.versions` not in OB schema (DocumentVersion +
 *   DocumentModule not ported); pass 0 / drop.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { DocumentCard } from "@/components/documents/DocumentCard";
import prisma from "@/lib/db/client";

export const metadata = {
  title: "Saved Documents — Olivia Brain",
  description: "Your bookmarked documents for quick access.",
};

export default async function SavedDocumentsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const profile = await prisma.userProfile.findUnique({
    where: { clerkUserId: userId },
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Saved Documents</h1>
        <div className="mt-8 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
          <p className="text-sm text-[var(--muted)]">
            Create a{" "}
            <Link href="/profile" className="text-brand-400 hover:underline">
              profile
            </Link>{" "}
            to start bookmarking documents.
          </p>
        </div>
      </div>
    );
  }

  const bookmarks = await prisma.documentBookmark.findMany({
    where: { userProfileId: profile.id },
    include: {
      document: {
        include: {
          _count: { select: { packageDocs: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Saved Documents</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {bookmarks.length} bookmarked document{bookmarks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/documents"
          className="rounded-md border border-[var(--card-border)] px-4 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-indigo-500/50 transition-colors"
        >
          Browse Library
        </Link>
      </div>

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center">
          <svg
            className="mx-auto h-10 w-10 text-[var(--muted)] mb-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
          <p className="text-sm text-[var(--muted)]">
            No bookmarked documents yet. Browse the{" "}
            <Link href="/documents" className="text-brand-400 hover:underline">
              document library
            </Link>{" "}
            and bookmark documents for quick access.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((bm) => (
            <DocumentCard
              key={bm.document.id}
              id={bm.document.id}
              title={bm.document.title}
              slug={bm.document.slug}
              documentType={bm.document.documentType}
              audienceType={bm.document.audienceType}
              purposeType={bm.document.purposeType}
              formatType={bm.document.formatType}
              confidentiality={bm.document.confidentiality}
              isTemplate={bm.document.isTemplate}
              ownerUserId={bm.document.ownerUserId}
              currentUserId={userId}
              summary={bm.document.summary}
              // OB has no DocumentCollection — fall back to a generic
              // workspace label until the table ports.
              collectionName="Document Library"
              moduleCount={0}
              versionCount={0}
              packageCount={bm.document._count.packageDocs}
              contentSourceType={bm.document.contentSourceType}
              variant="template"
            />
          ))}
        </div>
      )}
    </div>
  );
}
