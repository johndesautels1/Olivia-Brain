"use client";

/**
 * DocumentWorkspaceClient — Client wrapper for DocumentWorkspace
 *
 * Parses block_json content into WorkspaceBlocks, handles saves via
 * the workspace API, and manages the overall workspace state.
 */

import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DocumentWorkspace, {
  type WorkspaceBlock,
  type WorkspaceDocument,
  computeBlockStatus,
  getEditableFields,
} from "@/components/documents/DocumentWorkspace";
import {
  PackageProgressBar,
  type DocumentProgress,
} from "@/components/documents/PackageProgressBar";

interface DocumentWorkspaceClientProps {
  documentId: string;
  title: string;
  slug: string;
  collectionSlug: string;
  collectionName: string;
  documentType: string;
  audienceType: string;
  purposeType: string;
  confidentiality: string;
  summary: string | null;
  content: string | null;
  dnaParagraphs: Record<string, string>;
  dnaMap: Record<string, string[]>;
}

// ── Parse block_json into workspace blocks ─────────────────────────────

function parseBlocksFromContent(content: string | null): WorkspaceBlock[] {
  if (!content) return [];

  try {
    const trimmed = content.trim();
    if (!trimmed.startsWith("{")) return [];

    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed?.blocks)) return [];

    return parsed.blocks.map(
      (blockData: Record<string, unknown>, index: number) => {
        const block: WorkspaceBlock = {
          index,
          type: (blockData.type as string) || "paragraph",
          templateData: { ...blockData },
          userData: { ...blockData },
          status: "empty",
        };

        // Compute initial status
        block.status = computeBlockStatus(block.templateData, block.userData);

        return block;
      }
    );
  } catch {
    return [];
  }
}

// ── Main Component ─────────────────────────────────────────────────────

export function DocumentWorkspaceClient({
  documentId,
  title,
  slug,
  collectionSlug,
  collectionName,
  documentType,
  audienceType,
  purposeType,
  confidentiality,
  summary,
  content,
  dnaParagraphs,
  dnaMap,
}: DocumentWorkspaceClientProps) {
  const router = useRouter();
  const [activeDocumentId, setActiveDocumentId] = useState(documentId);
  const [collectionProgress, setCollectionProgress] = useState<DocumentProgress[]>([]);

  // Fetch collection-level progress for the package bar
  useEffect(() => {
    if (!collectionSlug) return;

    fetch(`/api/documents/workspace/progress?collectionSlug=${encodeURIComponent(collectionSlug)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.documents) {
          setCollectionProgress(
            data.documents.map((d: DocumentProgress) => ({
              ...d,
              isActive: d.id === activeDocumentId,
            }))
          );
        }
      })
      .catch(() => {
        // Silent fail — progress bar will just not show
      });
  }, [collectionSlug, activeDocumentId]);

  // Navigate to a different document's workspace
  const handleDocumentSelect = useCallback(
    (docId: string) => {
      if (docId !== activeDocumentId) {
        router.push(`/documents/${docId}/workspace`);
      }
    },
    [activeDocumentId, router]
  );

  // Parse blocks once on mount
  const initialBlocks = useMemo(
    () => parseBlocksFromContent(content),
    [content]
  );

  // Build document object
  const workspaceDoc: WorkspaceDocument = useMemo(
    () => ({
      id: documentId,
      title,
      slug,
      collectionSlug,
      documentType,
      audienceType,
      purposeType,
      confidentiality,
      summary,
      blocks: initialBlocks,
    }),
    [
      documentId,
      title,
      slug,
      collectionSlug,
      documentType,
      audienceType,
      purposeType,
      confidentiality,
      summary,
      initialBlocks,
    ]
  );

  // Handle save via API
  const handleSave = useCallback(
    async (blocks: WorkspaceBlock[]) => {
      const response = await fetch("/api/documents/workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: activeDocumentId,
          blocks: blocks.map((b) => ({
            index: b.index,
            userData: b.userData,
            status: b.status,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      const result = await response.json();

      // If a new private copy was created, update state and URL
      if (result.isNewCopy && result.id) {
        setActiveDocumentId(result.id);
        router.replace(`/documents/${result.id}/workspace`);
      }
    },
    [activeDocumentId, router]
  );

  // Handle empty content — show a helpful message
  if (initialBlocks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div
          className="rounded-2xl p-8 text-center max-w-md"
          style={{
            background: "rgba(15, 18, 25, 0.8)",
            border: "1px solid rgba(196, 169, 106, 0.15)",
          }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(196, 169, 106, 0.1)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C4A96A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            No Template Content
          </h3>
          <p className="text-sm text-[var(--muted)] mb-4">
            This document doesn&apos;t have block-based template content yet.
            The workspace editor requires documents with structured block_json
            format.
          </p>
          <a
            href={`/documents/${documentId}`}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: "rgba(196, 169, 106, 0.15)",
              border: "1px solid rgba(196, 169, 106, 0.25)",
              color: "#C4A96A",
            }}
          >
            Back to Document
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0" style={{ paddingBottom: collectionProgress.length > 0 ? 56 : 0 }}>
        <DocumentWorkspace
          document={workspaceDoc}
          dnaParagraphs={dnaParagraphs}
          dnaMap={dnaMap}
          onSave={handleSave}
        />
      </div>

      {/* Package-level progress bar — fixed at bottom */}
      {collectionProgress.length > 0 && (
        <PackageProgressBar
          collectionName={collectionName}
          collectionSlug={collectionSlug}
          documents={collectionProgress}
          activeDocumentId={activeDocumentId}
          onDocumentSelect={handleDocumentSelect}
        />
      )}
    </>
  );
}
