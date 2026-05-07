# OLIVIA BRAIN — NEXT AGENT HANDOFF

**Updated:** 2026-05-07 (end of batch S18-S22)
**GitHub:** https://github.com/johndesautels1/Olivia-Brain
**Local:** `D:\Olivia Brain`
**HEAD:** `b30ea00` on `main` (post-batch-S18-S22 handoff)
**State:** **Track C CLOSED (6/6 ✅) + Track V 3/9 ✅.** Studio Olivia workbench is feature-complete (workspace shell + 5 primitives + Library scoring + Section nav + Right-pane tabs + Polish). Track V (LTM Valuation Engine Port) opened: V1 schema (6 valuation models + SQL migration) + V2 types/bridge (`CompanyValuationInput` 60+ fields + `buildValuationInput`) + V3 engine math (10 methods + 3 V4 stochastic deps pulled forward). **223/223 tests passing**, typecheck clean. Vercel deploy queued.

**OLIVIA NORTH STAR locked 2026-05-07** at `docs/OLIVIA_NORTH_STAR.md` — the single question every commit must answer yes to ("are we making her the world's most advanced agentic CIO across Florida real estate / international relocation / London tech / two-city comparison mini-apps / heart-health recovery / London transit?"). **Read first every session before any other doc.**

**Plan locked 2026-05-07** — Track V (~9 sessions, 3 done), Track Q (Quantara 56-field paragraphical intake, 7 sessions), Track P (Deal Protection gap-closures, 7 sessions). Track O Session O1 (Composio) pulls forward ahead of Q. June 8 reframed as DEMO target, not full ship. ~63 remaining sessions at ~4 sessions/day ≈ 3 weeks. Memory: `project_june_8_demo_strategy`, `project_track_v_ltm_valuation_port`, `feedback_4_sessions_per_day_pace`, `reference_olivia_north_star`, `feedback_olivia_brain_batch_session_pattern`, `feedback_olivia_brain_end_of_batch_handoff_protocol`. Full session-by-session breakdown in `docs/BUILD_SEQUENCE.md`.

**Resume at Session 23 = Track V row V4 — stochastic + sensitivity port:** sensitivity.ts, hybrid.ts, kde.ts, market-comps-seed.ts, war-room-calendar.ts + LTM `__tests__/` port (engine, edge-cases, performance, security-rng, market-comps-seed, valuation-clock, e2e-pipeline). Per BUILD_SEQUENCE Track V row V4. Note: 3 of the originally-V4-scoped files (real-options, real-options-compound, monte-carlo) already landed in V3 because engine.ts depends on them — V4 has less to do than originally scoped.

**Batch authorization status:** No batch is currently authorized. Per `feedback_olivia_brain_batch_session_pattern` memory, the next agent batches only when the user explicitly says (e.g. *"build S23-S27, your judgment on minor decisions, stop on blockers"*). Default is one-task-at-a-time.

**Working tree:** clean post-handoff-commit. All commits pushed to `origin/main`. **Vercel build green.**

> The previous version of this file (post-Session-11 era) is preserved in git history. This file replaces it with the current post-Session-12 state. The session series captured here (Sessions 1–12) is documented in detail in `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Parts 10–19.

---

## REPO LOCATIONS

| Repo | Path | Status |
|------|------|--------|
| **Olivia Brain (this — your working repo)** | `D:\Olivia Brain` | Current. HEAD will be the post-Session-13 docs commit. |
| **GitHub** | https://github.com/johndesautels1/Olivia-Brain | up to date with `main` |
| London Tech Map (LTM) | `D:\London-Tech-Map` | **READ-ONLY.** Copy components OUT; never edit, rename, delete, or move ANY LTM file. |
| Studio Olivia prototypes | `D:\Studio-Olivia` | **REFERENCE ONLY.** The 95 KB GrandMaster JSX is the design north star — don't import its code. |
| Clues Main (cluesintelligence vision docs) | `D:\Clues Main` | Docs canonical. Code is way behind — don't trust the code. |
| Questionnaire engine | private GitHub `johndesautels1/clues-questionnaire-engine` | Current truth for cluesintelligence. Local `D:\clues-questionnaire-engine` is STALE (different computer). |

---

## ABSOLUTE RULES (do not violate)

1. **LTM is read-only.** Never edit, rename, delete, or move any file in `D:\London-Tech-Map`. Copy out (Read + Grep + `Copy-Item`); never modify the source.
2. **No band-aids.** No `force-dynamic` workarounds, no `// hack` comments, no `@ts-ignore`, no Suspense wrappers used as a workaround. Find and fix the root cause. When work cannot meet the bar in the time available, **raise the conflict, never silently lower the bar**.
3. **Verify before claiming done.** `npm test` and `npm run typecheck` must both pass before any commit.
4. **Lockfile in same commit as `package.json`.** Always.
5. **Commit + push together.** Vercel deploys from git. Local commits do nothing.
6. **One concern per commit.** Mixed-concern commits are forbidden.
7. **AbortSignal + timeout on every network call.** No exceptions.
8. **PII never enters spans, traces, or logs.** Only metadata.
9. **JSDoc on every exported symbol.** Class headers describe reliability guarantees.
10. **One task at a time.** After completing each session's deliverable, stop and check in with the user.
11. **NEVER run local builds** (`npm run build`, `next build`). Vercel handles that. `npm run typecheck` and `npm test` are allowed.
12. **All architecture and README docs must continue to be updated and committed** to reflect every change. (User words 2026-05-03: "all the architecture and readme docs must continue to be updated to reflect these changes and commited.")

