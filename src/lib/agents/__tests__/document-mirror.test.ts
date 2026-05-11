/**
 * document-mirror — spawn contract + idempotency + best-effort tests
 *
 * Locks down four behaviours:
 *   1. Early exit on empty body (no DB calls).
 *   2. Best-effort: missing UserProfile / missing collection / thrown
 *      Prisma error → null, never throws.
 *   3. Idempotency: existing slug returns {created: false} with no
 *      DocumentVersion write.
 *   4. Happy path: Document + DocumentVersion v1 created with the
 *      canonical /api/documents POST shape.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  default: {
    userProfile: { findUnique: vi.fn() },
    documentCollection: { findUnique: vi.fn() },
    document: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    documentVersion: { create: vi.fn() },
  },
}));

import prisma from "@/lib/db/client";
import { spawnDocumentFromAgent } from "../document-mirror";

const p = prisma as unknown as {
  userProfile: { findUnique: ReturnType<typeof vi.fn> };
  documentCollection: { findUnique: ReturnType<typeof vi.fn> };
  document: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  documentVersion: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  p.userProfile.findUnique.mockReset();
  p.documentCollection.findUnique.mockReset();
  p.document.findUnique.mockReset();
  p.document.create.mockReset();
  p.documentVersion.create.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const BASE_INPUT = {
  userProfileId: "user_profile_abc",
  agentRunId: "run_0123456789abcdef",
  agentId: "G1-033",
  collectionSlug: "legal-compliance",
  title: "DPIA — Aether Labs",
  body: "## DPIA\n\nFull markdown body here.",
  documentType: "legal_agreement" as const,
  audienceType: "internal" as const,
  purposeType: "diligence" as const,
};

describe("spawnDocumentFromAgent · early exits", () => {
  it("returns null for an empty body (no DB calls)", async () => {
    const result = await spawnDocumentFromAgent({ ...BASE_INPUT, body: "   " });
    expect(result).toBeNull();
    expect(p.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when UserProfile is not found", async () => {
    p.userProfile.findUnique.mockResolvedValueOnce(null);
    const result = await spawnDocumentFromAgent(BASE_INPUT);
    expect(result).toBeNull();
    expect(p.documentCollection.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when DocumentCollection slug is not found", async () => {
    p.userProfile.findUnique.mockResolvedValueOnce({ clerkUserId: "u_clerk" });
    p.documentCollection.findUnique.mockResolvedValueOnce(null);
    const result = await spawnDocumentFromAgent(BASE_INPUT);
    expect(result).toBeNull();
    expect(p.document.create).not.toHaveBeenCalled();
  });
});

describe("spawnDocumentFromAgent · idempotency", () => {
  it("returns existing row with created=false when slug already exists", async () => {
    p.userProfile.findUnique.mockResolvedValueOnce({ clerkUserId: "u_clerk" });
    p.documentCollection.findUnique.mockResolvedValueOnce({ id: "coll_legal" });
    p.document.findUnique.mockResolvedValueOnce({
      id: "doc_existing",
      slug: "dpia-aether-labs-456789abcdef",
    });
    const result = await spawnDocumentFromAgent(BASE_INPUT);
    expect(result).toEqual({
      documentId: "doc_existing",
      slug: "dpia-aether-labs-456789abcdef",
      created: false,
    });
    expect(p.document.create).not.toHaveBeenCalled();
    expect(p.documentVersion.create).not.toHaveBeenCalled();
  });
});

describe("spawnDocumentFromAgent · happy path", () => {
  it("creates Document + DocumentVersion v1 with canonical shape", async () => {
    p.userProfile.findUnique.mockResolvedValueOnce({ clerkUserId: "u_clerk" });
    p.documentCollection.findUnique.mockResolvedValueOnce({ id: "coll_legal" });
    p.document.findUnique.mockResolvedValueOnce(null);
    p.document.create.mockResolvedValueOnce({
      id: "doc_new",
      slug: "dpia-aether-labs-456789abcdef",
    });
    p.documentVersion.create.mockResolvedValueOnce({ id: "ver_new" });

    const result = await spawnDocumentFromAgent({
      ...BASE_INPUT,
      summary: "DPIA REQUIRED — Aether Labs.",
    });

    expect(result).toEqual({
      documentId: "doc_new",
      slug: "dpia-aether-labs-456789abcdef",
      created: true,
    });

    const createArgs = p.document.create.mock.calls[0][0].data;
    expect(createArgs).toMatchObject({
      title: "DPIA — Aether Labs",
      slug: "dpia-aether-labs-456789abcdef",
      collectionId: "coll_legal",
      documentType: "legal_agreement",
      audienceType: "internal",
      purposeType: "diligence",
      formatType: "markdown",
      contentSourceType: "rich_text",
      confidentiality: "internal",
      status: "active",
      authoringState: "draft",
      sourceKind: "studio_olivia",
      ownerUserId: "u_clerk",
      summary: "DPIA REQUIRED — Aether Labs.",
      storagePathOrBody: "## DPIA\n\nFull markdown body here.",
    });

    const versionArgs = p.documentVersion.create.mock.calls[0][0].data;
    expect(versionArgs).toMatchObject({
      documentId: "doc_new",
      versionNumber: 1,
      titleSnapshot: "DPIA — Aether Labs",
      contentSnapshot: "## DPIA\n\nFull markdown body here.",
      changeNotes: "Generated by agent G1-033",
      createdBy: "u_clerk",
    });
  });

  it("respects caller-supplied formatType / contentSourceType / confidentiality overrides", async () => {
    p.userProfile.findUnique.mockResolvedValueOnce({ clerkUserId: "u" });
    p.documentCollection.findUnique.mockResolvedValueOnce({ id: "c" });
    p.document.findUnique.mockResolvedValueOnce(null);
    p.document.create.mockResolvedValueOnce({ id: "d", slug: "s" });
    p.documentVersion.create.mockResolvedValueOnce({ id: "v" });

    await spawnDocumentFromAgent({
      ...BASE_INPUT,
      formatType: "block_json",
      contentSourceType: "stored_file",
      confidentiality: "confidential",
    });

    expect(p.document.create.mock.calls[0][0].data).toMatchObject({
      formatType: "block_json",
      contentSourceType: "stored_file",
      confidentiality: "confidential",
    });
  });
});

describe("spawnDocumentFromAgent · slug derivation", () => {
  async function deriveOnly(title: string, runId: string): Promise<string> {
    p.userProfile.findUnique.mockResolvedValueOnce({ clerkUserId: "u" });
    p.documentCollection.findUnique.mockResolvedValueOnce({ id: "c" });
    p.document.findUnique.mockResolvedValueOnce(null);
    p.document.create.mockImplementationOnce(async (args: { data: { slug: string } }) => ({
      id: "d",
      slug: args.data.slug,
    }));
    p.documentVersion.create.mockResolvedValueOnce({ id: "v" });

    const r = await spawnDocumentFromAgent({
      ...BASE_INPUT,
      agentRunId: runId,
      title,
    });
    return r!.slug;
  }

  it("kebabs the title and appends the 12-char runId tail", async () => {
    const slug = await deriveOnly("DPIA: Aether/Labs (2026)!", "abcdef1234567890");
    // lowercased + non-alnum → "-" + strip trailing "-" + tail(12) of runId.
    expect(slug).toBe("dpia-aether-labs-2026-ef1234567890");
  });

  it("falls back to 'agent-output' when the title slug is empty", async () => {
    const slug = await deriveOnly("!!!", "xxxxxxxxxxxxxxxx");
    expect(slug).toBe("agent-output-xxxxxxxxxxxx");
  });

  it("caps the title portion at 60 chars before adding the runId tail", async () => {
    const long = "a".repeat(120);
    const slug = await deriveOnly(long, "yyyyyyyyyyyyyyyy");
    const [head] = slug.split(/-y+$/);
    expect(head.length).toBeLessThanOrEqual(60);
  });
});

describe("spawnDocumentFromAgent · never throws", () => {
  it("returns null when Document.create rejects", async () => {
    p.userProfile.findUnique.mockResolvedValueOnce({ clerkUserId: "u" });
    p.documentCollection.findUnique.mockResolvedValueOnce({ id: "c" });
    p.document.findUnique.mockResolvedValueOnce(null);
    p.document.create.mockRejectedValueOnce(new Error("unique constraint"));
    const result = await spawnDocumentFromAgent(BASE_INPUT);
    expect(result).toBeNull();
  });
});
