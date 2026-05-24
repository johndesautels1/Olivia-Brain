/**
 * OLIVIA BRAIN — CRISTIANO VERDICT ENVELOPE (V1)
 * ================================================
 *
 * Vendor-neutral discriminated union for Cristiano verdicts that flow
 * through Olivia Brain from linked apps (LTM, lifescore) or are
 * rendered by OB itself.
 *
 * Per founder direction 2026-05-25, Cristiano is THE JUDGE — a one-way
 * verdict surface. Inputs are structured rubric payloads; outputs are
 * a structured verdict + a spoken script the LiveAvatar LITE pipeline
 * narrates. See `docs/HEYGEN_LTM_CONFIG.md` § 0 for the persona wiring.
 *
 * Design notes:
 * - Discriminated union on `kind` lets each consuming app carry its
 *   own native verdict shape without polluting the rest. Adding a new
 *   `kind` is a 3-step compile-time-enforced diff (id tuple + schema
 *   + Prisma row) mirroring `src/lib/avatar/personas.ts` precedent.
 * - Zod schemas at every boundary (per 2026 "Inputs" bar).
 * - Result-style discriminated unions for validators (per 2026
 *   "Errors" bar — never throw across a boundary; return a tagged
 *   union the caller branches on).
 *
 * Cite-able sources for each kind's shape:
 *   - startup_match:  LTM `src/lib/analysis/cristiano.ts:62-93`
 *                     (`CristianoMatch` + `CristianoResult`)
 *   - city_compare:   lifescore `src/components/JudgeTab.tsx:98-131`
 *                     (`JudgeReport`)
 *   - freeform:       OB-native — no upstream precedent, designed for
 *                     "Ask Cristiano" dashboard sub-tab
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { z } from "zod";

// ─── Eligibility (mirror of personas.ts pattern) ─────────────────────────────

/**
 * The set of verdict kinds Cristiano can render today.
 *
 * Adding a new kind is a compile-time-enforced 3-step diff:
 *   1. Add the literal to `CRISTIANO_VERDICT_KINDS` below.
 *   2. Add a Zod schema for its request payload + verdict body.
 *   3. Add the kind to `CristianoVerdictRequestSchema` discriminated
 *      union and `CristianoVerdictBodySchema` discriminated union.
 *
 * TypeScript will fail the build if the union members drift from the
 * tuple — the `Record<CristianoVerdictKind, ...>` lookup tables in
 * `validators.ts` make every miss a build error.
 */
export const CRISTIANO_VERDICT_KINDS = [
  "startup_match",
  "city_compare",
  "freeform",
] as const;
export type CristianoVerdictKind = (typeof CRISTIANO_VERDICT_KINDS)[number];

export const CristianoVerdictKindSchema = z.enum(CRISTIANO_VERDICT_KINDS);

/** Type guard for arbitrary string input. */
export function isCristianoVerdictKind(
  value: string,
): value is CristianoVerdictKind {
  return (CRISTIANO_VERDICT_KINDS as readonly string[]).includes(value);
}

// ─── Source app tag (push channel attribution) ───────────────────────────────

/**
 * Which app rendered or pushed this verdict. `ob` = rendered by Olivia
 * Brain itself via `/api/cristiano/judge`. The named apps push verdicts
 * via `/api/gateway/cristiano/verdicts` once their gateway publishers
 * land (LTM + lifescore backports — separate sessions).
 */
export const CRISTIANO_SOURCE_APPS = [
  "ob",
  "ltm",
  "lifescore",
  "clueslondon",
  "cluesintelligence",
  "cluesxscore",
  "heart-recovery",
  "property-search",
  "transit",
] as const;
export type CristianoSourceApp = (typeof CRISTIANO_SOURCE_APPS)[number];

export const CristianoSourceAppSchema = z.enum(CRISTIANO_SOURCE_APPS);

// ─── Request payload schemas — one per kind ──────────────────────────────────

/**
 * `startup_match` request payload — mirrors the LTM Cristiano brain
 * input at `src/lib/analysis/cristiano.ts:19-27` (CristianoDNAInput).
 *
 * Field names match LTM byte-for-byte so when the LTM backport pushes
 * verdicts into OB the consuming code is identical.
 */
