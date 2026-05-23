"use client";

/**
 * `LibraryTab` — the right-aside "Library" panel.
 *
 * Reference: `docs/STUDIO_OLIVIA_DESIGN.md` § 2.5 (Library tab spec) +
 * § 8 #4 (Library scoring with reasons) + § 8 #5 (Apply-archetype =
 * regenerate slides).
 *
 * Renders:
 *
 * - **Search input** — filters by name + tag + insight + fit.
 * - **Decks / Plans toggle** — switches between archetype list and
 *   business-plan template list. Counts displayed.
 * - **Relevance line** — `"X archetypes · {Stage}/{Industry} relevance"`.
 * - **Card list** — for each entry: 3-px left bar in category color,
 *   name, category pill, stage chip, `ConsensusDots`, optional `raised`
 *   chip, 2-line clamped insight, big mono score on the right.
 * - **Modal** — clicking a card opens `DeckDetailModal` with the entry's
 *   match reasons + Olivia action.
 *
 * Apply flow: when the user clicks "Apply This Archetype" inside the
 * modal, the parent's `onApplyArchetype` callback fires with the *scored*
 * archetype (preserves `slideCount`/`sections` for the slide generator).
 * Parent owns the slides state — see `src/app/page.tsx` S16 wiring.
 *
 * Scoring is recomputed via `useMemo` whenever `deckConfig` changes
 * (stage / industry inputs from the left rail). For S16 the deck config
 * is supplied as a prop with a defensible default; the left-rail
 * controls land in S17.
 */

import { useMemo, useState } from "react";
import { DeckDetailModal, type Deck } from "@/components/primitives/DeckDetailModal";
import { ConsensusDots } from "@/components/primitives/ConsensusDots";
import { DECK_ARCHETYPES } from "@/lib/studio/archetypes";
import { PLAN_TEMPLATES } from "@/lib/studio/templates";
import {
  scoreDecks,
  scoreTemplates,
  applyLibraryFilter,
  industryToCategory,
} from "@/lib/studio/scoring";
import { getCategoryVisual } from "@/lib/studio/category-colors";
import {
  toDeck,
  type DeckConfig,
  type ScoredArchetype,
  type ScoredTemplate,
} from "@/lib/studio/types";

export interface LibraryTabProps {
  /** Drives the scoring engine. Defaults to a Seed/AI baseline. */
  deckConfig?: DeckConfig;
  /**
   * Called when the user clicks "Apply This Archetype" inside the modal.
   * Parent owns the slides state and runs `generateSlidesForArchetype`.
   */
  onApplyArchetype?: (archetype: ScoredArchetype | ScoredTemplate) => void;
}

const DEFAULT_DECK_CONFIG: DeckConfig = {
  stage: "Seed",
  industry: "AI",
  goal: "Pre-seed Round",
  tone: "Confident & Optimistic",
};

type LibTab = "decks" | "plans";