Full standing rules: `docs/BUILD_SEQUENCE.md` § "Standing rules carried into every session" + `~/CLAUDE.md`.

---

## READ ORDER (every new session, in this exact sequence)

1. **`~/CLAUDE.md`** — auto-loaded by Claude Code. Master project rules. Includes: never set secret env vars to "All Environments" in Vercel; never run local builds; minimize tool calls; LTM read-only; STOP means STOP.
2. **Memory files** — auto-loaded by Claude. They live at `~/.claude/projects/C--Users-broke/memory/` (13 files indexed in `MEMORY.md`). The 5 most-load-bearing for this work are listed in § Memories below.
3. **`docs/OLIVIA_NORTH_STAR.md`** — the single question every commit must answer yes to. Six product surfaces, three modes, bicycle-wheel hub. **Locked 2026-05-07; read this before any other doc.** Short on purpose.
4. **`docs/00_PRODUCT_TRUTH.md`** — eternal source of truth for the entire CLUES product universe. Bicycle-wheel architecture; product hierarchy; Olivia is the brain at the hub. Past sessions ignored this for 30+ conversations — DON'T.
5. **`docs/01_UI_DESIGN_SYSTEM.md`** — universal dark-mode design language. Aurum + Aether tokens, LCH color space, modular workspace, multi-agent visualization, WCAG 2.2 AA + APCA, Vercel AGENTS.md rules.
6. **`docs/03_BRAIN_ENRICHMENT_ENGINE.md`** — universal auto-enrichment primitive (B1–B7).
7. **`docs/04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`** — flagship architecture (L0–L10). Subject-to-change banner.
8. **`docs/BUILD_SEQUENCE.md`** — session-by-session deliverables. **Find your current track + session row.** Tracks A–F (Olivia core + clueslondon ship), G–K (cascade + agents + multi-tenant + verticals + hardening), Track Calendar (C1–C6), Track N (Visual Manifestation N1–N5), Track O (Weakness Closure O1–O5), Track L (cluesintelligence Unification, post-clueslondon).
9. **`docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md`** — Parts 1–15. **Read the most recent Part for what just shipped + decisions + Session N+1 handoff.** Currently Part 15 = Session 8 = Track Calendar C1 done.
10. **`docs/STUDIO_PORT_MANIFEST.md`** — per-subsystem port inventory + adaptations + post-mortem sections. § A–I = pre-pivot Studio plans (still valid for Track B Documents post-Clerk). § J = Map subsystem (ported Session 7). § K = Documents subsystem entanglement post-mortem (must read before any documents-port attempt — Clerk strategy required first). § L will be added in Track Calendar C6.
11. **`README.md`** — Visual Manifestation Stack (Tier 1–4 APIs, Gamma is partner not competitor) + Weakness Backlog (W-001 through W-012, append-only).

**Skip in normal sessions** (large, lookup-only): `docs/MERGE_INVENTORY.md` (233-row capability matrix), the 95 KB `StudioOliviaGrandMaster (2).jsx` (use design doc instead), `docs/architecture-historical/V_*.md`.

---

## WHERE YOU ARE NOW (post-Session 8)

### What's working end-to-end

| Path | What |
|------|------|
| `/test-avatar` | Click **Start Live Avatar** → click **Speak** → Olivia lip-syncs (Sessions 1–2). Type into "Talk to Olivia" → cascade walks → reply → ElevenLabs PCM → lip-syncs (Sessions 4–6). Gated by `ADMIN_API_KEY` (passed via `?key=` or pasted in input). |
| `/api/olivia/chat` | Production chat endpoint. Cascade-routed (Anthropic → OpenAI → Google → Grok → Perplexity → Mistral → Groq → Tavily → Opus judge). Persists turns. Full `attempts` trail in metadata. Mock-mode degrades gracefully when no provider keys set. |
| `/api/olivia/liveavatar` + `/speak` | LiveKit room + ElevenLabs PCM bridge. Admin-key gated until Track F Session 18 (Clerk). |
| **Bridge providers** | `OliviaSelfProvider` + `LtmKnowledgeProvider` registered with 76 tests + full UKP contract. |
| `/map` | Map UI shell ported byte-for-byte from LTM (Session 7). 3-tier vendor fallback: Google Maps 3D → Google Maps standard → Mapbox → "API key required" message. **Renders empty until per-spoke adapter feeds data** (Track J) — by design. **Visual fidelity gap** (W-011 + W-012) — Olivia Brain has no Tailwind; LTM map files use 223+ Tailwind classes that are inert. Resolution in Track C UI rebuild. |

