# 03 · BRAIN ENRICHMENT ENGINE — the auto-enrichment primitive

> **Read `00_PRODUCT_TRUTH.md` first.** The bicycle-wheel architecture only works if Olivia (the hub) **automatically learns** what every spoke app knows. This file specifies the universal mechanism by which **any spoke app** — clueslondon, cluesintelligence, cluesxscore, clues-property-search, Heart-Recovery-Calendar, the future London transit app, white-label tenants — **enriches Olivia in real time** whenever it changes its schema, its data, or its knowledge.
>
> This engine is non-negotiable for the bicycle-wheel architecture to be more than a metaphor. Without it, every new app drifts from the brain and Olivia becomes stale.

---

## 1. Mandate

The Brain Enrichment Engine ("BEE") is a **bidirectional event pipeline** with three event classes:

| Class | Source-of-truth in spoke app | Effect on Olivia Brain |
|-------|------------------------------|------------------------|
| **Schema event** | Prisma migration / table DDL / field rename | Brain re-discovers the spoke's surface area; bridge provider type definitions refresh; `knowledgeRegistry` capability map updates. |
| **Data event** | Row-level insert / update / delete in spoke app | Brain's bridge providers see the new state on the next query; semantic memory layer ingests events that match the spoke's "memorable" filter. |
| **Knowledge event** | Question prompt added / methodology change / scoring rule edit / taxonomy reorganization / system prompt revision | Brain's prompt context cache invalidates; the affected agents re-prime; persona-snapshot regeneration is queued for users whose persona depends on the changed knowledge. |

**The bicycle-wheel mechanism in one sentence:** every time a spoke moves, the hub re-aligns automatically — no manual code changes in Olivia Brain, no stale cross-app references, no out-of-sync personas, no agents reasoning over prompts that have already been edited upstream.

---

## 2. Why this exists

Without BEE the bicycle-wheel breaks in five known ways:

1. **Schema drift** — clueslondon adds a new table; Olivia's `LtmKnowledgeProvider` cannot answer questions about it without a manual code edit. Drift compounds across ten apps.
2. **Data staleness** — a user's questionnaire answer changes in cluesintelligence; Olivia keeps narrating the old answer because nothing told her to refresh.
3. **Knowledge incoherence** — the questionnaire team rewords a paragraph prompt; Olivia keeps coaching users against the **old wording** because her memory layer cached it. The engineering team's edits don't reach the AI's mouth.
4. **Persona drift** — cluesintelligence revises the persona schema (adds a new attribute axis); existing personas were derived under the old schema and now produce inconsistent verdicts.
5. **White-label surprise** — a tenant adds a new sector to their cluesintelligence config; Olivia narrates against the old sector list and the tenant's users get a broken experience.

Each is a real failure mode that has happened in similar architectures. BEE prevents all five.

---

## 3. The three event classes — concrete shapes

### 3.1 Schema events

**Trigger:** any spoke app's Prisma migration, table DDL, field rename, or type change.

```ts
interface SchemaEvent {
  kind: "schema";
  appId: "clueslondon" | "cluesintelligence" | "cluesxscore.<x>" | "olivia-saas" | "clues-property-search" | "heart-recovery" | "london-transit" | string;
  appVersion: string;                         // semver of the spoke app
  schemaVersion: string;                      // monotonic; e.g. "2026-05-08-1"
  schemaHash: string;                         // sha256 of the dumped schema
  changes: Array<{
    op: "add" | "drop" | "rename" | "alter";
    objectType: "table" | "field" | "enum" | "index";
    before?: object;                          // null on add
    after?: object;                           // null on drop
  }>;
  emittedAt: string;                          // ISO 8601
}
```

**Brain reaction:** persist to `app_schema_snapshots`; recompute the spoke's `UniversalKnowledgeProvider` capability advertisement; broadcast a `knowledgeRegistry.providerUpdated` event so every active conversation refreshes its bridge state on the next turn.

### 3.2 Data events

**Trigger:** row-level mutation in any spoke app's database that the spoke flags as Olivia-relevant.

```ts
interface DataEvent {
  kind: "data";
  appId: string;
  domain: string;                             // "uk-companies" | "questionnaire-answer" | "city-comparison" | …
  op: "insert" | "update" | "delete";
  entityType: string;                         // e.g. "user_answer", "verdict_run", "company"
  entityId: string;
  payload: object;                            // current state; for delete: pre-delete state
  userScopedClientId?: string;                // if user-scoped, the client_id RLS key
  emittedAt: string;
}
```

