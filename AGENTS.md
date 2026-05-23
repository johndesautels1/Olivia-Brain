# AGENTS.md — Olivia Brain

> **Audience.** AI coding agents (Claude Code, Cursor, Copilot, future
> agent runners) and human contributors. Anything generating code in
> this repo reads this file first.
>
> **Status.** Authoritative. Where this file conflicts with stale
> documentation, this file wins and the other doc gets corrected.
> Where this file conflicts with `~/CLAUDE.md` or `docs/00_PRODUCT_TRUTH.md`,
> the canonical docs win and this file gets corrected.
>
> **Format.** Curated synthesis of: `~/CLAUDE.md` (founder standing
> rules), `docs/00_PRODUCT_TRUTH.md` (product universe), `docs/01_UI_DESIGN_SYSTEM.md`
> (design language), `docs/02_COMPETITIVE_FEATURE_MATRIX.md § L`
> (Vercel Web Interface Guidelines), and the locked feedback memories
> at `C:\Users\broke\.claude\projects\C--Users-broke\memory\`.
>
> Each rule carries a **why**. If the why doesn't apply to your edge
> case, raise it before bending the rule — never silently route around.

---

## 0. The North Star question

Before any commit:

> *Are we making Olivia the world's most advanced, intelligent, high-tech,
> user-friendly, agentic-powered, live-avatar / chat-avatar Chief
> Intelligence Officer for Florida Real Estate, International Relocation,
> the London Tech Ecosystem, our two-city comparison-metric mini-apps,
> Heart Health Recovery, and the London Transit System?*

If the commit moves that needle, ship it. If it doesn't, stop and raise it
to the founder. Locked 2026-05-07. Full text: `docs/OLIVIA_NORTH_STAR.md`.

---

## 1. Hard rules — every line, every commit

These cannot be skipped. CI catches the easy ones; reviewers + the
founder catch the rest.

### 1.1 Architecture + privacy

| Rule | Why |
|---|---|
| `UserCompanyDeadline` is private. NEVER project deadline columns onto `UserCompanyProfile`. NEVER add a `secondaryProfileExposed`-style flag. | The privacy contract that lets Olivia hold critical-date data (licenses, trademarks, patents, tax deadlines) without leaking it to public directories. See `~/CLAUDE.md` § Privacy Contract. |
| LTM (`D:\London-Tech-Map`) is **read-only** from this repo. Never delete, rename, edit, move, or write any LTM file from an OB session. | The walled-garden boundary. We copy OUT of LTM into OB. LTM's live integration must keep working at all times. |
| Bicycle-wheel architecture is non-negotiable. ALL data passes through Olivia. | She is the brain at the hub, not a chat assistant bolted on top of one product. See `docs/00_PRODUCT_TRUTH.md`. |
| Olivia is the brain serving 6 product spokes; she is NOT itself a user-facing app under "Olivia.com" marketing. | See `docs/OLIVIA_NORTH_STAR.md` for the 6 surfaces. |

### 1.2 No band-aids

| Rule | Why |
|---|---|
| No `// @ts-ignore` or `as any` shortcuts. Type the boundary correctly. | Hidden type errors compound. Every `any` becomes the next bug. |
| No `try { } catch { /* swallow */ }`. Catch → log structured context → re-throw or return a typed `Result`. | Silent failures are how production outages persist undetected. |
| No `force-dynamic` to mute a hydration error. Fix the root cause. | Symptom suppression hides architectural mistakes. |
| No `// TODO: fix later` without a tracked task elsewhere. | TODOs rot. Either fix in this commit or open a real issue. |
| No `npm run build` locally as a default — Vercel builds from git on every push. Local builds only when a deploy fails AND the trace doesn't reveal the cause. | Vercel does this for free in ~90s; local builds waste session time. See `~/CLAUDE.md` "Local builds". |

### 1.3 Commit + push discipline

