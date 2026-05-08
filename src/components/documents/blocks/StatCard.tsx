import type { StatCardBlockData } from "@/types/blocks";

interface StatCardProps {
  block: StatCardBlockData;
  accent: string;
}

export default function StatCard({ block, accent }: StatCardProps) {
  return (
    <div
      className="rounded-xl px-5 py-5 my-4"
      style={{
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div
        className="text-3xl font-extrabold tracking-tight"
        style={{ color: "#f1f5f9" }}
      >
        {block.value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#cbd5e1] font-medium">
        {block.label}
      </div>
      {block.delta && (
        <div
          className="mt-2 text-xs font-semibold"
          style={{ color: block.deltaDirection === "down" ? "#ef4444" : "#10b981" }}
        >
          {block.deltaDirection === "down" ? "↓" : "↑"} {block.delta}
        </div>
      )}
    </div>
  );
}