export const CristianoStartupMatchRequestSchema = z.object({
  // DNA Builder paragraphs — 10 sections (P1-P10) keyed by paragraph id.
  // Keys are kept loose (`Record<string, string>`) to survive paragraph
  // id evolution in LTM without an OB schema bump.
  paragraphs: z.record(z.string(), z.string()),

  metadata: z.object({
    legalName: z.string(),
    fundingRound: z.string(),
    sectorTags: z.array(z.string()),
  }),

  outreachGoal: z.string(),
});
export type CristianoStartupMatchRequest = z.infer<
  typeof CristianoStartupMatchRequestSchema
>;

/**
 * `city_compare` request payload — mirrors the lifescore JudgeRequest
 * surface used by `api/judge.ts:97-101`. The full evaluatorResults
 * array isn't carried into OB; we accept the city pair + optional
 * pre-computed evaluator scores.
 */
export const CristianoCityCompareRequestSchema = z.object({
  city1: z.string().min(1),
  city2: z.string().min(1),
  city1Country: z.string().optional(),
  city2Country: z.string().optional(),
  // Pre-computed consensus scores from upstream — when present, OB
  // skips re-judging and proceeds straight to narration.
  precomputedScores: z
    .object({
      city1Score: z.number().min(0).max(100),
      city2Score: z.number().min(0).max(100),
      overallAgreement: z.number().min(0).max(100).optional(),
    })
    .optional(),
});
export type CristianoCityCompareRequest = z.infer<
  typeof CristianoCityCompareRequestSchema
>;

/**
 * `freeform` request payload — OB-native rubric for the "Ask Cristiano"
 * dashboard sub-tab. The user picks this kind for any judgment query
 * that doesn't fit the structured rubrics (startup_match / city_compare).
 */
export const CristianoFreeformRequestSchema = z.object({
  /** The question the user wants Cristiano to render a verdict on. */
  question: z.string().min(8).max(2000),
  /** Optional background context (1-2 paragraphs of supporting material). */
  context: z.string().max(8000).optional(),
  /** Optional structured criteria the user wants weighted in the verdict. */
  criteria: z.array(z.string().min(2).max(280)).max(8).optional(),
});
export type CristianoFreeformRequest = z.infer<
  typeof CristianoFreeformRequestSchema
>;

// ─── Verdict body schemas — one per kind ─────────────────────────────────────

/**
 * Common verdict-body shape every kind extends. Cristiano always
 * returns:
 * - `spokenScript`: what the avatar narrates (drives LiveAvatar LITE)
 * - `verdictTitle`: short summary for list view
 * - `confidence`: "high" | "medium" | "low" — informs UI badge
 */
const CristianoVerdictCommonSchema = z.object({
  spokenScript: z.string().min(1).max(8000),
  verdictTitle: z.string().min(1).max(240),
  confidence: z.enum(["high", "medium", "low"]),
});

/**
 * `startup_match` verdict — mirrors LTM `CristianoResult.topMatches`
 * at `cristiano.ts:62-93`.
 */
export const CristianoStartupMatchVerdictSchema =
  CristianoVerdictCommonSchema.extend({
    companyProfile: z.object({
      companyName: z.string(),
      sector: z.array(z.string()),
      stage: z.string(),
    }).passthrough(), // accept extra fields without rejecting
    topMatches: z
      .array(
        z.object({
          organizationId: z.string(),
          organizationName: z.string(),
          rank: z.number().int().min(1).max(10),
          matchScore: z.number().min(0).max(100),
          rationale: z.string(),
          strengths: z.array(z.string()),
          concerns: z.array(z.string()),
          approachStrategy: z.string(),
        }),
      )
      .min(1)
      .max(10),
  });
export type CristianoStartupMatchVerdict = z.infer<
  typeof CristianoStartupMatchVerdictSchema
>;

/**
 * `city_compare` verdict — mirrors lifescore `JudgeReport.executiveSummary`
 * at `JudgeTab.tsx:122-130`.
 */
export const CristianoCityCompareVerdictSchema =
  CristianoVerdictCommonSchema.extend({
    winner: z.enum(["city1", "city2", "tie"]),
    city1Score: z.number().min(0).max(100),
    city2Score: z.number().min(0).max(100),
    margin: z.number().min(0),
    rationale: z.string(),
    keyFactors: z.array(z.string()).max(16),
    futureOutlook: z.string().optional(),
  });
export type CristianoCityCompareVerdict = z.infer<
  typeof CristianoCityCompareVerdictSchema
>;

/**
 * `freeform` verdict — OB-native rubric.
 */