### What just shipped this session series (Sessions 1–8)

- **Sessions 1–6** (commits pre-`c109d0f`): LiveAvatar pipeline, bridge providers, chat brain v1 (single-provider), chat brain v2 (cascade-routed), `/test-avatar` end-to-end smoke flow. **94/94 tests passing.**
- **Session 7** (commits `faa8ab1`, `991f411`, `55ff466`, `76c3fb0`, `c86e24f`): Pivoted from documents-engine port (entanglement post-mortem in `STUDIO_PORT_MANIFEST.md` § K) to **LTM map port byte-for-byte** (28 files, 6,107 LOC). Added Track N (Visual Manifestation, N1–N5) + Track O (Weakness Closure, O1–O5). Added W-008 through W-010 + later W-011/W-012 (Tailwind + token divergence).
- **Session 8** (commits `ecfb38b`, `49ed993`, `1986edf`): Added Track Calendar (6 sessions C1–C6) for calendar + voice + email/call/share infrastructure. **C1 foundation shipped:** 14 calendar Prisma models + 15 enums (schema validates clean; Prisma client generated), `lib/video/embeddings.ts` ported byte-for-byte, 8 npm packages installed (FullCalendar suite + react-international-phone + rrule). 94/94 tests still passing. Schema adaptations: `cuid → UUID`, `userProfileId → userId`, LTM-domain FKs dropped, DealRoom dropped (real-estate spoke), Event-family not ported. **`lib/queries/calendar.ts` port DEFERRED to C2** — discovery surfaced 93 LTM-domain references requiring engine-aware adaptation, not the originally-scoped mechanical rename.
- **Session 9** (commits `948f6ed`, `95526a1`): **Track Calendar C2 calendar engine + queries shipped.** `src/lib/queries/calendar.ts` (1130 lines, all `userProfileId → userId` + LTM-domain selects stripped + `getMergedCalendarView` dropped). `src/lib/calendar/*` (16 of 19 files: 7 byte-for-byte, 6 with userId rename, 3 modified — olivia-guardrails minus DB call, proximity-cluster trimmed to haversineKm, index.ts barrel adjusted). 3 LTM files intentionally NOT ported (document-aware, founder-journey, workflow-generator) — defer to dependency tracks (Documents post-Clerk; AnalysisResult Track L). `src/lib/olivia/tools.ts` calendar slice ported with 2 tools (`get_user_calendar` adapted, `web_search` byte-for-byte); the other 22 LTM tools defer to C3/C4/Track L. **94/94 tests still passing. Typecheck clean.** New weakness W-014 logged (`match_calendar_memory()` SQL function not installed — graceful degradation in place).
- **Session 10** (commits `4291a39`, `273b242`): **Track Calendar C3 voice + olivia models + engine shipped.** 9 voice/olivia Prisma models added to schema.prisma (OliviaConversation, OliviaMessage, OliviaPresentation, OliviaConsent, OliviaGuardrail, OliviaUserMemory, VoiceConversation, VoiceContact, VoiceActionItem) with same C1/C2 adaptations + the deferred `voiceConversations` reverse relation on CalendarEntry wired. SQL migration generated via `prisma migrate diff` at `prisma/sql/02-add-voice-olivia-foundation.sql` (10.5 KB). 4 voice lib files ported (3 byte-for-byte: voice-conversation/document/prompts; 1 with userId rename: voice-memory). `tools.ts` extended with `get_user_memory` + `save_user_memory` tools + `hasLearningConsent` helper (now 4 tools). `olivia-guardrails.ts` DB integration restored (OliviaGuardrail model now exists). `chat.ts` slim slice ported (createConversation / getConversationHistory / getConversationMessages only — `processOliviaMessage` deferred per HANDOFF gotcha analysis). **`knowledge-base.ts` NOT ported** — no in-scope C3 consumer; deferred to future track. **94/94 tests still passing. Typecheck clean.**
- **Session 11** (commits `1657fe2`, `278a4f9`): **Track Calendar C4 voice/email/call/sms/WhatsApp routes shipped.** 19 of 21 LTM routes ported (call ×10, calls ×2, voice ×3, email/sms/whatsapp ×3, conversations/[id]/email ×1). 2 routes intentionally deferred: `voice/to-document` + `voice/to-package` (depend on Document/Package models not in Olivia Brain). **Auth: Option B chosen** — `lib/auth/session.ts` Clerk stub (`getAuthSession()` reads `STUB_USER_ID` env in dev/preview, throws in production). One-line swap when Clerk lands in Track F Session 18. Tracked as W-015. Supporting libs ported: `lib/twilio/client.ts` (coexists with pre-existing server.ts), `lib/elevenlabs/client.ts` (coexists with pre-existing voice/elevenlabs.ts), `lib/email/resend.ts` + `resend` npm installed. 4 routes had `prisma.userProfile.findUnique({ clerkUserId })` lookups dropped (userId IS Clerk user ID directly). **94/94 tests still passing. Typecheck clean.**
- **Session 12** (commit `cb678b7` + `715aac4` docs): **Track Calendar C5 calendar UI + 18 of 24 API routes shipped.** 15 calendar UI components ported byte-for-byte (`AgendaRail`, `CalendarEntryModal`, `CalendarNotepad`, `CalendarView`, `ConfirmationChip`, `EventStatusWidget`, `FloatingCalendarWidget`, `FocusMode`, `InsightsPanel`, `OliviaPanel`, `PrepTaskList`, `SyncPanel`, `TabbedAgendaView`, `VoiceInput`, `index`) + 3 supporting (`components/tools/useDraggable`, `components/olivia/OliviaConsentModal`, `lib/mobile-keyboard`). 18 routes: `entries` (with ecosystem-events `prisma.event.findMany` block dropped), `prep-tasks`, `attendees` (linkedPersonId dropped), `analytics`, `memory`, `notes`, `olivia`, `plan`, `travel`, `sync` root + 5 sub-routes (google/outlook callbacks drop UserProfile lookup; calendly drops email-based UserProfile lookup → matches via CalendarSyncAccount.providerEmail), `cron/calendar-sync`, `cron/calendar-plan`, plus added `app/api/olivia/consent` (required by OliviaConsentModal). **6 routes intentionally deferred:** journey + workflow (AnalysisResult), documents (Document), nearby (Organization+Event), events ical/rsvp (Event/EventRsvp), videos/calendar (Video). **Adaptations:** PowerShell bulk script for `userProfileId → userId` (~140 occurrences), 10 `prisma.userProfile.findUnique` lookups dropped, `linkedOrg`/`linkedEventId`/`linkedPersonId` references dropped from entries/attendees/prep-tasks/CalendarView/TabbedAgendaView. **`lib/system-alerts.ts`** console-only stub (SystemAlert model not in OB schema; **W-016**). **Tailwind/styling caveat carries forward (W-013).** Deps: `react-datepicker` + `@types/react-datepicker` installed. **94/94 tests still passing. Typecheck clean.**
- **Session 13** (commit `4bdb08a` + `c25bbfc` docs): **Track Calendar C6 — app routes + smoke tests + docs. CLOSES Track Calendar.** Ported `app/calendar/page.tsx` (server-component shell, title swapped to "Calendar — Olivia Brain") + `app/calendar/CalendarPageClient.tsx` byte-for-byte (1265 LOC: OCC theater + My Calendar tab + Notes tab + agenda modal + focus-mode + GDPR consent flow + conversation history dropdown + transcript download/email/read-aloud) + `OliviaDisplayScreen.tsx` byte-for-byte (696 LOC; deps already in OB — `OliviaVideoAvatar`, `InsightsPanel`, `OliviaPanel`). 3 Vitest smoke tests / 6 cases (`__tests__/{CalendarView,CalendarNotepad,CalendarEntryModal}.test.tsx`) using `@vitest-environment jsdom` magic comment with mocks for FullCalendar (+ 4 plugins), `react-datepicker` (lazy import), `react-international-phone` (PhoneInput + style.css), `@googlemaps/js-api-loader`, and a `window.matchMedia` stub in `beforeAll`. Test deps installed (devDependencies + lockfile in same commit): `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`, `jsdom`. STUDIO_PORT_MANIFEST §L (Calendar + voice subsystem inventory; same shape as §J Map subsystem) appended. **No new W-IDs.** **100/100 tests passing. Typecheck clean.** **All 6 Track Calendar sessions ✅, track CLOSED.**
- **Session 14** (commit `21fbecf` + `2cab220` docs): **Track C opens — three-region shell + Aurum/Aether design system + Tailwind v4.** Decision locked (per founder Q on portability 2026-05-03): **tokens-as-substrate** (CSS custom properties) + Tailwind v4 utilities + inline styles for shell chrome — all three styling approaches consume the same canonical token primitives. Aurum gold (`#C4A96A`) overrides the Studio prototype's `C.accent` orange (`#FF8C00`); `01_UI_DESIGN_SYSTEM.md` is authoritative. **Shipped:** `src/styles/tokens.css` (canonical Aurum + Aether ladder, LCH with sRGB fallbacks, backward-compat aliases, Tailwind `@theme` block); `src/styles/base.css` (a11y primitives — `:focus-visible`, `touch-action: manipulation`, 16px input floor, `overscroll-behavior: contain`, skip-to-content, `prefers-reduced-motion`, 44×44 touch targets, forced-colors); `src/lib/theme/generate.ts` (white-label primitive — pure function, 230 lines); `src/components/workspace/{WorkspaceShell,Header,RailLeft,Inspector,Center}.tsx`; `src/components/primitives/AvatarOrb.tsx` (placeholder; full impl S15); `/` mounts the shell with placeholder region content; Phase-1 readiness UI relocated to `/admin/phase1`; `vitest.setup.ts` registers `@testing-library/react` cleanup globally. **Resolves W-011 + W-012 + W-013.** **134/134 tests passing** (94 baseline + 6 calendar smoke + 12 theme generator + 11 AvatarOrb + 11 workspace shell). Typecheck clean.
- **Session 15** (commit `22f1454` + this docs commit): **Track C — five reusable primitives.** `AvatarOrb` (full impl, surface contract preserved from S14; **Cristiano gold-saturated transition** § 6.3 — `intent="judge"` + `state="speaking"` → `data-cristiano="true"` + 1s gold swell; **council mode** § 6.4 — `subAgents={[...]}` orbits coloured dots per agent kind: Olivia/Cristiano aurum, Research aether, Persona mint, Math sky, Multilingual coral-mute; LiveAvatar `lazy()` + `Suspense` mounts only at size 240 OR explicit `hasVideo`). `Badge` (color-tiered percent pill, 4 tiers via `data-badge-tier`: high mint / medium amber / low coral / empty fg-disabled). `CompletionRing` (SVG progress, same 4 tiers via `data-ring-tier`, `role="progressbar"` + `aria-valuenow`). `ConsensusDots` (5 dots, single `role="img"` with descriptive label so screen readers don't count individual dots). `DeckDetailModal` (Radix Dialog — focus-trap + return-focus + Esc-to-close + ARIA all handled by Radix per § 8.3; renders category chip + stage + ConsensusDots + score Badge + name + tag + Insight + Fit + Match Reasons + Olivia Action + gradient Apply CTA; custom `applyLabel` for non-pitch contexts). Old `src/components/pitch/{Badge,CompletionRing}` paths now thin re-export shims (canonical impls in `primitives/`; no internal imports use legacy paths). `@radix-ui/react-dialog ^1.1.15` installed. **47 new unit tests** (10 Badge + 11 CompletionRing + 8 ConsensusDots + 9 DeckDetailModal + 8 AvatarOrb additions). **180/180 total tests passing**. Typecheck clean.

---

## WHERE TO RESUME — Session 16 = Track C, Session 11 in original numbering (Library tab + DeckDetailModal interaction)

**Spec:** `docs/BUILD_SEQUENCE.md` Track C row labelled `**11**`.

### Session 16 deliverable — Library tab + scoring + Apply flow

Per BUILD_SEQUENCE Track C row 11:

> Library + DeckDetailModal interaction. 75 archetypes + 12 templates from the prototype's static data, scored by `scoreDecks` / `scoreTemplates`. Apply-archetype regenerates slides. Real backend, not stubbed Anthropic calls.

**Critical context from S15 (the primitives are in place):**

- `DeckDetailModal` exports the canonical surface contract (`Deck`, `DeckDetailModalProps`). It already renders the full prototype payload — S16 just feeds it data + wires the Apply handler.
- `Badge` + `ConsensusDots` are token-aware primitives — Library cards consume them directly.
- `Inspector` (S14) has a `library` tab slot already wired in `/`'s page. S16 fills its body.

### Steps for Session 16

1. **Read in order**: this file → `docs/SESSION_LOG_…` Part 22 (Session 15 details) → `docs/BUILD_SEQUENCE.md` Track C row `**11**` → `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Library tab spec) + § 8 #4 (Library scoring with reasons).
2. **Lift archetype + template data** from `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` into `src/lib/studio/archetypes.ts` + `src/lib/studio/templates.ts`. Strict TypeScript types — no inline arrays. 75 archetypes + 12 templates per the prototype.
3. **Implement scoring helpers** as pure functions: `scoreDecks(deck, deckConfig)` + `scoreTemplates(template, deckConfig)` → `{ score, reasons }`. Standalone tested helpers in `src/lib/studio/scoring.ts`.
4. **Build the Library tab body component** at `src/components/studio/LibraryTab.tsx`. Search input + Decks/Plans toggle + relevance line ("X archetypes · Stage/Industry relevance") + scrollable card list (Studio prototype § 2.5 spec — 3px left bar in category color, name, category pill, stage, ConsensusDots, optional `raised` chip, 2-line clamped insight, big mono score number).
5. **Wire the click → DeckDetailModal flow.** Selected card sets local state; passing the deck to `DeckDetailModal` opens it. `onApply` regenerates slides (S16 may stub the slide-state slot — S17 likely owns the slide engine wiring).
6. **Replace the placeholder Library tab body** in `src/app/page.tsx`. The Library inspector tab now mounts `LibraryTab`.
7. **Vitest unit tests:** scoring helpers (pure-function determinism + per-input edge cases); `LibraryTab` smoke (search filter, toggle, click → modal).
8. **Verify**: `npm run typecheck` clean, `npm test` ~210+ passing.
9. **Commit + push** code (`feat(studio): Track C Session 16 — Library tab + scoring + Apply flow`) + docs (`docs: close Track C Session 16`).

### Anticipated gotchas for Session 16

- **Static data sources from the prototype.** The 95 KB single-file JSX has the archetype + template arrays inline. Lift them carefully — preserve all 75 + 12 entries with their full payloads (consensus dots, scores, raised, insight, fit, matchReasons).
- **Scoring math must match the prototype.** `scoreDecks` interpolates stage / industry / goal / tone match; `scoreTemplates` is similar. Translate the prototype's logic literally; pure functions; unit-test edges.
- **Apply flow needs a slides state slot.** Decision: land the slide-state model now (S16) or defer to S17 (Section nav + document tree). Recommend S16 lands a minimal `slides: Slide[]` state in the Studio context provider; S17 fills in the per-section editor.
- **The Library card's left bar uses a category-specific color.** Map category strings to canonical token names (no raw hex). Add a `category` → `--aurum-primary` / `--aether-primary` / `--mint-up` / etc. lookup in `src/lib/studio/category-colors.ts`.
- **`DeckDetailModal` is already done in S15** — don't rebuild it. S16 just feeds it the selected deck.

---

## OPERATOR ACTIONS NEEDED (you, not the agent)

| Action | When | Why |
|--------|------|-----|
| ~~**Apply C1 migration to DB**~~ | DONE 2026-05-03 (Option B — Supabase SQL Editor paste). Calendar tables exist in dev DB. | — |
| **Apply C3 migration to DB** — paste contents of `prisma/sql/02-add-voice-olivia-foundation.sql` into Supabase SQL Editor and Run (Option B path, identical workflow to C1). | Before any of C4's routes start writing to voice/olivia tables | Schema-in-code → DB tables. 9 new tables: olivia_conversations, olivia_messages, olivia_presentations, olivia_consents, olivia_guardrails, olivia_user_memories, voice_conversations, voice_contacts, voice_action_items. |
| **Apply V1 migration to DB** — paste `prisma/sql/03-add-valuation-foundation.sql` into Supabase SQL Editor and Run (Option B path, identical to C1+C3). | Before any V7 valuation API routes write to the new tables | 6 new valuation-domain tables: valuation_subjects, valuation_runs, valuation_sensitivities, financial_snapshots, deal_room_sessions, deal_room_messages. |
| Set `STUB_USER_ID` env var in Vercel (Preview only) | Before testing C4 routes in Preview | The `lib/auth/session.ts` stub reads this. Set it to any string (e.g., `clerk_user_dev_001`). Throws clearly if unset. **NOT in Production** — production refuses to run the stub at all (W-015). |
| Set Twilio env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) in Vercel | Before C4 routes go live | Twilio call lifecycle + webhook signature verification. **Sensitive, Production + Preview only.** Add to `env.ts` when wired. |
| Set ElevenLabs env vars (`ELEVENLABS_API_KEY`, `ELEVENLABS_OLIVIA_VOICE_ID`) | Before any voice TTS feature goes live | Used by `/api/olivia/voice` + `/api/olivia/call/audio` for ElevenLabs audio generation. **Sensitive, Production + Preview only.** |
| Set `RESEND_API_KEY` (optional) | Before email features go live | `/api/olivia/email` and `/api/olivia/conversations/[id]/email` use Resend. Graceful skip + console warning if missing. **Sensitive, Production + Preview only.** |
| Set `NEXT_PUBLIC_GOOGLE_MAPS_KEY` + `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel | Whenever you want the `/map` route to actually render | Without keys, map page shows "API key required" message. NEXT_PUBLIC_* uses **All Environments** per `~/CLAUDE.md`. Map clicks 404 to `/directory/{id}` and `/videos/{id}` since Olivia Brain has no such routes — see W-008. |
| Set `OPENAI_API_KEY` if not already | Before running calendar memory features (C5+) | `lib/video/embeddings.ts` uses it for vector embeddings. Marked **Sensitive**, **Production + Preview only**. |
| Install `match_calendar_memory()` PostgreSQL function in Supabase | When calendar memory becomes a user-facing feature (likely C5/C6) | C2's `searchCalendarMemory()` calls it via raw SQL. Currently degrades to empty array + console warning. **W-014** in README. LTM reference body in `D:\London-Tech-Map\prisma\sql\`. |
| Set Google OAuth + Outlook OAuth keys (`GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `MICROSOFT_CALENDAR_CLIENT_ID`, `MICROSOFT_CALENDAR_CLIENT_SECRET`, `CALENDAR_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`) | Before C5's calendar UI tries to OAuth | Calendar sync (`google-sync.ts` / `outlook-sync.ts` already ported in C2) needs these for OAuth flows. Not yet declared in `env.ts`. Add when C5 wires the API routes. **Sensitive, Production + Preview only.** |
| Set `TAVILY_API_KEY` | Before web_search tool is useful | C2's tools.ts has `web_search` that calls Tavily. Without the key, returns "Web search is not configured" gracefully. **Sensitive, Production + Preview only.** |

---

## MEMORIES YOU'LL FIND (auto-loaded, in `~/.claude/projects/C--Users-broke/memory/`)

These ARE the architectural decisions that took multiple painful conversations to lock. **Trust them — don't re-derive.**

| Memory | What it locks |
|--------|---------------|
| `feedback_world_class_standard` | 12-row standard table; no band-aids; root-cause every failure. |
| `feedback_gamma_is_partner` | Gamma is Olivia's presentation runtime. **Never** frame it as competition. Integrate via Gamma API + Gamma MCP. Closest peers for clueslondon are Pitch.com, Tome, Beautiful.ai, advisory firms. |
| `feedback_weakness_workflow` | Weaknesses → README + BUILD_SEQUENCE + memories. Doc-discipline rule: ALL architecture docs commit alongside code changes. |
| `reference_olivia_clues_product_truth` | Pointer to `00_PRODUCT_TRUTH.md`. Bicycle-wheel; clueslondon ship priority 1; cluesintelligence flagship priority 2. |
| `reference_olivia_ui_design_system` | Pointer to `01_UI_DESIGN_SYSTEM.md`. Aurum + Aether, LCH color space, Linear 3-input theming. |
| `reference_olivia_brain_enrichment_engine` | Pointers to `03_BRAIN_ENRICHMENT_ENGINE.md` + `04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md`. |
| `reference_olivia_brain_docs` | Olivia Brain canonical doc set + read order. |
| `project_ltm_map_calendar_adaptive` | LTM map (24 files, Google Maps + Mapbox dual) + calendar (36 files + full `lib/calendar/`) port byte-for-byte; need adaptive primitives in Studio-Olivia (Track N + Calendar). |
| `project_olivia_surface_suppression` | When Olivia embeds in a host that already provides a surface (LTM has map + calendar), Olivia hides her own. Mechanism: tenant config `ui.suppressedSurfaces: string[]`. Lands Track I Session 24. |
| `project_ltm_types_no_speculative_generalization` | Don't refactor `DistrictWithStats`, `MapOrg`, `CalendarEntry`, etc. into generic abstractions speculatively. Wait for second non-LTM consumer (cluesintelligence Track L). Don't stub LTM-specific routes. Don't add LTM Prisma models. |

---

## RECENT COMMIT TRAIL (last 24)

```
<this handoff commit>  docs: end-of-batch handoff S18-S22 — Track C CLOSED + Track V 3/9 ✅
<docs commit>          docs: close batch S18-S22 — SESSION_LOG Parts 25-29 + judgment-call trail
f40fb1b feat(valuation): Track V Session V3 — engine math port (10 methods)
9a67f05 feat(valuation): Track V Session V2 — types + bridge port
ddd3f1b feat(valuation): Track V Session V1 — schema port (6 valuation models)
9c2f25d feat(studio): Track C Session 19 — polish (J/K keyboard nav + autosave + theme switching)
98a63d6 feat(studio): Track C Session 18 — right-pane tabs + audit log + theme picker
75c39a5 feat(studio): Track C Session 17 — section nav + documents tree + frameworks panel + plan section nav
833ab51 docs: add OLIVIA_NORTH_STAR.md as the first agent read every session
3142ae8 docs: close Track C Session 16 — Library tab + scoring + Apply flow shipped
519d4f5 feat(studio): Track C Session 16 — Library tab + scoring + Apply flow
6c60121 docs: lock Track V (LTM valuation port) + Track Q (Quantara) + Track P (Deal Protection) + June 8 demo strategy
71c78cc docs: close Track C Session 15 — five reusable primitives shipped
22f1454 feat(primitives): Track C Session 15 — five reusable primitives + Cristiano transition + council mode
2cab220 docs: close Track C Session 14 — design system + Tailwind decision + W-011/12/13 ✅
21fbecf feat(workspace): Track C Session 14 — three-region shell + Aurum/Aether design system + Tailwind v4
c25bbfc docs: close Track Calendar C6 — Calendar subsystem inventory + Track Calendar ✅
4bdb08a feat(calendar): Track Calendar C6 — app routes + smoke tests
715aac4 docs: close Track Calendar C5 — UI + 18 routes done; W-013 + W-016 logged; resume at C6
cb678b7 feat(calendar): Track Calendar C5 — UI components + calendar API routes
2a69430 docs: refresh HANDOFF.md HEAD reference for fresh-conversation pickup
d5fe4c3 fix(map): move next/dynamic out of Server Component (Vercel build fix)
278a4f9 docs: close Track Calendar C4 — voice/email/call/sms/WhatsApp routes done
1657fe2 feat(calendar): Track Calendar C4 — voice/email/call/sms/WhatsApp routes
273b242 docs: close Track Calendar C3 — voice + olivia models + engine done
4291a39 feat(calendar): Track Calendar C3 — voice + olivia models + engine
```

---

## STRATEGIC PRIORITY (locked 2026-05-03, expanded 2026-05-07)

Founder direction: focus on **`clueslondon.com` (priority 1)** and **`cluesintelligence.com` (priority 2 — FLAGSHIP)**. Both ship targets. cluesxscore (priority 3) and white-label Olivia (priority 4) follow.

**June 8 strategy (locked 2026-05-07).** London Tech Show on 2026-06-08 is a **demo target, not a full clueslondon ship**. Olivia Brain becomes the canonical implementation of Studio Olivia + the advanced valuation engine + the new Quantara intake + Deal Protection. LTM stays untouched (read-only standing rule preserved). After Olivia Brain is built, a separate Claude session ports back the new code into LTM to finish LTM. Bicycle-wheel preserved: Olivia is the source of truth, LTM is a consumer.

**Pace (locked 2026-05-07).** Founder operates at **~4 sessions/day** with Claude. Remaining work (~70 sessions) takes ~3 weeks at sustained pace.

**Track V/Q/P expansion (locked 2026-05-07).** LTM's far-superior valuation system clones into Olivia Brain as **Track V — LTM Valuation Engine Port** (9 sessions, ~93 files: 24 valuation libs + 14 agents + 9 API routes + 39 UI components + Cristiano 2-pass + 4 Prisma models + 2 valuation-context DealRoom models). Then **Track Q — Quantara Paragraphical Intake** (7 sessions, 56-field metamorphic form persisting to existing `ValuationSubject` JSON columns) and **Track P — Deal Protection Engine + Gap Closures** (7 sessions, 6 gap-closures: Smart Score with bands, clause classifier, London Investor Reputation DB, multi-round dilution, band-specific emails, plus negotiation rehearsal + versioning + multi-LLM consensus). Track O Session O1 (Composio) pulls forward ahead of Q so auto-fill works day 1. Track L (cluesintelligence Unification) shrinks from ~15–20 to ~10 sessions because Track Q builds the paragraphical-questionnaire primitive Track L needs. **Full session-by-session breakdown in `docs/BUILD_SEQUENCE.md`.**

**Sessions 1–17 done. ~68 remaining** (was ~69 at S16-close, less the now-shipped S17). Track Calendar **CLOSED** (all 6 of 6 sessions ✅). Track C **Sessions 14–17 ✅** (4 of 6 — design substrate + workspace shell + five primitives + Library tab/scoring/Apply + section nav/docs tree/frameworks/plan nav). W-011 / W-012 / W-013 closed. **Next: Track C Session 18 — Right-pane tabs (Olivia / Preview / Themes / Audit) wired to backends + audit log mechanism + center-pane views.** Track V begins after Track C closes (~Session 20).

---

## START SEQUENCE (next session)

```bash
cd "D:\Olivia Brain"
git status                                    # should be clean, on main, up to date with origin/main
git log --oneline -5                          # confirm HEAD is at the post-Session-11 docs commit
```

Then in Claude Code:
1. Read this file (`HANDOFF.md`).
2. Read `docs/SESSION_LOG_2026-05-02_GRAND_MASTER_PLAN.md` Part 22 for Session 15 details (five primitives + Cristiano transition + council mode + DeckDetailModal contract).
3. Read `docs/BUILD_SEQUENCE.md` Track C row `**11**` for Session 16's Library-tab spec.
4. Read `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Library tab spec) + § 8 #4 (Library scoring with reasons).
5. Open `D:\Studio-Olivia\StudioOliviaGrandMaster (2).jsx` in **read-only** mode to inventory the 75 archetypes + 12 plan templates + the scoring math.
6. Begin Session 16 by lifting the static archetype + template arrays into typed modules (`src/lib/studio/archetypes.ts` + `src/lib/studio/templates.ts`), then the scoring helpers, then the `LibraryTab` component, then wire it into the Inspector library tab + the existing `DeckDetailModal`.

**Standing rule reminder:** stop after Session 16's deliverable lands. Track C is 6 sessions (S14–S19); confirm with the user before starting S17. Update docs alongside the code commit per the doc-discipline rule.
