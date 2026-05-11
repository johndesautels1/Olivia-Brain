/**
 * `/admin/tools` — operator landing page.
 *
 * Index of every admin / operator surface so a fresh browser tab can
 * navigate to the right tool without grep-ing the repo. Mirrors the
 * /admin/eval card style (dark, mono labels, aurum accent) and reads
 * vendor wiring at request time so the avatar tools card surfaces a
 * live "X/Y vendors configured" hint.
 *
 * Read-only. No POSTs, no client state. Server component on
 * force-dynamic so the vendor-health snapshot is always fresh.
 */

import Link from "next/link";
import prisma from "@/lib/db/client";
import { getAllVendorHealth } from "@/lib/avatar/status";
import { OwedMigrationCard } from "./OwedMigrationCard";

export const dynamic = "force-dynamic";

/**
 * Server-side check for migrations the operator still owes. Returns
 * the full SQL body for any migration that's not applied so the page
 * can render it inline (per the README ABSOLUTE RULE: never reference
 * an unapplied migration without inlining the SQL).
 *
 * Each check is wrapped in try/catch so one missing table doesn't
 * kill the page — the banner just shows what's actually missing.
 */
interface OwedMigration {
  filename: string;
  table: string;
  sql: string;
  verifySql: string;
}

const MIGRATION_10_SQL = `CREATE TABLE IF NOT EXISTS "avatar_eval_runs" (
  "id"             UUID           NOT NULL DEFAULT gen_random_uuid(),
  "vendor"         TEXT           NOT NULL,
  "scriptId"       TEXT           NOT NULL,
  "scriptCategory" TEXT           NOT NULL,
  "scriptText"     TEXT           NOT NULL,
  "latencyMs"      INTEGER        NOT NULL,
  "mosScore"       DOUBLE PRECISION,
  "costCents"      INTEGER,
  "raterId"        TEXT,
  "notes"          TEXT,
  "metadata"       JSONB          NOT NULL DEFAULT '{}'::jsonb,
  "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "avatar_eval_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "avatar_eval_runs_vendor_createdAt_idx"
  ON "avatar_eval_runs" ("vendor", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "avatar_eval_runs_scriptId_vendor_idx"
  ON "avatar_eval_runs" ("scriptId", "vendor");`;

const MIGRATION_10_VERIFY = `SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'avatar_eval_runs';`;

const MIGRATION_11_SQL = `DO $$ BEGIN
  CREATE TYPE "CollectionType" AS ENUM ('company_core','pitch_decks','strategic_partnerships','product_technology','financials_models','licensing_commercial','legal_compliance','due_diligence','sales_marketing','methodology','sample_reports','acquisition_exit');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "document_collections" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "collectionType" "CollectionType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "document_collections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "document_collections_slug_key" ON "document_collections" ("slug");
CREATE INDEX IF NOT EXISTS "document_collections_collectionType_idx" ON "document_collections" ("collectionType");
CREATE INDEX IF NOT EXISTS "document_collections_isActive_idx" ON "document_collections" ("isActive");

CREATE TABLE IF NOT EXISTS "document_versions" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "titleSnapshot" TEXT,
  "contentSnapshot" TEXT,
  "filePathSnapshot" TEXT,
  "changeNotes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "document_versions_documentId_idx" ON "document_versions" ("documentId");
CREATE INDEX IF NOT EXISTS "document_versions_versionNumber_idx" ON "document_versions" ("versionNumber");

CREATE TABLE IF NOT EXISTS "user_company_profiles" (
  "id" TEXT NOT NULL,
  "userProfileId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "primarySector" TEXT,
  "headquartersLocation" TEXT,
  "employeeCount" INTEGER,
  "arr" DOUBLE PRECISION,
  "totalRaised" DOUBLE PRECISION,
  "regulatoryBody" TEXT,
  "certifications" TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  "customerCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_company_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_company_profiles_userProfileId_key" ON "user_company_profiles" ("userProfileId");
CREATE INDEX IF NOT EXISTS "user_company_profiles_primarySector_idx" ON "user_company_profiles" ("primarySector");

DO $$ BEGIN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "document_collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "user_company_profiles" ADD CONSTRAINT "user_company_profiles_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; WHEN undefined_table THEN null; END $$;

INSERT INTO "document_collections" ("id","name","slug","description","collectionType","isActive","createdAt","updatedAt") VALUES
  ('cdoc_company_core','Company Core','company-core','Foundational corporate documents','company_core',true,NOW(),NOW()),
  ('cdoc_pitch_decks','Pitch Decks','pitch-decks','Investor-facing slide decks','pitch_decks',true,NOW(),NOW()),
  ('cdoc_strategic_partnerships','Strategic Partnerships','strategic-partnerships','Partnership memoranda and co-marketing assets','strategic_partnerships',true,NOW(),NOW()),
  ('cdoc_product_technology','Product & Technology','product-technology','Technical and product specifications','product_technology',true,NOW(),NOW()),
  ('cdoc_financials_models','Financials & Models','financials-models','Financial statements and valuation models','financials_models',true,NOW(),NOW()),
  ('cdoc_licensing_commercial','Licensing & Commercial','licensing-commercial','License agreements and commercial terms','licensing_commercial',true,NOW(),NOW()),
  ('cdoc_legal_compliance','Legal & Compliance','legal-compliance','Legal agreements and compliance artefacts (DPIA)','legal_compliance',true,NOW(),NOW()),
  ('cdoc_due_diligence','Due Diligence','due-diligence','Diligence room exhibits and disclosures','due_diligence',true,NOW(),NOW()),
  ('cdoc_sales_marketing','Sales & Marketing','sales-marketing','Sales collateral and marketing assets','sales_marketing',true,NOW(),NOW()),
  ('cdoc_methodology','Methodology','methodology','Internal methodology and how-we-work docs','methodology',true,NOW(),NOW()),
  ('cdoc_sample_reports','Sample Reports','sample-reports','Anonymised sample outputs','sample_reports',true,NOW(),NOW()),
  ('cdoc_acquisition_exit','Acquisition & Exit','acquisition-exit','M and A + exit-readiness documents','acquisition_exit',true,NOW(),NOW())
ON CONFLICT ("id") DO NOTHING;`;

