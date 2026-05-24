# Olivia Brain — Master Checklist

> **Running record of in-flight audit + remediation work.** Updated as
> each item ships. Source of truth for "what is the next item on the
> build" between handoffs. Locked 2026-05-25 per founder direction
> "keep updating your master checklist and committing to github".

---

## Active track — Remediation (post-audit fixes)

| # | Item | Status | Output | Commit |
|---|---|---|---|---|
| FIX-1 | **Law 6 Phase 1+2** — create `src/lib/regulatory-config/` + `uk-modern-slavery.ts` with `validUntil` + stale-config CI guard; refactor `g1-048` to import the constant at all 3 inline sites | ✅ Shipped | `src/lib/regulatory-config/uk-modern-slavery.ts` + sibling `__tests__/uk-modern-slavery.test.ts` + g1-048 refactor | (this commit) |
| FIX-2 | **Bundle E Phase 1** — wire `@next/bundle-analyzer` + `npm run analyze` script | ⏳ Next | `next.config.ts` + `package.json` | — |
| FIX-3 | **Bundle E Phase 3a** — lazy-load `ChartFromSpec` via `dynamic({ ssr: false })` in `MarkdownReply.tsx` so recharts (~120 KB) leaves the home-page initial bundle; chunk loads only when a chat reply emits a ` ```chart ` fence; barrel `index.ts` still re-exports the canonical `ChartFromSpec` statically so direct consumers (e.g. `ChartFromSpec.mount.test.tsx`) are unaffected | ✅ Shipped | `src/components/home/reply-renderer/MarkdownReply.tsx` + `MarkdownReply.test.tsx` (chart-fence dispatch test → async `findByText`) | (this commit) |
| FIX-4 | **Law 8 CI guard** — source-scan guard asserting every API route with `POST`/`PUT`/`PATCH` validates input via Zod (direct `from "zod"` OR Zod-backed helper `parse<Pascal>` / `<Pascal>Schema` from `@/lib/...`). Seeds `KNOWN_GAP_ALLOWLIST` with 54 routes pre-dating the guard (drained by audit phase 2). Allowlist-sanity test fires when an entry is remediated or removed (drift catcher). New routes have no allowlist slot — they ship with Zod or fail CI | ✅ Shipped | `src/lib/evaluation/law-8-route-zod-guard.test.ts` (4 tests: main scan, allowlist sanity, route-count telemetry, allowlist-size telemetry) | (this commit) |
| FIX-5 | **Law 5 CI guard** — runtime-import guard asserting every entry of `AGENT_DEFINITIONS` has a non-empty `dataSources` array AND every entry within is a non-empty trimmed string. Plus telemetry: ≥100 agents scanned + every agent has a non-empty `agentId`. Second half of Law 5 (strict-typing against a canonical enumeration) deferred behind founder-gated synonym-collapse pass per audit § 5 Phase 1+2 | ✅ Shipped | `src/lib/evaluation/law-5-agent-data-sources-guard.test.ts` (4 tests: empty-array, non-string-or-whitespace, agent-count telemetry, agentId-presence telemetry) | (this commit) |

## Audit-track summary — all 4 audits complete 2026-05-25

| # | Item | Status | Output | Commit |
|---|---|---|---|---|
| C-1 | **Architecture Law 5 audit** — agent `dataSources` strict-typing + CI AST guard | ✅ Audit shipped | `docs/07_ARCHITECTURE_LAW_5_AUDIT.md` | `d249205` |
| C-2 | **Architecture Law 6 audit** — regulatory constants in `src/lib/regulatory-config/` with `validUntil` | ✅ Audit shipped | `docs/08_ARCHITECTURE_LAW_6_AUDIT.md` | (this commit) |
| C-3 | **Architecture Law 8 audit** — schema-first at every boundary (Zod + type guard + tolerant JSON parser per G1-033) | ✅ Audit shipped | `docs/09_ARCHITECTURE_LAW_8_AUDIT.md` | (this commit) |
| E-1 | **Bundle-size audit** — Next/recharts/mapbox-gl/framer/radix; surface lazy-load opportunities; performance budget | ✅ Audit shipped | `docs/10_BUNDLE_SIZE_AUDIT.md` | (this commit) |

---

## Operator actions owed (you, not me)

These block production but cannot be done from a coding-agent session:

1. **Rotate the leaked LiveAvatar/HeyGen + ElevenLabs + OpenAI keys vendor-side.** The plain-text values were in OB git history (redacted in commit `edf3a05` 2026-05-25). Code-side leak vectors are fixed; rotating new keys is now safe.
2. **Set OB Vercel env vars** per `HANDOFF_2026-05-25.md` § 3.4 (LIVEAVATAR_*, ELEVENLABS_*, plus 8 `GATEWAY_TOKEN_*`).
3. **Apply migration 15** (`captionsUrl` SQL) per `HANDOFF_2026-05-25.md` § 3.1. Inline SQL body in that handoff.
4. **Real APCA + screen-reader verification** on `/cristiano` per `HANDOFF_2026-05-25.md` § 3.3.

---

## Deferred per founder calls (parked, not lost)

- **cristiano.ts Law 3 refactor** (738 LOC, 2 raw-fetch sites + fetchWithRetry helper + multi-provider fallback). Deferred 2026-05-25.
- **Stale `claude-sonnet-4-20250514` sweep** across 10 OB files (personas/, tenant/, cristiano.ts). Deferred 2026-05-25; founder approved a model-fix-only path that was moot after cristiano.ts itself was deferred.
- **Other undeclared `@theme` color tokens** (graphite, coral-downside, cyan-interactive, jade-upside, status-warning) — adjacent surface bug, deferred 2026-05-25.
- **L2 criteria textarea `maxLength`** in AskCristiano — minor UX, deferred 2026-05-25.
- **Track L cluesintelligence Unification** (~10 sessions, FLAGSHIP) — excluded by founder until spec lock.
- **Mount Cristiano in additional surfaces** (WarRoom / WarRoomBriefing / ValuationWorkbench / PreparationStudio per `HEYGEN_LTM_CONFIG.md` § 0). Deferred until founder picks up the rest of the multi-surface mount work.

---

## Done this session (2026-05-26)

Reverse-chronological:

| SHA | What |
|---|---|
| (this commit) | **FIX-5 Law 5 CI guard** — ship `src/lib/evaluation/law-5-agent-data-sources-guard.test.ts` (4 tests, runtime-import pattern per audit § 4.3 recommendation rather than the source-scan style used by FIX-4). Asserts: every `AGENT_DEFINITIONS` entry has `dataSources.length > 0`; every entry within is a non-empty trimmed string (catches `""` / `"  "` / non-string drift); ≥100 agents scanned (catches accidental array truncation); every `agentId` is non-empty (precondition for diff-able failure output). 4/4 green in 5ms; tsc clean. Second half of Law 5 (strict-typed enumeration + AST validation) deferred behind founder-gated synonym-collapse pass — `user_input` vs `user_query` vs `user_message` semantically refer to the same dependency but are three distinct strings the compiler treats as unrelated. Per audit § 5 Phase 1+2, the enumeration design needs founder review of canonical names, then this guard upgrades to enumeration-membership checks. |
| `55db0cf` | **FIX-4 Law 8 CI guard** — ship `src/lib/evaluation/law-8-route-zod-guard.test.ts` (4 tests, mirrors `a11y-source-guard` + `token-coverage-guard` patterns). Scans every `src/app/api/**/route.ts`; for files exporting `POST`/`PUT`/`PATCH`, asserts Zod validation at the boundary — direct (`from "zod"` + `z.object`/`z.string`/`safeParse`/`.parse(`) OR via helper (`parse<Pascal>` / `<Pascal>Schema` from `@/lib/...`). Seeds `KNOWN_GAP_ALLOWLIST` with 54 routes pre-dating the guard (audit's "82-route gap" minus 28 routes already compliant via multi-line helper imports the audit's single-line grep missed). Allowlist-sanity test fires when a route is remediated (drift catcher: "now validates via Zod — remove from allowlist; celebrate"). Telemetry tests assert ≥50 routes scanned (catches misplaced api dir) + allowlist size ≤65 (catches accidental balloon). 4/4 green in 8s; tsc clean. New routes have no allowlist slot — they ship with Zod or fail CI. |
| `ebfe272` | **FIX-3 Bundle E Phase 3a** — lazy-load `ChartFromSpec` via `next/dynamic({ ssr: false })` in `MarkdownReply.tsx` with a fixed-height (220 px) `Loading chart...` placeholder so layout does not jump. Recharts (~120 KB gzipped) now leaves the home-page initial bundle; the chunk loads only when a chat reply emits a ` ```chart ` fence. `index.ts` barrel re-export unchanged → `ChartFromSpec.mount.test.tsx` (which imports the component directly) still mounts synchronously. `MarkdownReply.test.tsx` chart-fence-dispatch test converted to async `findByText` (1 line of test setup; chunk resolves on next microtask). 159/159 reply-renderer tests green; `tsc --noEmit --incremental` clean. Zero LTM writes. |

## Done prior session (2026-05-25, post-handoff)

| SHA | What |
|---|---|
| `c19d77a` | **FIX-1 Law 6 remediation Phase 1+2** — create `src/lib/regulatory-config/` + `uk-modern-slavery.ts` with the £36M threshold + ISO `validUntil` field + barrel index + 11-case Law-6 stale-config CI guard (asserts `validUntil >= today + 90d`); refactor `g1-048` at all 3 inline sites (docstring + LLM input + LLM prompt instruction) to import via `formatUkModernSlaveryThreshold()`. 26/26 tests pass (11 new + 15 existing g1-048). Single source of truth for the threshold across OB. |
| `e508164` | Bundle-size audit (E-1) — 5 findings (no `@next/bundle-analyzer`; no perf budget; framer-motion static across 9 valuation files; recharts not lazy-loaded inside ChartFromSpec; verify three.js path). 6 existing dynamic-import strengths enumerated. 5-phase plan starting with `@next/bundle-analyzer` wire-up (~30 min) |
| `d588899` | Law 8 audit — 2 findings (37/119 API routes use Zod = 31% coverage; no CI guard for the 3-layer pattern); G1-033 canonical pattern annotated layer-by-layer; 4-phase remediation plan |
| `c9d234b` | Law 6 audit — 3 findings (regulatory-config dir missing, £36M inline in g1-048 at 3 sites, no stale-config alert); 4-phase remediation plan |
| `d249205` | Law 5 audit — 2 findings (dataSources typed `string[]` not strict-typed, no CI AST guard); 4-phase remediation plan + MASTER_CHECKLIST.md created |
| `edf3a05` | Redact leaked API keys in `HEYGEN_LTM_CONFIG.md`; align Olivia voice defaults across `env.ts` + `vapi.ts` to LTM production set `rVk0ZvRulp6xrYJkGztP`; enrich `.env.example` with persona voice + avatar ID section; update `HANDOFF_2026-05-25.md` § 3.4 with LTM-prod IDs inline + secret-rotation note |
| `53e9480` | voice/process route handler — 21 contract tests covering auth + validation + LLM-failure + happy + persistence + unexpected-throw + no-leak security posture |
| `f87610b` | voice-conversation raw fetch → callLLM (Architecture Law 3); 43 new tests covering all 5 callsites + every error branch + every pure helper |
| `e8d7230` | voice-document raw fetch → callLLM (Architecture Law 3); 26 new tests covering happy + every failure path + every pure helper |
| `5c6b79a` | Cristiano embedded as 7th home Inspector tab via new `embedded` prop on `CristianoDashboard`; 5 new tests; pop-out deep-link parity |
| `209a205` | Declare missing `--color-fog` / `--color-onyx` / `--color-aurum-highlight` `@theme` tokens; regression guard test; audit doc § 8 added |

**Net:** 6 commits, +102 tests, all green. TSC clean across every commit. Zero LTM writes.

---

## Maintenance

When a new audit / remediation lands, update:
1. The "Active track" table — flip `⏳` to `✅`, link the output doc, record the commit SHA
2. The "Done this session" table — append the new SHA at the top
3. The audit doc's `§ 1 Findings summary` — record any new ✅ / 🟡 / 🔴 marks

When founder defers an item, move it from "Active track" to "Deferred per founder calls" with the date + reason.
