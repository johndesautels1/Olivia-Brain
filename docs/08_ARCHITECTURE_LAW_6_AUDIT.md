# 08 · ARCHITECTURE STANDARDS LAW 6 AUDIT — regulatory constants in `src/lib/regulatory-config/` with `validUntil`

> **Date:** 2026-05-25. **Auditor:** Claude Opus 4.7.
> **Scope:** `src/lib/regulatory-config/` (directory existence) + `src/lib/agents/impl/**/*.ts` (every per-company handler) + broader OB sweep for inline regulatory / market constants.
> **Standard:** `~/CLAUDE.md` Architecture Standards Law 6 verbatim:
>
> > **6. Regulatory / market constants live in `src/lib/regulatory-config/` with `validUntil` metadata. No inline `SEIS_LIMITS = {...}` in agent files. Stale-config daily alert when `validUntil < today + 90d`.**
>
> **Method:** existence-check on the canonical directory; targeted regex sweep for `(SEIS|EIS|HMRC|RDEC|R&D|FCA|VAT|MTD|GDPR|ICO|Modern Slavery|TPR)_*` patterns + inline numeric thresholds (`£NNm` / `threshold = N` / `limit = N`) across the 12 per-company handler files at `src/lib/agents/impl/`. No code changes in this commit — audit deliverable only.

---

## § 1 · Findings summary

| Severity | Count | Item |
|---|---|---|
| 🔴 **HIGH** | 1 | `src/lib/regulatory-config/` directory does not exist — Law 6 first clause unmet (zero canonical home for regulatory constants) |
| 🟡 **MEDIUM** | 1 | `g1-048-modern-slavery-statement-generator.ts` hardcodes the UK Modern Slavery Act £36M turnover threshold inline at 3 sites — Law 6 second clause (no inline) violated |
| 🔴 **HIGH** | 1 | No stale-config daily-alert mechanism exists — Law 6 third clause unmet |

**Total actionable: 3 findings.**