const MIGRATION_11_VERIFY = `SELECT slug, name FROM "document_collections" ORDER BY slug;`;

async function getOwedMigrations(): Promise<OwedMigration[]> {
  const owed: OwedMigration[] = [];

  // Migration 10 — avatar_eval_runs (Track O5c S1)
  try {
    await prisma.avatarEvalRun.count();
  } catch {
    owed.push({
      filename: "prisma/sql/10-add-avatar-eval-run.sql",
      table: "avatar_eval_runs",
      sql: MIGRATION_10_SQL,
      verifySql: MIGRATION_10_VERIFY,
    });
  }

  // Migration 11 — agent handler foundation (Track H S21)
  // Probe DocumentCollection: it carries the 12 seeded rows, so a thrown
  // count() means the migration hasn't run. Seed-without-tables and
  // tables-without-seed are both surfaced (count throws OR count < 12
  // when the table exists but the INSERT block was skipped).
  try {
    const seedCount = await prisma.documentCollection.count();
    if (seedCount < 12) {
      owed.push({
        filename: "prisma/sql/11-add-agent-handler-foundation.sql",
        table: "document_collections (seed)",
        sql: MIGRATION_11_SQL,
        verifySql: MIGRATION_11_VERIFY,
      });
    }
  } catch {
    owed.push({
      filename: "prisma/sql/11-add-agent-handler-foundation.sql",
      table: "document_collections + document_versions + user_company_profiles",
      sql: MIGRATION_11_SQL,
      verifySql: MIGRATION_11_VERIFY,
    });
  }

  return owed;
}

interface ToolCard {
  href: string;
  group: string;
  title: string;
  blurb: string;
  status?: { ok: boolean; label: string };
}

