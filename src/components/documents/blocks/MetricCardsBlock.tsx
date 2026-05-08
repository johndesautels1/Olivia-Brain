"use client";

import type { MetricsBlockData } from "@/types/blocks";
import {
  Database,
  Globe,
  CheckCircle,
  Shield,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Target,
  Award,
  Layers,
  Brain,
  DollarSign,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  database: Database,
  globe: Globe,
  "check-circle": CheckCircle,
  shield: Shield,
  "trending-up": TrendingUp,
  users: Users,
  zap: Zap,
  "bar-chart": BarChart3,
  target: Target,
  award: Award,
  layers: Layers,
  brain: Brain,
  dollar: DollarSign,
  building: Building2,
};

interface MetricCardsBlockProps {
  block: MetricsBlockData;
  accent: string;
}

export default function MetricCardsBlock({ block, accent }: MetricCardsBlockProps) {
  if (!block.items?.length) return null;

  const cols =
    block.items.length <= 3
      ? "grid-cols-1 sm:grid-cols-3"
      : block.items.length === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : block.items.length <= 6
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4";

  return (
    <div className={`grid ${cols} gap-3 my-6`}>
      {block.items.map((item, i) => {
        const Icon = item.icon ? iconMap[item.icon] || null : null;
        return (
          <div
            key={i}
            className="relative rounded-xl px-5 py-5 overflow-hidden group"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Subtle top gradient line */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}40, transparent)`,
              }}
            />

            {Icon && (
              <div className="mb-3">
                <Icon
                  size={18}
                  style={{ color: `${accent}90` }}
                />
              </div>
            )}

            <div
              className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none"
              style={{ color: "#f1f5f9" }}
            >
              {item.value}
            </div>

            <div className="mt-1.5 text-[11px] uppercase tracking-[0.12em] text-[#cbd5e1] font-medium">
              {item.label}
            </div>

            {item.delta && (
              <div
                className="mt-2 text-xs font-semibold"
                style={{
                  color: item.deltaDirection === "down" ? "#ef4444" : "#10b981",
                }}
              >
                {item.deltaDirection === "down" ? "↓" : "↑"} {item.delta}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
