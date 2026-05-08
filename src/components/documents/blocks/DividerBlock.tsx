import type { DividerBlockData } from "@/types/blocks";

interface DividerBlockProps {
  block: DividerBlockData;
  accent: string;
}

export default function DividerBlock({ block, accent }: DividerBlockProps) {
  const style = block.style || "gradient";

  if (style === "diamond") {
    return (
      <div className="my-8 flex items-center gap-4">
        <div
          className="h-px flex-1"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }}
        />
        <div
          className="w-2 h-2 rotate-45"
          style={{ background: accent }}
        />
        <div
          className="h-px flex-1"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }}
        />
      </div>
    );
  }

  if (style === "dots") {
    return (
      <div className="my-8 flex items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: `${accent}${i === 1 ? "80" : "40"}` }}
          />
        ))}
      </div>
    );
  }

  // Default: gradient
  return (
    <div className="my-8 flex items-center gap-4">
      <div
        className="h-px flex-1"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }}
      />
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: accent }}
      />
      <div
        className="h-px flex-1"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }}
      />
    </div>
  );
}
