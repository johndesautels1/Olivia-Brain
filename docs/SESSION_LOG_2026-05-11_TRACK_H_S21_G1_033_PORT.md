# Session log — 2026-05-11 — Track H S21: G1-033 port + handler infrastructure

> **Batch summary:** 6 commits since `669a6d0`. Track H S21 lands the
> canonical LTM agent handler pattern in Olivia Brain, ports the three
> shared modules every per-company handler depends on, adds the three
> Prisma models they require (with seed + idempotent SQL migration), and
> wires the first ported agent (G1-033 Data Protection Orchestrator)
> into the handler registry. Full vitest suite 1155/1155.

## Why this scope (and why not just G1-005 like the prior HANDOFF said)

The prior HANDOFF (commit `669a6d0`) recommended Option A "Track O5c-Lift"
(now closed) or Option B "Track H S21 — LTM agent port (g1-005 property
gravity forecaster)". On cold-read this session, **G1-005 turned out to
be the wrong agent to start with**:

- G1-005 needs `prisma.location.findMany` with `districtOrganizations` +
  `districtEvents` relations, `prisma.districtScoreHistory.findMany`
  distinct, time-windowed `prisma.organization.groupBy`, and the LTM-
  only `computeTechGravityScore` utility.
- The OB bridge (`src/lib/bridge/providers/ltm.ts`) only exposes
  `organizations` + `districts` endpoints via LTM's v1 API. None of the
  data G1-005 needs is reachable from OB.
- HANDOFF option (b) "extend the v1 API" is now **forbidden** by founder
  direction — "London-Tech-Map is now a walled garden to OB sessions".
- HANDOFF option (a) "degraded narrative-only" strips out the gravity-
  trajectory math entirely; what's left isn't a forecaster.

So the founder picked Option 2 "Port G1-033 (Data Protection
Orchestrator) + infrastructure". G1-033 depends on
`UserCompanyProfile` (founder-side data) + LLM + Document mirror — **zero
LTM bridge dependency**. It ships a real founder-facing capability
(DPIA generation + auto-mirror to My Documents) AND builds the canonical
handler pattern every future LTM agent port will reuse.

(The founder corrected the prior HANDOFF's framing in this session —
"the canonical handler pattern" is the load-bearing infrastructure.)

## Per-commit narrative

### 1. `6c37ff0` — feat(agents): port callLLM bridge from LTM
- New: `src/lib/agents/llm.ts` (~580 lines, identical to LTM source).
- 7-provider fan-out (Anthropic Sonnet/Opus, OpenAI gpt-4o/mini,
  Gemini 3.1 Pro, xAI Grok, Perplexity Sonar) with rich return shape
  (`{ text, tokensUsed, costUsd, provider, modelId, inputTokens,
  outputTokens, durationMs, webSearchUsed }`).
- Opt-in provider-native web search via `enableWebSearch: true`:
  Anthropic Messages + web_search_20250305 tool, OpenAI Responses API +
  web_search, Gemini + google_search, Grok Responses API + web_search +
  x_search. Opus + gpt-4o-mini in `NO_SEARCH_MODELS` short-circuit
  set; Sonar reports `webSearchUsed=true` always.
- Graceful degradation: missing API key, non-2xx, fetch throw, empty
  text body all resolve to `null` (never throw).
- 20 vitest tests covering all four degradation paths, every provider
  happy path, the search opt-in policy, and the Responses-API text
  extraction shape.

### 2. `3966525` — feat(prisma): add DocumentCollection + DocumentVersion + UserCompanyProfile foundation
- Schema: new `enum CollectionType` (12 LTM-aligned values), new model
  `DocumentCollection`, new model `DocumentVersion`, new model
  `UserCompanyProfile` (minimum 10-column subset of LTM's ~85-field
  source).
- Relations added to existing models: `Document.collection
  DocumentCollection?` (keeps collectionId nullable so existing rows
  stay valid; new rows from document-mirror FK in), `Document.versions
  DocumentVersion[]`, `UserProfile.companyProfile UserCompanyProfile?`.
- **Privacy contract codified in schema doc-comment**:
  UserCompanyProfile NEVER contains deadline-related columns. Deadline
  data lives in UserCompanyDeadline (not yet ported). Per `~/CLAUDE.md`
  top-of-file rule.
- Migration: `prisma/sql/11-add-agent-handler-foundation.sql`. Idempotent
  throughout (`DO/EXCEPTION` blocks, `IF NOT EXISTS`, `ON CONFLICT DO
  NOTHING`). Seeds the 12 DocumentCollection rows so handlers can
  call `spawnDocumentFromAgent({collectionSlug: 'legal-compliance'})`
  immediately after applying. ASCII-only inside comments per the
  dash-corruption rule.

### 3. `0afe8a8` — feat(agents): port resolve-company helper
- New: `src/lib/agents/resolve-company.ts` (~200 lines, identical to
  LTM).
