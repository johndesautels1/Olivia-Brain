import type { ProductCardBlockData } from "@/types/blocks";
import { Zap, Globe, Brain, Heart, Database, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  zap: Zap,
  globe: Globe,
  brain: Brain,
  heart: Heart,
  database: Database,
  "bar-chart": BarChart3,
};

const statusColors: Record<string, { bg: string; text: string }> = {
  live: { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" },
  development: { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" },
  planned: { bg: "rgba(148, 163, 184, 0.15)", text: "#94a3b8" },
};

interface ProductCardProps {
  block: ProductCardBlockData;
  accent: string;
}

export default function ProductCard({ block, accent }: ProductCardProps) {
  if (!block.items?.length) return null;

  return (
    <div className="my-6 grid gap-3 sm:grid-cols-2">
      {block.items.map((item, i) => {
        const Icon = item.icon ? iconMap[item.icon] || Zap : Zap;
        const status = statusColors[item.status?.toLowerCase() || "planned"] || statusColors.planned;

        return (
          <div
            key={i}
            className="rounded-xl px-5 py-4"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon size={16} style={{ color: accent }} />
              <span className="text-sm font-semibold text-[#f1f5f9]">{item.name}</span>
              {item.status && (
                <span
                  className="text-[9px] uppercase tracking-[0.1em] font-semibold px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: status.bg, color: status.text }}
                >
                  {item.status}
                </span>
              )}
            </div>
            <p className="text-xs text-[#cbd5e1] leading-relaxed">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}
