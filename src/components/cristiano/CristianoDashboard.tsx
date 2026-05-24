"use client";

/**
 * CristianoDashboard
 *
 * The parent surface for the three Cristiano sub-tabs:
 *   1. Ask Cristiano      — submit a structured rubric, watch live narration
 *   2. Verdict Library    — replay every past verdict (newest first)
 *   3. Gateway Inbox      — verdicts pushed in by linked apps (polled)
 *
 * Mounted standalone at `/cristiano` AND embeddable inside the Ask
 * Olivia dashboard once that surface lands (consuming code just
 * renders `<CristianoDashboard />`).
 *
 * Tab state is persisted to sessionStorage so the user keeps their
 * place across hot-reloads in dev / route-back-button in production.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import Link from "next/link";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";

import { AskCristiano } from "@/components/cristiano/AskCristiano";
import { GatewayInbox } from "@/components/cristiano/GatewayInbox";
import { VerdictLibrary } from "@/components/cristiano/VerdictLibrary";

// ─── Tab definition ──────────────────────────────────────────────────────────

export const CRISTIANO_DASHBOARD_TABS = [
  "ask",
  "library",
  "inbox",
] as const;
export type CristianoDashboardTab = (typeof CRISTIANO_DASHBOARD_TABS)[number];

const TAB_LABELS: Record<CristianoDashboardTab, string> = {
  ask: "Ask Cristiano",
  library: "Verdict Library",
  inbox: "Gateway Inbox",
};

const TAB_DESCRIPTIONS: Record<CristianoDashboardTab, string> = {
  ask: "Submit a structured rubric and watch Cristiano render the verdict.",
  library: "Replay every verdict the Judge has rendered — newest first.",
  inbox: "Verdicts pushed in by linked apps. Polls every 30 seconds.",
};

const SESSION_KEY = "cristiano-dashboard-tab";

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CristianoDashboardProps {
  /**
   * Initial tab — overrides sessionStorage. Useful when a deep link
   * passes the user to a specific sub-tab (e.g. `/cristiano?tab=inbox`).
   */
  initialTab?: CristianoDashboardTab;
  /**
   * Compact rendering for in-pane embeds (e.g. the home page Inspector
   * "Cristiano" tab). Suppresses the persona-introduction header so the
   * dashboard chrome doesn't duplicate the parent surface's tab label,
   * and surfaces a compact link out to the standalone `/cristiano`
   * route (preserving the active sub-tab in the deep link).
   *
   * Defaults to `false` so the existing `/cristiano` standalone route
   * keeps its full chrome unchanged. No breaking changes for any
   * existing consumer.
   */
  embedded?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CristianoDashboard({
  initialTab,
  embedded = false,
}: CristianoDashboardProps) {
  const [activeTab, setActiveTab] = useState<CristianoDashboardTab>(() => {
    if (initialTab) return initialTab;
    if (typeof window === "undefined") return "ask";
    try {
      const saved = window.sessionStorage.getItem(SESSION_KEY);
      if (saved && (CRISTIANO_DASHBOARD_TABS as readonly string[]).includes(saved)) {
        return saved as CristianoDashboardTab;
      }
    } catch {
      /* sessionStorage unavailable — fall through to default */
    }
    return "ask";
  });

  // Persist the active tab to sessionStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, activeTab);
    } catch {
      /* sessionStorage unavailable — silently degrade */
    }
  }, [activeTab]);

  /**
   * L8 audit fix: ARIA APG tablist keyboard nav. Left/Right cycle
   * with wrap; Home/End jump to first/last. Focus follows the
   * active tab so SR users hear the new selection announced. Mouse
   * click still works via the button's own onClick.
   */
  const handleTabKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const tabs = CRISTIANO_DASHBOARD_TABS;
      const currentIdx = tabs.indexOf(activeTab);
      let nextIdx: number | null = null;

      if (event.key === "ArrowRight") {
        nextIdx = (currentIdx + 1) % tabs.length;
      } else if (event.key === "ArrowLeft") {
        nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
      } else if (event.key === "Home") {
        nextIdx = 0;
      } else if (event.key === "End") {
        nextIdx = tabs.length - 1;
      }

      if (nextIdx === null) return;
      event.preventDefault();
      const nextTab = tabs[nextIdx];
      setActiveTab(nextTab);
      // Move keyboard focus to the new active tab so SR users
      // hear the new selection announced.
      const nextTabEl = document.querySelector<HTMLButtonElement>(
        `[data-testid="cristiano-dashboard-tab-${nextTab}"]`,
      );
      nextTabEl?.focus();
    },
    [activeTab],
  );

  return (
    <div
      className={`cristiano-dashboard ${embedded ? "space-y-4" : "space-y-6"}`}
      data-testid="cristiano-dashboard"
      data-embedded={embedded ? "true" : "false"}
    >
      {/* Header — persona introduction. Suppressed when embedded so the
          dashboard chrome does not duplicate the parent surface's tab
          label (e.g. the home page Inspector's "Cristiano" tab already
          identifies the persona). The standalone /cristiano route
          keeps the full header for first-visit context. */}
      {embedded ? (
        <header className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-fog/80 font-mono">
            The Judge
          </p>
          <Link
            href={`/cristiano?tab=${activeTab}`}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-aurum hover:bg-aurum/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/60"
            data-testid="cristiano-dashboard-view-standalone"
            aria-label={`View Cristiano ${TAB_LABELS[activeTab]} in the standalone /cristiano dashboard`}
          >
            Full view <span aria-hidden="true">&rarr;</span>
          </Link>
        </header>
      ) : (
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-fog">
            Cristiano — The Judge
          </h1>
          <p className="max-w-2xl text-sm text-fog/80">
            One-way verdict surface. Cristiano renders decisions and
            recommendations on structured rubrics and presents them
            via the LiveAvatar pipeline. He does not converse — he
            renders pronouncements.
          </p>
        </header>
      )}

      {/* Sub-tab nav */}
      <nav
        role="tablist"
        aria-label="Cristiano sub-tabs"
        className="flex flex-wrap gap-1 rounded-lg border border-fog/10 bg-onyx/40 p-1"
      >
        {CRISTIANO_DASHBOARD_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`cristiano-panel-${tab}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab)}
              onKeyDown={handleTabKeyDown}
              className={`min-h-[44px] flex-1 sm:flex-none rounded-md px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/60 ${
                isActive
                  ? "bg-aurum text-onyx border border-aurum"
                  : "text-fog/80 hover:text-fog hover:bg-fog/5 border border-transparent"
              }`}
              data-testid={`cristiano-dashboard-tab-${tab}`}
            >
              {TAB_LABELS[tab]}
            </button>
          );
        })}
      </nav>

      {/* Sub-tab description — keyed by activeTab so it changes
          synchronously with the panel below. */}
      <p
        className="text-xs text-fog/80"
        data-testid={`cristiano-dashboard-description-${activeTab}`}
      >
        {TAB_DESCRIPTIONS[activeTab]}
      </p>

      {/* Panels */}
      <div
        role="tabpanel"
        id={`cristiano-panel-${activeTab}`}
        aria-label={TAB_LABELS[activeTab]}
        data-testid={`cristiano-dashboard-panel-${activeTab}`}
      >
        {activeTab === "ask" && <AskCristiano />}
        {activeTab === "library" && <VerdictLibrary />}
        {activeTab === "inbox" && <GatewayInbox />}
      </div>
    </div>
  );
}
