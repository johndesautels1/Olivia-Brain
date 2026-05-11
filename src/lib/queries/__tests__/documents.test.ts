/**
 * documents queries — post-migration-11 upgrade tests.
 *
 * Locks down the four query functions upgraded from stubs to real
 * implementations after migration 11 (Track H S21) added the
 * DocumentCollection + DocumentVersion tables:
 *   1. getDocumentCollections — real findMany against active rows.
 *   2. getDocumentById — includes collection + versions relations.
 *   3. getCollectionSiblings — prev/current/next/total navigation.
 *   4. getDocumentFilterOptions — real collections list.
 *
 * Prisma is mocked at the module surface.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  default: {
    documentCollection: { findMany: vi.fn() },
    document: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

import prisma from "@/lib/db/client";
import {
  getDocumentCollections,
  getDocumentById,
  getCollectionSiblings,
  getDocumentFilterOptions,
} from "../documents";

const p = prisma as unknown as {
  documentCollection: { findMany: ReturnType<typeof vi.fn> };
  document: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  p.documentCollection.findMany.mockReset();
  p.document.findMany.mockReset();
  p.document.findUnique.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getDocumentCollections", () => {
  it("returns active collections with document counts", async () => {
    p.documentCollection.findMany.mockResolvedValueOnce([
      { id: "cdoc_legal_compliance", name: "Legal & Compliance", slug: "legal-compliance", _count: { documents: 3 } },
      { id: "cdoc_pitch_decks", name: "Pitch Decks", slug: "pitch-decks", _count: { documents: 5 } },
    ]);
    const result = await getDocumentCollections();
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("legal-compliance");
    expect(result[1]._count.documents).toBe(5);
    expect(p.documentCollection.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { documents: true } },
      },
      orderBy: { name: "asc" },
    });
  });
});

describe("getDocumentById", () => {
  it("includes collection + versions relations (migration 11 additions)", async () => {
    p.document.findUnique.mockResolvedValueOnce({
      id: "doc1",
      collection: { id: "c1", name: "X" },
      versions: [],
    });
    await getDocumentById("doc1");
    const args = p.document.findUnique.mock.calls[0][0];
    expect(args.where).toEqual({ id: "doc1" });
    expect(args.include.collection).toBeDefined();
    expect(args.include.versions).toBeDefined();
    expect(args.include.packageDocs).toBeDefined();
    // versions ordered desc + capped at 10
    expect(args.include.versions.orderBy).toEqual({ versionNumber: "desc" });
    expect(args.include.versions.take).toBe(10);
  });
});

describe("getCollectionSiblings", () => {
  it("returns null when collectionId is empty", async () => {
    const result = await getCollectionSiblings("doc1", "");
    expect(result).toBeNull();
    expect(p.document.findMany).not.toHaveBeenCalled();
  });

  it("returns null when the doc is not found in its collection", async () => {
    p.document.findMany.mockResolvedValueOnce([
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
    ]);
    const result = await getCollectionSiblings("missing", "c1");
    expect(result).toBeNull();
  });

  it("returns the prev/current/next/total for the middle document", async () => {
    p.document.findMany.mockResolvedValueOnce([
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
      { id: "c", title: "Charlie" },
    ]);
    const result = await getCollectionSiblings("b", "c1");
    expect(result).toEqual({
      prev: { id: "a", title: "Alpha" },
      current: 2,
      next: { id: "c", title: "Charlie" },
      total: 3,
    });
  });

  it("returns null prev for the first document", async () => {
    p.document.findMany.mockResolvedValueOnce([
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
    ]);
    const result = await getCollectionSiblings("a", "c1");
    expect(result?.prev).toBeNull();
    expect(result?.next).toEqual({ id: "b", title: "Beta" });
    expect(result?.current).toBe(1);
    expect(result?.total).toBe(2);
  });

  it("returns null next for the last document", async () => {
    p.document.findMany.mockResolvedValueOnce([
      { id: "a", title: "Alpha" },
      { id: "b", title: "Beta" },
    ]);
    const result = await getCollectionSiblings("b", "c1");
    expect(result?.prev).toEqual({ id: "a", title: "Alpha" });
    expect(result?.next).toBeNull();
    expect(result?.current).toBe(2);
  });

  it("returns null on an empty collection", async () => {
    p.document.findMany.mockResolvedValueOnce([]);
    expect(await getCollectionSiblings("doc1", "c1")).toBeNull();
  });
});

describe("getDocumentFilterOptions", () => {
  it("returns active collections for the filter dropdown", async () => {
    p.documentCollection.findMany.mockResolvedValueOnce([
      { id: "c1", name: "Alpha", slug: "alpha" },
      { id: "c2", name: "Beta", slug: "beta" },
    ]);
    const result = await getDocumentFilterOptions();
    expect(result.collections).toHaveLength(2);
    expect(result.collections[0].slug).toBe("alpha");
  });
});
