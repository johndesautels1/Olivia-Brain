/**
 * Agent → Document mirror
 *
 * Turns an agent's markdown output into a row in the Document table so it
 * surfaces in the founder's existing **My Documents** tile + the
 * `/documents/[id]` workspace + Studio Olivia (`/documents/[id]/studio`).
 *
 * Mirrors the canonical creation contract used by
 * `src/app/api/documents/route.ts` POST (LTM) so the row renders identically:
 *   - ownerUserId is the Clerk userId of the founder (not UserProfile.id)
 *   - sourceKind = "studio_olivia" so My Documents shows the right chip
 *     (the agent system is part of Olivia — see DocSourceKind enum
 *     comment in schema.prisma)
 *   - DocumentVersion v1 is created alongside (matches POST behaviour)
 *
 * Idempotency: slug is `{kebab-title}-{agentRunId-tail-12}` — agent runs
 * have unique CUIDs so two runs for the same title produce different
 * slugs. Re-invoking with the same agentRunId returns the existing row
 * id instead of creating a duplicate.
 *
 * Best-effort: any failure is logged and returns null. Never throws —
 * the agent run completes regardless of whether the document spawned.
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/document-mirror.ts.
 * Document workspace routes are not yet ported to OB (Track B carry-forward);
 * once they land, the row this module creates already renders correctly
 * because the Prisma shape matches LTM's exactly.
 */

import type {
  ContentSourceType,
  DocAudienceType,
  DocumentType,
  FormatType,
  PurposeType,
  ConfidentialityLevel,
} from "@prisma/client";
import prisma from "@/lib/db/client";

export interface SpawnDocumentInput {
  /** UserProfile.id from agent input — handler resolves clerkUserId here. */
  userProfileId: string;
  /** AgentRun.id used as the idempotency key for the slug. */
  agentRunId: string;
  /** Agent identifier — used for log lines + DocumentVersion changeNotes. */
  agentId: string;
  /** Slug of the destination DocumentCollection (must already exist). */
  collectionSlug: string;
  /** Human-readable title (becomes the slug base + Document.title). */
  title: string;
  /** Markdown body the founder will see in the workspace editor. */
  body: string;
  /** Required Document enums — see schema.prisma for the full sets. */
  documentType: DocumentType;
  audienceType: DocAudienceType;
  purposeType: PurposeType;
  /** Defaults: markdown / rich_text / internal. */
  formatType?: FormatType;
  contentSourceType?: ContentSourceType;
  confidentiality?: ConfidentialityLevel;
  /** Short sub-line shown on the My Documents row card. */
  summary?: string | null;
}

export interface SpawnDocumentResult {
  documentId: string;
  slug: string;
  /** True if a row was created on this call; false if returned an existing match. */
  created: boolean;
}

const MAX_TITLE_SLUG_LEN = 60;

function deriveSlug(title: string, agentRunId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_TITLE_SLUG_LEN);
  const runTail = agentRunId.slice(-12);
  return `${base || "agent-output"}-${runTail}`;
}

/**
 * Create (or return existing) a Document row + initial DocumentVersion
 * for a markdown-output agent run. Returns null on any failure so the
 * caller's agent execution is never blocked by a Document write.
 */
export async function spawnDocumentFromAgent(
  input: SpawnDocumentInput,
): Promise<SpawnDocumentResult | null> {
  if (!input.body.trim()) {
    return null;
  }

  try {
    // 1. Resolve UserProfile → Clerk userId (Document.ownerUserId is the
    //    Clerk userId per /api/documents POST contract).
    const profile = await prisma.userProfile.findUnique({
      where: { id: input.userProfileId },
      select: { clerkUserId: true },
    });
    if (!profile) {
      console.warn(
        `[agent-doc-mirror] UserProfile ${input.userProfileId} not found; skipping ${input.agentId} run ${input.agentRunId}`,
      );
      return null;
    }
    const ownerUserId = profile.clerkUserId;

    // 2. Resolve collection by slug.
    const collection = await prisma.documentCollection.findUnique({
      where: { slug: input.collectionSlug },
      select: { id: true },
    });
    if (!collection) {
      console.warn(
        `[agent-doc-mirror] Collection slug "${input.collectionSlug}" not found; skipping ${input.agentId} run ${input.agentRunId}`,
      );
      return null;
    }

    const slug = deriveSlug(input.title, input.agentRunId);

    // 3. Idempotency: if a row already exists for this slug, return it.
    const existing = await prisma.document.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
    if (existing) {
      return { documentId: existing.id, slug: existing.slug, created: false };
    }

    // 4. Create the Document row — matches /api/documents POST contract.
    const doc = await prisma.document.create({
      data: {
        title: input.title.slice(0, 500),
        slug,
        collectionId: collection.id,
        documentType: input.documentType,
        audienceType: input.audienceType,
        purposeType: input.purposeType,
        formatType: input.formatType ?? "markdown",
        contentSourceType: input.contentSourceType ?? "rich_text",
        confidentiality: input.confidentiality ?? "internal",
        // status="active" so the doc surfaces in getUserDocuments (the
        // dashboard "My Documents" tile filters status:"active"). The
        // founder's review signal is authoringState:"draft" + the
        // gold "Studio Olivia" source chip — both render via the
        // existing dashboard tile UX.
        status: "active",
        authoringState: "draft",
        sourceKind: "studio_olivia",
        ownerUserId,
        summary: input.summary ?? null,
        storagePathOrBody: input.body,
      },
      select: { id: true, slug: true },
    });

    // 5. Initial DocumentVersion — matches the canonical pattern.
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        versionNumber: 1,
        titleSnapshot: input.title.slice(0, 500),
        contentSnapshot: input.body,
        changeNotes: `Generated by agent ${input.agentId}`,
        createdBy: ownerUserId,
      },
    });

    return { documentId: doc.id, slug: doc.slug, created: true };
  } catch (err) {
    console.error(
      `[agent-doc-mirror] Failed for ${input.agentId} run ${input.agentRunId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
