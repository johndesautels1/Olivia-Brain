"use client";

interface StatsPanelProps {
  districtCount: number;
  totalOrgs: number;
  avgScore: string;
}

export default function StatsPanel({ districtCount, totalOrgs, avgScore }: StatsPanelProps) {
  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 lg:left-4 lg:translate-x-0 lg:bottom-6 z-10">
      <div className="ltm-panel ltm-stats-panel" role="region" aria-label="Map statistics">
        <div className="ltm-stats-grid">
          <div className="ltm-stat-block">
            <div className="ltm-stat-number">{districtCount}</div>
            <div className="ltm-stat-text">Districts</div>
          </div>
          <div className="ltm-stat-divider" />
          <div className="ltm-stat-block">
            <div className="ltm-stat-number">{totalOrgs}</div>
            <div className="ltm-stat-text">Orgs in Districts</div>
          </div>
          <div className="ltm-stat-divider" />
          <div className="ltm-stat-block">
            <div className="ltm-stat-number ltm-stat-accent">{avgScore}</div>
            <div className="ltm-stat-text">Avg Score</div>
          </div>
        </div>
      </div>
    </div>
  );
}
