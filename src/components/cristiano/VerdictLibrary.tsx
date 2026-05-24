"use client";

/**
 * VerdictLibrary
 *
 * Lists Cristiano verdicts for the current user, newest-first. Click
 * a row → mounts the `CristianoVerdictPlayer` for replay. Supports
 * filtering by kind + sourceApp + keyset pagination via `before` cursor.
 *
 * Data source: `GET /api/cristiano/verdicts` (the C3 list endpoint).
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { CristianoVerdictPlayer } from "@/components/cristiano/CristianoVerdictPlayer";
import {
  CRISTIANO_SOURCE_APPS,
  CRISTIANO_VERDICT_KINDS,
  type CristianoSourceApp,
  type CristianoVerdictKind,
  type CristianoVerdictRecord,
} from "@/lib/cristiano/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ListResponse {
  ok: boolean;
  verdicts?: CristianoVerdictRecord[];
  hasMore?: boolean;
  nextCursor?: string | null;
  error?: string;
}

export interface VerdictLibraryProps {
  /**
   * Optional initial filter — when set, the kind dropdown defaults
   * to this value and is hidden. Used by the Gateway Inbox sub-tab
   * which shares this component but filters by sourceApp.
   */
  initialKindFilter?: CristianoVerdictKind;
  initialSourceAppFilter?: CristianoSourceApp;
  /** Hide the kind dropdown — used when caller forces a fixed kind. */
  hideKindFilter?: boolean;
  /** Hide the sourceApp dropdown — used when caller forces a fixed app. */
  hideSourceAppFilter?: boolean;
  /**
   * Default page limit (1..200). Defaults to 25 — smaller than the
   * route default so the initial paint is fast.
   */
  pageLimit?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VerdictLibrary({
  initialKindFilter,
  initialSourceAppFilter,
  hideKindFilter = false,
  hideSourceAppFilter = false,
  pageLimit = 25,
}: VerdictLibraryProps) {
  const [verdicts, setVerdicts] = useState<CristianoVerdictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [kindFilter, setKindFilter] = useState<CristianoVerdictKind | "">(
    initialKindFilter ?? "",
  );
  const [sourceAppFilter, setSourceAppFilter] = useState<
    CristianoSourceApp | ""
  >(initialSourceAppFilter ?? "");

  const [selectedVerdictId, setSelectedVerdictId] = useState<string | null>(
    null,
  );

  // ── Fetch ──
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (cursor: string | null) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (kindFilter) params.set("kind", kindFilter);
      if (sourceAppFilter) params.set("sourceApp", sourceAppFilter);
      if (cursor) params.set("before", cursor);
      params.set("limit", String(pageLimit));

      try {
        const res = await fetch(`/api/cristiano/verdicts?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (controller.signal.aborted) return;

        const data = (await res.json()) as ListResponse;
        if (!res.ok || !data.ok) {
          setError(data.error ?? `Failed to load verdicts (HTTP ${res.status})`);
          return;
        }

        const list = data.verdicts ?? [];
        // Reset list on a fresh fetch (cursor null); append on pagination.
        setVerdicts((prev) => (cursor ? [...prev, ...list] : list));
        setHasMore(!!data.hasMore);
        setNextCursor(data.nextCursor ?? null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      }
    },
    [kindFilter, sourceAppFilter, pageLimit],
  );

  // Refetch on filter change (cursor null → resets list).
  useEffect(() => {
    void fetchPage(null);
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchPage]);

  const selectedVerdict = selectedVerdictId
    ? verdicts.find((v) => v.id === selectedVerdictId) ?? null
    : null;

  // ── Render ──
  return (
    <section
      className="cristiano-verdict-library space-y-4"
      aria-label="Cristiano verdict library"
      data-testid="verdict-library"
    >
      {/* Heading — fills the h2 slot in the dashboard heading
          hierarchy (h1=dashboard root, h2=sub-tab, h3=row content).
          Visually styled but semantically important for SR users. */}
      <header>
        <h2 className="text-base font-semibold text-fog">Verdict Library</h2>
        <p className="text-xs text-fog/70">
          Every verdict Cristiano has rendered, newest first.
        </p>
      </header>

      {/* Filters */}
      {(!hideKindFilter || !hideSourceAppFilter) && (
        <div className="flex flex-wrap items-center gap-3">
          {!hideKindFilter && (
            // M4 audit fix: removed `aria-label` (was "Filter verdicts
            // by kind") so the visible "Kind:" text serves as the
            // accessible name. WCAG 2.5.3 — Label in Name. Implicit
            // <label> wrap provides the accessible name from the
            // <span> content automatically.
            <label className="flex items-center gap-2 text-xs text-fog/70">
              <span>Kind:</span>
              <select
                value={kindFilter}
                onChange={(e) =>
                  setKindFilter(
                    e.target.value === ""
                      ? ""
                      : (e.target.value as CristianoVerdictKind),
                  )
                }
                className="rounded border border-fog/20 bg-onyx px-2 py-1 text-xs text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
              >
                <option value="">All kinds</option>
                {CRISTIANO_VERDICT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!hideSourceAppFilter && (
            // M4 audit fix: same — visible "Source:" is the accessible name.
            <label className="flex items-center gap-2 text-xs text-fog/70">
              <span>Source:</span>
              <select
                value={sourceAppFilter}
                onChange={(e) =>
                  setSourceAppFilter(
                    e.target.value === ""
                      ? ""
                      : (e.target.value as CristianoSourceApp),
                  )
                }
                className="rounded border border-fog/20 bg-onyx px-2 py-1 text-xs text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
              >
                <option value="">All sources</option>
                {CRISTIANO_SOURCE_APPS.map((app) => (
                  <option key={app} value={app}>
                    {app}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* List */}
      {loading && verdicts.length === 0 && (
        <p className="text-sm text-fog/70" data-testid="verdict-library-loading">
          Loading verdicts...
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="text-sm text-red-300"
          data-testid="verdict-library-error"
        >
          {error}
        </p>
      )}
      {!loading && verdicts.length === 0 && !error && (
        <p
          className="text-sm text-fog/70"
          data-testid="verdict-library-empty"
        >
          No verdicts yet. Cristiano renders verdicts when a linked app
          pushes one, or when you ask one here.
        </p>
      )}

      <ul
        className="divide-y divide-fog/10 rounded-lg border border-fog/10 bg-onyx/40"
        role="list"
        aria-label="Verdict list"
      >
        {verdicts.map((v) => {
          const isSelected = v.id === selectedVerdictId;
          return (
            <li key={v.id} role="listitem">
              <button
                type="button"
                onClick={() =>
                  setSelectedVerdictId(isSelected ? null : v.id)
                }
                aria-expanded={isSelected}
                aria-label={`${isSelected ? "Hide" : "Show"} verdict: ${v.verdictTitle}`}
                className={`min-h-[44px] w-full text-left px-4 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50 ${
                  isSelected ? "bg-aurum/10" : "hover:bg-fog/5"
                }`}
                data-testid="verdict-row"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fog truncate">
                      {v.verdictTitle}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-fog/80">
                      {v.kind.replace(/_/g, " ")} · {v.sourceApp} ·{" "}
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {v.preRenderedVideoUrl ? (
                    <span
                      className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-300"
                      title="This verdict has a pre-rendered video"
                    >
                      Video
                    </span>
                  ) : (
                    <span
                      className="shrink-0 rounded-full border border-aurum/30 bg-aurum/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-aurum"
                      title="Live narration via LiveAvatar"
                    >
                      Live
                    </span>
                  )}
                </div>
              </button>

              {isSelected && (
                <div className="px-4 py-3 border-t border-fog/10 bg-onyx/30">
                  <CristianoVerdictPlayer
                    verdict={v}
                    autoPlay={false}
                    autoDisconnect
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {hasMore && (
        <button
          type="button"
          onClick={() => void fetchPage(nextCursor)}
          disabled={loading}
          className="min-h-[44px] rounded-md border border-fog/20 bg-onyx/60 px-4 py-2 text-xs font-medium text-fog hover:bg-fog/5 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
          data-testid="verdict-library-load-more"
        >
          {loading ? "Loading..." : "Load more"}
        </button>
      )}
    </section>
  );
}
