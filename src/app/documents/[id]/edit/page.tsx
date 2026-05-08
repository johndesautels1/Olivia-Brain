/**
 * `/documents/[id]/edit` — alternative edit-mode entry.
 *
 * OB-adapted from `D:\London-Tech-Map\src\app\documents\[id]\edit\page.tsx`.
 * Differences from LTM:
 * - `auth()` is async (Clerk v7).
 * - Next 16 routes: `params` is a Promise.
 * - `doc.collectionId` is `string | null` in OB (LTM marks required).
 *   DocumentEditor accepts the nullable value and falls back to empty
 *   string in its initialData mapping.
 */

import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { getDocumentById, getDocumentCollections } from "@/lib/queries/documents";

interface EditDocumentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditDocumentPageProps) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return { title: "Document Not Found — Olivia Brain" };
  return { title: `Edit: ${doc.title} — Olivia Brain` };
}

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const [doc, collections] = await Promise.all([
    getDocumentById(id),
    getDocumentCollections(),
  ]);

  if (!doc) return notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-[var(--muted)]">
        <Link href="/documents" className="hover:text-[var(--foreground)] transition-colors">
          Documents
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/documents/${doc.id}`}
          className="hover:text-[var(--foreground)] transition-colors"
        >
          {doc.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--foreground)]">Edit</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Edit Document</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Modify your document. Changes create a new version automatically.
        </p>
      </div>

      <DocumentEditor
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
        initialData={{
          id: doc.id,
          title: doc.title,
          collectionId: doc.collectionId ?? "",
          documentType: doc.documentType,
          audienceType: doc.audienceType,
          purposeType: doc.purposeType,
          formatType: doc.formatType,
          confidentiality: doc.confidentiality,
          summary: doc.summary,
          content: doc.storagePathOrBody,
          status: doc.status,
        }}
      />
    </div>
  );
}