**Brain reaction:** the bridge provider for that domain invalidates cached query results; if the entity is user-scoped, semantic memory writers consider whether to encode it (e.g. a high-impact answer change → new semantic memory; a low-impact metadata tweak → ignore); if a verdict is now stale (an underlying answer changed), the verdict's "freshness" flag in the user's report flips.

### 3.3 Knowledge events

**Trigger:** any change to user-facing or agent-facing knowledge — question prompts, scoring methodology, system prompts, taxonomy organization, threshold values, persona schema versions.

```ts
interface KnowledgeEvent {
  kind: "knowledge";
  appId: string;
  knowledgeType: "question_prompt" | "scoring_rule" | "system_prompt" | "taxonomy" | "persona_schema" | "threshold" | "report_template" | string;
  knowledgeId: string;                        // stable identifier
  version: number;                            // monotonic per (appId, knowledgeType, knowledgeId)
  before?: object;
  after: object;                              // the new state
  affectedUserScope?: "all" | "since_date" | { userIds: string[] };
  emittedAt: string;
}
```

**Brain reaction:** prompt context cache for the affected agents invalidates; if `affectedUserScope` is "all" or matches existing personas, queue persona-regeneration jobs; record the change in the audit log so any downstream report can show "your verdict was generated under questionnaire-version N — newer version available."

---

## 4. Receiving endpoints — Olivia Brain side

Three internal endpoints under `src/app/api/internal/enrich/`. All three are signed and rate-limited.

| Endpoint | Method | Body | Side effects |
|----------|--------|------|--------------|
| `/api/internal/enrich/schema` | `POST` | `SchemaEvent` | Persist snapshot, refresh registry. |
| `/api/internal/enrich/data` | `POST` | `DataEvent` | Invalidate bridge cache, conditionally write semantic memory. |
| `/api/internal/enrich/knowledge` | `POST` | `KnowledgeEvent` | Invalidate prompt cache, queue persona regeneration. |

A unified `POST /api/internal/enrich` accepts a discriminated-union body for batch deliveries. Apps may use either form.

### 4.1 Authentication

Each spoke app holds a per-app signing secret in its environment (`OLIVIA_ENRICH_SIGNING_KEY_<APP_ID>`). Olivia Brain holds the corresponding verification keys.

Every request carries:

- `x-olivia-app-id: <appId>` — which spoke is talking.
- `x-olivia-signature: sha256=<hex>` — HMAC-SHA256 of the raw body using the spoke's signing key.
- `x-olivia-timestamp: <unix-ms>` — replay-window; reject anything older than 5 minutes.
- `x-olivia-event-id: <uuid>` — idempotency key; brain dedupes on it.

Reuses the existing `x-olivia-signature` pattern that LTM and the calendar adapter already use (`MERGE_PLAN.md` § 3.10), so this is consistent with the rest of the cross-app contract.

### 4.2 Rate limiting + back-pressure

Per-app token bucket (`200 events/minute` baseline; raisable per tenant). Bursts buffered up to 1,000 events; over that, the brain returns `503` and the spoke's outbox is expected to retry with exponential backoff.

### 4.3 Idempotency

Brain persists `(appId, eventId)` to `enrichment_events` on receipt. Re-deliveries are no-ops. The `eventId` should be a UUIDv7 from the spoke so it sorts naturally by time.

---

## 5. The enrichment pipeline — what happens inside the brain

```
SchemaEvent / DataEvent / KnowledgeEvent
            │
            ▼
   ┌──────────────────┐
   │  enrich receiver │  ── persist to enrichment_events
   └──────────────────┘
            │
            ▼
   ┌──────────────────┐
   │  classifier      │  ── route by kind + appId + domain
   └──────────────────┘
            │
   ┌────────┴────────┬────────────────────────┐
   ▼                 ▼                        ▼
┌───────────┐  ┌──────────────┐   ┌───────────────────┐
│ schema    │  │ data         │   │ knowledge         │
│ handler   │  │ handler      │   │ handler           │
└───────────┘  └──────────────┘   └───────────────────┘
   │                 │                        │
   ▼                 ▼                        ▼
 registry         bridge cache          prompt cache
 refresh          invalidate            invalidate
                       │                        │
                       ▼                        ▼
                 semantic memory          persona regen
                  writer                   scheduler
                                                │
                                                ▼
                                          subscribers
                                          notified
```

