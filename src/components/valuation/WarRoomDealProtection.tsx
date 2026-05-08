'use client';

/**
 * Track P Session P6 — WarRoom Deal Protection panel.
 *
 * Mounted inside WarRoomBriefing as a new section when the parent
 * `WarRoom` is given a `valuationSubjectId`. Surfaces:
 *
 *   - The latest persisted `DealAnalysis` for the subject (smart score
 *     + band + critical issues + walk-away reasons + investor signal).
 *   - The list of `CounterTermSheet` versions for that analysis.
 *   - A "Generate counter draft" button that POSTs to
 *     `/api/deal-protection/counter-draft` and refreshes the list.
 *   - The selected counter draft's redlined markdown rendered inline.
 *
 * Self-contained — does not require extending the WarRoom mode system.
 * Visual polish is intentionally minimal (Track C polishes per W-013).
 */
import { useEffect, useState } from 'react';

interface AnalysisSummary {
  id: string;
  smartScore: number;
  smartBand: 'red' | 'orange' | 'yellow' | 'blue' | 'green';
  bandLanguage: string;
  recommendedAction: string;
  investorSignal: string;
  generatedAt: string;
  runtimeMode: 'live' | 'mock';
  clauseAnalyses: ReadonlyArray<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    toxicity: number;
    summary: string;
    clauseType: string;
  }>;
}

interface CounterDraft {
  id: string;
  dealAnalysisId: string;
  versionNumber: number;
  redlinedMarkdown: string;
  changes: ReadonlyArray<{
    clauseType: string;
    originalText: string;
    counterText: string;
    rationale: string;
  }>;
  founderNotes: string | null;
  runtimeMode: 'live' | 'mock';
  generatedAt: string;
}

const BAND_COLORS: Record<AnalysisSummary['smartBand'], string> = {
  red: 'var(--coral-down, #F28D7F)',
  orange: 'var(--amber-warn, #FBBF24)',
  yellow: 'var(--sky-info, #7DD3FC)',
  blue: 'var(--aether-primary, #818CF8)',
  green: 'var(--mint-up, #5EE0BE)',
};

export interface WarRoomDealProtectionProps {
  valuationSubjectId: string;
  companyName: string;
  recipientName?: string;
  founderName?: string;
}