export function LibraryTab({
  deckConfig = DEFAULT_DECK_CONFIG,
  onApplyArchetype,
}: LibraryTabProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<LibTab>("decks");
  const [selected, setSelected] = useState<ScoredArchetype | ScoredTemplate | null>(null);

  /* ── Scored + filtered lists ─────────────────────────────────────── */

  const filteredDecks = useMemo<ScoredArchetype[]>(() => {
    const filtered = applyLibraryFilter(DECK_ARCHETYPES, { search });
    const cat = industryToCategory(deckConfig.industry);
    const scored = scoreDecks(filtered, deckConfig.stage, cat, 0, {
      london: true,
      ai: deckConfig.industry === "AI",
    });
    return scored;
  }, [deckConfig, search]);

  const filteredTemplates = useMemo<ScoredTemplate[]>(() => {
    const filtered = applyLibraryFilter(PLAN_TEMPLATES, { search });
    const cat = industryToCategory(deckConfig.industry);
    const scored = scoreTemplates(filtered, deckConfig.stage, cat, {
      london: true,
      ai: deckConfig.industry === "AI",
    });
    return scored;
  }, [deckConfig, search]);

  const items = tab === "decks" ? filteredDecks : filteredTemplates;
  const itemNoun = tab === "decks" ? "archetypes" : "templates";

  /* ── Modal data adapter ──────────────────────────────────────────── */

  const selectedDeck: Deck | null = useMemo(() => {
    if (!selected) return null;
    return toDeck(selected, getCategoryVisual(selected.cat).label);
  }, [selected]);

  const handleApply = () => {
    if (selected && onApplyArchetype) {
      onApplyArchetype(selected);
    }
    setSelected(null);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* ── Search ──────────────────────────────────────────────────── */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search archetypes…"
        aria-label="Search the library"
        style={{
          padding: "10px 12px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          color: "var(--fg-primary)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-base)",
        }}
      />

      {/* ── Decks / Plans toggle ───────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Library category"
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          background: "var(--canvas-base)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <ToggleButton
          active={tab === "decks"}
          count={filteredDecks.length}
          label="Decks"
          onClick={() => setTab("decks")}
        />
        <ToggleButton
          active={tab === "plans"}
          count={filteredTemplates.length}
          label="Plans"
          onClick={() => setTab("plans")}
        />
      </div>

      {/* ── Relevance line ──────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        {items.length} {itemNoun} · {deckConfig.stage} / {deckConfig.industry} relevance
      </div>

      {/* ── Card list ──────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        >
          No matches. Try a different search term.
        </div>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 8,
          }}
        >
          {items.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              onClick={() => setSelected(item)}
            />
          ))}
        </ul>
      )}

      {/* ── Modal (portal-rendered) ─────────────────────────────────── */}
      <DeckDetailModal
        deck={selectedDeck}
        onClose={() => setSelected(null)}
        onApply={handleApply}
      />
    </div>
  );
}

/* ── ToggleButton ──────────────────────────────────────────────────── */

interface ToggleButtonProps {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}

function ToggleButton({ active, label, count, onClick }: ToggleButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 12px",
        background: active ? "var(--aurum-mute)" : "transparent",
        border: "none",
        borderRadius: "var(--radius-sm)",
        color: active ? "var(--aurum-primary)" : "var(--fg-tertiary)",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        fontWeight: active ? 600 : 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition:
          "color var(--duration-micro) var(--ease-out-quart), background var(--duration-micro) var(--ease-out-quart)",
      }}
    >
      {label} <span style={{ opacity: 0.7 }}>({count})</span>
    </button>
  );
}

/* ── LibraryCard ───────────────────────────────────────────────────── */

interface LibraryCardProps {
  item: ScoredArchetype | ScoredTemplate;
  onClick: () => void;
}

function LibraryCard({ item, onClick }: LibraryCardProps) {
  const visual = getCategoryVisual(item.cat);
  const stageLabel = item.stage[0] === "Any" ? "Any stage" : item.stage.join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${item.name} — ${item.score} relevance`}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px 12px 16px",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          color: "var(--fg-primary)",
          cursor: "pointer",
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          transition:
            "border-color var(--duration-micro) var(--ease-out-quart), background var(--duration-micro) var(--ease-out-quart)",
        }}
      >
        {/* 3-px category bar */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            background: visual.token,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />

        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          {/* Name */}
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-md)",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--fg-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </div>

          {/* Category + stage row */}
          <div
            style={{
              display: "inline-flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--fg-tertiary)",
            }}
          >
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "var(--radius-sm)",
                background: visual.mute,
                color: visual.token,
                fontWeight: 600,
              }}
            >
              {visual.label}
            </span>
            <span aria-hidden="true">·</span>
            <span>{stageLabel}</span>
            {item.raised && (
              <>
                <span aria-hidden="true">·</span>
                <span style={{ color: "var(--mint-up)" }}>{item.raised}</span>
              </>
            )}
          </div>

          {/* Consensus dots */}
          <ConsensusDots n={item.consensus} />

          {/* Insight, 2-line clamp */}
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--fg-secondary)",
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.insight}
          </p>
        </div>

        {/* Big mono score */}
        <div
          aria-hidden="true"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "flex-start",
            paddingTop: 2,
          }}
        >
          <span
            className="tabular-nums"
            style={{
              fontFamily: "var(--font-mono)",
              fontFeatureSettings: '"tnum" 1, "lnum" 1',
              fontSize: "var(--text-xl)",
              fontWeight: 700,
              color: "var(--aurum-primary)",
              lineHeight: 1,
            }}
          >
            {item.score}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--fg-tertiary)",
              marginTop: 4,
            }}
          >
            pt
          </span>
        </div>
      </button>
    </li>
  );
}
