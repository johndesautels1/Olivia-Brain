'use client';

// ═══════════════════════════════════════════════════════════════════════
// CascadeStatusBar — Discrete LLM agent success meter
// Fortune-50 boardroom aesthetic: 28px tall, monochrome + aurum accents.
// Only renders when modelStackVersion indicates a cascade run.
// ═══════════════════════════════════════════════════════════════════════

type AgentStatus = 'ok' | 'partial' | 'off';

interface AgentDot {
  id: string;
  /** 3-4 char label shown on hover */
  label: string;
  /** Full agent name for tooltip */
  fullName: string;
  status: AgentStatus;
}

export type CascadeStatusBarProps = {
  inputSnapshot: Record<string, unknown> | null;
};

function resolveAgents(snap: Record<string, unknown>): AgentDot[] {
  const agents: AgentDot[] = [
    {
      id: 'intake',
      label: 'DOC',
      fullName: 'Document Intake',
      // Intake always succeeds if we got here (cascade produced a result)
      status: 'ok',
    },
    {
      id: 'extraction',
      label: 'EXT',
      fullName: 'Financial Extraction',
      // If completenessScore exists, extraction ran
      status: typeof snap['completenessScore'] === 'number' ? 'ok' : 'off',
    },
    {
      id: 'validation',
      label: 'VAL',
      fullName: 'Data Validation',
      // Validation produces warnings array
      status: Array.isArray(snap['warnings']) ? 'ok' : 'off',
    },
    {
      id: 'engine',
      label: 'ENG',
      fullName: 'Valuation Engine',
      // Engine always runs in cascade (methods are in the result)
      status: 'ok',
    },
    {
      id: 'justification',
      label: 'OLV',
      fullName: 'Olivia (Justification)',
      status: snap['justification'] ? 'ok' : 'off',
    },
    {
      id: 'challenge',
      label: 'CRS',
      fullName: 'Cristiano (Challenge)',
      status: snap['challenge'] ? 'ok' : 'off',
    },
    {
      id: 'counter',
      label: 'CTR',
      fullName: 'Counter-Narrative',
      status: snap['counterNarrative'] ? 'ok' : 'off',
    },
    {
      id: 'premortem',
      label: 'PMT',
      fullName: 'Pre-Mortem',
      status: snap['preMortem'] ? 'ok' : 'off',
    },
  ];

  // Optional agents — only show if they ran
  if (snap['truthScore'] != null) {
    agents.push({
      id: 'truth',
      label: 'TRU',
      fullName: 'Truth Score',
      status: 'ok',
    });
  }
  if (snap['acquisitionMirror'] != null) {
    agents.push({
      id: 'mirror',
      label: 'MIR',
      fullName: 'Acquisition Mirror',
      status: 'ok',
    });
  }

  return agents;
}

const DOT_COLORS: Record<AgentStatus, string> = {
  ok: 'rgba(196, 169, 106, 0.9)',    // aurum — success
  partial: 'rgba(232, 212, 157, 0.6)', // aurum-muted — partial
  off: 'rgba(100, 116, 139, 0.35)',    // slate-muted — did not run
};

const GLOW: Record<AgentStatus, string> = {
  ok: '0 0 4px rgba(196, 169, 106, 0.4)',
  partial: 'none',
  off: 'none',
};

export default function CascadeStatusBar({ inputSnapshot }: CascadeStatusBarProps) {
  if (!inputSnapshot) return null;

  const version = inputSnapshot['modelStackVersion'];
  if (version !== 'cascade-v1') return null;

  const agents = resolveAgents(inputSnapshot);
  const successCount = agents.filter(a => a.status === 'ok').length;

  return (
    <div
      className="flex items-center justify-between px-3 sm:px-5 select-none"
      style={{
        height: 28,
        background: 'rgba(15, 23, 42, 0.6)',
        borderBottom: '1px solid rgba(196, 169, 106, 0.12)',
      }}
    >
      {/* Left: label */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span
          className="text-[10px] sm:text-[11px] font-bold tracking-[0.15em] uppercase"
          style={{ color: '#C4A96A' }}
        >
          Cascade
        </span>
        <span
          className="text-[10px] sm:text-[11px] font-semibold tabular-nums"
          style={{ color: '#94a3b8' }}
        >
          {successCount}/{agents.length}
        </span>
      </div>

      {/* Center: agent dots with connector lines */}
      <div className="flex items-center gap-0">
        {agents.map((agent, i) => (
          <div key={agent.id} className="flex items-center">
            {/* Connector line — shorter on mobile */}
            {i > 0 && (
              <div
                className="w-1 sm:w-3"
                style={{
                  height: 1,
                  background: agent.status === 'ok' && agents[i - 1].status === 'ok'
                    ? 'rgba(196, 169, 106, 0.2)'
                    : 'rgba(100, 116, 139, 0.12)',
                }}
              />
            )}
            {/* Dot — compact on mobile, touch-friendly wrapper */}
            <div className="group relative flex items-center justify-center w-5 h-7 sm:w-[18px] sm:h-[18px]">
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: DOT_COLORS[agent.status],
                  boxShadow: GLOW[agent.status],
                  transition: 'box-shadow 0.2s, background 0.2s',
                }}
              />
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-1.5 hidden group-hover:flex items-center pointer-events-none z-50 whitespace-nowrap"
                style={{ left: '50%', transform: 'translateX(-50%)' }}
              >
                <span
                  className="rounded px-2 py-1 text-[11px] font-medium"
                  style={{
                    background: 'rgba(15, 15, 20, 0.95)',
                    border: '1px solid rgba(196, 169, 106, 0.2)',
                    color: agent.status === 'ok'
                      ? 'rgba(196, 169, 106, 0.9)'
                      : 'rgba(148, 163, 184, 0.8)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {agent.fullName}
                  <span
                    className="ml-1.5"
                    style={{
                      color: agent.status === 'ok'
                        ? 'rgba(52, 211, 153, 0.8)'
                        : 'rgba(100, 116, 139, 0.5)',
                    }}
                  >
                    {agent.status === 'ok' ? '\u2713' : '\u2014'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right: version stamp — hidden on mobile to save space */}
      <span
        className="hidden sm:inline text-[11px] tracking-[0.1em] uppercase tabular-nums font-medium shrink-0"
        style={{ color: 'rgba(148, 163, 184, 0.6)' }}
      >
        v1
      </span>
    </div>
  );
}
