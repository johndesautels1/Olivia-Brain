"use client";

/**
 * /studio/[id] — Mount point for PreparationStudio.
 *
 * Track B 8c exit-criterion route. Today this mounts against a small
 * STUB WorkspaceBlock fixture so the engine has something to sequence
 * questions over; Track B 8d-routes-2 will replace the fixture with
 * real DB-backed Documents data loaded via `lib/queries/documents`.
 *
 * What this route proves today:
 *   - The full Studio v1 engine import graph resolves (PreparationStudio
 *     pulls in all 26 leaf + shell components from the 8c port).
 *   - The orchestrator mounts without runtime errors against a non-empty
 *     blocks array.
 *   - Navigation (prev/next/jump via J/K), auto-save callback, and the
 *     gold-pulse border all wire end-to-end against a stub onSave that
 *     just logs to the console.
 *
 * What this route does NOT do yet:
 *   - Fetch the Document by `params.id`. The id is read from the URL
 *     for cosmetic title only; replace with real query in 8d-routes-2.
 *   - Persist saves anywhere. `onSave` is a no-op pending Track B
 *     8d-routes-2 wiring to /api/documents/[id] PATCH.
 *   - Resolve the back-navigation target. `onBack` redirects to
 *     /documents (best guess; will rewire when the documents index
 *     route lands).
 */

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { PreparationStudio } from "@/components/studio/PreparationStudio";
import type { WorkspaceBlock } from "@/components/documents/DocumentWorkspace";

/** Three-block stub fixture covering the common question types so the
 *  engine has real data to sequence against. Replace in 8d-routes-2. */
const STUB_BLOCKS: WorkspaceBlock[] = [
  {
    index: 0,
    type: "paragraph",
    templateData: {
      heading: "Company overview",
      body: "{{paragraph: 2-3 sentence company overview}}",
    },
    userData: {
      heading: "Company overview",
      body: "",
    },
    status: "empty",
  },
  {
    index: 1,
    type: "paragraph",
    templateData: {
      heading: "Problem we solve",
      body: "{{paragraph: 2 sentences on the problem}}",
    },
    userData: {
      heading: "Problem we solve",
      body: "",
    },
    status: "empty",
  },
  {
    index: 2,
    type: "paragraph",
    templateData: {
      heading: "Why now",
      body: "{{paragraph: market timing thesis}}",
    },
    userData: {
      heading: "Why now",
      body: "",
    },
    status: "empty",
  },
];

export default function StudioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const documentId = params?.id ?? "stub-doc";

  const [blocks, setBlocks] = useState<WorkspaceBlock[]>(STUB_BLOCKS);

  const handleSave = useCallback(async (next: WorkspaceBlock[]) => {
    setBlocks(next);
    // TODO(track-b-8d-routes-2): PATCH /api/documents/[id] with the new blocks.
    if (typeof console !== "undefined") {
      console.info(
        "[studio] save (stub) — replace with PATCH /api/documents/[id]",
        { documentId, blocks: next.length },
      );
    }
  }, [documentId]);

  const handleBack = useCallback(() => {
    // TODO(track-b-8d-routes-2): route to /documents/[id] once the doc
    // workspace route lands.
    router.push("/documents");
  }, [router]);

  const completionPct = useMemo(() => {
    const filled = blocks.filter((b) => b.status === "complete").length;
    return Math.round((filled / blocks.length) * 100);
  }, [blocks]);

  return (
    <PreparationStudio
      documentId={documentId}
      title="Studio v1 (stub)"
      slug={documentId}
      collectionSlug="pitch-decks"
      collectionName="Pitch Decks"
      collectionDocCount={1}
      documentType="investor_deck"
      audienceType="investor"
      purposeType="fundraising"
      confidentiality="internal"
      summary={null}
      blocks={blocks}
      completionPct={completionPct}
      tierColor="#C4A96A"
      dnaParagraphs={{}}
      dnaMap={{}}
      onSave={handleSave}
      onBack={handleBack}
    />
  );
}