- `BaseCompanyInputSchema` (Zod, passthrough) + `resolveUserCompany()`
  with userProfileId-or-explicit-input precedence + source-tagging
  matrix (profile / input / input+profile / default).
- Hits OB's new `UserCompanyProfile` table; selects only the 10
  columns OB exposes. When LTM-side fields are needed in future
  handlers, add to the OB Prisma model first, then widen the select.
- Never throws — DB error and missing profile both degrade to
  input/default with a console.warn.
- 9 tests across 4 describe blocks: defaults, explicit input, profile
  path, input+profile precedence, never-throws.

### 4. `84e0d74` — feat(agents): port document-mirror
- New: `src/lib/agents/document-mirror.ts` (~180 lines, identical to
  LTM).
- `spawnDocumentFromAgent()` resolves UserProfile.id -> clerkUserId,
  resolves DocumentCollection by slug, creates Document + initial
  DocumentVersion v1 with canonical /api/documents POST shape, idempotent
  via `{kebab-title}-{agentRunId.slice(-12)}` slug.
- Best-effort throughout: every failure -> null, never throws.
- 10 tests across 5 describe blocks: early exits, idempotency, happy
  path (canonical shape + caller overrides), slug derivation, never-
  throws.
- One mistake caught + fixed before push: first slug-derivation test
  expected a tail of length 13 (hand-counted); corrected against the
  actual `.slice(-12)` output. Exactly the "verify before claiming
  done" trap HANDOFF §7.5 warns about — caught by running the test,
  not by reading the code.

### 5. `738fabc` — feat(agents): port G1-033 + register
- New: `src/lib/agents/impl/g1-033-data-protection-orchestrator.ts`
  (~390 lines, identical to LTM).
- Reference pattern every future per-company handler mirrors:
  versioned output schema (`OUTPUT_SCHEMA_VERSION = "1"`), exported
  type guard (`isDpiaDocument`), fence-and-brace JSON parser
  (`parseLlmJson`), structured fallback briefings on both failure
  modes (LLM unavailable -> alert + `mode: "llm_unavailable"`; JSON
  parse failed -> weekly narrative + `parseFailed: true`),
  spawnDocumentFromAgent only when userProfileId present, provenance
  in `outputData.inputSource`.
- Registry: `handlers.ts` now imports + registers
  `dataProtectionOrchestratorHandler`. `getHandler("G1-033")`
  returns the real handler instead of `DefaultHandler`.
