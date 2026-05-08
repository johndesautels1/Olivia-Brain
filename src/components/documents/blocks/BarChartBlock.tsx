"use client";

import type { BarChartBlockData } from "@/types/blocks";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartBlockProps {
  block: BarChartBlockData;
  accent: string;
}

export default function BarChartBlock({ block, accent }: BarChartBlockProps) {
  if (!block.data?.length) return null;

  const color = block.color || accent;
  const data = block.data.map((d) => ({
    name: d.label,
    value: d.value,
    display: `${d.value}${d.suffix || ""}`,
  }));

  const isHorizontal = block.layout === "horizontal";

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
        <ResponsiveContainer width="100%" height={220}>
          {isHorizontal ? (
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={60} />
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
                formatter={(_v, _n, props) => [(props as { payload: { display: string } }).payload.display, ""]}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {data.map((_, i) => (
                  <Cell key={i} fill={color} fillOpacity={0.7 + (i / data.length) * 0.3} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
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
                formatter={(_v, _n, props) => [(props as { payload: { display: string } }).payload.display, ""]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((_, i) => (
                  <Cell key={i} fill={color} fillOpacity={0.6 + (i / data.length) * 0.4} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
