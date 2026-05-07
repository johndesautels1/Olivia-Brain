# Olivia — North Star

> **Read this first, every session, before any other doc.**
> The single question every Olivia Brain commit must answer **yes** to.
> Locked by founder direction 2026-05-07.

---

## The single question

**Are we making her the world's most advanced, intelligent, high-tech, user-friendly, agentic-powered, live-avatar / chat-avatar Chief Intelligence Officer for Florida Real Estate, International Relocation, the London Tech Ecosystem, our two-city comparison-metric mini-apps, Heart Health Recovery, and the London Transit System — with herself as the hub of all knowledge at the center of a bicycle wheel, modular plug-and-gateway docking into each of those apps, and standing alone as her own app interface?**

If a commit moves that needle, ship it. If it doesn't, stop and raise it.

---

## The six product surfaces (the spokes)

| # | Surface | Repo / domain | Maps to product hierarchy |
|---|---|---|---|
| 1 | **Florida Real Estate** — residential sales market evaluations, buyer brokerage, new-construction home-sales evaluation | `clues-property-search` | Priority 5 in `00_PRODUCT_TRUTH.md` |
| 2 | **International Relocation** — paragraphical questionnaire engine, persona derivation, top-3 cities / towns / neighborhoods anywhere in the world | `cluesintelligence.com` | Priority 2 — **THE FLAGSHIP** |
| 3 | **London Tech Ecosystem** — capital matching, Studio Olivia, document library, pitch decks, business plans, marketing, Gamma presentations | `clueslondon.com` | Priority 1 — current ship target |
| 4 | **Two-city comparison metric mini-apps** — 23 modular apps, each comparing 2 cities on 100 metrics within one category (`lifescore`, `cluestransitscore`, `cluesenvironmentalscore`, …) | `cluesxscore.com` | Priority 3 |
| 5 | **Heart Health Recovery** — heart-health recovery tracking + calendar | `Heart-Recovery-Calendar` | Priority 6 |
| 6 | **London Transit System** — transit-intelligence app, to-be-designed | London transit | Priority 7 |

Plus white-label Olivia (Priority 4) — a productized version of her for third-party real-estate or relocation firms to deploy under their own brand.

---

## Olivia's three modes

She delivers value in three structurally different ways. Every line of code in this repo serves at least one — usually all three:

1. **Embedded in a spoke.** She takes over that spoke's expertise — Florida-real-estate analyst, London-VC matchmaker, relocation oracle, two-city verdict-renderer, cardiac-recovery coach, transit planner — while preserving cross-spoke memory of the user. The spoke is the surface; she is the brain underneath.
2. **Modular plug-and-gateway docking.** Third-party apps (white-label real-estate firms, white-label relocation firms, white-label health-tech) plug into her over a stable contract. She powers their AI without appearing under her own name. The gateway is the contract; she is the engine.
3. **Standalone, freestanding interface.** `olivia.com` is her own app. Any of her capabilities served directly, not embedded under another brand. The interface is the product; she is the product.

---

## The bicycle-wheel architecture

```
                    cluesintelligence.com
                     (relocation flagship)
                              │
   cluesxscore.com ──────┐    │    ┌────── clueslondon.com
   (23 mini-apps)        │    │    │        (London tech, current P1)
                         ╲    │    ╱
                          ╲   │   ╱
   clues-property-search ──╲──┼──╱── Heart-Recovery-Calendar
   (Florida real estate)    OLIVIA      (heart-health recovery)
                         (the brain
                       at the hub —
                         ALL DATA
                         PASSES
                       THROUGH HER)
                              │
                    London Transit (TBD)
                    + white-label tenants
                    + olivia.com standalone
```

**Olivia is the hub.** Every spoke routes all data through her — every field, every event, every signal, every API response, every user action. She is not "a chat assistant bolted on top of an app." She is the substrate. The apps are surfaces; she is the intelligence layer underneath.

When an agent writes Olivia code, the question is never *"should this go through Olivia?"* — the answer is always yes. The question is *"which of Olivia's subsystems does this belong to?"*

---

## How this doc is used

Every architectural decision, every commit, every UX choice, every prompt is gauged against the single question at the top. Concretely:

- **Reading order.** This file is the first doc a new Claude session reads after the required system READMEs (`~/CLAUDE.md` + memory files). Then `00_PRODUCT_TRUTH.md` for the detailed product hierarchy, then the technical docs.
- **Commit gate.** If a commit doesn't make Olivia more advanced, more intelligent, more agentic, more user-friendly, or more useful as the Chief Intelligence Officer of these six surfaces, raise it before pushing.
- **Conflict resolution.** Where this file conflicts with any other doc, this file wins and the other doc gets updated to match.

---

## Where to go next

| If you need… | Read |
|---|---|
| The detailed product hierarchy + per-product roles | `00_PRODUCT_TRUTH.md` |
| The universal UI design language (Aurum / Aether tokens, modular workspace) | `01_UI_DESIGN_SYSTEM.md` |
| The auto-enrichment primitive that keeps Olivia in sync with each spoke | `03_BRAIN_ENRICHMENT_ENGINE.md` |
| The flagship cluesintelligence architecture + questionnaire-engine fold-in | `04_CLUESINTELLIGENCE_UNIFICATION_PLAN.md` |
| Implementation context (current state, doc reading order, sacred files) | `BOOTSTRAP.md` |
| Session-by-session build plan (what's done, what's next, what's blocking what) | `BUILD_SEQUENCE.md` |

---

*Founder direction, locked 2026-05-07. Cleaned up by Claude under explicit instruction; semantics unchanged. This file is short on purpose — every line earns its place.*