Each stage is a discrete function with `withTraceSpan` instrumentation, so the operator can see in Langfuse/OTel exactly which event triggered what, how long each handler took, and which subscribers fanned out.

---

## 6. Bridge auto-discovery

When a `SchemaEvent` lands, the brain calls back to the originating spoke at a well-known endpoint (`GET /api/internal/olivia/discover`) which returns the spoke's current `UniversalKnowledgeProvider` metadata: capabilities, domain identifiers, supported NL query intents, vocabulary terms.

The brain compares to its last-known metadata for that spoke and:

- Adds new capabilities to the registry.
- Marks dropped capabilities as deprecated (active conversations get a warning rather than a hard break).
- Re-derives the spoke's section of the cross-app type union.

This is the mechanism that lets a spoke add a new feature **without touching Olivia Brain code**. The brain notices the new capability, picks it up in the registry, and exposes it to the cascade routing layer automatically.

---

## 7. Memory writes — semantic / episodic / journey

`DataEvent`s do not all become memories. The brain runs each event through a **memorability filter** specific to the domain:

| Filter rule (example, cluesintelligence) | Memory layer |
|------------------------------------------|--------------|
| User changed an answer marked `severity ≥ 4` (DNW) or `importance ≥ 4` (MH) | Semantic memory + journey snapshot |
| User completed a module | Episodic memory ("session: completed Healthcare module 2026-05-08") |
| User flagged a city as "love" or "rule out" in the verdict UI | Semantic memory (high-confidence preference) |
| Background analytics event (page-view, hover, scroll-depth) | Discarded |

Filter rules live in `src/lib/enrichment/memorability/<appId>.ts`, one file per spoke. Each spoke owns its rules; the brain enforces the universal interface.

---

## 8. Bidirectional — apps subscribing to brain events

The reverse direction matters too. When the brain produces a verdict, regenerates a persona, or completes a daily-brief computation, **subscribed spoke apps** receive a webhook so they can update their UI without polling.

```ts
interface Subscription {
  subscriberAppId: string;
  callbackUrl: string;                        // POST destination on the spoke
  eventPattern: {
    kind: "verdict.generated" | "persona.regenerated" | "brief.completed" | "verdict.what_if_done" | string;
    appIdFilter?: string[];                   // e.g. only events from cluesintelligence
    userScope?: "all" | "tenant" | "specific_users";
  };
  signingKeyId: string;
  active: boolean;
}
```

The brain emits to subscribed callbacks with the same HMAC + timestamp + idempotency-key contract used inbound.

---

## 9. Prisma models (additions to Olivia Brain schema)

```prisma
model enrichment_events {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  app_id         String
  event_id       String                               // UUIDv7 from spoke
  kind           String                               // 'schema' | 'data' | 'knowledge'
  domain         String?
  payload        Json
  signature      String                               // x-olivia-signature
  received_at    DateTime @default(now()) @db.Timestamptz(6)
  processed_at   DateTime? @db.Timestamptz(6)
  status         String   @default("queued")          // queued | processing | done | failed | dead_letter
  error          String?
  trace_id       String?                              // OTel trace id
  @@unique([app_id, event_id], map: "enrichment_events_dedupe")
  @@index([status, received_at(sort: Asc)], map: "enrichment_events_queue")
  @@index([app_id, kind, received_at(sort: Desc)], map: "enrichment_events_app_kind")
}

model app_schema_snapshots {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  app_id          String
  schema_version  String
  schema_hash     String
  capabilities    Json                                // discovered registry advertisement
  captured_at     DateTime @default(now()) @db.Timestamptz(6)
  @@unique([app_id, schema_version])
  @@index([app_id, captured_at(sort: Desc)])
}

model enrichment_subscriptions {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subscriber_app_id    String
  callback_url         String
  event_pattern        Json
  signing_key_id       String
  active               Boolean  @default(true)
  created_at           DateTime @default(now()) @db.Timestamptz(6)
  last_delivery_at     DateTime? @db.Timestamptz(6)
  last_delivery_status String?
  @@index([active, subscriber_app_id])
}

model enrichment_outbound_deliveries {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  subscription_id String   @db.Uuid
  event_id        String
  attempt         Int      @default(1)
  status          String                               // pending | delivered | failed
  http_status     Int?
  delivered_at    DateTime? @db.Timestamptz(6)
  next_retry_at   DateTime? @db.Timestamptz(6)
  payload         Json
  @@index([status, next_retry_at(sort: Asc)], map: "enrichment_outbound_queue")
}
```

