/**
 * `lib/queries/documents` — OB-adapted port of LTM's documents queries.
 *
 * **Source:** `D:\London-Tech-Map\src\lib\queries\documents.ts`
 *
 * **OB-only adaptations** (LTM-only tables stub to empty / null):
 * - `prisma.documentCollection.*` → returns `[]`. OB doesn't have a
 *   DocumentCollection table; documents are listed un-grouped.
 * - `prisma.organization.*` → returns `[]` for `getOrgLinkMap`. OB
 *   doesn't have an Organization table; the autolinker resolves only
 *   its EXTERNAL_ENTITIES list of public URLs without an org map.
 * - `Document.collection` relation → not selected. Routes that need
 *   the collection name fall back to a default label.
 * - `Document.modules`, `versions`, `fromRelations`, `toRelations` →
 *   not selected. OB doesn't have those tables.
 *
 * **`unstable_cache` is dropped** in this port. Re-add when OB cache
 * invalidation rules are decided (deferred).
 *
 * **Function signatures stay LTM-compatible** so consumers (the
 * documents app routes ported in S8d-routes) read against this
 * module byte-for-byte even with the data adaptations below.
 */

import prisma from "@/lib/db/client";
import type {
  DocAudienceType,
  DocStatus,
  DocumentType,
  PurposeType,
  ConfidentialityLevel,
} from "@prisma/client";

/** Returns active DocumentCollection rows with their document counts.
 *  Migration 11 (Track H S21) seeded the 12 LTM-aligned collections;
 *  this now hits the real table instead of returning []. */
export async function getDocumentCollections(): Promise<
  Array<{ id: string; name: string; slug: string; _count: { documents: number } }>
> {
  return prisma.documentCollection.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { documents: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getDocuments(filters?: {
  collectionId?: string;
  audienceType?: string;
  purposeType?: string;
  confidentiality?: string;
  documentType?: string;
  search?: string;
}) {
  const where: Record<string, unknown> = {
    status: "active" as DocStatus,
    ownerUserId: null,
  };

  // collectionId filter is preserved for parity but no-ops until
  // DocumentCollection ports — every Document has a nullable collectionId
  // string that callers can pass through, but the DB has no FK target
  // yet so the filter just narrows by string equality.
  if (filters?.collectionId) where.collectionId = filters.collectionId;
  if (filters?.audienceType) where.audienceType = filters.audienceType as DocAudienceType;
  if (filters?.purposeType) where.purposeType = filters.purposeType as PurposeType;
  if (filters?.confidentiality) {
    where.confidentiality = filters.confidentiality as ConfidentialityLevel;
  }
  if (filters?.documentType) where.documentType = filters.documentType as DocumentType;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { summary: { contains: filters.search, mode: "insensitive" } },
      { previewText: { contains: filters.search, mode: "insensitive" } },
      { storagePathOrBody: { contains: filters.search, mode: "insensitive" } },
    ];
    // LTM's modules-content search branch is removed — OB doesn't have
    // DocumentModule. Re-adds when modules port.
  }

  return prisma.document.findMany({
    where,
    // No `collection`, `_count.modules`, `_count.versions` — those
    // relations don't exist in OB. `_count.packageDocs` is preserved.
    include: {
      _count: { select: { packageDocs: true } },
    },
    orderBy: [{ title: "asc" }],
  });
}

export async function getDocumentById(id: string) {
  return prisma.document.findUnique({
    where: { id },
    // Migration 13 (Track B 8d-routes-2) added DocumentModule +
    // DocumentRelationship. Migration 11 added DocumentCollection +
    // DocumentVersion. All five relations are now selected.
    include: {
      packageDocs: {
        include: {
          package: { select: { id: true, name: true, packageStatus: true } },
        },
      },
      collection: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          collectionType: true,
        },
      },
      versions: {
        select: {
          id: true,
          versionNumber: true,
          titleSnapshot: true,
          changeNotes: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: { versionNumber: "desc" },
        take: 10,
      },
      modules: {
        orderBy: { sortOrder: "asc" },
      },
      fromRelations: {
        include: {
          toDocument: {
            select: {
              id: true,
              title: true,
              slug: true,
              documentType: true,
              audienceType: true,
              confidentiality: true,
            },
          },
        },
      },
      toRelations: {
        include: {
          fromDocument: {
            select: {
              id: true,
              title: true,
              slug: true,
              documentType: true,
              audienceType: true,
              confidentiality: true,
            },
          },
        },
      },
    },
  });
}

