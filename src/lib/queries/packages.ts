/**
 * `lib/queries/packages` — OB-adapted port of LTM's packages queries.
 *
 * **Source:** `D:\London-Tech-Map\src\lib\queries\packages.ts`
 *
 * **OB-only adaptations:**
 * - `targetList`, `packageTemplate` includes are dropped — OB doesn't
 *   have TargetList / PackageTemplate tables yet (port when those
 *   surfaces ship).
 * - `_count.recipients` + `_count.events` likewise dropped —
 *   PackageRecipient + PackageEvent not in OB.
 * - `getPackageById`'s deep includes (recipients with organization +
 *   person, events) — adapted to just packageDocuments + their
 *   document inclusion.
 * - `getPackageTemplates`, `getAvailableDocuments`,
 *   `getTargetListsForPackage`, `addRecipient` reference unported
 *   tables — exported as no-op stubs so callers don't crash; full
 *   implementations land when those tables port.
 */

import crypto from "crypto";

import prisma from "@/lib/db/client";
import type { OutreachGoal, PackageStatus } from "@prisma/client";

export async function getPackages(filters?: {
  status?: string;
  goal?: string;
  ownerUserId?: string;
  includeArchived?: boolean;
}) {
  return prisma.package.findMany({
    where: {
      ...(filters?.ownerUserId ? { ownerUserId: filters.ownerUserId } : {}),
      ...(filters?.status
        ? { packageStatus: filters.status as PackageStatus }
        : filters?.includeArchived
          ? {}
          : { packageStatus: { not: "package_archived" } }),
      ...(filters?.goal ? { outreachGoal: filters.goal as OutreachGoal } : {}),
    },
    include: {
      _count: { select: { packageDocuments: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPackageById(id: string) {
  return prisma.package.findUnique({
    where: { id },
    include: {
      packageDocuments: {
        include: {
          document: {
            select: {
              id: true,
              title: true,
              documentType: true,
              audienceType: true,
              confidentiality: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function createPackage(data: {
  name: string;
  outreachGoal: string;
  summary?: string;
  ownerUserId?: string;
}) {
  // LTM uses 16-byte hex; OB matches for the public share-token shape
  // even though hex is wider than the base64url that S8b-routes share
  // tokens use — different contexts, different shapes is fine.
  const shareToken = crypto.randomBytes(16).toString("hex");

  return prisma.package.create({
    data: {
      name: data.name,
      outreachGoal: data.outreachGoal as OutreachGoal,
      summary: data.summary,
      ownerUserId: data.ownerUserId,
      shareToken,
      packageStatus: "draft",
    },
  });
}

export async function addDocumentToPackage(data: {
  packageId: string;
  documentId: string;
  sortOrder?: number;
  customIntro?: string;
}) {
  return prisma.packageDocument.upsert({
    where: {
      packageId_documentId: {
        packageId: data.packageId,
        documentId: data.documentId,
      },
    },
    update: {
      sortOrder: data.sortOrder ?? 0,
      customIntro: data.customIntro,
    },
    create: {
      packageId: data.packageId,
      documentId: data.documentId,
      sortOrder: data.sortOrder ?? 0,
      customIntro: data.customIntro,
    },
  });
}

export async function removeDocumentFromPackage(
  packageId: string,
  documentId: string,
) {
  return prisma.packageDocument.deleteMany({
    where: { packageId, documentId },
  });
}

export async function updatePackageStatus(id: string, status: string) {
  return prisma.package.update({
    where: { id },
    data: { packageStatus: status as PackageStatus },
  });
}

/** OB stub — PackageTemplate not ported. */
export async function getPackageTemplates(): Promise<Array<never>> {
  return [];
}

/** OB-adapted — returns all non-archived documents (LTM additionally
 *  joined with collection name; OB returns the document fields
 *  directly). */
export async function getAvailableDocuments() {
  return prisma.document.findMany({
    where: { status: { not: "archived" } },
    orderBy: { title: "asc" },
  });
}

/** OB stub — TargetList not ported. */
export async function getTargetListsForPackage(): Promise<Array<never>> {
  return [];
}