---

## 10. Implementation phases

| Phase | Deliverable | Notes |
|-------|-------------|-------|
| **B1** | Inbound endpoints (`/api/internal/enrich/*`), HMAC verification, `enrichment_events` persistence, idempotency. Vitest suite. | The minimum viable surface — spokes can start emitting. |
| **B2** | Schema-event handler + bridge auto-discovery. `app_schema_snapshots` ingestion. Capability registry refresh. | Makes the bridge layer dynamically trace spoke surfaces. |
| **B3** | Data-event handler + memorability filters per spoke. Semantic-memory write path. Bridge cache invalidation. | First spoke to wire: cluesintelligence answer-change events. |
| **B4** | Knowledge-event handler + prompt-cache invalidation + persona-regeneration scheduler. | Decouples editorial team from agent code. |
| **B5** | Subscription model + outbound delivery worker (Inngest or Trigger.dev — both already in `package.json`). Retry policy, dead-letter queue. | Completes the bidirectional loop. |
| **B6** | Per-spoke SDK package — `@olivia/enrichment-client` — with typed event constructors, signing helper, retry-with-outbox pattern. | Spoke-side ergonomics. Each spoke imports this once and emits events idiomatically. |
| **B7** | Admin dashboard — event queue depth, per-spoke health, dead-letter inspection, subscription manager. | Operability. |

Each phase is a self-contained Build Sequence session; goes into `BUILD_SEQUENCE.md` as **Track M — Brain Enrichment Engine** when scheduled.

---

## 11. Spoke-side requirements

For each spoke to participate, it needs:

1. **An outbox pattern** — events written to a local outbox table in the same transaction as the underlying business write, then flushed to Olivia Brain by a background worker. This guarantees at-least-once delivery without distributed-transaction headaches.
2. **A discovery endpoint** — `GET /api/internal/olivia/discover` — returns the spoke's current `UniversalKnowledgeProvider` advertisement.
3. **A signing key** — per-spoke secret, rotatable.
4. **A memorability filter** — the rules for which data events should propagate.

The `@olivia/enrichment-client` package (phase B6) ships these as drop-in utilities; spokes wire them once.

---

## 12. Failure modes — what happens when this misbehaves

| Failure | Consequence | Mitigation |
|---------|-------------|------------|
| Spoke can't reach brain | Spoke's outbox grows; data is delayed but not lost | Outbox + retry with exponential backoff; alert when outbox > 1k events. |
| Brain rejects signature | Event silently discarded, alert raised | Per-spoke "last-failed-signature" timestamp surfaced in admin dashboard. |
| Memorability filter throws | Single event lands in dead-letter | Other events keep flowing; filter author fixes the bug; replay from dead-letter. |
| Knowledge event has `affectedUserScope: "all"` and there are 100k personas | Persona-regeneration backlog | Queue with rate-limit; users with stale personas see a "Regenerating verdict — fresher version in 2 min" notice. |
| Subscriber app is down | Outbound deliveries retry | After 24h of failures, subscription goes inactive; admin gets notification. |

---

## 13. What this is NOT

- **Not a CDC-of-record.** We're not replicating every byte of every spoke's database. Each spoke decides what's Olivia-relevant.
- **Not a workflow engine.** This is event delivery + cache invalidation. Workflow orchestration (Temporal, Inngest) consumes these events; it doesn't replace them.
- **Not synchronous.** A spoke does not wait on Olivia to process before its own request returns. Latency-sensitive operations stay local; the brain catches up.
- **Not the only inter-app communication.** Direct queries (the `UniversalKnowledgeProvider` bridge) remain the synchronous read path. BEE is the asynchronous "stay in sync" path.

---

## 14. Open questions

