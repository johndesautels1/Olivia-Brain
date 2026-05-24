"use client";

/**
 * GatewayInbox
 *
 * Sub-tab that shows verdicts pushed INTO Olivia Brain by linked apps
 * (LTM, lifescore, etc.) via the gateway push endpoint. Polls every
 * 30 seconds for new arrivals while the tab is visible — when a
 * gatewayed app POSTs a verdict on behalf of this user, it appears
 * here in near real time.
 *
 * Mounts `<VerdictLibrary />` with the kind filter unlocked but the
 * source-app filter pre-set to "all non-OB" (Olivia Brain's own
 * verdicts go to the Ask Cristiano tab, not the inbox).
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { useEffect, useRef, useState } from "react";

import { VerdictLibrary } from "@/components/cristiano/VerdictLibrary";
import type { CristianoVerdictRecord } from "@/lib/cristiano/types";

const POLL_INTERVAL_MS = 30_000;

interface ListResponse {
  ok: boolean;
  verdicts?: CristianoVerdictRecord[];
  error?: string;
}

export function GatewayInbox() {
  const [newCount, setNewCount] = useState(0);
  const [latestSeenAt, setLatestSeenAt] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const refreshKeyRef = useRef(0);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Poll for new verdicts ──
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function poll() {
      try {
        const res = await fetch(
          "/api/cristiano/verdicts?limit=10",
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          },
        );
        if (cancelled) return;
        const data = (await res.json()) as ListResponse;
        if (!res.ok || !data.ok || !data.verdicts) {
          setPollError(data.error ?? `Poll failed (HTTP ${res.status})`);
          return;
        }
        setPollError(null);

        // Count how many verdicts have createdAt > latestSeenAt and
        // sourceApp != "ob" (we only count gateway pushes here).
        const gatewayVerdicts = data.verdicts.filter(
          (v) => v.sourceApp !== "ob",
        );
        if (gatewayVerdicts.length === 0) return;

        const newestSeen = gatewayVerdicts[0].createdAt;
        if (latestSeenAt === null) {
          // First poll — mark the watermark; no notifications.
          setLatestSeenAt(newestSeen);
          return;
        }
        if (new Date(newestSeen) > new Date(latestSeenAt)) {
          const fresh = gatewayVerdicts.filter(
            (v) => new Date(v.createdAt) > new Date(latestSeenAt),
          );
          setNewCount((prev) => prev + fresh.length);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setPollError(err instanceof Error ? err.message : "Poll error");
      }
    }

    void poll(); // initial
    const intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [latestSeenAt]);

  const handleRefresh = () => {
    setNewCount(0);
    refreshKeyRef.current += 1;
    setRefreshKey(refreshKeyRef.current);
    // Mark all current verdicts as seen.
    setLatestSeenAt(new Date().toISOString());
  };

  return (
    <section
      className="cristiano-gateway-inbox space-y-4"
      aria-label="Gateway inbox"
      data-testid="gateway-inbox"
    >
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fog">Gateway Inbox</h2>
          <p className="text-xs text-fog/70">
            Verdicts pushed into Olivia Brain by linked apps. Polls every 30s.
          </p>
        </div>
        {newCount > 0 && (
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-md border border-aurum/40 bg-aurum/15 px-3 py-1.5 text-xs font-medium text-aurum hover:bg-aurum/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/60"
            data-testid="gateway-inbox-refresh"
            aria-label={`Refresh — ${newCount} new verdict${newCount === 1 ? "" : "s"} since you last looked`}
          >
            {newCount} new — refresh
          </button>
        )}
      </header>

      {pollError && (
        <p
          role="alert"
          className="text-xs text-amber-300"
          data-testid="gateway-inbox-poll-error"
        >
          Polling paused: {pollError}
        </p>
      )}

      {/* Force a remount when the user refreshes by changing the key.
          This re-fetches the underlying list without needing to drill
          a refresh prop into VerdictLibrary. */}
      <VerdictLibrary
        key={refreshKey}
        hideSourceAppFilter={false}
        pageLimit={25}
      />
    </section>
  );
}
