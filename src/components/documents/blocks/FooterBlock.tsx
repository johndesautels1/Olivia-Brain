import type { FooterBlockData } from "@/types/blocks";

interface FooterBlockProps {
  block: FooterBlockData;
  accent: string;
}

export default function FooterBlock({ block }: FooterBlockProps) {
  return (
    <div
      className="mt-10 px-8 py-4 flex items-center justify-between rounded-b-xl"
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="text-[11px] text-[#cbd5e1]">
        {block.copyright || `© 2026 ${block.company || "Clues Intelligence LTD"}. All rights reserved.`}
      </div>
      <div className="flex items-center gap-4">
        {block.address && (
          <div className="text-[11px] text-[#cbd5e1]">
            {block.address}
          </div>
        )}
        {block.classification && (
          <div className="text-[9px] uppercase tracking-wider text-[#cbd5e1] font-medium">
            {block.classification.replace(/_/g, " ")}
          </div>
        )}
      </div>
    </div>
  );
}