| # | Question | Why it matters |
|---|----------|---------------|
| 1 | Sync mechanism — pure HTTP webhooks, OR Postgres logical replication, OR a managed stream (Inngest / Trigger.dev / QStash)? | All work; tradeoffs are reliability vs. infra cost vs. ops complexity. Inngest is already in `package.json` — defaults to that unless overridden. |
| 2 | First spoke to wire? Probably **cluesintelligence** for its answer-change events (drives what-if simulator real-time updates). | Validates the design end-to-end before it touches clueslondon (which has the most data volume). |
| 3 | Should a "knowledge change" auto-regenerate every affected persona, or surface a user-visible "would you like to refresh?" prompt? | Affects user experience and compute cost. Default proposal: surface to the user; auto-regen only on explicit consent. |
| 4 | Dead-letter handling SLA — how long do we hold un-processable events, and who's responsible for replay? | Operational policy. |
| 5 | Should the SDK package live inside Olivia Brain (`packages/enrichment-client/`) or in its own repo? | Affects publishing cadence and tenant onboarding. |

---

## ⚠️ 14a. Phase 3 gap: data-source orchestration (precedence / provenance / confidence / conflict detection)

> **Surfaced 2026-05-17** during a ChatGPT strategic review of the clueslondon integration stack. Committed to the build at the same time. See the corresponding LTM register entry: `D:\London-Tech-Map\docs\api-specs\_MASTER_REGISTER.md §7` + memory `reference_data_source_orchestration_gap.md`.

BEE today handles **schema / data / knowledge events from each spoke** but does NOT yet specify how the brain resolves **conflicts between EXTERNAL data sources** that contribute facts about the same entity. With 15+ third-party integrations now wired into clueslondon (Companies House REST + Streaming, Apollo, GitHub, GLEIF, GDELT, OpenAlex, Crossref, Open-Meteo, HN Algolia, Reddit, Foursquare, TfL, UK Police, HM Land Registry as of wave 7/12 on 2026-05-17), the conflict surface grows quadratically. Examples that will appear at Phase 3 scale:

- GDELT (news) says "Acme raised £8M" and Companies House Streaming (regulator) says "Acme filed SH01 for £12M" — same entity, conflicting amount.
- GitHub says a founder is at company X; Apollo says they're at company Y; LinkedIn (hypothetically) says Z — which wins on the founder card?
- OpenAlex + Crossref both publish the same paper with slightly different author affiliations.

Four primitives the brain will need before this becomes a correctness problem:

1. **Source precedence ranking.** Per entity-field, define which source wins in a conflict (e.g., for funding-amount: CH Streaming > GDELT > LLM inference). Probably a `<entityType>.<field>` → ranked-source-array config that lives next to the knowledgeRegistry.
2. **Provenance tracking per field.** Every entity-field value carries `{ value, source, observedAt }` — UI surfaces can show "from Companies House, refreshed 2 hours ago" instead of bare values.
3. **Confidence scoring (0-100).** Combines source-reliability + freshness + corroboration count. Downstream consumers weight high-confidence fields more in valuation / matching / narrative agents.
4. **Cross-source conflict detection.** Audit cron that flags entities where two sources disagree on a tracked field by more than a configurable tolerance. Surfaces to admin for inspection or to the LLM cascade for tie-breaking.

**When to build:** when the first real conflict surfaces in production (e.g., a founder calls out "your directory card and your valuation tile disagree about my company's funding"). Build from real cases, not imagined ones — `feedback_question_specs_dont_guess`. Do NOT pre-build a generic precedence framework before there's a concrete consumer surface that suffers from a conflict.

