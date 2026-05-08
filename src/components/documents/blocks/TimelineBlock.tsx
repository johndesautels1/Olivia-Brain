import type { TimelineBlockData } from "@/types/blocks";

interface TimelineBlockProps {
  block: TimelineBlockData;
  accent: string;
}

export default function TimelineBlock({ block, accent }: TimelineBlockProps) {
  if (!block.items?.length) return null;

  return (
    <div className="my-8">
      {block.title && (
        <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">{block.title}</h4>
      )}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px"
          style={{
            background: `linear-gradient(180deg, ${accent}60, ${accent}10)`,
          }}
        />

        <div className="space-y-6">
          {block.items.map((item, i) => (
            <div key={i} className="relative">
              {/* Dot */}
              <div
                className="absolute -left-6 top-1.5 w-[9px] h-[9px] rounded-full"
                style={{
                  background: accent,
                  boxShadow: `0 0 8px ${accent}50`,
                }}
              />

              <div className="text-[11px] uppercase tracking-[0.1em] text-[#64748b] font-medium mb-0.5">
                {item.date}
              </div>
              <div className="text-sm font-semibold text-[#f1f5f9]">
                {item.title}
              </div>
              {item.description && (
                <p className="mt-1 text-xs text-[#cbd5e1] leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
