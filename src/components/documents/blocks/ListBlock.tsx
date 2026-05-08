import type { ListBlockData } from "@/types/blocks";
import { useOrgMap } from "@/components/documents/OrgMapProvider";
import { autoLinkText } from "@/lib/autolinker";

interface ListBlockProps {
  block: ListBlockData;
  accent: string;
}

export default function ListBlock({ block, accent }: ListBlockProps) {
  const orgMap = useOrgMap();

  if (!block.items?.length) return null;

  if (block.style === "numbered") {
    return (
      <ol className="mb-4 space-y-2 pl-1 list-decimal list-outside ml-4">
        {block.items.map((item, i) => (
          <li key={i} className="text-sm text-[#cbd5e1] leading-relaxed">
            {autoLinkText(item, orgMap)}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ul className="mb-4 space-y-2 pl-1">
      {block.items.map((item, i) => (
        <li key={i} className="text-sm text-[#cbd5e1] leading-relaxed flex gap-2">
          <span style={{ color: accent }} className="mt-1.5 shrink-0">
            <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
              <circle cx="3" cy="3" r="3" />
            </svg>
          </span>
          <span>{autoLinkText(item, orgMap)}</span>
        </li>
      ))}
    </ul>
  );
}