| Rule | Why |
|---|---|
| Every `git commit` is immediately followed by `git push`. Vercel deploys from git; local commits do nothing. | Lost work survives only if it's on origin. |
| One concern per commit. No mixed-concern bundles. | Reviewability + bisect-ability. |
| Lockfile in the same commit as any `package.json` edit. Always `npm install` before committing a `package.json` change. | Vercel installs from the lockfile. A drift kills CI. |
| Every commit message + every end-of-turn summary states **100% no breaking changes** (public API signatures + behaviour preserved) **and 100% no partial coding** (every shipped function fully implemented, tested, operational end-to-end). | Forensic-grep target. Locked 2026-05-17 per feedback memory. |
| Commits touching `src/lib/integrations/*` carry the verbatim attestation from `~/CLAUDE.md` § Architecture-Standards. | Architectural-contract attestation. |
| Never set secret env vars to "All Environments" in Vercel. Secrets = Production + Preview only, marked Sensitive. `SUPABASE_SERVICE_ROLE_KEY` = Production ONLY. | Secrets in dev environment leak into local `.env` files and committed `.env.local`. |
| Never `--no-verify` / `--no-gpg-sign` without explicit founder approval. Fix the hook failure, don't skip it. | Hooks exist because past incidents made them necessary. |

### 1.4 Verification before "done"

