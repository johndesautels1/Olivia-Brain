"use client";

/**
 * `/` — Olivia Brain root surface (Studio Olivia workspace).
 *
 * Three-region workspace shell per `docs/01_UI_DESIGN_SYSTEM.md` § 5.1.
 * Center pane composes the home hero (Track U) — orb + composer + ticker
 * + KPI tiles + recent work. Inspector hosts Olivia chat (default tab)
 * + Artifacts + Library + Themes + Audit. Header carries live score
 * chips (Bloomberg-style) and command palette entry.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Center,
  Header,
  Inspector,
  RailLeft,
  WorkspaceShell,
  type InspectorTab,
} from "@/components/workspace";
import { HomeCenter } from "@/components/home";
import { LibraryTab } from "@/components/studio/LibraryTab";
import { SectionNav } from "@/components/studio/SectionNav";
import { DocumentTree } from "@/components/studio/DocumentTree";
import { FrameworksPanel } from "@/components/studio/FrameworksPanel";
import { PlanSectionNav } from "@/components/studio/PlanSectionNav";
import { OliviaChatTab } from "@/components/studio/OliviaChatTab";
import { PreviewTab } from "@/components/studio/PreviewTab";
import { ThemesTab } from "@/components/studio/ThemesTab";
import { AuditTab } from "@/components/studio/AuditTab";
import { generateSlidesForArchetype } from "@/lib/studio/slides";
import { TOTAL_DOC_COUNT } from "@/lib/studio/doc-categories";
import { PLAN_SECTIONS } from "@/lib/studio/plan-sections";
import { DEFAULT_THEME, THEMES, type ThemeKey } from "@/lib/studio/themes";
import { pushAuditEntry, type AuditEntry } from "@/lib/studio/audit";
import {
  STORAGE_KEY,
  type WorkspaceSnapshot,
} from "@/lib/studio/persistence";
import { useAutoSave, useKeyboardNav } from "@/hooks";
import type {
  ActiveDoc,
  NavSection,
  ScoredArchetype,
  ScoredTemplate,
  Slide,
} from "@/lib/studio/types";

const RAIL_LINKS: { href: string; label: string; description: string }[] = [
  {
    href: "/calendar",
    label: "Calendar",
    description: "Personal calendar + voice scheduling",
  },
  {
    href: "/map",
    label: "Map",
    description: "London tech districts (3D Google Maps + Mapbox)",
  },
  {
    href: "/test-avatar",
    label: "Live Avatar",
    description: "End-to-end LiveAvatar + cascade smoke flow",
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Internal admin surfaces",
  },
  {
    href: "/admin/phase1",
    label: "Phase-1 Status",
    description: "Phase-1 readiness dashboard",
  },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("library");
  const [avatarPulse, setAvatarPulse] = useState(false);

  /* Minimal slides state for the Library Apply flow (S16). The full
   * slide-editor surface lands in S18; here we just hold what `Apply
   * This Archetype` regenerated, plus log a one-line message in
   * `appliedSummary` so the user has a confirmation breadcrumb. */
  const [slides, setSlides] = useState<Slide[]>([]);
  const [appliedSummary, setAppliedSummary] = useState<string | null>(null);

  /* Section navigation state (S17). `navSection` drives the left-rail
   * content panel + the center-pane view (center-pane wiring lands
   * post-Track-V; for S17 the rail content is the deliverable). */
  const [navSection, setNavSection] = useState<NavSection>("pitch");
  const [activeFrameworks, setActiveFrameworks] = useState<Set<number>>(
    () => new Set(),
  );
  const [activeDoc, setActiveDoc] = useState<ActiveDoc | null>(null);
  const [activePlanIdx, setActivePlanIdx] = useState<number>(0);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    () => new Set(),
  );
  const [planConfidences] = useState<number[]>(
    () => Array.from<number>({ length: PLAN_SECTIONS.length }).fill(0),
  );
  const [docCompletions] = useState<Record<string, number>>(() => ({}));

  /* S18 — audit log + active theme. */
  const [auditLog, setAuditLog] = useState<readonly AuditEntry[]>([]);
  const [activeTheme, setActiveTheme] = useState<ThemeKey>(DEFAULT_THEME);

  /* S19 — selected slide for J/K nav. */
  const [selectedSlide, setSelectedSlide] = useState<number>(0);

  /* S19 — one-shot restore via useAutoSave's onRestore. Validates the
   * version + shape before applying to avoid feeding stale schemas back
   * into state. */
  const handleRestore = useCallback((snap: WorkspaceSnapshot) => {
    if (snap.version !== 1) return;
    setNavSection(snap.navSection);
    setSlides(snap.slides);
    setActivePlanIdx(snap.activePlanIdx);
    setActiveFrameworks(new Set(snap.activeFrameworks ?? []));
    setActiveDoc(snap.activeDoc);
    setExpandedCats(new Set(snap.expandedCats ?? []));
    setActiveTheme(snap.activeTheme);
    setAuditLog(snap.auditLog ?? []);
  }, []);

  const { save: saveAutosave, isRestored } = useAutoSave<WorkspaceSnapshot>({
    key: STORAGE_KEY,
    debounceMs: 1500,
    onRestore: handleRestore,
  });

  /* S19 — debounced autosave: build the snapshot + push it to the hook's
   * debouncer whenever any of its inputs change. The hook itself batches
   * per `debounceMs`. */
  const autosaveSnapshot = useMemo<WorkspaceSnapshot>(
    () => ({
      version: 1,
      navSection,
      slides,
      activePlanIdx,
      activeFrameworks: Array.from(activeFrameworks),
      activeDoc,
      expandedCats: Array.from(expandedCats),
      activeTheme,
      auditLog: Array.from(auditLog),
    }),
    [
      navSection,
      slides,
      activePlanIdx,
      activeFrameworks,
      activeDoc,
      expandedCats,
      activeTheme,
      auditLog,
    ],
  );
  useEffect(() => {
    /* Skip autosave until the initial restore has resolved — otherwise
     * we overwrite real persisted data with seed values on first paint. */
    if (!isRestored) return;
    saveAutosave(autosaveSnapshot);
  }, [autosaveSnapshot, isRestored, saveAutosave]);

  /* S19 — apply active theme by writing override tokens to <html>.
   * Theme tokens are CSS-var overrides; default tokens stay as the
   * fallback when a theme doesn't set a particular var. */
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const t = THEMES[activeTheme];
    /* Direct CSS-var overrides — see tokens.css for the canonical set. */
    root.style.setProperty("--studio-theme-accent", t.accent);
    root.style.setProperty("--studio-theme-primary", t.primary);
    root.style.setProperty("--studio-theme-surface", t.surface);
    root.dataset.studioTheme = activeTheme;
  }, [activeTheme]);

  const pushAudit = useCallback((text: string) => {
    setAuditLog((prev) => pushAuditEntry(prev, text));
  }, []);

  const handleApplyArchetype = (
    archetype: ScoredArchetype | ScoredTemplate,
  ) => {
    const fresh = generateSlidesForArchetype(archetype);
    setSlides(fresh);
    setAppliedSummary(
      `Applied "${archetype.name}" — ${fresh.length} slides regenerated. Slide editor lands in a future session.`,
    );
    pushAudit(`Applied archetype "${archetype.name}" → ${fresh.length} slides`);
  };

  const toggleFramework = useCallback(
    (id: number) => {
      setActiveFrameworks((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      pushAudit(`Toggled framework #${id}`);
    },
    [pushAudit],
  );

  const toggleCategory = useCallback(
    (key: string) => {
      setExpandedCats((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [],
  );

  const handleSelectDoc = useCallback(
    (category: string, doc: string) => {
      setActiveDoc({ category, doc });
      pushAudit(`Opened doc: ${category} → ${doc}`);
    },
    [pushAudit],
  );

  const handleNavSection = useCallback(
    (section: NavSection) => {
      setNavSection(section);
      pushAudit(`Switched section to ${section}`);
    },
    [pushAudit],
  );

  const handlePlanSelect = useCallback(
    (idx: number) => {
      setActivePlanIdx(idx);
      pushAudit(`Selected plan section: ${PLAN_SECTIONS[idx]?.title ?? `#${idx}`}`);
    },
    [pushAudit],
  );

  const handleThemeSelect = useCallback(
    (key: ThemeKey) => {
      setActiveTheme(key);
      pushAudit(`Theme changed to ${key}`);
    },
    [pushAudit],
  );

  const clearAuditLog = useCallback(() => {
    setAuditLog([]);
  }, []);

  /* S19 — global J/K keyboard nav. Routes to slides in pitch mode,
   * plan sections in plan mode. Skips when typing in inputs (the hook
   * handles that). */
  const handleNext = useCallback(() => {
    if (navSection === "pitch" && slides.length > 0) {
      setSelectedSlide((idx) => Math.min(slides.length - 1, idx + 1));
    } else if (navSection === "plan") {
      handlePlanSelect(Math.min(PLAN_SECTIONS.length - 1, activePlanIdx + 1));
    }
  }, [navSection, slides.length, activePlanIdx, handlePlanSelect]);

  const handlePrev = useCallback(() => {
    if (navSection === "pitch" && slides.length > 0) {
      setSelectedSlide((idx) => Math.max(0, idx - 1));
    } else if (navSection === "plan") {
      handlePlanSelect(Math.max(0, activePlanIdx - 1));
    }
  }, [navSection, slides.length, activePlanIdx, handlePlanSelect]);

  useKeyboardNav({ onNext: handleNext, onPrev: handlePrev });

  const inspectorTabs = useMemo<InspectorTab[]>(
    () => [
      {
        id: "olivia",
        label: "Olivia",
        content: <OliviaChatTab onAuditEntry={pushAudit} />,
      },
      {
        id: "library",
        label: "Library",
        content: <LibraryTab onApplyArchetype={handleApplyArchetype} />,
      },
      {
        id: "preview",
        label: "Preview",
        content: (
          <PreviewTab
            navSection={navSection}
            slides={slides}
            activePlanIdx={activePlanIdx}
            activeDoc={activeDoc}
            themeName={activeTheme}
          />
        ),
      },
      {
        id: "themes",
        label: "Themes",
        content: <ThemesTab active={activeTheme} onSelect={handleThemeSelect} />,
      },
      {
        id: "audit",
        label: "Audit",
        content: <AuditTab log={auditLog} onClear={clearAuditLog} />,
      },
    ],
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    [
      auditLog,
      navSection,
      slides,
      activePlanIdx,
      activeDoc,
      activeTheme,
      pushAudit,
      handleThemeSelect,
      clearAuditLog,
    ],
  );

  return (
    <WorkspaceShell
      header={
        <Header
          wordmark="STUDIO OLIVIA"
          crumb={["Workspace"]}
          avatarState={avatarPulse ? "thinking" : "idle"}
          onAvatarClick={() => setAvatarPulse((v) => !v)}
        />
      }
      rail={
        <RailLeft>
          {/* S17 — Section nav drives the conditional rail content below
           * + (post-Track-V) the center-pane view. */}
          <SectionNav
            active={navSection}
            onChange={handleNavSection}
            counts={{
              pitch: slides.length,
              plan: PLAN_SECTIONS.length,
              documents: TOTAL_DOC_COUNT,
            }}
          />

          {/* Section-specific content. */}
          {navSection === "pitch" && (
            <FrameworksPanel
              active={activeFrameworks}
              onToggle={toggleFramework}
            />
          )}
          {navSection === "plan" && (
            <PlanSectionNav
              active={activePlanIdx}
              onSelect={handlePlanSelect}
              confidences={planConfidences}
            />
          )}
          {navSection === "documents" && (
            <DocumentTree
              expanded={expandedCats}
              onToggleCategory={toggleCategory}
              activeDoc={activeDoc}
              onSelectDoc={handleSelectDoc}
              completions={docCompletions}
            />
          )}
          {navSection === "general" && (
            <div
              style={{
                padding: 12,
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--border-default)",
                color: "var(--fg-tertiary)",
                fontSize: "var(--text-xs)",
              }}
            >
              General mode — freeform draft + quick actions land in the
              center pane (Session 18).
            </div>
          )}

          {/* Quick links to other surfaces (preserved from S14). */}
          <div
            style={{
              padding: "8px 4px",
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-tertiary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Other surfaces
          </div>
          {RAIL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                display: "block",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "var(--surface-1)",
                color: "var(--fg-primary)",
                textDecoration: "none",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                transition:
                  "background var(--duration-micro) var(--ease-out-quart), border-color var(--duration-micro) var(--ease-out-quart)",
              }}
            >
              <div>{link.label}</div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: "var(--text-2xs)",
                  color: "var(--fg-tertiary)",
                  fontWeight: 400,
                }}
              >
                {link.description}
              </div>
            </a>
          ))}
        </RailLeft>
      }
      center={
        <Center>
          <HomeCenter
            externalPulse={avatarPulse}
            onAvatarClick={() => setAvatarPulse((v) => !v)}
            appliedSummary={appliedSummary}
            slides={slides}
            onAudit={pushAudit}
          />
        </Center>
      }
      inspector={
        <Inspector
          tabs={inspectorTabs}
          activeTabId={activeTab}
          onTabChange={setActiveTab}
        />
      }
    />
  );
}
