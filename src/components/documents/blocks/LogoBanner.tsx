import type { LogoBannerBlockData } from "@/types/blocks";

interface LogoBannerProps {
  block: LogoBannerBlockData;
  accent: string;
}

export default function LogoBanner({ block, accent }: LogoBannerProps) {
  if (!block.logos?.length) return null;

  return (
    <div className="my-6">
      {block.title && (
        <div className="text-[11px] uppercase tracking-[0.15em] text-[#64748b] font-medium mb-3">
          {block.title}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {block.logos.map((logo, i) => (
          <div
            key={i}
            className="rounded-lg px-4 py-2.5 text-xs font-medium text-[#cbd5e1]"
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {logo.name}
          </div>
        ))}
      </div>
    </div>
  );
}
