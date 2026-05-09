"use client";

/**
 * `/admin/eval` — golden eval dashboard (Track O O2 follow-up).
 *
 * Lists every GoldenCase, lets you trigger the suite or a single
 * case via `/api/admin/eval/run`, and renders the report inline:
 * per-case pass/fail with the failing checks expanded so the
 * operator can see which acceptance criterion broke.
 *
 * Read-mostly: GET fetches the case catalog on mount; POST runs
 * the suite (rate-limited 3/min/IP server-side).
 */

import { useCallback, useEffect, useState } from "react";

interface CaseCatalogEntry {
  id: string;
  label: string;
  prompt: string;
  expect: Record<string, unknown>;
}

interface CaseResult {
  caseId: string;
  label: string;
  passed: boolean;
  checks: Record<
    string,
    | undefined
    | {
        passed: boolean;
        expected?: unknown;
        actual?: unknown;
        missing?: string[];
        hit?: string[];
        ms?: number;
        max?: number;
      }
  >;
  cascadeText: string;
  durationMs: number;
  providerId: string;
  modelId: string;
  runtimeMode: string;
  error?: string;
}

interface GoldenReport {
  startedAt: string;
  finishedAt: string;
  totalMs: number;
  passed: number;
  failed: number;
  total: number;
  results: CaseResult[];
}

export default function EvalPage() {
  const [catalog, setCatalog] = useState<CaseCatalogEntry[]>([]);
  const [report, setReport] = useState<GoldenReport | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Load case catalog on mount. */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/eval/run");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { cases?: CaseCatalogEntry[] };
        if (!cancelled) setCatalog(data.cases ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "catalog fetch failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSuite = useCallback(async (id?: string) => {
    setRunning(id ?? "all");
    setError(null);
    try {
      const url = id
        ? `/api/admin/eval/run?ids=${encodeURIComponent(id)}`
        : "/api/admin/eval/run";
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as
        | { kind: "suite"; report: GoldenReport }
        | { kind: "single"; result: CaseResult };
      if (data.kind === "suite") {
        setReport(data.report);
      } else {
        /* Wrap single-case result in a synthetic report so the same
         * renderer covers both paths. */
        setReport({
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          totalMs: data.result.durationMs,
          passed: data.result.passed ? 1 : 0,
          failed: data.result.passed ? 0 : 1,
          total: 1,
          results: [data.result],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "run failed");
    } finally {
      setRunning(null);
    }
  }, []);

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
          /admin/eval · golden suite
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            fontWeight: 500,
          }}
        >
          Cascade quality gate
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            maxWidth: 720,
          }}
        >
          Hand-picked golden cases that gate Olivia's release quality. Each
          case runs the cascade against a target prompt and verifies spoke
          routing, manifest fences, substring presence/absence, and duration
          caps. Run sparingly — each case costs ~500 tokens.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          padding: 16,
          borderRadius: "var(--radius-lg)",
          background: "var(--surface-1)",
          border: "1px solid var(--border-default)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: "var(--fg-tertiary)",
          }}
        >
          <span>{catalog.length} cases</span>
          {report && (
            <span className="tabular-nums">
              <span style={{ color: "var(--mint-up)" }}>{report.passed} ✓</span>
              {" · "}
              <span style={{ color: "var(--coral-down)" }}>{report.failed} ✗</span>
              {" · "}
              <span>{(report.totalMs / 1000).toFixed(1)}s</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void runSuite()}
          disabled={running !== null}
          style={{
            padding: "8px 18px",
            borderRadius: "var(--radius-full)",
            background:
              running === "all"
                ? "var(--surface-2)"
                : "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
            color:
              running === "all" ? "var(--fg-tertiary)" : "var(--fg-on-accent)",
            border: "none",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: running !== null ? "not-allowed" : "pointer",
            opacity: running !== null && running !== "all" ? 0.5 : 1,
          }}
        >
          {running === "all" ? "Running…" : "Run all cases"}
        </button>
      </section>

      {error && (
        <p role="alert" style={{ color: "var(--coral-down)", margin: 0 }}>
          {error}
        </p>
      )}

      {/* Case catalog with per-row run buttons. */}
      <section style={{ display: "grid", gap: 10 }}>
        {catalog.map((c) => {
          const result = report?.results.find((r) => r.caseId === c.id);
          return (
            <CaseCard
              key={c.id}
              entry={c}
              result={result}
              running={running === c.id}
              disabled={running !== null && running !== c.id}
              onRun={() => void runSuite(c.id)}
            />
          );
        })}
      </section>
    </main>
  );
}

