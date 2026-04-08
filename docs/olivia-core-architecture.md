# Olivia Core Multi-App Architecture

This document defines how Olivia should sit across the full CLUES portfolio.

The core rule is simple:

- Olivia is the intelligence and orchestration layer.
- Each product remains the system of record for its own domain.
- Olivia integrates through app-specific adapters instead of copying domain logic into the core.

## Portfolio model

| Product | Primary role | System of record owned there | Olivia role |
|---|---|---|---|
| `cluesintelligence.com` | predictive analytics and relocation workflows | relocation data, client workflow state, deliverables | relocation strategist and executive analyst |
| `clueslondon.com` | London ecosystem intelligence hub | ecosystem graph, events, founder network data, in-house calendar | chief of staff, networking planner, ecosystem agent |
| `clueslifescore.com` | modular city comparison engine | metric engines, comparison outputs, scoring models | comparison explainer and decision assistant |
| heart recovery app | provider-patient recovery platform | patient journey, post-surgery tasks, health workflow state | care coordinator and recovery companion |
| transit and environmental app | route and travel intelligence | transit logic, route metrics, environmental overlays | travel optimizer and rider assistant |
| Tampa Bay brokerage stack | brokerage operations | real estate client lifecycle, brokerage workflows, transaction state | brokerage executive assistant |

## Core split

### Olivia Core owns

- model cascade and judge routing
- orchestration and tool invocation policy
- shared conversation memory and audit trails
- tenant and persona configuration
- approval gates and compliance controls
- white-label branding, entitlements, and adapter selection

### Domain apps own

- domain schemas
- domain write logic
- user authorization for that domain
- sync engines and provider-specific state
- internal analytics and business rules

## Why this architecture is required

The London calendar system proves the point. It is a full subsystem with:

- rich calendar domain entities
- attendees, prep tasks, reminders, recommendations
- Google, Outlook, and Calendly sync
- webhook lifecycle tracking
- semantic memory and behavior learning
- Olivia voice and planning hooks

That should remain authoritative inside `clueslondon.com`. Rebuilding it inside Olivia Brain would create:

- two calendars with diverging logic
- duplicate sync complexity
- duplicate compliance and audit surfaces
- more failure modes across products

## Integration pattern

Olivia Core should talk to each app through a dedicated machine-to-machine adapter surface.

Recommended pattern:

1. Domain app exposes a private internal API namespace for Olivia.
2. Olivia Core authenticates with a shared secret or signed request.
3. Olivia Core sends action requests with trace and tenant context.
4. Domain app performs the domain write or lookup.
5. Domain app returns normalized results and preserves its own IDs as canonical.

## Adapter rules

- Never let Olivia Core write directly to another app's database.
- Never have Olivia Core depend on another app's ORM models.
- Prefer narrow task-oriented endpoints over mirroring the full domain schema.
- Keep remote IDs canonical in the domain app and store only references in Olivia Core if needed.
- Add idempotency keys for all cross-app writes.
- All write actions should support approval metadata and actor attribution.

## Canonical adapter families

| Adapter family | Typical actions |
|---|---|
| `calendar` | parse event, list entries, create entry, update entry, set attendees, get prep tasks |
| `crm` | lookup contact, create or update contact, lookup company, create deal, update deal |
| `communications` | send email, create draft, queue outbound sequence, send SMS, place call |
| `documents` | generate report, attach files, fetch prep documents, export deck |
| `analytics` | run comparison, generate predictive report, fetch scoring output |
| `travel` | route query, recommendation query, travel buffer estimate |
| `health` | retrieve care task list, create follow-up, summarize recovery state |

## Tenant model

Olivia should support the same core brain across:

- first-party CLUES properties
- internal brokerage operations
- future white-label customers

Each tenant should define:

- enabled adapters
- enabled personas
- policy and approval rules
- branding and voice
- model routing overrides

## White-label requirement

White-label Olivia should not require product-specific code forks.

That means:

- the core orchestration stays the same
- adapters are enabled or disabled per tenant
- each tenant gets its own prompt pack, policy pack, and branding pack
- tenant-specific systems of record remain external to Olivia Core

## Recommended near-term build sequence

1. Define the shared adapter registry in Olivia Brain.
2. Define the London calendar contract as the first domain adapter.
3. Build a private server-to-server adapter API in `clueslondon.com`.
4. Build the Olivia Brain London calendar client against that contract.
5. Add approval-gated LangGraph tools that call the adapter.
6. Repeat the same pattern for CRM, communications, and analytics across the portfolio.

## Non-negotiable principle

Olivia should be deeply integrated everywhere, but authoritative nowhere outside her own intelligence layer.

That is what makes her both:

- a real operating system for your portfolio
- a free-standing white-label product you can sell separately
