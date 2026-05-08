"use client";

import type { HeroBlockData } from "@/types/blocks";

const classificationColors: Record<string, { bg: string; text: string; border: string }> = {
  confidential: { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  internal: { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6", border: "rgba(59, 130, 246, 0.3)" },
  public_access: { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" },
  nda_required: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" },
};

interface HeroBlockProps {
  block: HeroBlockData;
  accent: string;
}

export default function HeroBlock({ block, accent }: HeroBlockProps) {
  const cls = classificationColors[block.classification || ""] || classificationColors.internal;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${accent}12 0%, transparent 60%),
                       radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
                       linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(10, 14, 26, 0.99))`,
        }}
      />

      {/* Content */}
      <div className="relative px-8 py-10 sm:px-12 sm:py-14">
        {/* Top row — logo mark + classification */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{
                background: `linear-gradient(135deg, ${accent}25, ${accent}08)`,
                border: `1px solid ${accent}40`,
                color: accent,
                boxShadow: `0 4px 16px ${accent}15`,
              }}
            >
              CI
            </div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#cbd5e1] font-medium">
              Clues Intelligence LTD
            </div>
          </div>

          {block.classification && (
            <div
              className="text-[9px] uppercase tracking-[0.15em] font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: cls.bg,
                color: cls.text,
                border: `1px solid ${cls.border}`,
              }}
            >
              {block.classification.replace(/_/g, " ")}
            </div>
          )}
        </div>

        {/* Title */}
        <h1
          className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight"
          style={{ color: "#f1f5f9" }}
        >
          {block.title}
        </h1>

        {block.subtitle && (
          <p
            className="mt-2 text-lg font-medium tracking-wide"
            style={{ color: accent }}
          >
            {block.subtitle}
          </p>
        )}

        {/* Date + divider */}
        {block.date && (
          <div className="mt-6 flex items-center gap-4">
            <div
              className="h-px flex-1"
              style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }}
            />
            <span className="text-[11px] uppercase tracking-[0.15em] text-[#64748b] font-medium">
              {block.date}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
