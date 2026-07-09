"use client";

/**
 * `/admin/avatar-eval/decision` — Track O5c session 3.
 *
 * Read-only ranking view. Pulls every AvatarEvalRun via the existing
 * `/api/admin/avatar-eval/runs` endpoint, applies the decision
 * rubric (latency × 0.4 + lip-sync MOS × 0.4 + cost × 0.2), and
 * renders vendors ranked by composite score with the per-component
 * breakdown so the operator can see why a vendor ranked where it did.
 *
 * Vendors without any MOS-rated runs are excluded from the ranking
 * (the rubric weights MOS at 40% — a missing score makes the
 * composite incomparable). They still show in the "Awaiting MOS"
 * section so the operator knows where to direct rating effort.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  aggregateRunsByVendor,
  rankVendors,
  DEFAULT_RUBRIC_WEIGHTS,
  type AvatarRunInput,
  type VendorAggregate,
} from "@/lib/avatar/decision-rubric";

interface AvatarEvalRunRow {
  id: string;
  vendor: string;
  scriptId: string;
  scriptCategory: string;
  latencyMs: number;
  mosScore: number | null;
  costCents: number | null;
  createdAt: string;
}

interface RunsApiResponse {
  ok: boolean;
  runs?: AvatarEvalRunRow[];
  error?: string;
  migrationRequired?: boolean;
  sqlFile?: string;
  hint?: string;
}

export default function DecisionPage() {
  const [runs, setRuns] = useState<AvatarEvalRunRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState<{
    sqlFile?: string;
    hint?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/avatar-eval/runs");
      const data = (await res.json().catch(() => ({}))) as RunsApiResponse;
      if (data.migrationRequired) {
        setMigrationRequired({ sqlFile: data.sqlFile, hint: data.hint });
        setRuns([]);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMigrationRequired(null);
      setRuns(data.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const inputs = useMemo<AvatarRunInput[]>(
    () =>
      runs.map((r) => ({
        vendor: r.vendor,
        latencyMs: r.latencyMs,
        mosScore: r.mosScore,
        costCents: r.costCents,
      })),
    [runs],
  );

  const aggregates = useMemo(() => aggregateRunsByVendor(inputs), [inputs]);
  const rankings = useMemo(() => rankVendors(aggregates), [aggregates]);

  const awaitingMos = useMemo<VendorAggregate[]>(
    () => aggregates.filter((a) => a.meanMosScore == null),
    [aggregates],
  );

  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "var(--canvas-base)",
        color: "var(--fg-primary)",
        padding: "32px 32px 64px",
        display: "grid",
        gap: 24,
        maxWidth: 1280,
        marginInline: "auto",
      }}
    >
      <header style={{ display: "grid", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--aurum-primary)",
          }}
        >
          /admin/avatar-eval/decision · O5c S3
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            fontWeight: 500,
          }}
        >
          Avatar vendor decision rubric
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            maxWidth: 720,
          }}
        >
          composite = latency × {DEFAULT_RUBRIC_WEIGHTS.latency} + MOS ×{" "}
          {DEFAULT_RUBRIC_WEIGHTS.mos} + cost × {DEFAULT_RUBRIC_WEIGHTS.cost}.
          Latency and cost are inverted within the candidate set so lower raw
          values produce higher components. Vendors without any MOS-rated runs
          are excluded — rate them on /admin/avatar-eval to bring them into the
          ranking.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 12,
          borderRadius: "var(--radius-lg)",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--fg-tertiary)",
          }}
        >
          {runs.length} runs · {aggregates.length} vendors with data ·{" "}
          {rankings.length} ranked
        </span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: loading ? "var(--fg-tertiary)" : "var(--aurum-primary)",
            background: "transparent",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </section>

      {migrationRequired && (
        <section
          role="alert"
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-1)",
            border: "1px solid var(--coral-down-mute)",
            display: "grid",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--coral-down)",
            }}
          >
            Migration not applied
          </span>
          <p style={{ margin: 0, color: "var(--fg-primary)" }}>
            The <code>avatar_eval_runs</code> table doesn&apos;t exist in the
            database. Apply{" "}
            <code style={{ color: "var(--aurum-primary)" }}>
              {migrationRequired.sqlFile ??
                "prisma/sql/10-add-avatar-eval-run.sql"}
            </code>{" "}
            then refresh.
          </p>
          {migrationRequired.hint && (
            <pre
              style={{
                margin: 0,
                padding: 10,
                background: "var(--canvas-recess)",
                borderRadius: "var(--radius-md)",
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                color: "var(--fg-secondary)",
                whiteSpace: "pre-wrap",
              }}
            >
              {migrationRequired.hint}
            </pre>
          )}
        </section>
      )}

      {error && (
        <p role="alert" style={{ color: "var(--coral-down)", margin: 0 }}>
          {error}
        </p>
      )}

      {/* Ranked vendors */}
      <section
        style={{
          padding: 16,
          borderRadius: "var(--radius-lg)",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
          display: "grid",
          gap: 10,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-md)",
            fontWeight: 500,
          }}
        >
          Ranked
        </h2>

        {rankings.length === 0 ? (
          <p style={{ margin: 0, color: "var(--fg-tertiary)" }}>
            No MOS-rated runs yet. Record some on /admin/avatar-eval to populate
            the ranking.
          </p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
            }}
          >
            <thead>
              <tr style={{ color: "var(--fg-tertiary)", textAlign: "left" }}>
                <th style={cellHeader}>#</th>
                <th style={cellHeader}>Vendor</th>
                <th style={cellHeader}>Composite</th>
                <th style={cellHeader}>Latency (med ms)</th>
                <th style={cellHeader}>MOS (mean)</th>
                <th style={cellHeader}>Cost (mean ¢)</th>
                <th style={cellHeader}>Runs</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((r, i) => {
                const isWinner = i === 0;
                return (
                  <tr
                    key={r.vendor}
                    style={{
                      borderTop: "1px solid var(--border-subtle)",
                      color: isWinner ? "var(--mint-up)" : "var(--fg-secondary)",
                    }}
                  >
                    <td style={cell}>{i + 1}</td>
                    <td style={{ ...cell, color: "var(--aurum-primary)" }}>
                      {r.vendor}
                    </td>
                    <td style={cell} className="tabular-nums">
                      {r.composite.toFixed(3)}
                      <span
                        style={{
                          color: "var(--fg-tertiary)",
                          paddingLeft: 8,
                          fontSize: "var(--text-2xs)",
                        }}
                      >
                        L{r.latencyComponent.toFixed(2)} · M
                        {r.mosComponent.toFixed(2)} · C
                        {r.costComponent.toFixed(2)}
                      </span>
                    </td>
                    <td style={cell} className="tabular-nums">
                      {r.medianLatencyMs.toFixed(0)}
                    </td>
                    <td style={cell} className="tabular-nums">
                      {(r.meanMosScore as number).toFixed(2)}
                    </td>
                    <td style={cell} className="tabular-nums">
                      {r.meanCostCents != null
                        ? r.meanCostCents.toFixed(1)
                        : "—"}
                    </td>
                    <td style={cell} className="tabular-nums">
                      {r.runCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Vendors awaiting MOS */}
      {awaitingMos.length > 0 && (
        <section
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-1)",
            border: "1px solid var(--border-default)",
            display: "grid",
            gap: 8,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-md)",
              fontWeight: 500,
            }}
          >
            Awaiting MOS scoring
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--fg-tertiary)",
              fontSize: "var(--text-sm)",
            }}
          >
            These vendors have latency runs but no MOS scores. Rate them on{" "}
            <code>/admin/avatar-eval</code> to bring them into the ranking.
          </p>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 6,
            }}
          >
            {awaitingMos.map((a) => (
              <li
                key={a.vendor}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  color: "var(--fg-secondary)",
                  display: "flex",
                  gap: 12,
                }}
              >
                <span style={{ color: "var(--aurum-primary)", minWidth: 80 }}>
                  {a.vendor}
                </span>
                <span className="tabular-nums">{a.runCount} runs</span>
                <span className="tabular-nums" style={{ color: "var(--fg-tertiary)" }}>
                  median {a.medianLatencyMs.toFixed(0)}ms
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

const cellHeader: React.CSSProperties = {
  padding: "6px 8px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
};

const cell: React.CSSProperties = {
  padding: "8px 8px",
};
