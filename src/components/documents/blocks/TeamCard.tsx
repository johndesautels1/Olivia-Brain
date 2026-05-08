import type { TeamCardBlockData } from "@/types/blocks";
import { User } from "lucide-react";

interface TeamCardProps {
  block: TeamCardBlockData;
  accent: string;
}

export default function TeamCard({ block, accent }: TeamCardProps) {
  return (
    <div
      className="my-6 rounded-xl overflow-hidden"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="px-6 py-6">
        <div className="flex items-start gap-4">
          {/* Avatar placeholder */}
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accent}20, ${accent}08)`,
              border: `1px solid ${accent}30`,
            }}
          >
            <User size={24} style={{ color: accent }} />
          </div>
          <div>
            <div className="text-lg font-bold text-[#f1f5f9]">{block.name}</div>
            <div className="text-sm font-medium" style={{ color: accent }}>
              {block.role}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-[#cbd5e1] leading-[1.8]">{block.bio}</p>

        {block.highlights && block.highlights.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {block.highlights.map((h, i) => (
              <span
                key={i}
                className="text-[11px] uppercase tracking-[0.08em] font-medium px-2.5 py-1 rounded-full"
                style={{
                  background: `${accent}10`,
                  color: `${accent}cc`,
                  border: `1px solid ${accent}20`,
                }}
              >
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
