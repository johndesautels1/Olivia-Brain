"use client";

/**
 * `IntakeForm` — top-level Quantara founder-intake orchestrator.
 *
 * Mounts the canonical `WorkspaceShell` (Track C Session 14) with the
 * three-pane layout from `docs/01_UI_DESIGN_SYSTEM.md` § 5:
 *   - **Header.** AvatarOrb + QUANTARA wordmark + crumb + score chips
 *     ("FIELD N/56", "COMPLETE %") + Save action.
 *   - **RailLeft.** `IntakeSidebar` — section nav, completeness card,
 *     gap-analysis CTA.
 *   - **Center.** Hero block + 12 `IntakeSectionBlock`s (one per section)
 *     + final CTA.
 *   - **Inspector.** Two tabs: Olivia (informational placeholder) +
 *     Verdict (live valuation preview).
 *
 * # State
 *
 * Holds `values: QuantaraValues` (partial, every field optional —
 * partial completion is a first-class state per Q1 schema), the active
 * section id (drives the rail's `aria-current`), the inspector tab,
 * `companyName` (required for `ValuationSubject.companyName`), and a
 * save-state machine (`idle | saving | saved | error`).
 *
 * # Save flow
 *
 * `POST /api/founder-intake` with `{ companyName, values, subjectId? }`.
 * The route uses Q1's `mergeQuantaraIntoSubject` helper so partial
 * saves don't clobber unrelated JSON-column subkeys. The API returns
 * the (possibly newly-created) `subjectId` and the persisted
 * `completenessScore`; we update local state with both so subsequent
 * saves go to the same subject.
 *
 * # Section navigation
 *
 * Click in the rail → `scrollIntoView({ behavior: "smooth" })` on the
 * target `#section-${id}`, then update `activeSection`. An
 * `IntersectionObserver` keeps the active marker in sync as the
 * founder scrolls manually.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  Center,
  Header,
  Inspector,
  RailLeft,
  WorkspaceShell,
  type InspectorTab,
} from "@/components/workspace";
import {
  QUANTARA_SECTIONS_BY_ID,
  QUANTARA_VERTICALS,
  getSectionOrderForRound,
  type QuantaraFieldId,
  type QuantaraSectionId,
  type QuantaraValues,
  type SupplementaryFieldId,
  type SupplementaryValues,
  type SupplementaryValuesForRound,
  type TargetRoundType,
  type VerticalFieldId,
  type VerticalId,
  type VerticalValues,
  type VerticalValuesForVertical,
} from "@/lib/quantara";
import type {
  AutoFillSummary,
  QuantaraSuggestion,
} from "@/lib/quantara/auto-fill";
import {
  detectDiscrepancies,
  type QuantaraDiscrepancyGap,
} from "@/lib/quantara/discrepancy";

import { overallCompleteness } from "./completeness";
import { IntakeOliviaPanel } from "./IntakeOliviaPanel";
import { IntakeSectionBlock } from "./IntakeSectionBlock";
import { IntakeSidebar, type AutoFillState } from "./IntakeSidebar";
import { IntakeSupplementaryBlock } from "./IntakeSupplementaryBlock";
import { IntakeVerdictPanel } from "./IntakeVerdictPanel";
import { IntakeVerticalBlock } from "./IntakeVerticalBlock";

export interface IntakeFormProps {
  /** Initial values restored from a previously-saved subject. */
  initialValues?: QuantaraValues;
  /** Initial company name (when resuming an existing subject). */
  initialCompanyName?: string;
  /** Subject id of an in-progress save (resume flow). */
  initialSubjectId?: string;
  /**
   * Q5 — initial supplementary values restored from a previous save.
   * Multi-round shape: switching `f23 — Target Round Type` between rounds
   * preserves prior entries.
   */
  initialSupplementaryValues?: SupplementaryValues;
  /**
   * Q6 — initial vertical (sector) restored from a previous save.
   * Persisted to `ValuationSubject.sector`.
   */
  initialVertical?: VerticalId;
  /**
   * Q6 — initial vertical-specific schedule values restored from a
   * previous save. Multi-vertical shape: switching the founder's
   * vertical preserves prior entries (parity with Q5 supplementary).
   */
  initialVerticalValues?: VerticalValues;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

