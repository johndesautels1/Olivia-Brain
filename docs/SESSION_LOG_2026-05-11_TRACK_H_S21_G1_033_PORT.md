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
