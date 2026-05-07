'use client';

// ── Props ────────────────────────────────────────────────────────────

export type RiskOpportunityPanelProps = {
  risks: string[];
  opportunities: string[];
};

// ── Component ────────────────────────────────────────────────────────

export default function RiskOpportunityPanel({
  risks,
  opportunities,
}: RiskOpportunityPanelProps) {
  if (risks.length === 0 && opportunities.length === 0) {
    return (
      <p className="text-[11px] text-text-secondary text-center py-6">
        No risks or opportunities identified.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#34D399' }}>
              Opportunities
            </span>
            <span className="text-[10px] text-text-secondary tabular-nums ml-auto">
              {opportunities.length} identified
            </span>
          </div>
          <div className="space-y-2">
            {opportunities.map((o, i) => (
              <div
                key={i}
                className="relative rounded-lg px-4 py-3 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(52,211,153,0.05) 0%, rgba(52,211,153,0.01) 100%)',
                  borderLeft: '3px solid rgba(52,211,153,0.5)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold tabular-nums" style={{ color: 'rgba(52,211,153,0.6)', minWidth: 18 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs text-text-primary leading-relaxed">{o}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: 'rgba(232,72,85,0.12)', border: '1px solid rgba(232,72,85,0.2)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E84855" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: '#E84855' }}>
              Risks
            </span>
            <span className="text-[10px] text-text-secondary tabular-nums ml-auto">
              {risks.length} identified
            </span>
          </div>
          <div className="space-y-2">
            {risks.map((r, i) => (
              <div
                key={i}
                className="relative rounded-lg px-4 py-3 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(232,72,85,0.05) 0%, rgba(232,72,85,0.01) 100%)',
                  borderLeft: '3px solid rgba(232,72,85,0.5)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 mt-0.5 text-[11px] font-bold tabular-nums" style={{ color: 'rgba(232,72,85,0.6)', minWidth: 18 }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs text-text-primary leading-relaxed">{r}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