- 14 tests across 5 describe blocks: module surface, isDpiaDocument
  guard (5 cases), parseLlmJson (4 cases incl. ```json fence),
  execute paths (LLM unavailable, parse fail, happy with
  userProfileId, happy without).

### 6. `<this commit>` — docs(handoff): Track H S21 batch close
- New: `docs/SESSION_LOG_2026-05-11_TRACK_H_S21_G1_033_PORT.md` (this
  file).
- `docs/HANDOFF.md` top section rewritten: bumped "Last updated" to
  2026-05-11; today's batch listed with the 6 commits and one-line
  each; migration 11 SQL inlined in the operator-actions section
  (per the README ABSOLUTE RULE); previous batch demoted to
  "Previous batch — 2026-05-10"; resume options refreshed.

## Verification trail

Each commit verified independently:

| Commit | tsc | Targeted vitest |
|---|---|---|
| 1. callLLM | exit 0 | `agents/__tests__/llm.test.ts` 20/20 in 41ms |
| 2. Prisma foundation | exit 0 | n/a (schema-only; client regenerated) |
| 3. resolve-company | exit 0 | `agents/__tests__/resolve-company.test.ts` 9/9 in 31ms |
| 4. document-mirror | exit 0 | `agents/__tests__/document-mirror.test.ts` 10/10 in 5ms |
| 5. G1-033 + registry | exit 0 | `agents/__tests__/` + `impl/__tests__/` 53/53 in 4.33s |

Full vitest suite at HEAD `738fabc` (before this docs commit):
**107 test files, 1155 tests, all passing in 125.96s** (1070 baseline
+ 53 new + 32 from other tests counted now that weren't in the prior
batch's number).

`npx tsc --noEmit` clean throughout (with
`NODE_OPTIONS=--max-old-space-size=4096` to dodge the default-heap OOM
on Windows that HANDOFF §0 documents).

`npx prisma format` + `npx prisma generate` both ran clean after the
commit-2 schema edits. Prisma Client v7.7.0 regenerated with the
three new model types (`UserCompanyProfile`, `DocumentCollection`,
`DocumentVersion`).

## Operator actions OWED

### SQL migration to apply (full body below — per README ABSOLUTE RULE)

Paste into Supabase SQL editor:

```sql
-- 11-add-agent-handler-foundation.sql
-- Track H S21 -- foundation tables for LTM-style agent handlers.
-- ASCII-only inside comments to dodge Supabase paste corruption.
DO $$ BEGIN
  CREATE TYPE "CollectionType" AS ENUM (
    'company_core',
    'pitch_decks',
    'strategic_partnerships',
    'product_technology',
    'financials_models',
    'licensing_commercial',
    'legal_compliance',
    'due_diligence',
    'sales_marketing',
    'methodology',
    'sample_reports',
    'acquisition_exit'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "document_collections" (
  "id"             TEXT             NOT NULL,
  "name"           TEXT             NOT NULL,
  "slug"           TEXT             NOT NULL,
  "description"    TEXT,
  "collectionType" "CollectionType" NOT NULL,
  "isActive"       BOOLEAN          NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "document_collections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_collections_slug_key"
  ON "document_collections" ("slug");
CREATE INDEX IF NOT EXISTS "document_collections_collectionType_idx"
  ON "document_collections" ("collectionType");
CREATE INDEX IF NOT EXISTS "document_collections_isActive_idx"
  ON "document_collections" ("isActive");

CREATE TABLE IF NOT EXISTS "document_versions" (
  "id"               TEXT         NOT NULL,
  "documentId"       TEXT         NOT NULL,
  "versionNumber"    INTEGER      NOT NULL,
  "titleSnapshot"    TEXT,
  "contentSnapshot"  TEXT,
  "filePathSnapshot" TEXT,
  "changeNotes"      TEXT,
  "createdBy"        TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "document_versions_documentId_idx"
  ON "document_versions" ("documentId");
CREATE INDEX IF NOT EXISTS "document_versions_versionNumber_idx"
  ON "document_versions" ("versionNumber");

CREATE TABLE IF NOT EXISTS "user_company_profiles" (
  "id"                   TEXT             NOT NULL,
  "userProfileId"        TEXT             NOT NULL,
  "companyName"          TEXT             NOT NULL,
  "primarySector"        TEXT,
  "headquartersLocation" TEXT,
  "employeeCount"        INTEGER,
  "arr"                  DOUBLE PRECISION,
  "totalRaised"          DOUBLE PRECISION,
  "regulatoryBody"       TEXT,
  "certifications"       TEXT[]           NOT NULL DEFAULT '{}'::TEXT[],
  "customerCount"        INTEGER,
  "createdAt"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "user_company_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_company_profiles_userProfileId_key"
  ON "user_company_profiles" ("userProfileId");
CREATE INDEX IF NOT EXISTS "user_company_profiles_primarySector_idx"
  ON "user_company_profiles" ("primarySector");

DO $$ BEGIN
  ALTER TABLE "documents"
    ADD CONSTRAINT "documents_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "document_collections"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "document_versions"
    ADD CONSTRAINT "document_versions_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_company_profiles"
    ADD CONSTRAINT "user_company_profiles_userProfileId_fkey"
    FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

INSERT INTO "document_collections"
  ("id", "name", "slug", "description", "collectionType", "isActive", "createdAt", "updatedAt")
VALUES
  ('cdoc_company_core',           'Company Core',           'company-core',           'Foundational corporate documents',                'company_core',           true, NOW(), NOW()),
  ('cdoc_pitch_decks',            'Pitch Decks',            'pitch-decks',            'Investor-facing slide decks',                     'pitch_decks',            true, NOW(), NOW()),
  ('cdoc_strategic_partnerships', 'Strategic Partnerships', 'strategic-partnerships', 'Partnership memoranda and co-marketing assets',   'strategic_partnerships', true, NOW(), NOW()),
  ('cdoc_product_technology',     'Product & Technology',   'product-technology',     'Technical and product specifications',            'product_technology',     true, NOW(), NOW()),
  ('cdoc_financials_models',      'Financials & Models',    'financials-models',      'Financial statements and valuation models',       'financials_models',      true, NOW(), NOW()),
  ('cdoc_licensing_commercial',   'Licensing & Commercial', 'licensing-commercial',   'License agreements and commercial terms',         'licensing_commercial',   true, NOW(), NOW()),
  ('cdoc_legal_compliance',       'Legal & Compliance',     'legal-compliance',       'Legal agreements and compliance artefacts (DPIA)', 'legal_compliance',       true, NOW(), NOW()),
  ('cdoc_due_diligence',          'Due Diligence',          'due-diligence',          'Diligence room exhibits and disclosures',         'due_diligence',          true, NOW(), NOW()),
  ('cdoc_sales_marketing',        'Sales & Marketing',      'sales-marketing',        'Sales collateral and marketing assets',           'sales_marketing',        true, NOW(), NOW()),
  ('cdoc_methodology',            'Methodology',            'methodology',            'Internal methodology and how-we-work docs',       'methodology',            true, NOW(), NOW()),
  ('cdoc_sample_reports',         'Sample Reports',         'sample-reports',         'Anonymised sample outputs',                       'sample_reports',         true, NOW(), NOW()),
  ('cdoc_acquisition_exit',       'Acquisition & Exit',     'acquisition-exit',       'M and A + exit-readiness documents',              'acquisition_exit',       true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
```

Verify (12 rows expected):

```sql
SELECT slug, name FROM "document_collections" ORDER BY slug;
```

### New env vars to set if you want G1-033 live

None required by this batch alone — `callLLM` reads the same provider
keys that the cascade already uses. If `ANTHROPIC_API_KEY` (or
`OPENAI_API_KEY` as fallback) is already set in Vercel, G1-033 is
operational once migration 11 applies.

## Carry-forwards

Deferred sub-tracks documented for the next session:

1. **`/admin/tools` getOwedMigrations() detection for migration 11.**
   The HANDOFF rule says the in-product UX should match the chat rule
   — `/admin/tools` auto-detects unapplied migrations and renders the
   SQL inline with a Copy button. Today the chat handoff has the SQL,
   but `/admin/tools` doesn't yet probe for the three new tables.
   Small follow-up: extend `getOwedMigrations()` in
   `src/app/admin/tools/page.tsx`.

2. **AGENT_DEFINITIONS registry row for G1-033.** The handler is
   registered (`getHandler("G1-033")` returns the real implementation),
   but the agent isn't yet listed in `src/lib/agents/registry.ts`'s
   `AGENT_DEFINITIONS` array. Schedulers iterate over that list, so
   G1-033 won't auto-run until added. Operator can still invoke it
   directly via `executeAgent({agentId: "G1-033", input: {...}})`.

3. **Document workspace routes (Track B carry-forward).** The DPIA
   document this handler spawns has the right shape for
   `/documents/[id]/page.tsx` + `/documents/[id]/workspace/...` —
   those routes are not yet ported from LTM. Today the row exists in
   `documents` + `document_versions` and can be inspected via DB or
   future API, but there's no UI yet.

4. **Per-company handler portfolio.** G1-033 is the first ported
   handler. The canonical pattern is now locked. Future per-company
   handlers (G1-034 through G1-050ish) port mechanically: each one
   reuses `resolveUserCompany` + `callLLM` + `spawnDocumentFromAgent`
   and only adds its own `XxxExtensionSchema` + `XxxDocument` shape
   + system/user prompts.

5. **G1-005 Property Gravity Forecaster — blocked.** Needs LTM-side
   API extension (`/api/v1/districts/score-history` +
   `/api/v1/organizations?createdAtFrom=`) or LTM Prisma model
   copy-in. Both require a separate LTM session with explicit
   founder authorization. Park until then.

## Architectural facts captured this batch

1. **G1-033 is the canonical per-company handler pattern.** Memory
   note `feedback_ltm_agent_handler_pattern.md` (locked 2026-05-08)
   said "every new LTM agent handler mirrors G1-033's structure" —
   that's now grounded in OB code as well. Future ports reuse the
   resolve-company / document-mirror / parseLlmJson + isXxxDocument
   primitives instead of reinventing.
2. **UserCompanyProfile in OB is a minimum subset of LTM's source.**
   10 columns chosen because that's exactly what `resolve-company.ts`
   selects. The privacy contract codified inline in the schema
   doc-comment ensures the deadline-data boundary stays clean as
   future fields land.
3. **The /admin/tools auto-detection pattern is the in-product chat
   rule.** New migrations should extend `getOwedMigrations()`. Today
   migration 11 lives only in the chat handoff — the auto-detect
   addition is a carry-forward (item 1 above).

## What this batch deliberately did NOT touch

- LTM repo: zero touches. LTM is a walled garden to OB sessions per
  founder direction.
- The Studio engine port (Track B Session 8c) and document workspace
  routes (Track B Session 8d-routes-2) — unchanged. They remain on
  the carry-forwards list from prior sessions.
- The cascade orchestrator (`runModelCascade`) — `callLLM` does NOT
  delegate through it. The two LLM surfaces coexist: cascade for
  multi-step chat, callLLM for direct agent narrative generation.
  This mirrors LTM's structure exactly. Future architectural decision
  whether to fold them; not in scope here.

## Pointer for the next session

Start by reading:
1. `docs/OLIVIA_NORTH_STAR.md` (always first)
2. `docs/00_PRODUCT_TRUTH.md`
3. `docs/HANDOFF.md` top section (updated this commit)
4. `docs/SESSION_LOG_2026-05-11_TRACK_H_S21_G1_033_PORT.md` (this file)

Then verify on arrival (`git pull origin main && git log --oneline -10 &&
npx tsc --noEmit && npm test`) and pick a path from the refreshed Resume
options in HANDOFF §6.

Recommended next pick: **continue Track H** — port a second per-company
handler that exercises the canonical pattern (G1-034 / G1-036 / G1-048 /
G1-050 are good candidates depending on which weakness the founder wants
to close next). Each subsequent port is ~1 session because the
infrastructure is now in place.

---

## Addendum — 2026-05-11 same-session continuation (G1-048 port)

After the 6-commit foundation batch closed at `770cb8d`, the founder
said "keep going" + "keep committing to github". This addendum captures
the continuation work: a single follow-up commit porting the **second**
per-company handler.

### Survey of candidate handlers

The HANDOFF.md § 6 listed G1-034 / G1-036 / G1-048 / G1-050 as good
candidates. Cold-read of all four showed:

| Handler | Status | Why |
|---|---|---|
| G1-034 FCA Authorization Packager | ❌ BLOCKED | Uses `prisma.organization.findMany` with LTM-only relations. Same blocker as G1-005. |
| G1-036 EMI Share Option Manager | ❌ BLOCKED | Uses `prisma.organization` + `prisma.personOrganizationRole` (LTM-only). |
| **G1-048 Modern Slavery Statement Generator** | ✅ Clean | Pure per-company doc-spawn handler, identical shape to G1-033. Zero new infra. |
| G1-050 Corporate Governance Agent | ❌ BLOCKED | Uses `prisma.organization` + `prisma.personOrganizationRole`. |

So the "good candidates" list in HANDOFF § 6 was partially
wrong — 3 of the 4 actually need LTM-data access that the
walled-garden direction blocks. Updated `resolveUserCompany`-based
inventory (the real per-company handler list): grep across
`D:\London-Tech-Map\src\lib\agents\impl` for `resolveUserCompany` →
12 files total. After G1-033 + G1-048, **10 remain ported-eligible**:

- `g1-076-pitch-deck-london-filter.ts`
- `g1-105-journalist-matchmaker.ts`
- `g1-107-thought-leadership-ghostwriter.ts`
- `g1-110-podcast-booker.ts`
- `g1-115-social-proof-agent.ts`
- `g1-130-build-vs-buy-decision-agent.ts`
- `g1-136-second-order-consequence-modeler.ts`
- `g1-141-confidence-score-decision-engine.ts`
- `g1-149-email-negotiator.ts`
- `g1-150-procurement-agent.ts`

Each ports in ~1 session using the G1-033 + G1-048 reference.

### `e619332` — feat(agents): port G1-048 + register

- **New:** `src/lib/agents/impl/g1-048-modern-slavery-statement-generator.ts`
  (~340 lines, identical to LTM source). UK Modern Slavery Act 2015
  s.54 compliance statement generator. £36M turnover threshold
  derivation (`above-threshold` / `below-threshold` /
  `turnover-not-provided`). ARR-as-turnover-proxy fallback when no
  explicit `turnoverGbp`. legal-compliance document-mirror spawn.
- **Pattern fidelity:** same Zod extension shape, same provenance
  matrix, same two-mode fallback briefing, same document-mirror
  contract as G1-033. Zero new infra needed — validated the
  canonical pattern works in one commit.
- **Pattern divergence (noted, not fixed):** G1-048 source does NOT
  include `OUTPUT_SCHEMA_VERSION`. The memory note's "versioned
  output schema" canonical-pattern bullet is G1-033's flavour, not
  uniform. Ported byte-for-byte (no version field) to match LTM.
  Future refactor opportunity: add it to both 033 + 048 in lockstep.
- **15 vitest tests** mirroring G1-033's structure: module surface,
  isStatement guard, parseLlmJson, LLM-unavailable, parse-fail,
  happy path (3 cases incl. threshold flips), explicit turnover
  override.
- **Registry wiring:** appended to `handlers.ts` below the G1-033
  registration. `getHandler("G1-048")` now returns the real handler.

### Verification at HEAD `e619332`

- `npx tsc --noEmit` exit 0.
- Full vitest suite **1170 / 1170** in 122.67s (1155 prior + 15
  new G1-048 tests).

### Carry-forwards (unchanged from the foundation batch)

- `/admin/tools getOwedMigrations()` detection for migration 11.
- AGENT_DEFINITIONS registry rows for G1-033 + G1-048 (so schedulers
  can auto-run them, not just `executeAgent({agentId, ...})` direct
  calls).
- Document workspace routes (Track B carry-forward).
- 10 more per-company handlers to port mechanically using the
  canonical pattern.

### Why this addendum and not a separate SESSION_LOG file

The foundation batch (6 commits) AND this continuation (1 commit)
are the same calendar day, the same context, the same founder
direction ("keep going"). Splitting into two SESSION_LOG files
would fragment the narrative across reads. Keeping them in one
file makes the next session's read-on-arrival cleaner.

---

## Addendum 2 — 2026-05-11 extended port batch (5 more handlers)

Founder said "keep going" + "keep committing to github" + "what
are you doing keep working" after the G1-048 close. Five more
per-company handlers ported in mechanical succession, each
following the canonical pattern with single-commit landings.
This is the regime the foundation work was built for — each
~1 commit, each validating the pattern's leverage.

### Port queue worked through (in commit order)

1. **`92204b7`** — **G1-076 Pitch Deck London Filter** (~420 lines,
   15 tests). Rewrites US-centric pitch decks for London/UK
   investors: USD→GBP, US hyperbole→UK measured, US accelerator
   name-drops→London equivalents, adds FCA/EIS/SEIS/Patent Box
   anchors. Pitch-decks collection (investor_deck / investor /
   fundraising) — third distinct document-mirror shape. New
   pattern: `targetSection` enum lets the rewrite focus on one
   slide while preserving others. Severity flips warning on
   `redFlags.length > 0`.

2. **`1a20c7b`** — **G1-107 Thought Leadership Ghostwriter**
   (~400 lines, 15 tests). Drafts long-form thought-leadership
   pieces (essay / blog_post / linkedin_thought_post / op_ed) in
   the founder's voice. sales-marketing collection (marketing_doc /
   media / outreach). New patterns: `maxTokens` capped at 5000 to
   stay inside the 45s LLM timeout on Sonnet at 1000-word target;
   severity is always "info" (no boolean trigger for warning, by
   design).

3. **`9e6c221`** — **G1-105 Journalist Matchmaker** (~450 lines,
   15 tests). Matches a founder's announcement to specific named
   UK tech journalists (Sifted, FT Tech, Bloomberg London,
   TechCrunch EU, Wired UK, The Guardian, Sky News). Drafts
   per-match pitch + 3 subject-line options + follow-up strategy.
   **First handler to opt into provider-native web search**
   (`enableWebSearch: true`) since journalist beats shift weekly —
   validates the search opt-in machinery built in commit `6c37ff0`
   (llm.ts) end-to-end. `outputData.webSearchUsed` surfaces from
   `llmResult.webSearchUsed`. Same sales-marketing mirror as
   G1-107.

4. **`b180f29`** — **G1-115 Social Proof Agent** (~420 lines, 16
   tests). Assembles a deck-ready "proof package" across 8
   categories (customer_logos / partner_signals / press_mentions /
   investor_logos / district_legitimacy / regulator_alignments /
   team_credentials / metrics_signals) for one of 4 use contexts
   (investor_deck / enterprise_pitch / press_kit / website). New
   patterns: **numeric-threshold severity** (warning when
   `legitimacyScore < 50`); **conditional audience/purpose
   derivation** (audienceType + purposeType derived dynamically
   from targetUseContext, first handler to do this — pattern:
   investor_deck → investor/fundraising; enterprise_pitch →
   enterprise_client/partnership; press_kit → media/outreach;
   website → investor/outreach).

5. **`3324525`** — **G1-110 Podcast Booker** (~460 lines, 14
   tests). Matches a founder to London-tech podcasts (Sifted
   Audio, 20MVC, EUVC, This Much I Know, AI Daily Brief). Master
   pitch with per-show `<<HOOK>>` placeholders, booking
   expectations (lead time, prep, equipment). Second handler with
   `enableWebSearch: true` — podcasts come and go faster than
   journalists' beats. Missing-founderBio early exit (mode=
   `missing_founder_bio`). Same matchmaker shape as G1-105 with
   per-match `hooksTailored` array (exactly 3 per show).

### Pattern observations from the extended batch

- **The pattern absolutely holds.** Each new handler ported in
  one mechanical commit using the existing primitives — no new
  Prisma models, no new shared modules, no new schema migrations.
  The foundation investment (commits 1–6 of this batch's first
  half) paid back in commits 7–11.
- **Three distinct document-mirror shapes** now exercised:
  legal-compliance (G1-033 + G1-048) for compliance docs;
  pitch-decks (G1-076) for investor materials; sales-marketing
  (G1-107 + G1-105 + G1-115 + G1-110) for media / pitch outreach.
  Each shape is one Prisma row + one `summary` line — no special-
  casing needed in the spawn helper.
- **Severity rules are per-handler.** G1-033 used `dpiaRequired`;
  G1-048 used `legallyRequired`; G1-076 + G1-105 + G1-110 used
  `redFlags.length > 0`; G1-107 was always `"info"`; G1-115 used
  `legitimacyScore < 50` (numeric threshold). Pattern: pick the
  single signal that means "the founder needs to read this
  carefully" and use it for the warning flip.
- **Web search opt-in is a stable primitive.** Two handlers (G1-105,
  G1-110) now exercise the `enableWebSearch: true` path end-to-end.
  Future market-research / news-grounding handlers will reuse
  this without code changes.
- **Early-exit modes are handler-specific.** G1-076 introduced
  `missing_deck_text`; G1-105 introduced `missing_announcement_text`;
  G1-110 introduced `missing_founder_bio`. Each is a 3rd failure
  mode beyond `llm_unavailable` + parse-failed. Convention: when a
  handler requires a piece of caller-supplied content that the
  resolveUserCompany helper can't fill in, add a single
  `missing_<thing>` early exit with `mode: "missing_<thing>"` in
  outputData and a clear `severity: "info"` alert.

### Verification at HEAD `3324525`

- `npx tsc --noEmit` exit 0 (NODE_OPTIONS=--max-old-space-size=4096),
  confirmed across all 5 commits — the only typecheck dependency
  in each was the new handler file + 2-line registry add. Zero
  type drift in existing code.
- Full vitest suite **1245 / 1245** in 248.14s — up from 1170
  prior addendum-1 baseline + 75 new this addendum (15 + 15 + 15 +
  16 + 14).
- Per-handler smoke tests cleanly isolate llm / document-mirror /
  resolve-company via vi.mock at the @/lib/agents/* import surface.
  No fragile network or DB dependencies in the test surface.

### Bug caught + fixed mid-batch

- **`2e324a2` migration 11 tolerant FK fix.** Operator hit
  `ERROR: 42P01: relation "documents" does not exist` when
  applying `prisma/sql/11-add-agent-handler-foundation.sql` to
  Supabase. Root cause: migration 11 assumes migrations 08+09
  (Track B documents engine + foundation) have been applied,
  but they haven't. Fix: wrap each of the three FK ADDs in
  DO/EXCEPTION blocks that also catch `undefined_table` with a
  `RAISE NOTICE`, so the migration applies cleanly (3 new tables
  + 12 seed rows succeed) and the deferred FKs land later when
  the operator re-runs migration 11 after 08+09 apply. Both the
  on-disk file (`prisma/sql/11-...sql`) AND the inline copy in
  `docs/HANDOFF.md` § 4 were updated to match. Per the README
  ABSOLUTE RULE: chat-pasteable copies must match the file.

### Carry-forwards into the next session

| Track | Status | Next step |
|---|---|---|
| /admin/tools getOwedMigrations() for migration 11 | Owed | Extend the page component's `getOwedMigrations()` to probe via `prisma.documentCollection.count()`. Migration 11 SQL is inline-ready in HANDOFF § 4. |
| AGENT_DEFINITIONS registry rows for the 7 ported handlers | Owed | Add G1-033, G1-048, G1-076, G1-107, G1-105, G1-115, G1-110 rows to `src/lib/agents/registry.ts AGENT_DEFINITIONS` so schedulers can auto-run them. Today: handlers fire via `executeAgent()` direct calls only. |
| Track B document workspace routes | Owed | Port `/documents/[id]/page.tsx` + `/documents/[id]/workspace/*` from LTM so the 7 ported handlers' spawned documents are actually viewable in the UI. |
| Remaining 5 per-company handlers | Open | g1-130 (build-vs-buy-decision), g1-136 (second-order-consequence-modeler), g1-141 (confidence-score-decision-engine), g1-149 (email-negotiator), g1-150 (procurement-agent). Each ~1 session. |
| LTM-data handlers (G1-005 / G1-034 / G1-036 / G1-050) | Blocked | Need LTM org/district/role data not exposed in the v1 bridge. Walled-garden direction blocks LTM-side extension. Park until founder reopens the boundary. |

---

## Addendum 3 — 2026-05-11 final wave — queue closed (12/12 handlers ported)

Founder kept pushing: "continue committing to github and building", "what
are you doing keep working", "commit to github and keep going". Five more
per-company handlers ported in mechanical succession, **closing the
entire queue** of per-company doc-spawn agents that can be ported without
LTM data access.

### Final five commits

1. **`f761213`** — **G1-130 Build-vs-Buy Decision Agent** (~525 lines,
   16 tests). Six options × UK compliance × cost × time-to-value ×
   talent lock-in. **First briefing-only handler** (no document
   mirror). **First three-level severity** (info / warning / critical).
   **Self-validation** (rubric weights ±0.05; all 6 options covered).
2. **`401718e`** — **G1-149 Email Negotiator** (~520 lines, 20 tests).
   Classifies inbound emails, scores leverage, drafts reply in
   founder's voice. **First handler to import DocAudienceType +
   PurposeType from `@prisma/client`** for typed audience/purpose
   routing matrix (7 request types → 7 distinct audience+purpose
   pairs). Stance-gated mirror (skip when stance='ignore').
3. **`89a9e02`** — **G1-150 Procurement Agent** (~480 lines, 10 tests).
   SOW + 5-vendor shortlist. **First handler to use licensing-commercial
   collection** (proposal / internal / partnership). Third web-search
   handler.
4. **`f863687`** — **G1-141 Confidence Score Decision Engine** (~430
   lines, 12 tests). Calibrated 0-100 confidence per option +
   recommendation confidence + reversibility-aware severity escalation
   (critical when lowConfidence + hard-to-reverse). Briefing-only.
5. **`c705cf7`** — **G1-136 Second-Order Consequence Modeler** (~480
   lines, 11 tests). 3-order cascading consequence map across 8 domains
   (finance / team / product / market / regulator / brand / customers /
   network). Critical severity when any company_defining negative.
   Default model `claude-opus-4-7` for the cascade-reasoning workload.
   50s LLM timeout. Briefing-only. **Closes the queue.**

### Bugs caught + fixed mid-batch

- **G1-141 test fixture**: `decisionDescription: "..."` (length 3) hit
  Zod min(10), falling back to the missing-input early exit instead of
  exercising severity logic. Fixed by passing a real-length decision
  string.
- **G1-076 test expectation**: hand-counted `inputSource` mismatch
  (`profile` vs `input+profile`). Same lesson as G1-033's slug-tail
  miscount — hand-crafted test fixtures stay tighter when they
  match the schema constraints.

### Pattern wrinkles surfaced from porting at scale

- **Briefing-only handlers** (G1-130 / G1-141 / G1-136): 3 of 12. The
  pattern works fine without `spawnDocumentFromAgent` — the structured
  output lives on briefing.details and is reachable from the Olivia
  briefing reports surface (when Track B ports the doc workspace
  routes).
- **Three-level severity** (G1-130 / G1-149 / G1-141 / G1-136): 4 of 12.
  `critical` is reserved for *founder must look NOW* situations:
  recommended option violates a hard constraint (G1-130), founder
  needs personal touch (G1-149), low confidence on irreversible call
  (G1-141), or company-defining negative cascade (G1-136).
- **Self-validation of LLM output** (G1-130 / G1-150): rubric weight
  sum + option coverage. Pattern generalises to any handler whose
  output has an internal-consistency invariant the LLM might violate.
- **Numeric-threshold severity** (G1-115 legitimacyScore < 50; G1-141
  recommendationConfidence < 60): pattern for handlers where the
  trigger is a number rather than a flag.
- **Stance-gated mirror** (G1-149): the document spawn is conditional
  on the recommendation actually producing something worth saving.
  G1-076 + G1-115 + G1-107 also use this (empty markdown short-
  circuit) but G1-149 is the first to use it for a semantic stance
  rather than empty content.
- **Typed audience/purpose routing** (G1-115 inline switch; G1-149
  exported function with @prisma/client types): both patterns work.
  G1-149's typed export is cleaner when more than one collection
  shape is supported, but inline switch is fine when the mapping is
  obvious from the handler context.

### Verification at HEAD `c705cf7`

- `npx tsc --noEmit` exit 0 across the full chain of 5 new handlers
  (NODE_OPTIONS=--max-old-space-size=4096).
- Full vitest suite **1314 / 1314** in 101s (1245 prior + 69 new this
  wave: 16 + 20 + 10 + 12 + 11).
- Migration 11 confirmed applied in production Supabase by founder
  (the 12 DocumentCollection rows are live, the user_company_profiles
  + document_versions tables exist, FKs to documents.collectionId
  deferred until migrations 08+09 land).

### Queue status

**12 / 12 per-company doc-spawn handlers ported.** This is the
complete set of LTM handlers that use `resolveUserCompany` and
DON'T need LTM organization / district / role data. The 4 remaining
LTM-data handlers (G1-005 / G1-034 / G1-036 / G1-050) stay blocked
until LTM-side API extension is authorised.

### Carry-forwards into the next session

| Track | Status | Next step |
|---|---|---|
| /admin/tools getOwedMigrations() for migration 11 | Owed | Extend the page component's `getOwedMigrations()` to probe via `prisma.documentCollection.count()`. Migration 11 SQL is inline-ready in HANDOFF § 4. |
| AGENT_DEFINITIONS registry rows for ALL 12 ported handlers | Owed | Add G1-033 / 048 / 076 / 107 / 105 / 115 / 110 / 130 / 149 / 150 / 141 / 136 to `src/lib/agents/registry.ts AGENT_DEFINITIONS`. Without these, schedulers can't auto-run any of the handlers — operator must call `executeAgent()` directly. |
| Track B document workspace routes | Owed | Port `/documents/[id]/page.tsx` + `/documents/[id]/workspace/*` from LTM. Nine of the 12 handlers spawn documents; without the workspace they only exist in DB. |
| Migrations 08+09 (documents engine + foundation) | Owed | When applied, re-run migration 11 to land the deferred FKs. Until then, document-mirror calls silently fail (best-effort returns null) — handlers still execute fine but no rows hit `documents` table. |
| LTM-data handlers (G1-005 / 034 / 036 / 050) | Blocked | Need founder to reopen the LTM walled garden for a v1 API extension. Park. |
| Larger LTM agent inventory | Open | 100+ remaining LTM handlers in `D:\London-Tech-Map\src\lib\agents\impl\` that don't import resolveUserCompany — most are LTM-data agents that need the bridge extension. Out of scope for this batch. |