/** Returns sibling documents within the same collection so the detail
 *  page can render prev/current/next navigation. Sorted by title for
 *  predictable ordering. Returns null when the document has no
 *  collectionId (un-grouped documents). */
export async function getCollectionSiblings(
  docId: string,
  collectionId: string,
): Promise<{
  prev: { id: string; title: string } | null;
  current: number;
  next: { id: string; title: string } | null;
  total: number;
} | null> {
  if (!collectionId) return null;
  const siblings = await prisma.document.findMany({
    where: {
      collectionId,
      status: "active" as DocStatus,
      ownerUserId: null,
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  if (siblings.length === 0) return null;
  const index = siblings.findIndex((s) => s.id === docId);
  if (index === -1) return null;
  return {
    prev: index > 0 ? siblings[index - 1] : null,
    current: index + 1,
    next: index < siblings.length - 1 ? siblings[index + 1] : null,
    total: siblings.length,
  };
}

/** OB-adapted — scores related documents by overlapping audience /
 *  purpose / type only (LTM also uses collection overlap, which OB
 *  doesn't have). */
export async function getRelatedDocuments(doc: {
  id: string;
  collectionId: string | null;
  audienceType: string;
  purposeType: string;
  documentType: string;
}) {
  const suggestions = await prisma.document.findMany({
    where: {
      id: { not: doc.id },
      status: "active" as DocStatus,
      ownerUserId: null,
      OR: [
        {
          audienceType: doc.audienceType as DocAudienceType,
          purposeType: doc.purposeType as PurposeType,
        },
        { documentType: doc.documentType as DocumentType },
        ...(doc.collectionId ? [{ collectionId: doc.collectionId }] : []),
      ],
    },
    select: {
      id: true,
      title: true,
      documentType: true,
      audienceType: true,
      confidentiality: true,
      collection: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  const scored = suggestions.map((s) => {
    let score = 0;
    if (s.audienceType === doc.audienceType) score += 2;
    if (s.documentType === doc.documentType) score += 2;
    return { ...s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 4);
}

/** OB stub — no Organization table; the autolinker resolves only its
 *  EXTERNAL_ENTITIES list of public URLs (UK gov, regulators, major
 *  tech, industry bodies, data standards) without an org map. */
export async function getOrgLinkMap(): Promise<
  Array<{ name: string; slug: string; website: string | null }>
> {
  return [];
}

/** OB stub — cascade-pipeline news articles aren't in OB yet. Returns
 *  empty list so any consumer renders the empty-state branch. */
export async function getNewsArticles(): Promise<
  Array<{
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    body: string | null;
    source: "insight" | "report";
    collectionName: string;
    publishedAt: string;
    coverImageUrl: string | null;
  }>
> {
  return [];
}

/**
 * Returns documents owned by a specific user that AREN'T members of
 * any non-archived package. Mental model from LTM (see lib/queries/documents
 * source): "if a doc is in a package, the package is its home."
 */
export async function getUserDocuments(ownerUserId: string) {
  return prisma.document.findMany({
    where: {
      ownerUserId,
      status: "active" as DocStatus,
      packageDocs: {
        none: {
          package: {
            packageStatus: { not: "package_archived" },
          },
        },
      },
    },
    include: {
      sourceTemplate: { select: { id: true, title: true, slug: true } },
      _count: { select: { packageDocs: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getUserPackagesForPicker(ownerUserId: string) {
  return prisma.package.findMany({
    where: {
      ownerUserId,
      packageStatus: { notIn: ["package_archived", "closed"] },
    },
    select: {
      id: true,
      name: true,
      outreachGoal: true,
      packageStatus: true,
      _count: { select: { packageDocuments: true } },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

/** Compound-unique lookup matching the fork endpoint's idempotency
 *  check. */
export async function getUserCopyOfTemplate(
  ownerUserId: string,
  templateId: string,
) {
  return prisma.document.findFirst({
    where: {
      ownerUserId,
      sourceTemplateId: templateId,
      status: "active" as DocStatus,
    },
    select: { id: true, slug: true, updatedAt: true },
  });
}

/** Returns the active DocumentCollection rows for the filter dropdown.
 *  Migration 11 (Track H S21) seeded these — no longer a stub. */
export async function getDocumentFilterOptions(): Promise<{
  collections: Array<{ id: string; name: string; slug: string }>;
}> {
  const collections = await prisma.documentCollection.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
  return { collections };
}
