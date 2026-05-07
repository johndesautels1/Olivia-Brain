"use client";

/**
 * `/` — Olivia Brain root surface.
 *
 * Session 14 lands the **three-region workspace shell** per
 * `docs/01_UI_DESIGN_SYSTEM.md` § 5.1 and `docs/STUDIO_OLIVIA_DESIGN.md`
 * § 1. The shell is product-agnostic: clueslondon, cluesintelligence,
 * cluesxscore, white-label tenants, and standalone Olivia all mount
 * the same shell with different region content
 * (`docs/01_UI_DESIGN_SYSTEM.md` § 10).
 *
 * Region content here is intentionally **scaffolding** — the rail, the
 * inspector tab bodies, and the center canvas all show "coming in
 * Session N…" placeholders. Subsequent Track C sessions populate them:
 *
 *   - Session 15: 5 reusable primitives (`AvatarOrb` full impl,
 *     `ConsensusDots`, `Badge`, `CompletionRing`, `DeckDetailModal`).
 *   - Session 16: Library tab + DeckDetailModal interaction.
 *   - Session 17: Section nav (Pitch / Plan / Documents / General),
 *     document tree, frameworks panel.
 *   - Session 18: Right-pane tabs (Olivia / Library / Preview /
 *     Themes / Audit) wired to the chat brain + audit log.
 *   - Session 19: J/K keyboard nav, focus-trap modal, debounced
 *     autosave, theme switching.
 *
 * Existing routes (`/map`, `/calendar`, `/test-avatar`, `/admin`,
 * `/admin/phase1`) survive untouched. The Phase-1 readiness UI
 * relocated to `/admin/phase1` to make the root surface available
 * for the Studio shell.
 */

import { useCallback, useMemo, useState } from "react";
import {
  Center,
  Header,
  Inspector,
  RailLeft,
  WorkspaceShell,
  type InspectorTab,
} from "@/components/workspace";
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
import { DEFAULT_THEME, type ThemeKey } from "@/lib/studio/themes";
import { pushAuditEntry, type AuditEntry } from "@/lib/studio/audit";
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
        <Center
          toolbar={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--fg-tertiary)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              <span>Workspace · Session 14 chrome</span>
              <span>⌨ J/K navigate · Esc close — wired Session 19</span>
            </div>
          }
        >
          <div
            style={{
              maxWidth: 720,
              display: "grid",
              gap: 16,
            }}
          >
            <h1
              className="font-display"
              style={{
                fontSize: "var(--text-3xl)",
                color: "var(--fg-primary)",
                margin: 0,
              }}
            >
              Welcome to Studio Olivia
            </h1>
            <p
              style={{
                color: "var(--fg-secondary)",
                margin: 0,
                lineHeight: 1.55,
              }}
            >
              The three-region workspace shell. Header above, rail to the
              left, inspector to the right. The center canvas (this region) is
              where Pitch, Plan, Documents, and General views live. Session 15
              ships the five reusable primitives; Sessions 16–19 fill in the
              widget grid, navigation, and chat brain.
            </p>
            <div
              role="note"
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-aurum)",
                background: "var(--aurum-mute)",
                color: "var(--fg-primary)",
                fontSize: "var(--text-sm)",
              }}
            >
              <strong style={{ color: "var(--aurum-primary)" }}>
                Design-system note —
              </strong>{" "}
              Every paint on this surface references a canonical token
              (Aurum, Aether, canvas, foreground). No hex codes in
              components. White-label tenants override the token set; the
              shell reskins automatically. See{" "}
              <code>docs/01_UI_DESIGN_SYSTEM.md</code>.
            </div>

            {/* Applied-archetype confirmation breadcrumb (S16). */}
            {appliedSummary && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-aether)",
                  background: "var(--aether-mute)",
                  color: "var(--fg-primary)",
                  fontSize: "var(--text-sm)",
                  display: "grid",
                  gap: 4,
                }}
              >
                <strong style={{ color: "var(--aether-primary)" }}>
                  Library →
                </strong>
                <span>{appliedSummary}</span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    color: "var(--fg-tertiary)",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {slides.length} slides queued: {slides.map((s) => s.type).join(" · ")}
                </span>
              </div>
            )}
          </div>
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