export default function WarRoomDealProtection({
  valuationSubjectId,
  companyName,
  recipientName,
  founderName,
}: WarRoomDealProtectionProps) {
  const [analysis, setAnalysis] = useState<AnalysisSummary | null>(null);
  const [drafts, setDrafts] = useState<CounterDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load latest analysis + drafts ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/deal-protection/analyze?subjectId=${encodeURIComponent(valuationSubjectId)}`,
          { cache: 'no-store' },
        );
        const data = (await res.json()) as { ok: boolean; analyses?: AnalysisSummary[]; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setError(data.error ?? 'Failed to load analysis');
          setAnalysis(null);
          return;
        }
        const latest = data.analyses?.[0] ?? null;
        setAnalysis(latest);
        if (!latest) {
          setDrafts([]);
          return;
        }
        const draftsRes = await fetch(
          `/api/deal-protection/counter-draft?dealAnalysisId=${encodeURIComponent(latest.id)}`,
          { cache: 'no-store' },
        );
        const draftsData = (await draftsRes.json()) as { ok: boolean; drafts?: CounterDraft[]; error?: string };
        if (cancelled) return;
        if (!draftsRes.ok || !draftsData.ok) {
          setError(draftsData.error ?? 'Failed to load counter drafts');
          return;
        }
        const list = draftsData.drafts ?? [];
        setDrafts(list);
        setSelectedDraftId(list[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [valuationSubjectId]);

  // ── Generate counter draft ─────────────────────────────────────────
  const generateCounter = async () => {
    if (!analysis) return;
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch('/api/deal-protection/counter-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealAnalysisId: analysis.id,
          companyName,
          recipientName,
          founderName,
        }),
      });
      const data = (await res.json()) as { ok: boolean; draft?: CounterDraft; error?: string };
      if (!res.ok || !data.ok || !data.draft) {
        setError(data.error ?? 'Counter draft generation failed');
        return;
      }
      setDrafts((prev) => [data.draft as CounterDraft, ...prev]);
      setSelectedDraftId(data.draft.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Counter draft generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const selectedDraft = drafts.find((d) => d.id === selectedDraftId) ?? null;
  const criticalCount = analysis?.clauseAnalyses.filter((c) => c.severity === 'critical').length ?? 0;

  return (
    <section
      data-testid="war-room-deal-protection"
      style={{
        padding: '24px',
        borderRadius: '16px',
        border: '1px solid var(--border-default, rgba(180,190,210,0.14))',
        background: 'var(--surface-1, #0A1322)',
        color: 'var(--fg-primary, #F1ECE0)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Deal Protection</h2>
          <p style={{ fontSize: '12px', color: 'var(--fg-tertiary, #8B897F)', margin: '4px 0 0' }}>
            Smart-score band + clause analysis + counter term sheet draft
          </p>
        </div>
        {analysis ? (
          <button
            type="button"
            onClick={generateCounter}
            disabled={generating}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--aurum-primary, #C4A96A)',
              background: generating ? 'var(--surface-2, #111B2E)' : 'var(--aurum-primary, #C4A96A)',
              color: generating ? 'var(--fg-tertiary, #8B897F)' : 'var(--fg-on-accent, #0E0805)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? 'Generating…' : drafts.length > 0 ? 'Generate new version' : 'Generate counter draft'}
          </button>
        ) : null}
      </header>

      {loading ? (
        <p style={{ color: 'var(--fg-tertiary)', fontSize: '13px' }}>Loading analysis…</p>
      ) : null}

      {error ? (
        <p
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--coral-down, #F28D7F)',
            color: 'var(--coral-down, #F28D7F)',
            fontSize: '12px',
            marginBottom: '12px',
          }}
        >
          {error}
        </p>
      ) : null}

      {!loading && !analysis ? (
        <p style={{ fontSize: '13px', color: 'var(--fg-secondary, #CBC9BD)' }}>
          No deal-protection analysis found for this subject yet. Run the analyzer first via the founder intake or
          <code style={{ marginLeft: '4px' }}>POST /api/deal-protection/analyze</code>.
        </p>
      ) : null}

      {analysis ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) 1fr', gap: '24px' }}>
          {/* ── Left: report summary ── */}
          <div>
            <div
              style={{
                padding: '14px',
                borderRadius: '10px',
                border: `1px solid ${BAND_COLORS[analysis.smartBand]}`,
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '32px',
                    fontWeight: 700,
                    color: BAND_COLORS[analysis.smartBand],
                  }}
                >
                  {analysis.smartScore.toFixed(0)}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: BAND_COLORS[analysis.smartBand],
                    color: 'var(--fg-on-accent, #0E0805)',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  }}
                >
                  {analysis.smartBand}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', margin: '8px 0 0' }}>
                {analysis.bandLanguage}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--fg-tertiary)', margin: '6px 0 0' }}>
                Investor signal: <strong>{analysis.investorSignal}</strong>
                {analysis.runtimeMode === 'mock' ? ' · mock-mode' : ''}
              </p>
            </div>

            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-tertiary)' }}>
              Critical issues ({criticalCount})
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 16px' }}>
              {analysis.clauseAnalyses
                .filter((c) => c.severity === 'critical' || c.severity === 'high')
                .slice(0, 5)
                .map((c, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: '12px',
                      color: 'var(--fg-secondary)',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--border-subtle, rgba(180,190,210,0.08))',
                    }}
                  >
                    <strong>{c.clauseType}</strong>: {c.summary}{' '}
                    <span style={{ color: 'var(--fg-tertiary)' }}>(toxicity {c.toxicity})</span>
                  </li>
                ))}
            </ul>

            <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-tertiary)' }}>
              Counter drafts ({drafts.length})
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0' }}>
              {drafts.length === 0 ? (
                <li style={{ fontSize: '12px', color: 'var(--fg-tertiary)' }}>No drafts yet.</li>
              ) : (
                drafts.map((d) => {
                  const active = d.id === selectedDraftId;
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedDraftId(d.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 10px',
                          marginBottom: '4px',
                          borderRadius: '6px',
                          border: `1px solid ${active ? 'var(--aurum-primary, #C4A96A)' : 'var(--border-default)'}`,
                          background: active ? 'var(--aurum-mute, rgba(196,169,106,0.14))' : 'transparent',
                          color: 'var(--fg-primary)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        v{d.versionNumber} · {new Date(d.generatedAt).toLocaleDateString()} ·{' '}
                        {d.runtimeMode === 'mock' ? 'mock' : 'live'}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* ── Right: selected draft ── */}
          <div>
            {selectedDraft ? (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>
                  Counter draft — v{selectedDraft.versionNumber}
                </h3>
                <p style={{ fontSize: '11px', color: 'var(--fg-tertiary)', margin: '0 0 12px' }}>
                  Generated {new Date(selectedDraft.generatedAt).toLocaleString()} ·{' '}
                  {selectedDraft.runtimeMode === 'mock' ? 'mock-mode (deterministic template)' : 'cascade-drafted'}
                </p>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--canvas-recess, var(--surface-1))',
                    color: 'var(--fg-primary)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-sans, system-ui)',
                    maxHeight: '480px',
                    overflowY: 'auto',
                    margin: 0,
                  }}
                >
                  {selectedDraft.redlinedMarkdown}
                </pre>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--fg-tertiary)' }}>
                {drafts.length === 0
                  ? 'Click "Generate counter draft" to draft a redlined counter for this analysis.'
                  : 'Select a draft to view its redlines.'}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