interface SaveResponse {
  ok: boolean;
  subjectId: string;
  completenessScore: number;
  fieldsFilled: number;
  fieldsTotal: number;
  error?: string;
}

const SAVE_API_PATH = "/api/founder-intake";
const AUTO_FILL_API_PATH = "/api/founder-intake/auto-fill";

export function IntakeForm({
  initialValues,
  initialCompanyName,
  initialSubjectId,
  initialSupplementaryValues,
  initialVertical,
  initialVerticalValues,
}: IntakeFormProps) {
  const [values, setValues] = useState<QuantaraValues>(initialValues ?? {});
  const [companyName, setCompanyName] = useState<string>(
    initialCompanyName ?? "",
  );
  const [subjectId, setSubjectId] = useState<string | undefined>(
    initialSubjectId,
  );
  /**
   * Q5 — multi-round supplementary values map. Keyed by `TargetRoundType`,
   * then by `SupplementaryFieldId`. Switching `f23` swaps which slot is
   * visible; we never delete entries from inactive rounds, so a founder
   * can switch back and forth without losing work.
   */
  const [supplementaryValues, setSupplementaryValues] =
    useState<SupplementaryValues>(initialSupplementaryValues ?? {});
  /**
   * Q6 — active vertical (industry / sector). Drives the
   * `IntakeVerticalBlock` mount + which schedule renders.
   * Persisted on save to `ValuationSubject.sector`.
   */
  const [vertical, setVertical] = useState<VerticalId | undefined>(
    initialVertical,
  );
  /**
   * Q6 — multi-vertical values map. Switching verticals swaps which
   * slot is visible; prior entries persist (parity with supplementary).
   */
  const [verticalValues, setVerticalValues] = useState<VerticalValues>(
    initialVerticalValues ?? {},
  );
  const [activeSection, setActiveSection] = useState<QuantaraSectionId>(
    "core_financials",
  );
  const [inspectorTab, setInspectorTab] = useState<string>("olivia");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [suggestions, setSuggestions] = useState<
    ReadonlyMap<QuantaraFieldId, QuantaraSuggestion>
  >(new Map());
  /**
   * Q4 — persistent API references. Populated once when auto-fill
   * runs; never dismissed by accept/edit. Drives the discrepancy
   * cascade via `detectDiscrepancies`.
   */
  const [apiReferenceValues, setApiReferenceValues] = useState<
    ReadonlyMap<QuantaraFieldId, QuantaraSuggestion>
  >(new Map());
  /**
   * Q4 — fields where the founder explicitly clicked "Keep mine" on
   * the discrepancy chip. Filtered out of the displayed gap map so
   * the chip stays dismissed for the rest of the session.
   */
  const [dismissedDiscrepancies, setDismissedDiscrepancies] = useState<
    ReadonlySet<QuantaraFieldId>
  >(new Set());
  const [autoFillState, setAutoFillState] = useState<AutoFillState>({
    kind: "idle",
  });

  const overall = useMemo(() => overallCompleteness(values), [values]);

  /**
   * Q5 — active target round type. Drives section reorder + which
   * supplementary block mounts. Coerced from `values.f23` since the
   * canonical schema stores it as a typed enum string.
   */
  const targetRoundType: TargetRoundType | undefined = useMemo(() => {
    const v = values.f23;
    if (typeof v !== "string") return undefined;
    /* No need to validate against the enum here — `IntakeField` only
       lets the founder pick valid options (the LTM mockup's
       `<select id="f23">`). Defensive cast is sufficient. */
    return v as TargetRoundType;
  }, [values.f23]);

  /**
   * Q5 — section render order. Returns canonical when `targetRoundType`
   * is undefined; reorders by relevance otherwise. Pure derivation —
   * memoised on the round type.
   */
  const sectionOrder = useMemo(
    () => getSectionOrderForRound(targetRoundType),
    [targetRoundType],
  );

  /** Q5 — supplementary slot for the active round (empty when none). */
  const activeSupplementaryValues: SupplementaryValuesForRound = useMemo(() => {
    if (!targetRoundType) return {};
    return supplementaryValues[targetRoundType] ?? {};
  }, [supplementaryValues, targetRoundType]);

  /** Q6 — vertical schedule slot for the active vertical (empty when generic / unset). */
  const activeVerticalValues: VerticalValuesForVertical = useMemo(() => {
    if (!vertical) return {};
    return verticalValues[vertical] ?? {};
  }, [verticalValues, vertical]);

  /**
   * Q4 — discrepancy detection. Runs the V5 truth-score-agent (5%
   * match threshold + per-field optimistic/pessimistic directionality)
   * and filters out fields the founder has explicitly dismissed.
   * Pure derived state — no side-effects.
   */
  const discrepancies = useMemo<
    ReadonlyMap<QuantaraFieldId, QuantaraDiscrepancyGap>
  >(() => {
    if (apiReferenceValues.size === 0) return new Map();
    const result = detectDiscrepancies(values, apiReferenceValues);
    if (dismissedDiscrepancies.size === 0) return result.gaps;
    const filtered = new Map<QuantaraFieldId, QuantaraDiscrepancyGap>();
    for (const [id, gap] of result.gaps) {
      if (!dismissedDiscrepancies.has(id)) filtered.set(id, gap);
    }
    return filtered;
  }, [values, apiReferenceValues, dismissedDiscrepancies]);

  const dismissSuggestion = useCallback((fieldId: QuantaraFieldId) => {
    setSuggestions((prev) => {
      if (!prev.has(fieldId)) return prev;
      const next = new Map(prev);
      next.delete(fieldId);
      return next;
    });
  }, []);

  const handleChangeField = useCallback(
    (fieldId: QuantaraFieldId, next: unknown) => {
      setValues((prev) => {
        if (next === undefined) {
          if (!(fieldId in prev)) return prev;
          const copy = { ...prev };
          delete copy[fieldId];
          return copy;
        }
        return { ...prev, [fieldId]: next };
      });
      /* Manual edit dismisses any pending suggestion for the field —
         the founder's typed value wins. */
      dismissSuggestion(fieldId);
    },
    [dismissSuggestion],
  );

  /**
   * Q6 — update one vertical-schedule field. Writes into
   * `verticalValues[vertical][fieldId]`. No-op when no non-generic
   * vertical is selected (the vertical block is hidden in that state).
   */
  const handleChangeVertical = useCallback(
    (fieldId: VerticalFieldId, next: unknown) => {
      if (!vertical) return;
      setVerticalValues((prev) => {
        const prevForVertical: VerticalValuesForVertical = prev[vertical] ?? {};
        const nextForVertical: VerticalValuesForVertical = { ...prevForVertical };
        if (next === undefined) {
          delete nextForVertical[fieldId];
        } else {
          nextForVertical[fieldId] = next;
        }
        return { ...prev, [vertical]: nextForVertical };
      });
    },
    [vertical],
  );

  /**
   * Q5 — update one supplementary field for the active round type.
   * Writes into `supplementaryValues[targetRoundType][fieldId]`. No-op
   * when no round type is selected (the supplementary block is hidden
   * in that state).
   */
  const handleChangeSupplementary = useCallback(
    (fieldId: SupplementaryFieldId, next: unknown) => {
      if (!targetRoundType) return;
      setSupplementaryValues((prev) => {
        const prevForRound: SupplementaryValuesForRound =
          prev[targetRoundType] ?? {};
        const nextForRound: SupplementaryValuesForRound = { ...prevForRound };
        if (next === undefined) {
          delete nextForRound[fieldId];
        } else {
          nextForRound[fieldId] = next;
        }
        return { ...prev, [targetRoundType]: nextForRound };
      });
    },
    [targetRoundType],
  );

  const handleAcceptSuggestion = useCallback(
    (fieldId: QuantaraFieldId) => {
      const suggestion = suggestions.get(fieldId);
      if (!suggestion) return;
      setValues((prev) => ({ ...prev, [fieldId]: suggestion.value }));
      dismissSuggestion(fieldId);
    },
    [suggestions, dismissSuggestion],
  );

  const handleRejectSuggestion = useCallback(
    (fieldId: QuantaraFieldId) => {
      dismissSuggestion(fieldId);
    },
    [dismissSuggestion],
  );

  /**
   * Q4 — "Trust API" reconcile. Snap the founder's value to the
   * stored API reference. Discrepancy disappears because gap → 0.
   * Also clears the dismissedDiscrepancies entry in case the founder
   * had previously clicked "Keep mine" on the same field.
   */
  const handleTrustReference = useCallback(
    (fieldId: QuantaraFieldId) => {
      const ref = apiReferenceValues.get(fieldId);
      if (!ref) return;
      setValues((prev) => ({ ...prev, [fieldId]: ref.value }));
      setDismissedDiscrepancies((prev) => {
        if (!prev.has(fieldId)) return prev;
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
    },
    [apiReferenceValues],
  );

  /** Q4 — "Keep mine" — dismiss the discrepancy chip without changing
   *  the value. The chip stays gone for the rest of the session. */
  const handleDismissDiscrepancy = useCallback(
    (fieldId: QuantaraFieldId) => {
      setDismissedDiscrepancies((prev) => {
        if (prev.has(fieldId)) return prev;
        const next = new Set(prev);
        next.add(fieldId);
        return next;
      });
    },
    [],
  );

  const handleTriggerAutoFill = useCallback(async () => {
    setAutoFillState({ kind: "running" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(AUTO_FILL_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: {
            companyName: companyName.trim() || undefined,
            includeDefaults: true,
          },
        }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as Partial<
        AutoFillSummary & { ok: boolean; error?: string }
      >;
      if (!res.ok || !data.ok || !Array.isArray(data.suggestions)) {
        const msg = (data.error as string) || `Auto-fill failed (HTTP ${res.status}).`;
        setAutoFillState({ kind: "error", message: msg });
        return;
      }
      const map = new Map<QuantaraFieldId, QuantaraSuggestion>();
      for (const s of data.suggestions) {
        map.set(s.fieldId, s);
      }
      setSuggestions(map);
      /* Q4: mirror the suggestion set into the persistent API
         reference map. Stays after accept/reject so the truth-score
         cascade has data to compare against. Re-running auto-fill
         overwrites previous references with fresher numbers. */
      setApiReferenceValues(new Map(map));
      /* New auto-fill clears prior dismissals so the chip can
         reappear if the new API data still disagrees. */
      setDismissedDiscrepancies(new Set());
      setAutoFillState({ kind: "ready", pendingCount: map.size });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error during auto-fill.";
      setAutoFillState({ kind: "error", message });
    } finally {
      clearTimeout(timeout);
    }
  }, [companyName]);

  const handleSelectSection = useCallback((id: QuantaraSectionId) => {
    setActiveSection(id);
    if (typeof document === "undefined") return;
    const el = document.getElementById(`section-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /* IntersectionObserver — keep `activeSection` in sync with manual
     scrolling. Only one section is "active" at a time: the topmost
     visible. */
  const sectionRefs = useRef<Map<QuantaraSectionId, HTMLElement>>(new Map());
  const registerSectionRef = useCallback(
    (id: QuantaraSectionId) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(id, el);
      else sectionRefs.current.delete(id);
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        const topmost = visible[0];
        if (topmost) {
          const id = (topmost.target as HTMLElement).dataset.sectionId as
            | QuantaraSectionId
            | undefined;
          if (id) setActiveSection(id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25] },
    );

    for (const el of sectionRefs.current.values()) {
      observer.observe(el);
    }
    return () => observer.disconnect();
    /* Re-observe on order change so reorder doesn't strand the observer
       on stale references (Q5). */
  }, [sectionOrder]);

  const handleSave = useCallback(async () => {
    if (!companyName.trim()) {
      setSaveState({
        kind: "error",
        message: "Company name is required before saving.",
      });
      return;
    }
    setSaveState({ kind: "saving" });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(SAVE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          values,
          /* Q5 — full multi-round supplementary map. Server merges per-round
             so partial saves never clobber other rounds' entries. */
          supplementaryValues,
          /* Q6 — vertical (writes to ValuationSubject.sector) + the
             multi-vertical schedule values map. Same per-key merge
             behavior on the server. */
          vertical,
          verticalValues,
          subjectId,
        }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as Partial<SaveResponse>;
      if (!res.ok || !data.ok || !data.subjectId) {
        const msg =
          (data && (data.error as string)) ||
          `Save failed (HTTP ${res.status}).`;
        setSaveState({ kind: "error", message: msg });
        return;
      }
      setSubjectId(data.subjectId);
      setSaveState({ kind: "saved", at: Date.now() });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error during save.";
      setSaveState({ kind: "error", message });
    } finally {
      clearTimeout(timeout);
    }
  }, [
    companyName,
    subjectId,
    supplementaryValues,
    values,
    vertical,
    verticalValues,
  ]);

  /* Reset the "saved" toast 4s after it lands, mirroring LTM mockup. */
  useEffect(() => {
    if (saveState.kind !== "saved") return;
    const t = setTimeout(() => {
      setSaveState({ kind: "idle" });
    }, 4000);
    return () => clearTimeout(t);
  }, [saveState]);

  /* Keep autoFillState's pending count in sync as the founder
     accepts/rejects suggestions. Drop back to idle when zero remain. */
  useEffect(() => {
    if (autoFillState.kind !== "ready") return;
    if (suggestions.size === 0) {
      setAutoFillState({ kind: "idle" });
    } else if (autoFillState.pendingCount !== suggestions.size) {
      setAutoFillState({ kind: "ready", pendingCount: suggestions.size });
    }
  }, [autoFillState, suggestions.size]);

  const inspectorTabs: InspectorTab[] = useMemo(
    () => [
      {
        id: "olivia",
        label: "Olivia",
        content: (
          <IntakeOliviaPanel
            values={values}
            activeSection={activeSection}
            state="idle"
          />
        ),
      },
      {
        id: "verdict",
        label: "Verdict",
        content: <IntakeVerdictPanel values={values} overall={overall} />,
      },
    ],
    [activeSection, overall, values],
  );

  const saveLabel =
    saveState.kind === "saving"
      ? "Saving…"
      : saveState.kind === "saved"
        ? "Saved ✓"
        : "Save";

  const headerScoreChips = [
    {
      label: "FIELD",
      value: `${overall.fieldsFilled}/${overall.fieldsTotal}`,
    },
    { label: "COMPLETE", value: `${overall.percent}%` },
  ];

  const headerActions = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {saveState.kind === "error" && (
        <span
          role="alert"
          style={{
            padding: "4px 10px",
            background: "var(--coral-down-mute)",
            border: "1px solid var(--coral-down)",
            borderRadius: "var(--radius-md)",
            color: "var(--coral-down)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            fontWeight: 500,
            maxWidth: 320,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {saveState.message}
        </span>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saveState.kind === "saving"}
        style={{
          padding: "8px 16px",
          background:
            saveState.kind === "saved"
              ? "var(--mint-up-mute)"
              : "var(--aurum-primary)",
          color:
            saveState.kind === "saved"
              ? "var(--mint-up)"
              : "var(--fg-on-accent)",
          border:
            saveState.kind === "saved"
              ? "1px solid var(--mint-up)"
              : "1px solid var(--aurum-primary)",
          borderRadius: "var(--radius-md)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          cursor: saveState.kind === "saving" ? "not-allowed" : "pointer",
          opacity: saveState.kind === "saving" ? 0.6 : 1,
          touchAction: "manipulation",
          transition:
            "background var(--duration-default) var(--ease-out-quart), color var(--duration-default) var(--ease-out-quart)",
        }}
      >
        {saveLabel}
      </button>
    </div>
  );

  return (
    <WorkspaceShell
      header={
        <Header
          wordmark="QUANTARA"
          crumb={["Founder Intake"]}
          scoreChips={headerScoreChips}
          actions={headerActions}
        />
      }
      rail={
        <RailLeft expanded label="Founder intake sections">
          <IntakeSidebar
            values={values}
            overall={overall}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
            onTriggerOliviaAutofill={handleTriggerAutoFill}
            autoFillState={autoFillState}
            suggestionCount={suggestions.size}
          />
        </RailLeft>
      }
      center={
        <Center>
          <FormHero
            companyName={companyName}
            onCompanyNameChange={setCompanyName}
            vertical={vertical}
            onVerticalChange={setVertical}
          />

          {sectionOrder.map((id) => {
            const s = QUANTARA_SECTIONS_BY_ID[id];
            return (
              <div key={s.id} ref={registerSectionRef(s.id)}>
                <IntakeSectionBlock
                  sectionId={s.id}
                  values={values}
                  onChange={handleChangeField}
                  suggestions={suggestions}
                  onAcceptSuggestion={handleAcceptSuggestion}
                  onRejectSuggestion={handleRejectSuggestion}
                  discrepancies={discrepancies}
                  onTrustReference={handleTrustReference}
                  onDismissDiscrepancy={handleDismissDiscrepancy}
                />
              </div>
            );
          })}

          {/* Q5 — round-specific supplementary block. Mounts only when a
              target round type is selected. Persists per-round so a
              founder switching between rounds keeps their work. */}
          <IntakeSupplementaryBlock
            roundType={targetRoundType}
            values={activeSupplementaryValues}
            onChange={handleChangeSupplementary}
          />

          {/* Q6 — vertical-specific schedule. Mounts only when a
              non-generic vertical is selected (`generic` shows nothing
              by design). Persists per-vertical for switch-back. */}
          <IntakeVerticalBlock
            verticalId={vertical}
            values={activeVerticalValues}
            onChange={handleChangeVertical}
          />

          <FinalCTA overall={overall} />
        </Center>
      }
      inspector={
        <Inspector
          tabs={inspectorTabs}
          activeTabId={inspectorTab}
          onTabChange={setInspectorTab}
        />
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// Hero block — confidential eyebrow, page title, CTA pair, name input.
// ─────────────────────────────────────────────────────────────────────

interface FormHeroProps {
  companyName: string;
  onCompanyNameChange: (next: string) => void;
  /** Q6 — active vertical (sector). Drives `IntakeVerticalBlock`. */
  vertical: VerticalId | undefined;
  onVerticalChange: (next: VerticalId | undefined) => void;
}

function FormHero({
  companyName,
  onCompanyNameChange,
  vertical,
  onVerticalChange,
}: FormHeroProps) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 14px",
          background: "var(--amber-warn-mute)",
          border: "1px solid var(--amber-warn)",
          borderRadius: "var(--radius-full)",
          marginBottom: 16,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "var(--radius-full)",
            background: "var(--amber-warn)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            fontWeight: 600,
            color: "var(--amber-warn)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Confidential · Founder only
        </span>
      </div>

      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-4xl)",
          fontWeight: 600,
          color: "var(--fg-primary)",
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
        }}
      >
        Valuation Data Profile
      </h1>
      <p
        style={{
          maxWidth: 560,
          margin: "12px 0 0",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-md)",
          color: "var(--fg-tertiary)",
          lineHeight: 1.5,
        }}
      >
        Provide these 56 founder-verified metrics. Olivia uses them to generate
        a precise valuation and match you to the right capital partners across
        angel → Series B → strategic buyout.
      </p>

      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 280px)",
          gap: 16,
          maxWidth: 800,
        }}
      >
        <div>
          <label
            htmlFor="quantara-company-name"
            style={{
              display: "block",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: "var(--fg-secondary)",
              marginBottom: 6,
            }}
          >
            Company name
            <span
              aria-hidden="true"
              style={{ color: "var(--coral-down)", marginLeft: 4 }}
            >
              *
            </span>
          </label>
          <input
            id="quantara-company-name"
            type="text"
            value={companyName}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onCompanyNameChange(e.target.value)
            }
            aria-required="true"
            placeholder="e.g. Quantara Ltd"
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "var(--canvas-recess)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              color: "var(--fg-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
              fontWeight: 500,
              outline: "none",
              touchAction: "manipulation",
            }}
          />
        </div>

        {/* Q6 — vertical selector. Drives the vertical-schedule block.
            "Generic / Other" hides the block (no schedule). */}
        <div>
          <label
            htmlFor="quantara-vertical"
            style={{
              display: "block",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: "var(--fg-secondary)",
              marginBottom: 6,
            }}
          >
            Vertical
          </label>
          <select
            id="quantara-vertical"
            value={vertical ?? ""}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              const v = e.target.value;
              onVerticalChange(v === "" ? undefined : (v as VerticalId));
            }}
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "var(--canvas-recess)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
              color: "var(--fg-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-md)",
              fontWeight: 500,
              outline: "none",
              touchAction: "manipulation",
            }}
          >
            <option value="">Select vertical…</option>
            {QUANTARA_VERTICALS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Final CTA block — gates "Run full valuation" behind 80% completion.
// ─────────────────────────────────────────────────────────────────────

interface FinalCTAProps {
  overall: ReturnType<typeof overallCompleteness>;
}

function FinalCTA({ overall }: FinalCTAProps) {
  const ready = overall.percent >= 80;
  return (
    <section
      style={{
        marginTop: 32,
        padding: 32,
        background: "var(--surface-1)",
        border: "1px solid var(--border-aurum)",
        borderRadius: "var(--radius-2xl)",
        backgroundImage:
          "linear-gradient(135deg, var(--aurum-mute) 0%, transparent 70%)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            fontWeight: 600,
            color: "var(--fg-primary)",
            letterSpacing: "-0.02em",
          }}
        >
          {ready
            ? "Ready for the full valuation"
            : "Keep going — more data, better verdict"}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-sm)",
            color: "var(--fg-tertiary)",
            lineHeight: 1.55,
          }}
        >
          {ready
            ? "Olivia has enough signal to run the valuation engine and surface the best 40–60 capital partners for your round."
            : `Currently ${overall.percent}% complete. The full engine unlocks at ≥ 80% to keep verdict confidence high.`}
        </div>
      </div>
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Wired in Track V workbench (already shipped) — link from this CTA lands in Q3."
        style={{
          alignSelf: "flex-start",
          padding: "14px 32px",
          background: ready ? "var(--aurum-primary)" : "var(--surface-2)",
          color: ready ? "var(--fg-on-accent)" : "var(--fg-disabled)",
          border: ready
            ? "1px solid var(--aurum-primary)"
            : "1px solid var(--border-default)",
          borderRadius: "var(--radius-full)",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-sm)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          cursor: "not-allowed",
          opacity: 0.85,
        }}
      >
        Run full valuation + matches
      </button>
    </section>
  );
}
