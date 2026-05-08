import type { ParagraphBlockData } from "@/types/blocks";
import { useOrgMap } from "@/components/documents/OrgMapProvider";
import { autoLinkText } from "@/lib/autolinker";

interface ParagraphBlockProps {
  block: ParagraphBlockData;
}

export default function ParagraphBlock({ block }: ParagraphBlockProps) {
  const orgMap = useOrgMap();

  return (
    <p className="text-sm text-[#cbd5e1] leading-[1.8] mb-4">
      {autoLinkText(block.content, orgMap)}
    </p>
  );
}
