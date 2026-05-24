# Olivia Brain — Master Checklist

> **Running record of in-flight audit + remediation work.** Updated as
> each item ships. Source of truth for "what is the next item on the
> build" between handoffs. Locked 2026-05-25 per founder direction
> "keep updating your master checklist and committing to github".

---

## Active track — Architecture Standards Audits (C) + Bundle Audit (E) — ALL AUDITS COMPLETE 2026-05-25

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

## Done this session (2026-05-25, post-handoff)

Reverse-chronological:

| SHA | What |
|---|---|
| (this commit) | Bundle-size audit (E-1) — 5 findings (no `@next/bundle-analyzer`; no perf budget; framer-motion static across 9 valuation files; recharts not lazy-loaded inside ChartFromSpec; verify three.js path). 6 existing dynamic-import strengths enumerated. 5-phase plan starting with `@next/bundle-analyzer` wire-up (~30 min) |
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