**Where it lives when built:** as a `_shared/precedence.ts` + `_shared/provenance.ts` + `_shared/confidence.ts` triad inside `D:\Olivia Brain\src\lib\bridge/` (the brain's existing UniversalKnowledgeProvider layer is the natural integration point), plus a `ConflictReport` Prisma model in the brain's DB schema for the audit cron's findings.

### 14a.1. Wire-shape contract: `NormalizedResponse<T>` (cross-linked from LTM tooling deliverable #5 of 5)

> **Surfaced 2026-05-17** during the same 8-LLM synthesis pass that produced LTM's probe / scaffold / deferred-registry / freshness-contract tooling. Idea #11 in the synthesis. Folded into Phase 3 here (rather than retrofit into the 16 already-wired LTM integration clients) per the no-breaking-changes rule the founder locked in the same session.

**What it is.** A uniform response envelope that EVERY wired integration client (in LTM, and eventually in OB's own integration layer) emits at the point where Phase 3 orchestration starts consuming it. Today each LTM client returns its own `XxxResult<T>` discriminated union (`{ ok: true; data: T } | { ok: false; error; status? }`). That's correct for the consumer-side contract but leaves the Phase 3 layer with no place to attach **source-precedence weight, provenance, confidence, freshness signals** without parsing each vendor's payload bespoke.

The envelope (forthcoming — DO NOT pre-build per `feedback_question_specs_dont_guess`):

```ts
export interface NormalizedResponse<T> {
  /** Vendor's original response, post-Zod-parse. Same shape the existing
   *  XxxResult<T> Ok branch carries today. */
  data: T;

  /** Per-row provenance — every field of `data` MAY carry a
   *  `__provenance` sidecar that points back here. Filled by the
   *  orchestrator, not the integration client. */
  provenance: {
    /** Slug matching `src/lib/integrations/<slug>/` AND the LTM
     *  `_MASTER_REGISTER.md §2` row. Single grep-able identifier. */
    source: string;
    /** ISO 8601 timestamp the fetch completed. */
    fetchedAt: string;
    /** Canonical URL we fetched — for "click to see the source"
     *  affordances in the UI. */
    provenanceUrl: string;
  };

  /** Freshness signals captured from response headers — same fields
   *  recorded by `scripts/probe-source.ts` (LTM tooling deliverable #1).
   *  Cross-link to the per-source freshness contract in LTM
   *  `_MASTER_REGISTER.md §11`. */
  freshness: {
    /** Vendor-documented refresh cadence — pulled from the §11.2 row
     *  for this source. */
    refreshInterval: "realtime" | "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "static" | "varies";
    /** Period the data CURRENTLY represents — distinct from
     *  `refreshInterval`. */
    dataAsOf: "realtime" | "hourly" | "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "static" | "varies";
    /** Duration string (e.g. "5m", "30d") past which consumers should
     *  flag the row as stale. */
    stalenessThreshold: string;
    /** Headers captured at fetch time. */
    lastModified: string | null;
    etag: string | null;
  };

  /** Vendor rate-limit signals — useful to the orchestrator for
   *  prioritising which sources to re-fetch first when filling a
   *  precedence-ranked merge. */
  rateLimit: {
    remaining: number | null;
    reset: string | null;
  };

  /** 0-100 confidence score. Filled by the orchestrator after combining
   *  source-precedence weight (§14a.1) + freshness factor (§14a.3) +
   *  corroboration count. Integration clients MUST NOT populate this
   *  themselves — they have no view of the cross-source picture. */
  confidence?: number;
}
```

**Backward-compatibility contract.** Existing per-client `XxxResult<T>` discriminated unions stay bit-for-bit unchanged. The `NormalizedResponse<T>` envelope is introduced as a thin **decorator** that the orchestrator calls — `decorate(result, ctx)` — only at the point where Phase 3 actually starts consuming cross-source merges. No retrofit pass on the 16 already-wired LTM clients.

**Where it lives when built.** Co-located with the precedence / provenance / confidence triad in `D:\Olivia Brain\src\lib\bridge/_shared/normalized.ts`. The LTM-side decorator is a thin re-export under `src/lib/integrations/_shared/normalized.ts` that depends only on `_shared/http.ts` types (zero new third-party deps).

**When to build.** Same trigger as §14a — first real cross-source conflict surfaces in production. Until then, this section is the design lock so the next session can implement without re-deriving the envelope.

**Cross-references:**
- LTM tooling deliverable #1: `scripts/probe-source.ts` records the freshness signals this envelope embeds — see `D:\London-Tech-Map\scripts\probe-source.ts`.
- LTM tooling deliverable #4: per-source freshness contract — see `D:\London-Tech-Map\docs\api-specs\_MASTER_REGISTER.md §11`.
- LTM Phase 3 gap entry: `_MASTER_REGISTER.md §7` row "Phase 3 architectural gap: data-source orchestration".
- Memory: `reference_data_source_orchestration_gap.md`.

---

## 15. The mandate

Every spoke app, current and future, **emits** to BEE on schema / data / knowledge change. Every spoke app **may subscribe** to brain events. This is non-negotiable for any product that joins the bicycle wheel (`00_PRODUCT_TRUTH.md`). When a new product is added to the wheel, **wiring it into BEE is part of its definition-of-done.** No silent drift.

The Phase 3 extension in §14a above is **part of this mandate** once it lands — every spoke + every wired third-party source eventually feeds the brain's precedence / provenance / confidence layer.
