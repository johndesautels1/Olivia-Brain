import type { ComparisonTableBlockData } from "@/types/blocks";

interface ComparisonTableProps {
  block: ComparisonTableBlockData;
  accent: string;
}

export default function ComparisonTable({ block, accent }: ComparisonTableProps) {
  if (!block.headers?.length || !block.rows?.length) return null;

  const highlight = block.highlightColumn ?? -1;

  return (
    <div className="my-6">
      {block.title && (
        <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">{block.title}</h4>
      )}
      <div
        className="overflow-x-auto rounded-xl"
        style={{
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              style={{
                background: `linear-gradient(90deg, ${accent}12, ${accent}06)`,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {block.headers.map((header, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{
                    color: i === highlight ? "#f1f5f9" : accent,
                    background: i === highlight ? `${accent}15` : "transparent",
                  }}
                >
                  {header}
                  {i === highlight && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-current" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {block.rows.map((row, ri) => (
              <tr key={ri} className="transition-colors hover:bg-white/[0.02]">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-5 py-3 text-sm ${ci === 0 ? "font-medium text-[var(--foreground)]" : "text-[#cbd5e1]"}`}
                    style={{
                      background: ci === highlight ? `${accent}06` : "transparent",
                      color: ci === highlight ? "#e2e8f0" : undefined,
                      fontWeight: ci === highlight ? 600 : undefined,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
