"use client";

/**
 * `/admin/traces` — live cascade trace viewer.
 *
 * Bloomberg-style table of the last N cascade calls with intent,
 * provider, model, duration, attempts, and tool dispatch trail.
 * Polls `/api/traces` every 5 seconds and renders the bucket
 * (max 30 entries, in-memory only — when the function spins down,
 * the bucket resets).
 *
 * Read-only ops surface — no mutation, no auth gate beyond what
 * `/api/traces` already enforces (currently public; see RUNBOOK §2
 * for hardening if needed).
 */

import { useEffect, useState } from "react";
import type { FoundationTrace } from "@/lib/foundation/types";

interface TracesResponse {
  traces?: FoundationTrace[];
}

const POLL_MS = 5_000;

export default function TracesPage() {
  const [traces, setTraces] = useState<FoundationTrace[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function refresh() {
      try {
        const res = await fetch("/api/traces", { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as TracesResponse;
        if (cancelled) return;
        setTraces(data.traces ?? []);
        setRefreshedAt(Date.now());
        setError(null);
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "fetch failed");
      }
    }

    void refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--canvas-base)",
        color: "var(--fg-primary)",
        padding: "32px 32px 64px",
        display: "grid",
        gap: 20,
        maxWidth: 1280,
        marginInline: "auto",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--aurum-primary)",
            }}
          >
            /admin/traces · cascade telemetry
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-3xl)",
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            Cascade trace stream
          </h1>
          <p
            style={{
              margin: 0,
              color: "var(--fg-tertiary)",
              fontSize: "var(--text-sm)",
            }}
          >
            Live cascade routing decisions — the last {traces.length} calls in the in-memory bucket. Polling every {POLL_MS / 1000}s.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--fg-tertiary)",
          }}
        >
          <span>{traces.length} entries</span>
          {refreshedAt && (
            <span className="tabular-nums">
              {formatRelative(refreshedAt)}
            </span>
          )}
          {error && (
            <span style={{ color: "var(--coral-down)" }}>· {error}</span>
          )}
        </div>
      </header>

      {traces.length === 0 && !error && (
        <p
          style={{
            margin: 0,
            padding: 32,
            textAlign: "center",
            borderRadius: "var(--radius-lg)",
            border: "1px dashed var(--border-default)",
            color: "var(--fg-tertiary)",
            fontStyle: "italic",
          }}
        >
          No cascade calls yet. Trigger one from the home composer or `/voice`.
        </p>
      )}

      {traces.length > 0 && (
        <div
          role="region"
          aria-label="Cascade traces"
          style={{
            overflowX: "auto",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-1)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--border-default)",
                  background: "var(--canvas-recess)",
                }}
              >
                {["When", "Intent", "Mode", "Provider", "Model", "Attempts", "Duration", "Tools", "Preview"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      color: "var(--aurum-primary)",
                      fontWeight: 600,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      fontSize: "var(--text-2xs)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {traces.map((t) => (
                <TraceRow key={t.id} trace={t} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function TraceRow({ trace }: { trace: FoundationTrace }) {
  const totalMs = trace.attempts.reduce((sum, a) => sum + a.durationMs, 0);
  const failed = trace.attempts.filter((a) => !a.success).length;
  const ok = trace.attempts.filter((a) => a.success).length;
  const modeColor =
    trace.runtimeMode === "live" ? "var(--mint-up)" : "var(--amber-warn)";
  const providerColor =
    trace.selectedProvider === "mock"
      ? "var(--fg-tertiary)"
      : "var(--aurum-primary)";
  return (
    <tr
      style={{
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <Td className="tabular-nums">{formatTime(trace.createdAt)}</Td>
      <Td color="var(--aether-primary)">{trace.intent}</Td>
      <Td color={modeColor}>{trace.runtimeMode}</Td>
      <Td color={providerColor}>{trace.selectedProvider}</Td>
      <Td>{trace.selectedModel}</Td>
      <Td className="tabular-nums">
        {ok}✓{failed > 0 && <span style={{ color: "var(--coral-down)" }}> {failed}✗</span>}
      </Td>
      <Td className="tabular-nums">{totalMs}ms</Td>
      <Td className="tabular-nums">
        {trace.toolCalls?.length ?? 0}
      </Td>
      <Td maxWidth={320}>
        <span
          style={{
            color: "var(--fg-secondary)",
            display: "inline-block",
            maxWidth: 320,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            verticalAlign: "middle",
          }}
        >
          {trace.responsePreview || trace.userMessage || "—"}
        </span>
      </Td>
    </tr>
  );
}

function Td({
  children,
  color,
  className,
  maxWidth,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
  maxWidth?: number;
}) {
  return (
    <td
      className={className}
      style={{
        padding: "8px 12px",
        color: color ?? "var(--fg-primary)",
        whiteSpace: "nowrap",
        maxWidth,
      }}
    >
      {children}
    </td>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatRelative(ts: number): string {
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  return `${Math.floor(diffSec / 60)}m ago`;
}