export const CristianoFreeformVerdictSchema =
  CristianoVerdictCommonSchema.extend({
    recommendation: z.string().min(1),
    rationale: z.string().min(1),
    keyFactors: z.array(z.string()).max(16),
    risks: z.array(z.string()).max(16).optional(),
    nextSteps: z.array(z.string()).max(16).optional(),
  });
export type CristianoFreeformVerdict = z.infer<
  typeof CristianoFreeformVerdictSchema
>;

// ─── Discriminated union envelopes ───────────────────────────────────────────

/**
 * The full request envelope a caller posts to `/api/cristiano/judge`.
 * The `kind` discriminator selects which payload schema applies.
 */
export const CristianoVerdictRequestSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("startup_match"),
    payload: CristianoStartupMatchRequestSchema,
  }),
  z.object({
    kind: z.literal("city_compare"),
    payload: CristianoCityCompareRequestSchema,
  }),
  z.object({
    kind: z.literal("freeform"),
    payload: CristianoFreeformRequestSchema,
  }),
]);
export type CristianoVerdictRequest = z.infer<
  typeof CristianoVerdictRequestSchema
>;

/**
 * The full verdict body. Discriminated on `kind` so consumers branch
 * once and get a fully-typed shape.
 */
export const CristianoVerdictBodySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("startup_match"),
    body: CristianoStartupMatchVerdictSchema,
  }),
  z.object({
    kind: z.literal("city_compare"),
    body: CristianoCityCompareVerdictSchema,
  }),
  z.object({
    kind: z.literal("freeform"),
    body: CristianoFreeformVerdictSchema,
  }),
]);
export type CristianoVerdictBody = z.infer<typeof CristianoVerdictBodySchema>;

// ─── Stored verdict envelope (DB-shaped) ─────────────────────────────────────

/**
 * The full shape of a `CristianoVerdict` row exposed to clients. Mirrors
 * the Prisma model with snake_case → camelCase mapping handled by
 * Prisma. The body is type-safe via the discriminated union above.
 *
 * This is the shape both `/api/cristiano/verdicts` list/detail and
 * `/api/gateway/cristiano/verdicts` push return.
 */
export interface CristianoVerdictRecord {
  id: string;
  userId: string;
  kind: CristianoVerdictKind;
  sourceApp: CristianoSourceApp;
  externalId: string | null;

  /** The original request payload as posted (kept for replay). */
  requestPayload: CristianoVerdictRequest["payload"];
  /** SHA256 of canonical request payload. Used for idempotency. */
  requestHash: string;

  /** The kind-specific verdict body. */
  verdictBody: CristianoVerdictBody["body"];
  /** Cristiano's spoken script. Drives LiveAvatar LITE narration. */
  spokenScript: string;
  /** Short list-view summary. */
  verdictTitle: string;

  /** Pre-rendered MP4 url if source app provided one (lifescore HeyGen V2). */
  preRenderedVideoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  /**
   * Captions track URL (typically WebVTT). When set AND `preRenderedVideoUrl`
   * is set, the player renders `<track kind="captions">` for WCAG 1.2.2
   * Level A compliance during playback. Independent of the `spokenScript`
   * transcript (which covers WCAG 1.2.3 — media alternative).
   *
   * Source apps that ship captions populate this on gateway-push.
   */
  captionsUrl: string | null;

  status: "pending" | "ready" | "failed";
  errorMessage: string | null;
  modelUsed: string | null;

  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

// ─── Result-style validators (Result discriminated union) ────────────────────

/**
 * Discriminated-union result type for verdict validators. Mirrors the
 * 2026 "typed Result at module boundaries / never throw across a
 * boundary" bar (see `~/CLAUDE.md`). Callers branch on `.ok` and never
 * need to wrap a try.
 */
export type CristianoValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: z.ZodIssue[] };

/**
 * Parse + validate a verdict-request POST body. Returns the typed
 * discriminated union on success or the Zod issues on failure.
 */
export function parseVerdictRequest(
  raw: unknown,
): CristianoValidationResult<CristianoVerdictRequest> {
  const result = CristianoVerdictRequestSchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, issues: result.error.issues };
}

/**
 * Parse + validate a stored verdict body (used by gateway push to
 * confirm the upstream app's payload shape before persisting).
 */
export function parseVerdictBody(
  raw: unknown,
): CristianoValidationResult<CristianoVerdictBody> {
  const result = CristianoVerdictBodySchema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, issues: result.error.issues };
}
