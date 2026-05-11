import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth/session";
import { getDocumentById, getUserCopyOfTemplate } from "@/lib/queries/documents";
import { COLLECTION_DNA_MAP } from "@/lib/analysis/constants";
import { DocumentWorkspaceClient } from "./DocumentWorkspaceClient";
import prisma from "@/lib/db/client";
import { canOpenDocumentStudio } from "@/lib/documents/content";

interface WorkspacePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WorkspacePageProps) {
  const { id } = await params;
  const doc = await getDocumentById(id);
  if (!doc) return { title: "Document Not Found — Olivia Brain" };
  return {
    title: `Workspace: ${doc.title} — Olivia Brain`,
  };
}

export default async function DocumentWorkspacePage({
  params,
}: WorkspacePageProps) {
  const { id } = await params;
  const { userId } = await getAuthSession();
  if (!userId) redirect("/sign-in");

  const doc = await getDocumentById(id);
  if (!doc) return notFound();

  // Privacy: if document is owned by another user, deny access
  if (doc.ownerUserId && doc.ownerUserId !== userId) {
    return notFound();
  }

  // Redirect: if this is a template and the user already has a copy, go to their copy
  if (doc.isTemplate && !doc.ownerUserId) {
    const existingCopy = await getUserCopyOfTemplate(userId, doc.id);
    if (existingCopy) {
      redirect(`/documents/${existingCopy.id}/workspace`);
    }
  }

  if (!canOpenDocumentStudio({ ...doc, currentUserId: userId })) {
    redirect(`/documents/${doc.id}`);
  }

  // Fetch DNA paragraphs for the current user (from their analysis profile)
  const dnaParagraphs = await getDnaParagraphs(userId);

  // Get collection slug for DNA mapping
  const collectionSlug = doc.collection?.slug || "";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Breadcrumb navigation */}
      <nav
        className="px-4 py-2 text-xs text-[var(--muted)]"
        style={{
          background: "rgba(15, 18, 25, 0.6)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
        }}
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center gap-0">
          <li>
            <Link
              href="/documents"
              className="hover:text-[var(--foreground)] transition-colors"
            >
              Documents
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="mx-2">/</span>
          </li>
          <li>
            <Link
              href={`/documents/${doc.id}`}
              className="hover:text-[var(--foreground)] transition-colors"
            >
              {doc.title}
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="mx-2">/</span>
          </li>
          <li>
            <span className="text-[var(--foreground)]">Workspace</span>
          </li>
        </ol>
      </nav>

      {/* Workspace fills remaining height */}
      <DocumentWorkspaceClient
        documentId={doc.id}
        title={doc.title}
        slug={doc.slug}
        collectionSlug={collectionSlug}
        collectionName={doc.collection?.name || "Documents"}
        documentType={doc.documentType}
        audienceType={doc.audienceType}
        purposeType={doc.purposeType}
        confidentiality={doc.confidentiality}
        summary={doc.summary}
        content={doc.storagePathOrBody}
        dnaParagraphs={dnaParagraphs}
        dnaMap={COLLECTION_DNA_MAP}
      />
    </div>
  );
}

// ── Helper: Fetch DNA paragraphs for the user ──────────────────────────

async function getDnaParagraphs(
  clerkUserId: string
): Promise<Record<string, string>> {
  try {
    // Find the user's profile, then their most recent analysis result
    const userProfile = await prisma.userProfile.findUnique({
      where: { clerkUserId },
      select: { id: true },
    });

    if (!userProfile) return {};

    // Get the most recent analysis result which contains companyProfile.paragraphs
    const result = await prisma.analysisResult.findFirst({
      where: { userProfileId: userProfile.id },
      select: { companyProfile: true },
      orderBy: { createdAt: "desc" },
    });

    if (!result?.companyProfile) return {};

    // companyProfile is a Json field containing { paragraphs: { p1: "...", p2: "...", ... } }
    const profile = result.companyProfile as Record<string, unknown>;
    const paragraphs = profile.paragraphs;

    if (typeof paragraphs === "object" && paragraphs !== null) {
      return paragraphs as Record<string, string>;
    }

    return {};
  } catch {
    // Graceful fallback — workspace works without DNA
    return {};
  }
}
