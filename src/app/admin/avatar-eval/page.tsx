"use client";

/**
 * `/admin/avatar-eval` — Track O5c sessions 2 + 3.
 *
 * Per-vendor MOS-rating harness for the avatar A/B comparison.
 * Operator picks a vendor + a script from the 30-script suite,
 * captures TTFM + a 1–5 MOS rating, and records back into
 * `AvatarEvalRun` via `/api/admin/avatar-eval/runs`.
 *
 * Live trigger (S3): for `liveavatar` only, the "Run live" button
 * POSTs the script to `/api/olivia/liveavatar/speak-stream` and
 * captures TTFM (request-start to first PCM byte) via
 * `performance.now()`. For other vendors, capture stays out-of-band —
 * drive the vendor's player and paste latency in. The full
 * `OliviaVideoAvatar` abstraction lift was scoped out of S3.
 *
 * Decision rubric: see `/admin/avatar-eval/decision` —
 * latency × 0.4 + lip-sync MOS × 0.4 + cost × 0.2.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EVAL_SCRIPTS,
  EVAL_VENDORS,
  type EvalScript,
  type EvalScriptCategory,
  type EvalVendor,
} from "@/lib/avatar/eval-scripts";
import { LIVEAVATAR_SPEAK_STREAM_PATH } from "@/lib/avatar/liveavatar";

const CATEGORY_ORDER: readonly EvalScriptCategory[] = [
  "short",
  "medium",
  "number_heavy",
  "plosive",
  "multilingual",
  "long_form",
];

const CATEGORY_LABEL: Record<EvalScriptCategory, string> = {
  short: "Short utterances",
  medium: "Medium sentences",
  number_heavy: "Number-heavy",
  plosive: "Plosive-heavy (b/p/m)",
  multilingual: "Multilingual",
  long_form: "Long-form",
};

interface AvatarEvalRunRow {
  id: string;
  vendor: string;
  scriptId: string;
  scriptCategory: string;
  scriptText: string;
  latencyMs: number;
  mosScore: number | null;
  costCents: number | null;
  raterId: string | null;
  notes: string | null;
  createdAt: string;
}

interface RunsApiResponse {
  ok: boolean;
  runs?: AvatarEvalRunRow[];
  run?: AvatarEvalRunRow;
  error?: string;
}

export default function AvatarEvalPage() {
  const [vendor, setVendor] = useState<EvalVendor>("tavus");
  const [scriptId, setScriptId] = useState<string>(EVAL_SCRIPTS[0].id);
  const [latencyMs, setLatencyMs] = useState<string>("");
  const [mosScore, setMosScore] = useState<string>("");
  const [costCents, setCostCents] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [liveCapturing, setLiveCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<AvatarEvalRunRow[]>([]);

  const script = useMemo(
    () => EVAL_SCRIPTS.find((s) => s.id === scriptId) ?? EVAL_SCRIPTS[0],
    [scriptId],
  );

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/avatar-eval/runs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RunsApiResponse;
      setRuns(data.runs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "runs load failed");
    }
  }, []);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const submit = useCallback(async () => {
    setError(null);
    const latency = Number.parseInt(latencyMs, 10);
    if (!Number.isFinite(latency) || latency < 0) {
      setError("Latency must be a non-negative integer (ms).");
      return;
    }
    const mos = mosScore.trim() === "" ? undefined : Number.parseFloat(mosScore);
    if (mos !== undefined && (mos < 1 || mos > 5)) {
      setError("MOS must be between 1.0 and 5.0.");
      return;
    }
    const cost = costCents.trim() === "" ? undefined : Number.parseInt(costCents, 10);
    if (cost !== undefined && (!Number.isFinite(cost) || cost < 0)) {
      setError("Cost must be a non-negative integer (cents).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/avatar-eval/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor,
          scriptId,
          latencyMs: latency,
          mosScore: mos,
          costCents: cost,
          notes: notes.trim() === "" ? undefined : notes.trim(),
        }),
      });
      const data = (await res.json()) as RunsApiResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setLatencyMs("");
      setMosScore("");
      setCostCents("");
      setNotes("");
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [vendor, scriptId, latencyMs, mosScore, costCents, notes, loadRuns]);

  /**
   * S3 live-trigger: only meaningful for `liveavatar` today (existing
   * `/api/olivia/liveavatar/speak-stream` route returns PCM as a
   * stream; we time request-start to first byte received).
   *
   * For Tavus / Simli the live path requires a real WebRTC session
   * setup that the harness can't drive without dragging in vendor
   * SDKs — those stay manual-entry until the abstraction lift lands
   * in a follow-up session.
   */
  const runLive = useCallback(async () => {
    if (vendor !== "liveavatar") return;
    setError(null);
    setLiveCapturing(true);
    const t0 = performance.now();
    try {
      const res = await fetch(LIVEAVATAR_SPEAK_STREAM_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script.text }),
      });
      const contentType = res.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        // The route returned its JSON fallback (env missing or
        // upstream declined). Surface the reason instead of writing a
        // bogus latency.
        const data = (await res.json().catch(() => ({}))) as {
          fallback?: boolean;
          reason?: string;
          error?: string;
        };
        const reason = data.reason ?? data.error ?? "fallback";
        throw new Error(`LiveAvatar declined: ${reason}`);
      }
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const first = await reader.read();
      const t1 = performance.now();
      // Cancel after first byte — we only need TTFM, not the full PCM.
      void reader.cancel().catch(() => {});
      if (first.done) {
        throw new Error("Empty response stream");
      }
      const ttfm = Math.max(0, Math.round(t1 - t0));
      setLatencyMs(String(ttfm));
    } catch (err) {
      setError(err instanceof Error ? err.message : "live trigger failed");
    } finally {
      setLiveCapturing(false);
    }
  }, [vendor, script.text]);

  const runsForSelection = useMemo(
    () => runs.filter((r) => r.vendor === vendor && r.scriptId === scriptId),
    [runs, vendor, scriptId],
  );

  const vendorMosByScript = useMemo(() => {
    // For the script grid: per-(vendor,scriptId) latest MOS so the
    // operator can see at a glance what's been rated.
    const map = new Map<string, number>();
    for (const r of runs) {
      if (r.mosScore == null) continue;
      const key = `${r.vendor}::${r.scriptId}`;
      if (!map.has(key)) map.set(key, r.mosScore);
    }
    return map;
  }, [runs]);

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
          /admin/avatar-eval · O5c S2
        </span>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-3xl)",
            fontWeight: 500,
          }}
        >
          Avatar vendor A/B harness
        </h1>
        <p
          style={{
            margin: 0,
            color: "var(--fg-tertiary)",
            fontSize: "var(--text-sm)",
            maxWidth: 720,
          }}
        >
          Run each script through each vendor, capture
          time-to-first-mouth-movement plus a 1–5 MOS rating, and{" "}
          <a
            href="/admin/avatar-eval/decision"
            style={{ color: "var(--aurum-primary)" }}
          >
            the decision rubric
          </a>{" "}
          (latency × 0.4 + lip-sync MOS × 0.4 + cost × 0.2) ranks them. The
          "Run live" button captures TTFM directly for the LiveAvatar vendor;
          for other vendors, drive the vendor's own player and paste the
          latency in.
        </p>
      </header>

      {/* Vendor selector */}
      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
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
            paddingRight: 8,
          }}
        >
          Vendor
        </span>
        {EVAL_VENDORS.map((v) => {
          const active = v === vendor;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVendor(v)}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                background: active
                  ? "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))"
                  : "var(--canvas-recess)",
                color: active ? "var(--fg-on-accent)" : "var(--fg-secondary)",
                border: `1px solid ${active ? "var(--border-aurum)" : "var(--border-default)"}`,
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-2xs)",
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {v}
            </button>
          );
        })}
      </section>

      {/* Two-column layout: script picker + capture form */}
      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(360px, 1fr) minmax(360px, 1fr)",
        }}
      >
        {/* Left: script catalog grouped by category */}
        <div style={{ display: "grid", gap: 12 }}>
          {CATEGORY_ORDER.map((cat) => (
            <CategoryGroup
              key={cat}
              category={cat}
              scripts={EVAL_SCRIPTS.filter((s) => s.category === cat)}
              selectedScriptId={scriptId}
              onSelect={setScriptId}
              vendor={vendor}
              vendorMosByScript={vendorMosByScript}
            />
          ))}
        </div>

        {/* Right: capture form */}
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <article
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-1)",
              border: "1px solid var(--border-default)",
              display: "grid",
              gap: 10,
            }}
          >
            <header style={{ display: "grid", gap: 4 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-2xs)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "var(--aurum-primary)",
                }}
              >
                {script.id} · {CATEGORY_LABEL[script.category]}
              </span>
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-md)",
                  color: "var(--fg-primary)",
                  fontStyle: "italic",
                }}
              >
                "{script.text}"
              </p>
              {script.notes && (
                <span
                  style={{
                    fontSize: "var(--text-2xs)",
                    color: "var(--fg-tertiary)",
                  }}
                >
                  {script.notes}
                </span>
              )}
            </header>
          </article>

          <article
            style={{
              padding: 16,
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-1)",
              border: "1px solid var(--border-default)",
              display: "grid",
              gap: 12,
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
              Capture run · {vendor}
            </span>

            <FormField label="Latency (ms) — time to first mouth movement">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={latencyMs}
                onChange={(e) => setLatencyMs(e.target.value)}
                placeholder="e.g. 250"
                style={inputStyle}
              />
            </FormField>

            <FormField label="MOS (1.0–5.0) — optional">
              <input
                inputMode="decimal"
                value={mosScore}
                onChange={(e) => setMosScore(e.target.value)}
                placeholder="e.g. 4.2"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Cost (cents) — optional">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={costCents}
                onChange={(e) => setCostCents(e.target.value)}
                placeholder="e.g. 12"
                style={inputStyle}
              />
            </FormField>

            <FormField label="Notes — optional">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="anything the rubric won't capture"
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </FormField>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--radius-full)",
                  background: submitting
                    ? "var(--surface-2)"
                    : "linear-gradient(135deg, var(--aurum-primary), var(--aurum-soft))",
                  color: submitting ? "var(--fg-tertiary)" : "var(--fg-on-accent)",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "var(--text-sm)",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Saving…" : "Record run"}
              </button>

              {vendor === "liveavatar" && (
                <button
                  type="button"
                  onClick={() => void runLive()}
                  disabled={liveCapturing}
                  title="POST the script to /api/olivia/liveavatar/speak-stream and time the request-start to first PCM byte. Auto-fills latency."
                  style={{
                    padding: "10px 18px",
                    borderRadius: "var(--radius-full)",
                    background: liveCapturing
                      ? "var(--surface-2)"
                      : "var(--canvas-recess)",
                    color: liveCapturing
                      ? "var(--fg-tertiary)"
                      : "var(--aurum-primary)",
                    border: "1px solid var(--border-aurum)",
                    fontWeight: 600,
                    fontSize: "var(--text-sm)",
                    cursor: liveCapturing ? "not-allowed" : "pointer",
                  }}
                >
                  {liveCapturing ? "Capturing…" : "Run live (TTFM)"}
                </button>
              )}
            </div>

            {error && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  color: "var(--coral-down)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {error}
              </p>
            )}
          </article>

          {runsForSelection.length > 0 && (
            <article
              style={{
                padding: 16,
                borderRadius: "var(--radius-lg)",
                background: "var(--surface-1)",
                border: "1px solid var(--border-default)",
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
                  color: "var(--fg-tertiary)",
                }}
              >
                Prior runs · {vendor} × {script.id} · {runsForSelection.length}
              </span>
              {runsForSelection.slice(0, 8).map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </article>
          )}
        </div>
      </section>

      {/* All recent runs */}
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
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
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
            All recent runs · {runs.length}
          </span>
          <button
            type="button"
            onClick={() => void loadRuns()}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              color: "var(--aurum-primary)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Refresh
          </button>
        </header>
        {runs.length === 0 ? (
          <p style={{ margin: 0, color: "var(--fg-tertiary)" }}>
            No runs yet. Record one above to populate the rubric.
          </p>
        ) : (
          runs.slice(0, 24).map((r) => <RunRow key={r.id} run={r} showVendorAndScript />)
        )}
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--canvas-recess)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-md)",
  color: "var(--fg-primary)",
  padding: "8px 10px",
  fontSize: "var(--text-sm)",
  fontFamily: "var(--font-mono)",
  width: "100%",
};

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-2xs)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--fg-tertiary)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function CategoryGroup({
  category,
  scripts,
  selectedScriptId,
  onSelect,
  vendor,
  vendorMosByScript,
}: {
  category: EvalScriptCategory;
  scripts: readonly EvalScript[];
  selectedScriptId: string;
  onSelect: (id: string) => void;
  vendor: EvalVendor;
  vendorMosByScript: Map<string, number>;
}) {
  return (
    <article
      style={{
        padding: 12,
        borderRadius: "var(--radius-lg)",
        background: "var(--surface-1)",
        border: "1px solid var(--border-default)",
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
          color: "var(--aurum-primary)",
        }}
      >
        {CATEGORY_LABEL[category]} · {scripts.length}
      </span>
      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 6,
        }}
      >
        {scripts.map((s) => {
          const active = s.id === selectedScriptId;
          const mos = vendorMosByScript.get(`${vendor}::${s.id}`);
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  background: active ? "var(--canvas-recess)" : "transparent",
                  border: `1px solid ${active ? "var(--border-aurum)" : "var(--border-subtle)"}`,
                  color: "var(--fg-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      letterSpacing: "0.06em",
                      color: active ? "var(--aurum-primary)" : "var(--fg-tertiary)",
                    }}
                  >
                    {s.id}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--text-sm)",
                      color: "var(--fg-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    "{s.text}"
                  </span>
                </span>
                {mos != null && (
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      color: mos >= 4 ? "var(--mint-up)" : "var(--fg-tertiary)",
                      flexShrink: 0,
                    }}
                  >
                    {mos.toFixed(1)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function RunRow({
  run,
  showVendorAndScript = false,
}: {
  run: AvatarEvalRunRow;
  showVendorAndScript?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "baseline",
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-2xs)",
        color: "var(--fg-secondary)",
        borderTop: "1px solid var(--border-subtle)",
        paddingTop: 6,
      }}
    >
      <span style={{ color: "var(--fg-tertiary)", minWidth: 110 }}>
        {new Date(run.createdAt).toLocaleString()}
      </span>
      {showVendorAndScript && (
        <>
          <span style={{ minWidth: 80, color: "var(--aurum-primary)" }}>
            {run.vendor}
          </span>
          <span style={{ minWidth: 90, color: "var(--fg-tertiary)" }}>
            {run.scriptId}
          </span>
        </>
      )}
      <span className="tabular-nums">{run.latencyMs}ms</span>
      {run.mosScore != null && (
        <span
          className="tabular-nums"
          style={{ color: run.mosScore >= 4 ? "var(--mint-up)" : "var(--fg-secondary)" }}
        >
          MOS {run.mosScore.toFixed(1)}
        </span>
      )}
      {run.costCents != null && (
        <span className="tabular-nums" style={{ color: "var(--fg-tertiary)" }}>
          {(run.costCents / 100).toFixed(2)}¢
        </span>
      )}
      {run.notes && (
        <span style={{ color: "var(--fg-tertiary)", fontStyle: "italic" }}>
          {run.notes.length > 60 ? `${run.notes.slice(0, 60)}…` : run.notes}
        </span>
      )}
    </div>
  );
}