function CaseCard({
  entry,
  result,
  running,
  disabled,
  onRun,
}: {
  entry: CaseCatalogEntry;
  result?: CaseResult;
  running: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  const tone = result
    ? result.passed
      ? "var(--mint-up)"
      : "var(--coral-down)"
    : "var(--fg-tertiary)";

  return (
    <article
      style={{
        padding: 16,
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-1)",
        border: `1px solid ${result ? (result.passed ? "var(--border-default)" : "var(--coral-down-mute)") : "var(--border-default)"}`,
        display: "grid",
        gap: 10,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 2, minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: tone,
            }}
          >
            {entry.id}
            {result && (
              <>
                <span style={{ opacity: 0.5, padding: "0 6px" }}>·</span>
                <span className="tabular-nums">{result.durationMs}ms</span>
                <span style={{ opacity: 0.5, padding: "0 6px" }}>·</span>
                {result.providerId}
              </>
            )}
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-md)",
              color: "var(--fg-primary)",
              fontWeight: 500,
            }}
          >
            {entry.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled}
          style={{
            padding: "6px 14px",
            borderRadius: "var(--radius-full)",
            background: running ? "var(--surface-2)" : "var(--canvas-recess)",
            border: `1px solid ${running ? "var(--border-aurum)" : "var(--border-default)"}`,
            color: running ? "var(--aurum-primary)" : "var(--fg-secondary)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled && !running ? 0.45 : 1,
          }}
        >
          {running ? "…" : "Run"}
        </button>
      </header>
      <p
        style={{
          margin: 0,
          color: "var(--fg-secondary)",
          fontSize: "var(--text-sm)",
          fontStyle: "italic",
        }}
      >
        "{entry.prompt}"
      </p>

      {result && Object.keys(result.checks).length > 0 && (
        <ul
          style={{
            margin: 0,
            padding: "10px 0 0",
            listStyle: "none",
            display: "grid",
            gap: 4,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {Object.entries(result.checks).map(([key, value]) => {
            if (!value) return null;
            const passed = value.passed;
            return (
              <li
                key={key}
                style={{
                  display: "flex",
                  gap: 10,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.04em",
                  color: passed ? "var(--mint-up)" : "var(--coral-down)",
                }}
              >
                <span style={{ width: 12 }}>{passed ? "✓" : "✗"}</span>
                <span style={{ minWidth: 100, color: "var(--fg-tertiary)" }}>
                  {key}
                </span>
                <span style={{ color: "var(--fg-secondary)" }}>
                  {summariseCheck(key, value)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {result?.error && (
        <p style={{ margin: 0, color: "var(--coral-down)", fontSize: "var(--text-sm)" }}>
          Error: {result.error}
        </p>
      )}

      {result?.cascadeText && (
        <details>
          <summary
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--fg-tertiary)",
            }}
          >
            Reply ({result.cascadeText.length} chars)
          </summary>
          <pre
            style={{
              margin: "8px 0 0",
              padding: 12,
              background: "var(--canvas-recess)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-secondary)",
              maxHeight: 240,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {result.cascadeText}
          </pre>
        </details>
      )}
    </article>
  );
}

function summariseCheck(
  key: string,
  value: NonNullable<CaseResult["checks"][string]>,
): string {
  if (key === "spoke") {
    return `expected ${(value.expected as string[])?.join("|")} · actual ${value.actual}`;
  }
  if (key === "manifests") {
    const expected = value.expected as string[];
    const actual = value.actual as string[];
    if (expected.length === 0)
      return `forbidden · actual [${actual.join(", ") || "none"}]`;
    return `expected one of [${expected.join(", ")}] · actual [${actual.join(", ") || "none"}]`;
  }
  if (key === "mustContain") {
    return value.missing && value.missing.length > 0
      ? `missing: ${value.missing.join(", ")}`
      : "all substrings present";
  }
  if (key === "mustNotContain") {
    return value.hit && value.hit.length > 0
      ? `forbidden hits: ${value.hit.join(", ")}`
      : "no forbidden substrings";
  }
  if (key === "duration") {
    return `${value.ms}ms (max ${value.max}ms)`;
  }
  return "";
}