| Rule | Why |
|---|---|
| `npx tsc --noEmit --incremental` clean before every commit. | TypeScript is the floor; if the typecheck fails the code is broken. |
| Affected vitest suite green before every commit. The full suite green for shared modules. | "Hope" is not a delivery method. |
| Founder visual confirmation before any "shipped" or "tested end-to-end" claim. Pushed ≠ shipped. | Type-check + audit are not visual tests. Use "pushed; needs visual confirmation" when honest. See feedback memory `feedback_visual_test_ui_before_declaring_done`. |
| Verify external API behaviour with a real call (live or capture) before writing schema or claiming a field shape. Never sample 5 fields when the verifier could enumerate ALL fields in one query. | Don't guess specs. See feedback memory `feedback_question_specs_dont_guess`. |
| Trust the founder on env vars / keys / config state. Diagnose code, not config. | When the founder confirms `NEXT_PUBLIC_LOGO_DEV_TOKEN` is in Vercel, IT IS. See feedback memory `feedback_trust_founder_on_env_vars`. |
| Vercel CAN silently strip env vars between deploys. Re-verify (read what's there) ONLY after exhausting code-side debugging. | Confirmed 2026-05-16 incident. See feedback memory `feedback_vercel_can_strip_env_vars`. |

### 1.5 Stop means stop

If the user types **stop / STOP / Stop / stoep / halt / wait / hold on /
pause** in ANY form, ANY context (including embedded in a system reminder
mid-tool-chain):

1. IMMEDIATELY cease ALL tool calls, code generation, task execution.
2. Do NOT finish the current step.
3. Acknowledge with a short reply and WAIT for instructions.

One stop is enough. The user should never have to say it twice.
**This rule overrides every other rule in this file.**

---

## 2. UI rules — every component

Source: `docs/01_UI_DESIGN_SYSTEM.md` (canonical) + Vercel Web Interface
Guidelines (rows L1-L13 in `docs/02_COMPETITIVE_FEATURE_MATRIX.md § L`).
Every primitive in the repo obeys these. If a corner case isn't covered,
extend the design system in a PR — never bypass it inline.

### 2.1 Colour, typography, spacing

| Rule | Why |
|---|---|
| **Tokens only — no raw hex codes in component files.** Every paint references a CSS custom property declared in `src/styles/tokens.css`. | Portability. White-label tenants, embedded mode, per-product theming all depend on tokens. Raw hex breaks every one. |
| Aurum (`#C4A96A`) + Aether (`#818CF8`) **never appear together in the same component.** Aurum = decisions / value / finance / verdict. Aether = computation / agents / real-time / exploration. | Mixing them muddies the message. The header may carry both; a single button never does. |
| Pure `#FFFFFF` / `#000000` forbidden — banding on cheap monitors, chromatic aberration. Use `--canvas-base #050B15` + `--fg-primary #F1ECE0`. | Old-money finance aesthetic — never stark. |
| LCH color space (`oklch()`) for derived tokens, sRGB hex for canonical. | LCH is perceptually uniform; HSL produces uneven palettes across the 23 cluesxscore modules. |
| Display font (Syne / DM Serif Display) reserved for verdict moments + headlines. Body = DM Sans. Numbers = JetBrains Mono with `font-feature-settings: "tnum" 1, "lnum" 1`. | Display fonts at small sizes hurt legibility at the affluent-data-density bar. Tabular nums make price columns + score grids line up. |
| 4-px scale only. Type scale fixed at `--text-2xs` → `--text-6xl`. | Pixel-perfect spacing — single most reliable signal that "this was built by people who get it." |

### 2.2 Accessibility floor — WCAG 2.2 AA + APCA

Every surface, every component, every state. No exceptions. If a
component cannot meet AA, it ships disabled until it can.

| Rule | Why |
|---|---|
| `:focus-visible` over `:focus`. Aurum-gold ring 2px solid + 2px offset. | Mouse clicks shouldn't paint focus rings on top of visible click targets. |
| `touch-action: manipulation` on every interactive control. | Removes the iOS 320ms double-tap-zoom delay. Free latency win. |
| `<input>` font-size ≥ 16px on mobile. | Smaller triggers iOS auto-zoom on focus → common WCAG-AA failure. |
| `overscroll-behavior: contain` on modals + drawers. | Prevents background-scroll bleed when modal scrolls to its end. |
| Never `transition: all`. Always enumerate the properties. | `transition: all` causes silent layout-thrash bugs as browser-internal properties change. |
| Minimum loading-state duration 300–500ms OR skip the skeleton entirely. | Prevents the skeleton-flicker anti-pattern on fast networks. |
| `aria-label` mandatory on icon-only controls. CI fails the build if missing. | Visual labels can be omitted; the DOM must always be readable by screen readers. |
| Confirm destructive actions OR offer Undo with a safe window. | Irreversible operations need either a confirm step or an Undo toast. |
| Touch hit-target ≥ 44 × 44 px on coarse pointers. | Apple HIG / WCAG 2.5.5 AAA. |
| `prefers-reduced-motion` respected — disable spring curves, swap to instant transitions. | Vestibular disorder accessibility. |
| `prefers-color-scheme` respected for embedded/web-component mode. In our own products we ship dark-first. | Olivia's audience uses Bloomberg-style dark tools; light mode is an opt-in print/accessibility variant. |
| Forced-colors / Windows High Contrast Mode respected — borders use `currentColor` + semantic tokens. | Don't paint over OS overrides. |
| Empty / error / loading / partial states designed in. Never assume the happy path is the only path. | Real production data is messy. UIs that only render the happy path crash on the first weird row. |

### 2.3 Modular workspace mandate

Every Olivia surface is a user-configurable workspace:

- Drag-drop toolbars, drag-drop cards, drag-drop modals.
- Resize anything (1×1 to full-width tiles).
- Save named layout presets.
- Persist server-side, sync across devices.

The product ships with intelligent defaults; the user reshapes them.
The Widget Catalog (§5.2 of the design system) is the source of truth
for which components mount in the canvas.

---

## 3. Code rules — every line

### 3.1 TypeScript

| Rule | Why |
|---|---|
| Strict TS. No `any` (use `unknown` + narrow). No `// @ts-ignore`. | Type holes compound. Every escape is the next bug. |
| Exhaustive `switch` / discriminated unions for every state machine. | Forces the compiler to catch new states. |
| Generic constraints proven, not asserted. Use `extends` + conditional types. | "Trust me, this is the right shape" rots. |
| Typed Result returns at module boundaries — `Ok<T> \| Err<E>` discriminated unions; never `throw` across a boundary. | Throws are invisible at the call site. Result is in the type. |
| JSDoc on every exported symbol. Class headers describe reliability guarantees. | The docstring is the contract. |

### 3.2 Async + network

| Rule | Why |
|---|---|
| Every network / DB / IO call carries `AbortSignal` + explicit timeout. | Orphaned requests pin the connection pool. |
| No raw `fetch("https://api.foo.com/...")` from `src/lib/agents/`, `src/app/`, `src/lib/cascade/`. All external HTTP lives under `src/lib/integrations/<vendor>/`. | See `~/CLAUDE.md` § Architecture Standards (Law 2) — locked 2026-05-18. |
| All LLM calls go through `callLLM()` in `src/lib/agents/llm.ts`. No raw `fetch` to `api.anthropic.com` / `api.openai.com` etc. | Wrapper handles fan-out, cost tracking, structured logging. Bypassing it loses all of that. |
| One canonical client per external vendor. Two flavours (rest + streaming) co-locate under `src/lib/integrations/<vendor>/{rest,streaming,_shared}.ts`. | See `~/CLAUDE.md` § Architecture Standards (Law 1). |

### 3.3 Database + persistence

| Rule | Why |
|---|---|
| `prisma db push` is **DEV-ONLY**. NEVER against production. Schema changes go through `prisma migrate dev --create-only` → review → commit → `prisma migrate deploy`. | `db push` silently drops columns not declared in `schema.prisma`. Caused the 2026-05-14 → 2026-05-20 vault padlock outage. |
| Raw SQL DDL → reconcile into `schema.prisma` in the **same** commit. Never defer. | Else a future `db push` from a teammate drops the column. |
| Data ops go through TypeScript scripts in `scripts/` using Prisma client. Founder runs `npx tsx scripts/<name>.ts`. NO `prisma/sql/*.sql` files for ad-hoc data ops. | Per-agent SQL paste-by-paste wastes session time. Locked 2026-05-08. |
| Schema migrations (unavoidable SQL) — paste FULL SQL inline in chat, never just reference the file path. | Founder is the applier; pointing at a path = pretending you communicated. Locked 2026-05-09. |
| ASCII-only inside SQL comments (`-- foo` lines). | Em-dash + section-sign autocorrect on clipboard → Supabase paste path breaks comment parsing. Locked 2026-05-09. |
| RLS / authorisation check per row returned. Every multi-write op in a transaction. | Authorisation at the row level is how multi-tenant stays safe. |

### 3.4 React 19 + Next 16

| Rule | Why |
|---|---|
| Server-side rendering deterministic. No `new Date()` / `Math.random()` / `window` in render. Use server-passed props or `dynamic({ ssr: false })` for client-only islands. | Hydration mismatches crash without warning. |
| React 18+ primitives — `useSyncExternalStore`, `useTransition`, Suspense, streaming SSR. No setState-in-effect re-renders. No race conditions. | Modern React; old patterns leak memory + cause unnecessary re-renders. |
| Zod (or equivalent) validation at every boundary — API route, props for shared components, env vars. Trust no external input. | Boundary validation catches bad data before it reaches business logic. |
| Server-only secrets stay server-only. `NEXT_PUBLIC_*` only for keys designed-to-be-public (Mapbox public token, Clerk publishable). | Browser-visible secrets are public. |

### 3.5 Observability

| Rule | Why |
|---|---|
| Langfuse / OTel spans on meaningful ops with structured context (user id, entity ids, latency, result counts). | Production observability is how outages get diagnosed. |
| PII NEVER enters spans, traces, or logs. Only metadata + IDs. | Compliance + privacy. Logs leak. |
| Structured logs (`{ msg, ctx }`) not free-form strings. | Greppable in production. |

---

## 4. Reply-renderer manifest contract

The `MarkdownReply` component (in `src/components/home/reply-renderer/`)
renders Olivia replies as Markdown with custom code-fence treatments.
Each fence is a self-contained, parser-validated, drop-invalid-resilient
JSON contract. Current fences:

| Fence | Renders | Spec file |
|---|---|---|
| ` ```chart ` | Bar / line / area / pie chart (Recharts) | `chart-spec.ts` |
| ` ```gamma ` | Gamma deck preview card | `GammaCard.tsx` |
| ` ```sources ` | Numbered citation strip | `CitationStrip.tsx` |
| ` ```timeline ` | Vertical-rail chronological narrative | `TimelineFromSpec.tsx` |
| ` ```map ` | Interactive Mapbox view with pins + flyTo | `map-spec.ts` |
| ` ```ui ` | Card / stat / progress / button registry | `ui-spec.ts` |
| ` ```comparison ` | 2–3 column side-by-side with verdict + winner | `comparison-spec.ts` |

**To add a new fence:**

1. Define the JSON shape + parser in `<name>-spec.ts` (pure, no IO,
   drop-invalid-resilient).
2. Build the renderer in `<NameRenderer>.tsx` (`"use client"`, tokens
   only, no raw hex, ARIA-correct, never trust LLM-derived strings —
   escape before innerHTML).
3. Add parser tests in `<name>-spec.test.ts`.
4. Wire into `MarkdownReply.tsx` (`lang === "<name>"` branch — invalid
   spec falls through to `CodeBlock` with error note).
5. Export from `index.ts` barrel.
6. Teach the system prompt in `model-cascade.ts buildSystemPrompt()`
   — one entry, one shape, one when-to-use rule.

---

## 5. The reading order for every new session

Read these first, in order:

1. **This file (`AGENTS.md`)** — the rules above.
2. **`~/CLAUDE.md`** — absolute-priority founder standing rules. Items
   not in this file (the founder's pace, the "Stop means stop"
   override, the 4-sessions/day rhythm).
3. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit
   must answer yes to.
4. **`docs/00_PRODUCT_TRUTH.md`** — eternal source of truth for the
   product universe.
5. **`docs/01_UI_DESIGN_SYSTEM.md`** — universal dark-mode design
   language. Every UI conforms.
6. **`docs/HANDOFF.md`** — current open work, latest batch close,
   resume point.
7. **`docs/BUILD_SEQUENCE.md`** — canonical session-by-session plan.

Read for the specific task:

- LLM / cascade work → `docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`
- Multi-app sync / persona regen → `docs/03_BRAIN_ENRICHMENT_ENGINE.md`
- Competitive context → `docs/02_COMPETITIVE_FEATURE_MATRIX.md`
- Studio surface work → `docs/STUDIO_OLIVIA_DESIGN.md`
- LiveAvatar / Tavus / Simli / HeyGen → `docs/HEYGEN_LTM_CONFIG.md`
- Runbook (deploy / smoke / rollback) → `docs/RUNBOOK.md`

---

## 6. Standing rules carried into every session

1. **No LTM edits.** Read-only. We copy out, we never modify in place.
2. **No band-aids.** Fix root causes; remove the cause.
3. **Verify before claiming done.** Typecheck + tests + visual.
4. **Lockfile in the same commit as `package.json`.** Always.
5. **Commit + push together.** Vercel deploys from git.
6. **One concern per commit.** No mixed-concern bundles.
7. **AbortSignal + timeout on every network call.** No exceptions.
8. **PII never enters spans, traces, or logs.** Only metadata + IDs.
9. **JSDoc on every exported symbol.** Class headers describe
   reliability guarantees.
10. **Apple / Microsoft / Google 2026 leading standard.** Every line.
    See `~/CLAUDE.md` § Apple-Microsoft-Google standard.
11. **Question specs that don't fit our app — never guess.** Surface
    options + a recommendation before writing speculative code.
12. **Surface pre-existing bugs in plain English** when you spot them.
    Ask: fix this commit / separate task / leave alone?

---

## 7. Action queue

Tracked in `docs/02_COMPETITIVE_FEATURE_MATRIX.md § 3`:

- **Action 1** — Drop this file (done; this very file).
- **Action 2** — `<DualCityCompare>` primitive — shipped as the
  `comparison` fence (commit `48edc40` 2026-05-23).
- **Action 3** — `@olivia/design-system` package spec — awaiting
  approval.
- **Action 4** — WCAG 2.2 AA + APCA audit on existing surfaces —
  awaiting approval.

When you ship something in this queue, mark it done with the commit
hash and date.

---

*Last updated 2026-05-23. When a new standing rule lands in
`~/CLAUDE.md` or a new design primitive lands in the system, mirror it
here in the appropriate section.*
