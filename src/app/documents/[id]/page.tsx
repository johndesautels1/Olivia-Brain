export const revalidate = 3600;

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { getDocumentById, getCollectionSiblings, getRelatedDocuments, getOrgLinkMap } from "@/lib/queries/documents";
import DocumentBody from "@/components/documents/DocumentBody";
import { BookmarkButton } from "@/components/documents/BookmarkButton";
import { PrintButton } from "@/components/documents/PrintButton";
import { AddToPackageButton } from "@/components/documents/AddToPackageButton";
import { SaveToMyDocumentsButton } from "@/components/documents/SaveToMyDocumentsButton";
import { OrgMapProvider } from "@/components/documents/OrgMapProvider";
import { ReadAloudButton } from "@/components/analysis/ReadAloudButton";
import { DocumentSourcePanel } from "@/components/documents/DocumentSourcePanel";
import { resolveDocumentContent, resolveDocumentStudioAccess } from "@/lib/documents/content";

interface DocumentDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return { title: "Document Not Found — Olivia Brain" };
  const collectionLabel = doc.collection?.name ?? "Uncategorized";
  return {
    title: `${doc.title} — Documents — Olivia Brain`,
    description: doc.summary || `${doc.title} in the ${collectionLabel} collection.`,
  };
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const confidentialityColors: Record<string, string> = {
  public_access: "bg-green-900/40 text-green-300 border-green-700",
  internal: "bg-blue-900/40 text-blue-300 border-blue-700",
  confidential: "bg-amber-900/40 text-amber-300 border-amber-700",
  nda_required: "bg-red-900/40 text-red-300 border-red-700",
};

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { id } = await params;
  const { userId } = await getAuthSession();
  const doc = await getDocumentById(id);
  if (!doc) return notFound();

  // Privacy: if document is owned by another user, deny access
  if (doc.ownerUserId && doc.ownerUserId !== userId) {
    return notFound();
  }

  const [siblings, suggestedDocs, orgMap] = await Promise.all([
    getCollectionSiblings(doc.id, doc.collectionId ?? ""),
    getRelatedDocuments({
      id: doc.id,
      collectionId: doc.collectionId,
      audienceType: doc.audienceType,
      purposeType: doc.purposeType,
      documentType: doc.documentType,
    }),
    getOrgLinkMap(),
  ]);
  const collectionLabel = doc.collection?.name ?? "Uncategorized";
  const confColors = confidentialityColors[doc.confidentiality] || confidentialityColors.internal;
  const hasExplicitRelations = doc.fromRelations.length > 0 || doc.toRelations.length > 0;
  const documentContent = resolveDocumentContent(doc);
  const studioAccess = resolveDocumentStudioAccess({ ...doc, currentUserId: userId });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-xs text-[var(--muted)]">
        <Link href="/documents" className="hover:text-[var(--foreground)] transition-colors">
          Documents
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--foreground)]">{doc.title}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{doc.title}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {collectionLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Link
              href={`/documents/${doc.id}/edit`}
              className="flex items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] hover:border-indigo-500/50 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
              Edit
            </Link>
            {studioAccess.canOpen && (
              <Link
                href={`/documents/${doc.id}/studio`}
                className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors"
                style={{
                  background: "rgba(196, 169, 106, 0.1)",
                  borderColor: "rgba(196, 169, 106, 0.25)",
                  color: "#C4A96A",
                }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                Studio
              </Link>
            )}
            <PrintButton title={doc.title} />
            <BookmarkButton documentId={doc.id} />
            <SaveToMyDocumentsButton
              documentId={doc.id}
              isTemplate={doc.isTemplate}
              ownerUserId={doc.ownerUserId}
            />
            <AddToPackageButton documentId={doc.id} documentTitle={doc.title} />
            <span className={`rounded border px-3 py-1 text-xs font-medium uppercase whitespace-nowrap ${confColors}`}>
              {formatLabel(doc.confidentiality)}
            </span>
          </div>
        </div>

        {doc.summary && (
          <div className="mt-4">
            <p className="text-sm text-[var(--muted)] leading-relaxed">{doc.summary}</p>
            <div className="mt-2">
              <ReadAloudButton
                label="Read Summary"
                text={`${doc.title}. ${doc.summary}`}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
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
          {doc.isModular && (
            <span className="rounded bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-300">
              Modular
            </span>
          )}
          {doc.isTemplate && (
            <span className="rounded bg-amber-900/30 px-2.5 py-1 text-xs font-medium text-amber-300">
              Template
            </span>
          )}
        </div>
      </div>

      {/* Collection Navigation */}
      {siblings && siblings.total > 1 && (
        <div
          className="mb-8 flex items-center justify-between rounded-xl px-5 py-3"
          style={{
            background: "rgba(15, 23, 42, 0.82)",
            backdropFilter: "blur(16px) saturate(1.4)",
            border: "1px solid rgba(99, 102, 241, 0.12)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03) inset",
          }}
        >
          {/* Previous */}
          {siblings.prev ? (
            <Link
              href={`/documents/${siblings.prev.id}`}
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[#e2e8f0] transition-colors min-w-0 max-w-[35%]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="truncate">{siblings.prev.title}</span>
            </Link>
          ) : (
            <div />
          )}

          {/* Center — collection position */}
          <div className="text-[11px] text-[var(--muted)] font-medium shrink-0 px-3">
            {collectionLabel}
            <span className="ml-2 font-mono text-brand-400">
              {siblings.current} / {siblings.total}
            </span>
          </div>

          {/* Next */}
          {siblings.next ? (
            <Link
              href={`/documents/${siblings.next.id}`}
              className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[#e2e8f0] transition-colors min-w-0 max-w-[35%]"
            >
              <span className="truncate text-right">{siblings.next.title}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Full Document Content */}
      {documentContent.kind !== "empty" && (
        <div className="mb-8">
          {documentContent.kind === "external_link" || documentContent.kind === "stored_file" ? (
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
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Modules */}
          {doc.modules.length > 0 && (
            <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Modules ({doc.modules.length})
              </h2>
              <div className="space-y-3">
                {doc.modules.map((mod, i) => (
                  <div
                    key={mod.id}
                    className="rounded border border-[var(--card-border)] bg-[var(--background)] p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-indigo-900/40 text-[11px] font-bold text-indigo-300">
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium text-[var(--foreground)]">
                        {mod.moduleName}
                      </span>
                      <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px] text-slate-400">
                        {formatLabel(mod.moduleType)}
                      </span>
                    </div>
                    {mod.contentBody && (
                      <p className="mt-2 line-clamp-3 text-xs text-[var(--muted)]">
                        {mod.contentBody}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related Documents (explicit relationships) */}
          {hasExplicitRelations && (
            <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Related Documents
              </h2>
              <div className="space-y-2">
                {doc.fromRelations.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/documents/${rel.toDocument.id}`}
                    className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px]">
                      {formatLabel(rel.relationshipType)}
                    </span>
                    {rel.toDocument.title}
                  </Link>
                ))}
                {doc.toRelations.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/documents/${rel.fromDocument.id}`}
                    className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px]">
                      {formatLabel(rel.relationshipType)}
                    </span>
                    {rel.fromDocument.title}
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Version History */}
          {doc.versions.length > 0 && (
            <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                Versions ({doc.versions.length})
              </h2>
              <div className="space-y-2">
                {doc.versions.map((ver) => (
                  <div key={ver.id} className="text-xs">
                    <span className="font-medium text-[var(--foreground)]">v{ver.versionNumber}</span>
                    {ver.changeNotes && (
                      <span className="ml-2 text-[var(--muted)]">{ver.changeNotes}</span>
                    )}
                    <div className="text-[var(--muted)]">
                      {new Date(ver.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Packages using this doc */}
          {doc.packageDocs.length > 0 && (
            <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                In Packages ({doc.packageDocs.length})
              </h2>
              <div className="space-y-2">
                {doc.packageDocs.map((pd) => (
                  <Link
                    key={pd.id}
                    href={`/packages/${pd.package.id}`}
                    className="block text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {pd.package.name}
                    <span className="ml-2 rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px]">
                      {formatLabel(pd.package.packageStatus)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Suggested Documents — full width below grid */}
      {suggestedDocs.length > 0 && (
        <section className="mt-8 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            {hasExplicitRelations ? "See Also" : "You Might Also Need"}
          </h2>
          <div className="space-y-2">
            {suggestedDocs.map((s) => (
              <Link
                key={s.id}
                href={`/documents/${s.id}`}
                className="flex items-center justify-between gap-2 rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-xs transition-colors hover:border-indigo-500/30"
              >
                <div className="min-w-0">
                  <span className="text-[var(--foreground)] font-medium">{s.title}</span>
                  <span className="ml-2 text-[var(--muted)]">{s.collection?.name ?? "Uncategorized"}</span>
                </div>
                <span className="shrink-0 rounded bg-indigo-900/30 px-1.5 py-0.5 text-[11px] text-indigo-300">
                  {formatLabel(s.documentType)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
