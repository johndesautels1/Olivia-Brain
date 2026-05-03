"use client";

import { useState } from "react";
import { SCORE_BLOB_COLORS } from "../constants";

export default function MapLegend() {
  const [showHelp, setShowHelp] = useState(false);

  const tiers = [
    { color: SCORE_BLOB_COLORS.red,    label: "0–20",   tag: "Emerging", size: 18 },
    { color: SCORE_BLOB_COLORS.orange,  label: "21–40",  tag: "Growing",  size: 22 },
    { color: SCORE_BLOB_COLORS.yellow,  label: "41–60",  tag: "Moderate", size: 26 },
    { color: SCORE_BLOB_COLORS.blue,    label: "61–80",  tag: "Strong",   size: 30 },
    { color: SCORE_BLOB_COLORS.green,   label: "81–100", tag: "Leading",  size: 34 },
  ];

  return (
    <div className="hidden md:block absolute bottom-12 right-4 z-10" style={{ maxWidth: 240 }}>
      <div className="ltm-panel">
        {/* Score-based cluster guide */}
        <div className="ltm-panel-title">Tech Gravity Score</div>
        <div className="flex items-end justify-between gap-1.5 mb-3">
          {tiers.map((tier) => (
            <div key={tier.label} className="flex flex-col items-center gap-1">
              <div
                className="rounded-full border-2 border-white/30"
                style={{
                  width: tier.size,
                  height: tier.size,
                  background: tier.color,
                  boxShadow: `0 0 10px ${tier.color}50`,
                }}
              />
              <span className="text-[8px] text-[#e2e8f0] font-bold leading-tight">{tier.label}</span>
              <span className="text-[7px] text-[#94a3b8] leading-tight">{tier.tag}</span>
            </div>
          ))}
        </div>

        {/* Heatmap */}
        <div className="ltm-panel-title" style={{ marginTop: 4 }}>Heatmap</div>
        <div className="ltm-legend-gradient" />
        <div className="flex justify-between text-[9px] text-[#94a3b8] mt-1 mb-2">
          <span>Low</span>
          <span>High</span>
        </div>

        {/* Help toggle */}
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full text-left text-[11px] text-[#818cf8] hover:text-[#a5b4fc] transition-colors font-medium"
          aria-expanded={showHelp}
        >
          {showHelp ? "Hide guide" : "What am I looking at?"}
        </button>

        {showHelp && (
          <div className="mt-2 text-[11px] text-[#94a3b8] leading-relaxed space-y-1.5">
            <p>
              Blob <strong className="text-[#e2e8f0]">color</strong> reflects the district&apos;s Tech Gravity Score — red is low, green is high. Blob <strong className="text-[#e2e8f0]">size</strong> shows how many companies are clustered. Click a blob to see the companies inside.
            </p>
            <p>
              The <strong className="text-[#e2e8f0]">heatmap</strong> shows overall tech density. Brighter areas have more activity.
            </p>
            <p>
              <strong className="text-[#e2e8f0]">Individual pins</strong> appear at higher zoom levels, colored by sector.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
