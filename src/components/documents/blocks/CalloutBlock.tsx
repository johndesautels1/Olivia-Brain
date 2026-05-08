import type { CalloutBlockData } from "@/types/blocks";
import { Info, AlertTriangle, Star, CheckCircle } from "lucide-react";
import { useOrgMap } from "@/components/documents/OrgMapProvider";
import { autoLinkText } from "@/lib/autolinker";

const variantConfig = {
  info: {
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.06)",
    border: "rgba(59, 130, 246, 0.2)",
    Icon: Info,
  },
  warning: {
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.06)",
    border: "rgba(245, 158, 11, 0.2)",
    Icon: AlertTriangle,
  },
  premium: {
    color: "#f59e0b",
    bg: "linear-gradient(135deg, rgba(245, 158, 11, 0.06), rgba(217, 119, 6, 0.04))",
    border: "rgba(245, 158, 11, 0.25)",
    Icon: Star,
  },
  success: {
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.06)",
    border: "rgba(16, 185, 129, 0.2)",
    Icon: CheckCircle,
  },
};

interface CalloutBlockProps {
  block: CalloutBlockData;
  accent: string;
}

export default function CalloutBlock({ block }: CalloutBlockProps) {
  const orgMap = useOrgMap();
  const config = variantConfig[block.variant || "info"] || variantConfig.info;
  const { Icon } = config;

  return (
    <div
      className="my-6 rounded-xl px-5 py-4 flex gap-3"
      style={{
        background: typeof config.bg === "string" && config.bg.startsWith("linear")
          ? config.bg
          : config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      <div className="shrink-0 mt-0.5">
        <Icon size={16} style={{ color: config.color }} />
      </div>
      <div>
        {block.title && (
          <div className="text-sm font-semibold mb-1" style={{ color: config.color }}>
            {block.title}
          </div>
        )}
        <p className="text-sm text-[#cbd5e1] leading-relaxed">
          {autoLinkText(block.content, orgMap)}
        </p>
      </div>
    </div>
  );
}
