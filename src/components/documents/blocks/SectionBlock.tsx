import type { SectionBlockData } from "@/types/blocks";
import {
  Lightbulb,
  Target,
  TrendingUp,
  Users,
  Globe,
  Shield,
  Zap,
  Award,
  BarChart3,
  Building2,
  Code,
  FileText,
  Heart,
  Lock,
  Rocket,
  Settings,
  Star,
  Briefcase,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  lightbulb: Lightbulb,
  target: Target,
  "trending-up": TrendingUp,
  users: Users,
  globe: Globe,
  shield: Shield,
  zap: Zap,
  award: Award,
  "bar-chart": BarChart3,
  building: Building2,
  code: Code,
  "file-text": FileText,
  heart: Heart,
  lock: Lock,
  rocket: Rocket,
  settings: Settings,
  star: Star,
  briefcase: Briefcase,
};

interface SectionBlockProps {
  block: SectionBlockData;
  accent: string;
}

export default function SectionBlock({ block, accent }: SectionBlockProps) {
  const Icon = block.icon ? iconMap[block.icon] || null : null;
  const isH3 = block.level === 3;

  if (isH3) {
    return (
      <h3
        className="text-base font-semibold mt-6 mb-2"
        style={{ color: accent }}
      >
        {Icon && <Icon size={14} className="inline mr-2 -mt-0.5" />}
        {block.heading}
      </h3>
    );
  }

  return (
    <div className="mt-10 mb-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-1 h-6 rounded-full"
          style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }}
        />
        {Icon && (
          <Icon size={18} style={{ color: accent }} />
        )}
        <h2
          className="text-xl font-bold uppercase tracking-wide"
          style={{ color: "#f1f5f9" }}
        >
          {block.heading}
        </h2>
      </div>
      <div
        className="h-px"
        style={{ background: `linear-gradient(90deg, ${accent}40, transparent)` }}
      />
    </div>
  );
}
