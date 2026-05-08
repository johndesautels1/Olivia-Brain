/**
 * `/documents/new` — create-new-document wizard.
 *
 * OB-adapted from `D:\London-Tech-Map\src\app\documents\new\page.tsx`.
 * Differences from LTM:
 * - `auth()` from `@clerk/nextjs/server` is async in Clerk v7 (Track F).
 * - `getDocumentCollections()` returns `[]` in OB until the
 *   DocumentCollection table ports — DocumentEditor renders with an
 *   empty collection dropdown which is intentional.
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { DocumentEditor } from "@/components/documents/DocumentEditor";
import { getDocumentCollections } from "@/lib/queries/documents";

export const metadata = {
  title: "New Document — Olivia Brain",
  description: "Create a new strategic document.",
};

export default async function NewDocumentPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const collections = await getDocumentCollections();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-[var(--muted)]">
        <Link href="/documents" className="hover:text-[var(--foreground)] transition-colors">
          Documents
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[var(--foreground)]">New Document</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Create New Document</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Write and publish a strategic document. Use Markdown for rich content formatting.
        </p>
      </div>

      <DocumentEditor
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
