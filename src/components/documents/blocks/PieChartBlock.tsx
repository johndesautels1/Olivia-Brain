"use client";

import type { PieChartBlockData } from "@/types/blocks";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const DEFAULT_COLORS = [
  "#2563eb",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
];

interface PieChartBlockProps {
  block: PieChartBlockData;
  accent: string;
}

export default function PieChartBlock({ block }: PieChartBlockProps) {
  if (!block.data?.length) return null;

  const data = block.data.map((d, i) => ({
    name: d.label,
    value: d.value,
    color: d.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  return (
    <div className="my-8">
      {block.title && (
        <h4 className="text-sm font-semibold text-[var(--foreground)] mb-4">{block.title}</h4>
      )}
      <div
        className="rounded-xl p-5 overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
                backdropFilter: "blur(12px)",
              }}
              labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
              itemStyle={{ color: "#e2e8f0" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              formatter={(value: string) => (
                <span style={{ color: "#94a3b8" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
