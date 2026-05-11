/**
 * Shared user-company resolver for per-company agent handlers.
 *
 * Per-company doc-spawn agents (G1-033, G1-034, G1-036, G1-048, G1-050, …)
 * share the same dual-input contract:
 *
 *   - `userProfileId` is the canonical input — the engine's per-user mirror
 *     writes a briefing for that founder, and `spawnDocumentFromAgent`
 *     lands a `Document` on the founder's My Documents tile.
 *   - Explicit `companyName` / `sector` / `employeeCount` / etc. are the
 *     fallback for ad-hoc admin runs (no founder attached) or for testing.
 *
 * This helper centralises the lookup + fallback logic so each handler
 * just declares its own extension schema and consumes the typed
 * `ResolvedCompanyBase` plus whatever extra parsed fields it needs.
 *
 * Privacy contract: this helper reads `UserCompanyProfile` ONLY. It must
 * never project deadline data — that lives in `UserCompanyDeadline` and
 * is owned by that table per the global privacy rule (see `~/CLAUDE.md`).
 *
 * Ported byte-for-byte from London-Tech-Map src/lib/agents/resolve-company.ts
 * as the canonical pattern for OB agent handlers. The select() pulls only
 * the 10 columns OB's UserCompanyProfile currently exposes — when LTM-side
 * fields are needed (orgType, productStage, dnaParagraphsJson, etc.), add
 * them to the OB Prisma model first, then widen the select() here.
 */

import { z } from "zod";
import prisma from "@/lib/db/client";

// ─────────────────────────────────────────────────────────────────────────
// Input schema
// ─────────────────────────────────────────────────────────────────────────

/**
 * Base input schema every per-company agent shares.
 *
 * Handlers that need extra fields should `.extend(...)` (or define their
 * own strict schema) — keep `passthrough()` here so an extended-schema
 * parse on the same payload still sees the base fields.
 */
export const BaseCompanyInputSchema = z
  .object({
    userProfileId: z.string().min(1).max(100).optional(),
    companyName: z.string().min(1).max(200).optional(),
    sector: z.string().min(1).max(100).optional(),
    employeeCount: z.number().int().nonnegative().optional(),
    headquartersLocation: z.string().min(1).max(120).optional(),
  })
  .passthrough();

export type BaseCompanyInput = z.infer<typeof BaseCompanyInputSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Resolved shape
// ─────────────────────────────────────────────────────────────────────────

/**
 * Provenance tag for the resolved record. Handlers should surface this in
 * `outputData` so the founder + admin can see how the run was sourced.
 */
export type CompanySource = "input" | "profile" | "input+profile" | "default";

/**
 * Typed view of the company every per-company handler can rely on.
 *
 * Optional fields are `null` when neither the input nor the profile
 * supplied them — handlers decide whether to default further or to flag
 * the gap in the prompt.
 */
export interface ResolvedCompanyBase {
  companyName: string;
  sector: string;
  employeeCount: number | null;
  headquartersLocation: string;

  // Financial signals — useful for handlers like G1-048 (turnover proxy)
  // and G1-033 (data-processing scale heuristic).
  arr: number | null;
  totalRaised: number | null;

  // Compliance signals — surface directly to the prompt so the LLM can
  // reason about existing certifications and the company's regulator.
  certifications: string[];
  regulatoryBody: string | null;

  // Scale signal — number of data subjects the company handles.
  customerCount: number | null;

  // Provenance.
  source: CompanySource;
  profileMatched: boolean;
  /** The Clerk userId of the profile owner, when matched. Required by
   *  `spawnDocumentFromAgent` (which sets `Document.ownerUserId`). */
  ownerClerkUserId: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Resolver
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_HQ = "London, UK";
const DEFAULT_SECTOR = "technology";
const DEFAULT_COMPANY_NAME = "the Company";

/**
 * Resolve a per-company agent's input into a typed company record.
 *
 * - If `userProfileId` is present, pulls `UserCompanyProfile` and uses
 *   it as the base. Explicit input fields override profile fields.
 * - If the lookup fails (DB error, profile missing), falls back to
 *   input-only resolution and logs a warning. Never throws.
 * - If neither is supplied, returns a `default`-tagged record so
 *   handlers can still produce a generic output.
 */
export async function resolveUserCompany(
  rawInput: unknown,
): Promise<ResolvedCompanyBase> {
  const parsed = BaseCompanyInputSchema.safeParse(rawInput);
  const input = parsed.success ? parsed.data : ({} as BaseCompanyInput);

  let profileFields: Partial<ResolvedCompanyBase> = {};
  let profileMatched = false;
  let ownerClerkUserId: string | null = null;

  if (input.userProfileId) {
    try {
      const profile = await prisma.userCompanyProfile.findUnique({
        where: { userProfileId: input.userProfileId },
        select: {
          companyName: true,
          primarySector: true,
          headquartersLocation: true,
          employeeCount: true,
          arr: true,
          totalRaised: true,
          certifications: true,
          regulatoryBody: true,
          customerCount: true,
          userProfile: { select: { clerkUserId: true } },
        },
      });
      if (profile) {
        profileMatched = true;
        ownerClerkUserId = profile.userProfile?.clerkUserId ?? null;
        profileFields = {
          companyName: profile.companyName,
          sector: profile.primarySector ?? DEFAULT_SECTOR,
          headquartersLocation: profile.headquartersLocation ?? DEFAULT_HQ,
          employeeCount: profile.employeeCount,
          arr: profile.arr,
          totalRaised: profile.totalRaised,
          certifications: profile.certifications ?? [],
          regulatoryBody: profile.regulatoryBody,
          customerCount: profile.customerCount,
        };
      } else {
        console.warn(
          `[resolve-company] userProfileId=${input.userProfileId} not found; falling back to input-only resolution`,
        );
      }
    } catch (err) {
      console.error(
        `[resolve-company] UserCompanyProfile lookup failed for userProfileId=${input.userProfileId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const companyName =
    input.companyName?.trim() ||
    profileFields.companyName ||
    DEFAULT_COMPANY_NAME;
  const sector =
    input.sector?.trim() || profileFields.sector || DEFAULT_SECTOR;
  const employeeCount =
    input.employeeCount ?? profileFields.employeeCount ?? null;
  const headquartersLocation =
    input.headquartersLocation?.trim() ||
    profileFields.headquartersLocation ||
    DEFAULT_HQ;

  const hasInputFields = Boolean(
    input.companyName ||
      input.sector ||
      typeof input.employeeCount === "number" ||
      input.headquartersLocation,
  );

  let source: CompanySource = "default";
  if (profileMatched && hasInputFields) source = "input+profile";
  else if (profileMatched) source = "profile";
  else if (hasInputFields) source = "input";

  return {
    companyName,
    sector,
    employeeCount,
    headquartersLocation,
    arr: profileFields.arr ?? null,
    totalRaised: profileFields.totalRaised ?? null,
    certifications: profileFields.certifications ?? [],
    regulatoryBody: profileFields.regulatoryBody ?? null,
    customerCount: profileFields.customerCount ?? null,
    source,
    profileMatched,
    ownerClerkUserId,
  };
}