function buildToolCards(): ToolCard[] {
  const vendorHealth = getAllVendorHealth();
  const configuredCount = vendorHealth.filter((v) => v.configured).length;

  return [
    {
      href: "/admin",
      group: "Agents",
      title: "Agent command center",
      blurb:
        "Status, configuration, and per-agent run controls for every Olivia / Cristiano / Emelia agent. Run-all, briefings, system alerts.",
    },
    {
      href: "/admin/avatar-eval",
      group: "Avatar A/B",
      title: "Vendor MOS harness",
      blurb:
        "30-script suite × 6 vendors. Capture latency + MOS + cost per run. Live TTFM trigger for LiveAvatar.",
      status: {
        ok: configuredCount > 0,
        label: `${configuredCount}/${vendorHealth.length} vendors wired`,
      },
    },
    {
      href: "/admin/avatar-eval/decision",
      group: "Avatar A/B",
      title: "Decision rubric",
      blurb:
        "Vendor ranking via latency × 0.4 + MOS × 0.4 + cost × 0.2. Per-component breakdown shows why a vendor ranked where it did.",
    },
    {
      href: "/admin/eval",
      group: "Quality",
      title: "Golden eval suite",
      blurb:
        "Hand-picked golden cases that gate cascade quality. Run sparingly — each case costs ~500 tokens.",
    },
    {
      href: "/admin/traces",
      group: "Quality",
      title: "Cascade traces",
      blurb:
        "Live recording of every /api/olivia/chat and /chat/stream call. Per-provider latency, model id, spoke routing, fallback path.",
    },
    {
      href: "/admin/investors",
      group: "Deal protection",
      title: "Investor reputations",
      blurb:
        "Admin CRUD for the InvestorReputation table. Backs the deal-protection cascade's investor-tilt math.",
    },
    {
      href: "/admin/integrations",
      group: "Integrations",
      title: "Composio + cascade providers",
      blurb:
        "Health checks for the Q3 read-only Composio integrations and the multi-provider LLM cascade.",
    },
    {
      href: "/admin/phase1",
      group: "Legacy",
      title: "Phase 1 dashboard",
      blurb:
        "Pre-Track-U surface. Kept for reference; Track U + the agent command center supersede it.",
    },
  ];
}

export default async function AdminToolsPage() {
  const cards = buildToolCards();
  const owedMigrations = await getOwedMigrations();

  // Group cards by their `group` field so the page reads as
  // capability sections, not one flat list.
  const groups: { name: string; cards: ToolCard[] }[] = [];
  for (const card of cards) {
    const existing = groups.find((g) => g.name === card.group);
    if (existing) existing.cards.push(card);
    else groups.push({ name: card.group, cards: [card] });
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--canvas-base)",
        color: "var(--fg-primary)",
        padding: "32px 32px 64px",
        display: "grid",
        gap: 24,
        maxWidth: 1280,
        marginInline: "auto",
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          /admin/tools
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            fontWeight: 500,
          }}
        >
          Operator surfaces
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            maxWidth: 720,
          }}
        >
          Every admin / operator surface in one place. Vendor wiring status
          is read at request time so the avatar tools card always reflects
          the current Vercel env.
        </p>
      </header>

      {owedMigrations.length > 0 && (
        <section
          role="alert"
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-1)",
            border: "1px solid var(--coral-down-mute)",
            display: "grid",
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--coral-down)",
            }}
          >
            Operator actions owed · {owedMigrations.length} migration{owedMigrations.length === 1 ? "" : "s"}
          </span>
          <p style={{ margin: 0, color: "var(--fg-primary)", fontSize: "var(--text-sm)" }}>
            The following SQL migrations have not been applied to the database. Paste each block into the
            Supabase SQL Editor and Run. Once applied, this banner disappears on refresh. (Per the README
            ABSOLUTE RULE, the SQL is inlined here — no need to chase files.)
          </p>
          {owedMigrations.map((m) => (
            <OwedMigrationCard
              key={m.filename}
              filename={m.filename}
              table={m.table}
              sql={m.sql}
              verifySql={m.verifySql}
            />
          ))}
        </section>
      )}

      {groups.map((group) => (
        <section key={group.name} style={{ display: "grid", gap: 10 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--fg-tertiary)",
            }}
          >
            {group.name}
          </span>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            {group.cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-default)",
                  display: "grid",
                  gap: 8,
                  transition: "border-color 120ms",
                }}
              >
                <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-md)",
                      fontWeight: 500,
                      color: "var(--fg-primary)",
                    }}
                  >
                    {card.title}
                  </span>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      color: "var(--aurum-primary)",
                    }}
                  >
                    {card.href}
                  </code>
                </header>
                <p
                  style={{
                    margin: 0,
                    color: "var(--fg-secondary)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  {card.blurb}
                </p>
                {card.status && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.06em",
                      color: card.status.ok
                        ? "var(--mint-up)"
                        : "var(--coral-down)",
                    }}
                  >
                    {card.status.ok ? "✓" : "✗"} {card.status.label}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
