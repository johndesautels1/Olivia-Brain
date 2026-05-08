import type { TableBlockData } from "@/types/blocks";

interface TableBlockProps {
  block: TableBlockData;
  accent: string;
}

export default function TableBlock({ block, accent }: TableBlockProps) {
  if (!block.headers?.length || !block.rows?.length) return null;

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
                  style={{ color: accent }}
                >
                  {header}
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
