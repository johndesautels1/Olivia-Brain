/**
 * `/documents/share/[token]` — public viewer for à la carte share links.
 *
 * OB-adapted from `D:\London-Tech-Map\src\app\documents\share\[token]\page.tsx`.
 *
 * **OB-only adaptations:**
 * - `headers()` is async in Next 16 — `await headers()`.
 * - Next 16 routes: `params` is a Promise.
 * - `prisma.documentShareEvent.create` is removed — DocumentShareEvent
 *   is not ported in OB (LTM line 1444); view tracking degrades to
 *   the inline `viewCount` + `lastViewedAt` columns on DocumentShare.
 *   The audit-event table can land in a follow-up if needed.
 * - `share.document.collection.name` doesn't exist in OB. The shared-
 *   with banner falls back to a generic "Olivia Brain" label.
 *
 * No authentication required — anyone with the unguessable share token
 * can view. Token is 24 bytes of crypto entropy from S8b-routes.
 *
 * Failure modes (all render the same "link unavailable" panel — never
 * reveal whether the token simply didn't exist vs. was revoked vs.
 * expired):
 *   - token not in DB
 *   - share.isRevoked === true
 *   - expiresAt is in the past
 *   - parent document was archived (status !== "active")
 */

export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";

import DocumentBody from "@/components/documents/DocumentBody";
import { DocumentSourcePanel } from "@/components/documents/DocumentSourcePanel";
import { OrgMapProvider } from "@/components/documents/OrgMapProvider";
import prisma from "@/lib/db/client";
import { resolveDocumentContent } from "@/lib/documents/content";
import { getOrgLinkMap } from "@/lib/queries/documents";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Shared Document — Olivia Brain",
};

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function getRequestMeta() {
  const h = await headers();
  const fwdFor = h.get("x-forwarded-for");
  const ip = fwdFor
    ? fwdFor.split(",")[0]?.trim() ?? null
    : h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;
  return { ip, ua };
}

function UnavailablePanel({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-10 text-center">
        <svg
          className="mx-auto mb-4 h-10 w-10 text-[var(--muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          This link is no longer available
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{reason}</p>
        <Link
          href="/"
          className="mt-6 inline-block text-xs text-brand-400 hover:underline"
        >
          Return to Olivia Brain
        </Link>
      </div>
    </div>
  );
}

export default async function SharedDocumentPage({ params }: SharePageProps) {
  const { token } = await params;
  // ip + ua are read from request headers — used for audit metadata
  // when DocumentShareEvent ports. Today they're captured but not
  // persisted (the audit table doesn't exist in OB yet).
  const meta = await getRequestMeta();
  void meta;

  const share = await prisma.documentShare.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      isRevoked: true,
      expiresAt: true,
      message: true,
      recipientName: true,
      document: true,
    },
  });

  // Fold every failure mode into the same generic message — no
  // information leak about whether the token exists, was revoked, or
  // has expired.
  const generic =
    "The owner may have revoked it, the link may have expired, or it never existed.";
  if (!share) return <UnavailablePanel reason={generic} />;
  if (share.isRevoked) return <UnavailablePanel reason={generic} />;
  if (share.expiresAt && share.expiresAt <= new Date()) {
    return <UnavailablePanel reason={generic} />;
  }
  if (!share.document || share.document.status !== "active") {
    return <UnavailablePanel reason={generic} />;
  }

  const doc = share.document;

  // Inline view-count tracking. LTM additionally writes a
  // DocumentShareEvent audit row — that table isn't in OB yet, so
  // the per-event audit trail is deferred to a follow-up.
  try {
    await prisma.documentShare.update({
      where: { id: share.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("[doc-share] view tracking write failed:", err);
  }

  const documentContent = resolveDocumentContent(doc);
  const orgMap = await getOrgLinkMap();
  // OB doesn't have Document.collection — fall back to a generic
  // workspace label until DocumentCollection ports.
  const collectionLabel = "Olivia Brain";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Shared-with banner */}
      <div
        className="mb-6 rounded-xl px-5 py-4"
        style={{
          background: "rgba(15, 23, 42, 0.82)",
          border: "1px solid rgba(196, 169, 106, 0.20)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
            style={{
              background: "rgba(196, 169, 106, 0.15)",
              border: "1px solid rgba(196, 169, 106, 0.30)",
            }}
          >
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(196,169,106,0.95)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Shared with you{share.recipientName ? `, ${share.recipientName}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {collectionLabel}
              {share.expiresAt
                ? ` · Expires ${share.expiresAt.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}`
                : ""}
            </p>
            {share.message && (
              <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
                {share.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Title + chips */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{doc.title}</h1>
        {doc.summary && (
          <p className="mt-2 text-sm text-[var(--muted)] leading-relaxed">{doc.summary}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded bg-indigo-900/30 px-2.5 py-1 text-xs font-medium text-indigo-300">
            {formatLabel(doc.documentType)}
          </span>
          <span className="rounded bg-purple-900/30 px-2.5 py-1 text-xs font-medium text-purple-300">
            {formatLabel(doc.audienceType)}
          </span>
          <span className="rounded bg-cyan-900/30 px-2.5 py-1 text-xs font-medium text-cyan-300">
            {formatLabel(doc.purposeType)}
          </span>
          <span className="rounded bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-300">
            {(doc.formatType || "md").toUpperCase()}
          </span>
        </div>
      </div>

      {/* Body */}
      {documentContent.kind !== "empty" ? (
        documentContent.kind === "external_link" ||
        documentContent.kind === "stored_file" ? (
          <DocumentSourcePanel content={documentContent} title={doc.title} />
        ) : (
          <OrgMapProvider orgMap={orgMap}>
            <DocumentBody
              content={documentContent.content}
              formatType={doc.formatType}
              contentSourceType={doc.contentSourceType}
              title={doc.title}
              confidentiality={doc.confidentiality}
              collection={collectionLabel}
            />
          </OrgMapProvider>
        )
      ) : (
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm text-[var(--muted)]">This document has no content yet.</p>
        </div>
      )}

      <div className="mt-10 text-center text-[11px] text-[var(--muted)]">
        Shared via{" "}
        <Link href="/" className="hover:underline">
          Olivia Brain
        </Link>
      </div>
    </div>
  );
}
