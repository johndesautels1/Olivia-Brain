#!/usr/bin/env node
/**
 * build-truth.mjs — the single source of truth for "where is the Olivia Brain build".
 *
 * WHY THIS EXISTS
 * ---------------
 * The narrative planning docs (BATTLE_PLAN.md, OLIVIA_BUILD_STATE.md,
 * BUILD_SEQUENCE.md, MASTER_CHECKLIST.md) drifted apart — three different
 * completion percentages, stale test counts, track checkmarks that were never
 * re-ticked after the work shipped. Hand-maintained status always drifts.
 *
 * This script removes the drift class entirely for every OBJECTIVE metric by
 * DERIVING it from the file system, which cannot lie. It emits:
 *   - docs/BUILD_TRUTH.json  (machine-readable, checked into git)
 *   - docs/BUILD_TRUTH.md    (human-readable canonical status)
 *
 * The companion guard `src/lib/evaluation/build-status-drift-guard.test.ts`
 * recomputes the `computed` block and fails CI if the committed JSON diverges,
 * so the numbers can never silently rot again: change the tree, regenerate, or
 * the build goes red.
 *
 * CURATED vs COMPUTED
 * -------------------
 * `computed.*`  — pure file-system facts (counts + evidence presence). Enforced
 *                 byte-for-byte by the guard.
 * `curated.*`   — human judgment (a track's status label, whether a spoke is
 *                 docked). NOT equality-enforced, because judgment isn't a file
 *                 count — but every curated row carries its computed evidence
 *                 count beside it, so a "done" claim against an empty directory
 *                 is visible at a glance.
 *
 * Run:  npm run build:truth        (regenerate + write)
 *       npm run build:truth -- --check   (print only, non-zero exit if files stale)
 */

import { globSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

/** Count source files (.ts/.tsx, excluding declaration files) under a glob rooted at repo root. */
function count(glob) {
  return globSync(glob, { cwd: ROOT }).filter((p) => !p.endsWith(".d.ts")).length;
}
/** True if at least one file matches the glob. */
function exists(glob) {
  return globSync(glob, { cwd: ROOT }).length > 0;
}
/** Sum of source files across several evidence globs (deduped). */
function evidence(globs) {
  const set = new Set();
  for (const g of globs) for (const p of globSync(g, { cwd: ROOT })) if (!p.endsWith(".d.ts")) set.add(p);
  return set.size;
}

// ── CURATED MANIFEST ────────────────────────────────────────────────────────
// Track membership + human status labels. Evidence globs are computed, not typed.
// status: "shipped" | "in_progress" | "not_started"
const TRACKS = [
  { id: "A",  name: "Chat brain end-to-end",        sessions: "4–6",   status: "shipped",      evidence: ["src/app/api/olivia/chat/**/route.ts", "src/lib/orchestration/intent.ts"] },
  { id: "Cal",name: "Calendar/voice/email/call infra", sessions: "C1–C6", status: "shipped",   evidence: ["src/lib/calendar/**/*.ts", "src/app/api/calendar/**/route.ts"] },
  { id: "V",  name: "LTM Valuation Engine port",     sessions: "V1–V9", status: "shipped",      evidence: ["src/lib/valuation/**/*.ts", "src/lib/agents/valuation/**/*.ts", "src/app/api/valuation/**/route.ts", "src/components/valuation/**/*.tsx"] },
  { id: "Q",  name: "Quantara founder intake",       sessions: "Q1–Q7", status: "shipped",      evidence: ["src/lib/quantara/**/*.ts", "src/app/api/founder-intake/**/route.ts"] },
  { id: "P",  name: "Deal Protection engine",        sessions: "P1–P7", status: "shipped",      evidence: ["src/lib/deal-protection/**/*.ts", "src/app/api/deal-protection/**/route.ts"] },
  { id: "F",  name: "Auth (pre-Clerk stub + gateway)", sessions: "18",  status: "shipped",      evidence: ["src/lib/auth/**/*.ts", "src/lib/gateway/**/*.ts"] },
  { id: "O1", name: "Composio agentic tool dispatch", sessions: "O1",   status: "shipped",      evidence: ["src/lib/tools/composio.ts", "src/lib/tools/approval-gate.ts"] },
  { id: "B",  name: "Studio engine port",            sessions: "7–8",   status: "in_progress",  evidence: ["src/lib/studio/**/*.ts"] },
  { id: "C",  name: "Studio UI rebuild + design system", sessions: "9–14", status: "in_progress", evidence: ["src/components/studio/**/*.tsx"] },
  { id: "G",  name: "Cascade orchestrator port",     sessions: "19–20", status: "in_progress",  evidence: ["src/lib/orchestration/**/*.ts", "src/lib/services/model-cascade.ts"] },
  { id: "H",  name: "Agents consolidation",          sessions: "21–23", status: "in_progress",  evidence: ["src/lib/agents/**/*.ts"] },
  { id: "I",  name: "Multi-tenant + white-label hardening", sessions: "24", status: "in_progress", evidence: ["src/lib/tenant/**/*.ts", "src/lib/white-label/**/*.ts"] },
  { id: "K",  name: "Hardening + launch prep (audits/remediation)", sessions: "27–30", status: "in_progress", evidence: ["src/lib/evaluation/**/*.ts", "src/lib/regulatory-config/**/*.ts"] },
  { id: "O",  name: "Weakness closure (O1 done; O2–O5 open)", sessions: "O1–O5", status: "in_progress", evidence: ["src/lib/rag/**/*.ts", "src/lib/tools/composio.ts"] },
  { id: "D",  name: "Studio ↔ brain wiring",         sessions: "15–16", status: "not_started",  evidence: [] },
  { id: "E",  name: "Voice input (Studio hookup)",   sessions: "17",    status: "not_started",  evidence: ["src/lib/voice/**/*.ts"] },
  { id: "J",  name: "Vertical adapters",             sessions: "25–26", status: "not_started",  evidence: [] },
  { id: "N",  name: "Visual Manifestation Layer",    sessions: "N1–N5", status: "not_started",  evidence: [] },
];

// The 6 spokes Olivia orchestrates as the hub. A spoke is "docked" when a
// UniversalKnowledgeProvider exists for it under src/lib/bridge/providers/.
// (olivia-self is the hub itself, not one of the six spokes.)
const SPOKES = [
  { key: "london-tech-map",   name: "London Tech Map",       provider: "src/lib/bridge/providers/ltm.ts" },
  { key: "clues-intelligence",name: "CLUES Intelligence",    provider: "src/lib/bridge/providers/clues-intelligence.ts" },
  { key: "clues-lifescore",   name: "CLUES LifeScore",       provider: "src/lib/bridge/providers/lifescore.ts" },
  { key: "heartbeat",         name: "HEARTBEAT (cardiac)",   provider: "src/lib/bridge/providers/heartbeat.ts" },
  { key: "clues-tes",         name: "CLUES-TES (transit/env)", provider: "src/lib/bridge/providers/clues-tes.ts" },
  { key: "desautels-brokerage", name: "Desautels Brokerage", provider: "src/lib/bridge/providers/desautels.ts" },
];

// ── COMPUTE ─────────────────────────────────────────────────────────────────
const tracks = TRACKS.map((t) => ({
  id: t.id, name: t.name, sessions: t.sessions, status: t.status,
  evidenceFiles: t.evidence.length ? evidence(t.evidence) : 0,
}));

const spokes = SPOKES.map((s) => ({
  key: s.key, name: s.name, docked: exists(s.provider),
}));

const computed = {
  apiRoutes: count("src/app/api/**/route.ts"),
  libModules: count("src/lib/**/*.ts"),
  components: count("src/components/**/*.tsx"),
  testFiles: evidence(["src/**/*.test.ts", "src/**/*.test.tsx"]),
  prismaModels: (readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8").match(/^model /gm) || []).length,
  bridgeProviders: count("src/lib/bridge/providers/*.ts"),
  adapters: count("src/lib/adapters/*.ts"),
  tracks: {
    total: tracks.length,
    shipped: tracks.filter((t) => t.status === "shipped").length,
    inProgress: tracks.filter((t) => t.status === "in_progress").length,
    notStarted: tracks.filter((t) => t.status === "not_started").length,
  },
  spokes: {
    total: spokes.length,
    docked: spokes.filter((s) => s.docked).length,
  },
};

const truth = {
  $schema: "olivia-build-truth/v1",
  note: "GENERATED by scripts/build-truth.mjs — do not hand-edit. Run `npm run build:truth`.",
  computed,
  curated: { tracks, spokes },
};

/**
 * The whole point of the anti-drift guard: recompute the truth object from the
 * live tree. The guard test imports this, so a tree change without a
 * regenerate makes the committed JSON diverge from this return value → red CI.
 */
export function computeTruth() {
  return truth;
}

// ── RENDER ──────────────────────────────────────────────────────────────────
const json = JSON.stringify(truth, null, 2) + "\n";

const statusMark = { shipped: "✅ shipped", in_progress: "🟡 in progress", not_started: "⬜ not started" };
const c = computed;
const md = `<!-- GENERATED by scripts/build-truth.mjs — DO NOT EDIT BY HAND. Run: npm run build:truth -->

# Olivia Brain — Build Truth (canonical)

> **This file is generated from the source tree, not hand-written.** It is the
> single source of truth for build status. The narrative docs
> (\`BATTLE_PLAN.md\`, \`OLIVIA_BUILD_STATE.md\`, \`BUILD_SEQUENCE.md\`,
> \`MASTER_CHECKLIST.md\`) are historical/planning context; when any of them
> disagrees with this file, **this file wins.** Drift is prevented by
> \`src/lib/evaluation/build-status-drift-guard.test.ts\`, which fails CI if the
> committed \`BUILD_TRUTH.json\` no longer matches the tree.

## Architecture — hub + 6 spokes

Olivia is the **hub** (grand-master orchestration + agentic super-agent) that
docks into 6 **spoke** apps through the UKP bridge + gateway. She is the brain,
not the warehouse: each spoke stays the system of record for its own domain.

**Spokes docked: ${c.spokes.docked} / ${c.spokes.total}** (a spoke is "docked" when a bridge provider exists for it)

| Spoke | Docked |
|---|---|
${spokes.map((s) => `| ${s.name} | ${s.docked ? "✅ provider present" : "⬜ pending (blocked until app is live)"} |`).join("\n")}

## Codebase facts (computed)

| Metric | Count |
|---|---|
| API routes (\`route.ts\`) | ${c.apiRoutes} |
| Library modules (\`src/lib/**/*.ts\`) | ${c.libModules} |
| Components (\`src/components/**/*.tsx\`) | ${c.components} |
| Test files | ${c.testFiles} |
| Prisma models | ${c.prismaModels} |
| Bridge providers | ${c.bridgeProviders} |
| Domain adapters | ${c.adapters} |

## Track ledger (curated status + computed evidence)

**${c.tracks.shipped} shipped · ${c.tracks.inProgress} in progress · ${c.tracks.notStarted} not started** (of ${c.tracks.total} tracks)

| Track | Focus | Sessions | Status | Evidence files on disk |
|---|---|---|---|---|
${tracks.map((t) => `| ${t.id} | ${t.name} | ${t.sessions} | ${statusMark[t.status]} | ${t.evidenceFiles} |`).join("\n")}

> "Evidence files on disk" is computed live. A \`shipped\` row with 0 evidence
> files is a lie the next regenerate will expose.
`;

const jsonPath = join(ROOT, "docs/BUILD_TRUTH.json");
const mdPath = join(ROOT, "docs/BUILD_TRUTH.md");

// The rendered artifacts, exposed so the guard test can assert byte-equality
// against the committed files without shelling out.
export const RENDERED_JSON = json;
export const RENDERED_MARKDOWN = md;

// ── CLI (only when run directly, never on import) ────────────────────────────
const runDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) {
  if (process.argv.includes("--check")) {
    let stale = false;
    for (const [p, want] of [[jsonPath, json], [mdPath, md]]) {
      let have = "";
      try { have = readFileSync(p, "utf8"); } catch { /* missing = stale */ }
      if (have !== want) { stale = true; console.error(`STALE: ${p} — run \`npm run build:truth\``); }
    }
    console.log(JSON.stringify(computed, null, 2));
    process.exit(stale ? 1 : 0);
  } else {
    writeFileSync(jsonPath, json);
    writeFileSync(mdPath, md);
    console.log(`Wrote docs/BUILD_TRUTH.json + docs/BUILD_TRUTH.md`);
    console.log(`  ${c.tracks.shipped}/${c.tracks.total} tracks shipped · ${c.spokes.docked}/${c.spokes.total} spokes docked · ${c.apiRoutes} routes · ${c.testFiles} test files`);
  }
}
