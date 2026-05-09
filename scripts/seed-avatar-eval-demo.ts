/**
 * scripts/seed-avatar-eval-demo.ts
 *
 * Seeds ~30 sample AvatarEvalRun rows so /admin/avatar-eval and
 * /admin/avatar-eval/decision render meaningful content out of the
 * box. Useful for demos and for operator sanity-checking the
 * migration before recording real runs.
 *
 * Per CLAUDE.md, data changes go through TypeScript scripts using
 * the existing Prisma client — never raw SQL pastes.
 *
 * Prerequisites:
 *   - prisma/sql/10-add-avatar-eval-run.sql applied to the database
 *   - DATABASE_URL set in .env.local (or shell env)
 *
 * Run:
 *   npx tsx scripts/seed-avatar-eval-demo.ts          # seed
 *   npx tsx scripts/seed-avatar-eval-demo.ts --clean  # remove demo rows
 *
 * Idempotent on seed: every demo row is tagged metadata.demo === true,
 * so re-running adds another batch (use --clean first to reset).
 * Idempotent on --clean: only deletes demo-tagged rows; never touches
 * operator-recorded runs.
 */

import { Prisma } from "@prisma/client";
import prisma from "../src/lib/db/client";
import {
  EVAL_SCRIPTS,
  EVAL_VENDORS,
  type EvalScript,
  type EvalVendor,
} from "../src/lib/avatar/eval-scripts";

// Realistic latency ranges (ms) per vendor — based on the O5 research
// memo's vendor-class characterisation. liveavatar is fastest because
// it's the LITE Mode (PCM-in, server-side viseme infer); sadtalker is
// slowest because it's a Replicate batch model not a realtime SaaS.
const LATENCY_RANGE_MS: Record<EvalVendor, [number, number]> = {
  liveavatar: [180, 380],
  tavus: [320, 540],
  simli: [220, 440],
  heygen: [380, 720],
  did: [480, 880],
  sadtalker: [800, 1500],
};

// Realistic MOS ranges (1–5 scale) per vendor. liveavatar is the
// production baseline (good but not perfect); tavus claims tighter
// phoneme accuracy; simli is mid-pack; heygen and did are mature
// but not optimised for sub-second pipelines.
const MOS_RANGE: Record<EvalVendor, [number, number]> = {
  liveavatar: [3.8, 4.4],
  tavus: [4.1, 4.8],
  simli: [3.7, 4.3],
  heygen: [4.0, 4.6],
  did: [3.6, 4.2],
  sadtalker: [3.2, 4.0],
};

// Realistic cost ranges (USD cents) per minute of generated speech.
// These are approximations from public pricing pages; will drift.
const COST_CENTS_RANGE: Record<EvalVendor, [number, number]> = {
  liveavatar: [4, 8],
  tavus: [10, 18],
  simli: [3, 7],
  heygen: [12, 20],
  did: [8, 14],
  sadtalker: [1, 3],
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function makeDemoRow(
  vendor: EvalVendor,
  script: EvalScript,
): Prisma.AvatarEvalRunCreateInput {
  const [latMin, latMax] = LATENCY_RANGE_MS[vendor];
  const [mosMin, mosMax] = MOS_RANGE[vendor];
  const [costMin, costMax] = COST_CENTS_RANGE[vendor];

  return {
    vendor,
    scriptId: script.id,
    scriptCategory: script.category,
    scriptText: script.text,
    latencyMs: Math.round(rand(latMin, latMax)),
    mosScore: Number(rand(mosMin, mosMax).toFixed(2)),
    costCents: Math.round(rand(costMin, costMax)),
    raterId: "demo-seed",
    notes: null,
    metadata: {
      demo: true,
      seededAt: new Date().toISOString(),
    } as Prisma.InputJsonValue,
  };
}

async function seed(): Promise<void> {
  // 30 rows: each vendor gets 5 random scripts (one per category if
  // possible, falling back to truly random). Keeps the harness
  // populated across the whole script grid.
  const rows: Prisma.AvatarEvalRunCreateInput[] = [];
  for (const vendor of EVAL_VENDORS) {
    const sample = new Set<string>();
    while (sample.size < 5) {
      sample.add(pickRandom(EVAL_SCRIPTS).id);
    }
    for (const id of sample) {
      const script = EVAL_SCRIPTS.find((s) => s.id === id);
      if (script) rows.push(makeDemoRow(vendor as EvalVendor, script));
    }
  }

  console.log(`[seed-avatar-eval-demo] Inserting ${rows.length} demo rows…`);
  const result = await prisma.avatarEvalRun.createMany({ data: rows });
  console.log(`[seed-avatar-eval-demo] Created ${result.count} rows.`);
  console.log(
    "[seed-avatar-eval-demo] Visit /admin/avatar-eval and /admin/avatar-eval/decision to see them.",
  );
  console.log(
    "[seed-avatar-eval-demo] To remove demo rows: npx tsx scripts/seed-avatar-eval-demo.ts --clean",
  );
}

async function clean(): Promise<void> {
  console.log("[seed-avatar-eval-demo] Removing demo-tagged rows…");
  // Path filter on JSONB. Prisma's `path` lookup expects an array
  // of keys; { path: ["demo"], equals: true } matches metadata where
  // metadata.demo === true.
  const result = await prisma.avatarEvalRun.deleteMany({
    where: {
      metadata: {
        path: ["demo"],
        equals: true,
      },
    },
  });
  console.log(`[seed-avatar-eval-demo] Deleted ${result.count} demo rows.`);
  console.log(
    "[seed-avatar-eval-demo] Operator-recorded runs (no metadata.demo flag) were not touched.",
  );
}

async function main(): Promise<void> {
  const wantsClean = process.argv.includes("--clean");
  try {
    if (wantsClean) {
      await clean();
    } else {
      await seed();
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((err) => {
  console.error("[seed-avatar-eval-demo] Failed:", err);
  process.exit(1);
});