The grep sweep found ONE concrete regulatory constant inline in the 12 per-company handler files. The narrow surface is because most handlers either delegate to the LLM (the prompt mentions the threshold; the agent code doesn't hardcode it) or are pre-existing-violation-free by good luck of not yet covering regulated domains. The £36M threshold is the canonical citation.

---

## § 2 · HIGH 1 — `src/lib/regulatory-config/` does not exist

### 2.1 What Law 6 requires

> Regulatory / market constants live in `src/lib/regulatory-config/` with `validUntil` metadata.

The canonical directory is named explicitly. Per Law 6, **every** regulatory / market constant in OB should live there as a typed module with a `validUntil: Date` (or ISO string) field declaring when the constant's accuracy can no longer be assumed.

### 2.2 What exists today

```
$ ls src/lib/regulatory-config
DIR-NOT-EXIST
```

The directory is unbuilt. There is no `regulatory-config` index, no `seis-limits.ts`, no `modern-slavery.ts` — nothing. The closest existing pattern is `src/lib/clues-intelligence/data/*` which holds questionnaire definitions (different concern; not regulatory constants).

### 2.3 Recommended remediation pattern

Create `src/lib/regulatory-config/` with one module per regulatory regime. Each module exports a const with strict typing + a `validUntil` field per the canonical pattern:

```ts
// src/lib/regulatory-config/uk-modern-slavery.ts (NEW — example)
/**
 * UK Modern Slavery Act 2015 s.54 reporting threshold + companion
 * metadata. Companies whose annual turnover meets or exceeds the
 * threshold MUST publish a Modern Slavery Statement; smaller
 * companies often publish voluntarily.
 *
 * Authoritative source: gov.uk Modern Slavery Act 2015 s.54
 * https://www.gov.uk/government/publications/transparency-in-supply-chains-a-practical-guide
 *
 * `validUntil`: review annually + on any HM-Treasury or Home Office
 * announcement that may change the threshold. The Law-6 stale-config
 * alert (§ 4 of the audit) fires when validUntil < today + 90 days.
 */
export const UK_MODERN_SLAVERY = {
  turnoverThresholdGbp: 36_000_000,
  jurisdiction: "UK",
  legislation: "Modern Slavery Act 2015, s.54",
  source: "https://www.gov.uk/government/publications/transparency-in-supply-chains-a-practical-guide",
  validUntil: "2026-12-31" as const,
} as const;

export type UkModernSlavery = typeof UK_MODERN_SLAVERY;
```

Effect: every consumer imports `UK_MODERN_SLAVERY.turnoverThresholdGbp` rather than literal `36_000_000` / `"£36M"`. A single edit updates every callsite. The `validUntil` field gives the stale-config alert (§ 4) a concrete date to compare against.

---

## § 3 · MEDIUM 1 — £36M Modern Slavery threshold inline in `g1-048`

### 3.1 Violations cited

`src/lib/agents/impl/g1-048-modern-slavery-statement-generator.ts`:

| Line | Code |
|---|---|
| 5 | `* a company. Companies with turnover >= £36M must publish an annual` (header docstring) |
| 172 | `? "  turnover: not provided (assume below £36M threshold unless otherwise stated)"` (string fed to LLM) |
| 195 | `"Determine whether this company is legally required to publish a statement (turnover threshold £36M) and explain the reasoning.",` (LLM prompt instruction) |

The literal string `£36M` appears three times in this one file. None of them reference a central constant; each duplicate the value verbatim.

### 3.2 Why this matters

Per Law 6 verbatim: **No inline `SEIS_LIMITS = {...}` in agent files.** The £36M threshold is exactly the kind of regulatory constant Law 6 targets:
- Defined by UK statute (Modern Slavery Act 2015, s.54).
- Subject to change by future legislation (the threshold has been £36M for years but is reviewed periodically).
- If the threshold rises to £50M tomorrow, the agent will give incorrect compliance advice until a developer remembers there are three sites to update in this file.

### 3.3 Recommended remediation

After § 2.3's `src/lib/regulatory-config/uk-modern-slavery.ts` lands:

```ts
// src/lib/agents/impl/g1-048-modern-slavery-statement-generator.ts
import { UK_MODERN_SLAVERY } from "@/lib/regulatory-config/uk-modern-slavery";

// Header docstring (line 5):
//   "Companies with turnover >= £${(UK_MODERN_SLAVERY.turnoverThresholdGbp / 1_000_000).toFixed(0)}M must..."
//   (or expand the docstring to "the configured threshold" + cite the constant)

// String fed to LLM (line 172):
const formatted = `£${(UK_MODERN_SLAVERY.turnoverThresholdGbp / 1_000_000).toFixed(0)}M`;
const turnoverLine =
  c.turnoverGbp === null
    ? `  turnover: not provided (assume below ${formatted} threshold unless otherwise stated)`
    : `  turnover: £${Math.round(c.turnoverGbp).toLocaleString()} GBP`;

// LLM prompt instruction (line 195):
`Determine whether this company is legally required to publish a statement (turnover threshold ${formatted}) and explain the reasoning.`,
```

Effect: single source of truth. A future threshold change requires editing one file + bumping `validUntil`.

### 3.4 Why this is MEDIUM not HIGH

- The current value (£36M) is correct as of the audit date (2026-05-25).
- The LLM at runtime receives the correct threshold in the prompt; user-facing output is not currently wrong.
- The violation is a structural-quality / future-proofing concern, not a present production bug.

If the UK government changes the threshold and no one notices, the severity escalates to HIGH the moment the first user gets bad advice.

---

## § 4 · HIGH 2 — no stale-config daily-alert mechanism

### 4.1 What Law 6 requires

> Stale-config daily alert when `validUntil < today + 90d`.

A daily-scheduled job that scans every regulatory-config module's `validUntil` field and alerts (Slack / Linear / email / Langfuse alert) when any is within 90 days of expiry — giving the team a quarter to review legislation + extend the date or update the value.

### 4.2 What exists today

Nothing. The directory doesn't exist (§ 2), so there are no `validUntil` fields to scan, and no daily job is scheduled to scan them. The closest existing scheduled job is the per-spoke cron at `vercel.json` (weekly only per the cron-discipline memory `feedback_vercel_cron_weekly_only`).

### 4.3 Recommended remediation

Two-piece deliverable:

1. **Scanner script** at `scripts/audit-regulatory-config-staleness.ts` — imports every module under `src/lib/regulatory-config/`, builds `[{ moduleId, validUntil, daysUntilExpiry }]`, exits non-zero if any is within 90 days.
2. **Schedule** — given the cron-discipline rule, this is WEEKLY (Sunday 3:30am-5:55am UTC staggered slot) not daily, with a per-finding alert routing through the existing observability stack (`@/lib/observability/tracer` or `system-alerts.ts` if/when that model lands per W-016 in the README).

If founder wants strict daily-alerting per Law 6's literal text, that becomes a documented exception alongside the existing `deadline-reminders hourly` + `voice-recording-cleanup daily` carve-outs.

---

## § 5 · What else this audit DID look for + DID NOT find

### 5.1 Broader sweep — clean

Regex grep across `src/lib/agents/impl/**/*.ts` for:
- `(SEIS|EIS|HMRC|RDEC|FCA|VAT|MTD|GDPR|ICO|TPR)_(LIMITS|THRESHOLDS|RATE|CAP|MAX|MIN|VALID|UPDATED|EFFECTIVE)` → **zero hits**
- `const\s+(SEIS|EIS|HMRC|RDEC|FCA|VAT|MTD)` → **zero hits**

Most regulated topics (SEIS / EIS investment limits, R&D tax credit rates, FCA capital adequacy requirements, MTD VAT thresholds, GDPR fine limits, TPR pension auto-enrolment thresholds) appear ONLY in LLM prompts as natural-language description — they are not extracted as TypeScript constants. The LLM is asked to know the values; the OB code does not encode them.

That's both good and bad:
- **Good:** narrow surface area for Law 6 violations today. Only the £36M literal in g1-048 is concretely inline.
- **Bad:** every agent that mentions a regulatory threshold trusts the LLM's training-cutoff knowledge to be current. The LLM may be wrong (training data lags by months). Law 6's spirit applies to ANY value the company's product communicates to a user — not just typed constants.

This audit's findings are scoped to Law 6's literal text. The broader question — "should we put every regulatory threshold mentioned in prompts into a typed config so we can override LLM hallucination?" — is a follow-up.

### 5.2 Out-of-scope (covered separately)

- Market constants (e.g. ElevenLabs voice IDs, model names, pricing tables). These are NOT regulatory; they fall under a separate "vendor-config" concern handled by `src/lib/avatar/personas.ts`, `src/lib/agents/llm.ts MODEL_MAP`, etc.
- The 23 cluesxscore mini-app metric thresholds — those are scoring-rubric values, not regulatory. Out of scope.

---

## § 6 · Remediation plan

Founder approval gates each phase.

| Phase | Owner | Effort | Description |
|---|---|---|---|
| Phase 1 | Coding agent | 30 min | Create `src/lib/regulatory-config/` + `uk-modern-slavery.ts` per § 2.3 pattern + index re-export. Add 1 unit test asserting the constant is non-zero + validUntil parses + is in the future. |
| Phase 2 | Coding agent | 15 min | Refactor `g1-048-modern-slavery-statement-generator.ts` to import the constant + use the formatted string at all 3 sites per § 3.3. Re-run existing g1-048 tests (15 cases) to confirm no behavior regression. |
| Phase 3 | Coding agent | 45 min | Scanner script at `scripts/audit-regulatory-config-staleness.ts` per § 4.3. Wire as a vitest test that fails on stale config (so it runs in CI on every push), plus a weekly cron via `vercel.json` for the alerting channel. |
| Phase 4 | Coding agent | 15 min | Update MASTER_CHECKLIST.md C-2 row to ✅ with the commit SHAs. |

Total: ~1.75 hours coding + zero founder semantic decisions (the £36M value is unambiguous; only the rollout-routing requires founder pick on alerting channel). Could ship in one session.

---

## § 7 · Attestation

Held to Apple / IBM / Microsoft / Google 2026 leading coding practices per `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md` section 10.4. This audit is a deliverable, not a code change. 100% no breaking changes (zero code edits). 100% no partial coding (every finding cite-able to `file:line`; remediation pattern provided with concrete code; out-of-scope items explicitly enumerated).
