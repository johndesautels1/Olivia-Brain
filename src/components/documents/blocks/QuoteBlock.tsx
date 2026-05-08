import type { QuoteBlockData } from "@/types/blocks";

interface QuoteBlockProps {
  block: QuoteBlockData;
  accent: string;
}

export default function QuoteBlock({ block, accent }: QuoteBlockProps) {
  return (
    <div
      className="my-8 rounded-xl px-6 py-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${accent}08, ${accent}03)`,
        border: `1px solid ${accent}20`,
        borderLeftWidth: "3px",
        borderLeftColor: accent,
      }}
    >
      {/* Decorative quote mark */}
      <div
        className="absolute top-3 right-5 text-5xl font-serif leading-none select-none"
        style={{ color: `${accent}15` }}
      >
        &ldquo;
      </div>

      <p className="italic text-sm text-[#cbd5e1] leading-relaxed relative z-10">
        {block.text}
      </p>

      {block.attribution && (
        <div className="mt-3 text-[11px] font-medium" style={{ color: `${accent}cc` }}>
          &mdash; {block.attribution}
        </div>
      )}
    </div>
  );
}
