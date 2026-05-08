"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import DocumentBody from "./DocumentBody";
import { DocumentActionBar } from "./DocumentActionBar";
import { DocumentSourcePanel } from "./DocumentSourcePanel";
import { resolveDocumentContent } from "@/lib/documents/content";

interface DocumentData {
  id: string;
  title: string;
  slug: string;
  documentType: string;
  audienceType: string;
  confidentiality: string;
  summary: string | null;
  previewText: string | null;
  formatType: string;
  storagePathOrBody: string | null;
  contentSourceType: string;
  isModular: boolean;
  status: string;
  updatedAt: string;
  collection: { name: string; slug: string } | null;
  modules: { id: string; moduleName: string; contentBody: string; sortOrder: number }[];
}

interface DocumentQuickViewProps {
  documentId: string;
  onClose: () => void;
}

export function DocumentQuickView({ documentId, onClose }: DocumentQuickViewProps) {
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch document
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/documents/${documentId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data: DocumentData) => {
        setDoc(data);
        setEditContent(data.storagePathOrBody || "");
      })
      .catch(() => setError("Failed to load document"))
      .finally(() => setLoading(false));
  }, [documentId]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Close on click outside panel
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSave = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const res = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc.id, content: editContent, changeNotes: "Edited via quick view" }),
      });
      if (res.ok) {
        setDoc((prev) => prev ? { ...prev, storagePathOrBody: editContent } : prev);
        setEditing(false);
      }
    } catch {
      // silently fail, content stays in textarea
    } finally {
      setSaving(false);
    }
  };

  const resolvedContent = useMemo(() => {
    if (!doc) return null;
    return resolveDocumentContent(doc);
  }, [doc]);

  const getContent = useCallback(() => {
    if (!doc) return "";
    if (doc.isModular && doc.modules.length > 0) {
      return doc.modules.map((m) => `## ${m.moduleName}\n\n${m.contentBody}`).join("\n\n");
    }
    if (resolvedContent?.kind === "external_link" || resolvedContent?.kind === "stored_file") {
      return doc.summary || "";
    }
    return resolvedContent?.content || doc.summary || "";
  }, [doc, resolvedContent]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative flex h-full w-full max-w-2xl flex-col border-l border-[var(--card-border)] bg-[var(--background)] shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-5 py-3">
          <div className="min-w-0 flex-1">
            {doc && (
              <>
                <h2 className="truncate text-sm font-bold text-[var(--foreground)]">{doc.title}</h2>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--muted)]">
                  {doc.collection && <span>{doc.collection.name}</span>}
                  <span className="rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] px-1.5 py-0.5">
                    {doc.confidentiality.replace(/_/g, " ")}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-3 rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            title="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Bar */}
        {doc && (
          <div className="border-b border-[var(--card-border)] px-5 py-2">
            <DocumentActionBar
              document={{
                id: doc.id,
                title: doc.title,
                slug: doc.slug,
                storagePathOrBody: doc.storagePathOrBody || undefined,
                summary: doc.summary || undefined,
                contentSourceType: doc.contentSourceType,
              }}
              variant="full"
              onEdit={() => setEditing(true)}
              onDeleted={onClose}
              getText={getContent}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3 text-[var(--muted)]">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm">Loading document...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {doc && !editing && (() => {
            const modularContent = doc.isModular && doc.modules.length > 0
              ? doc.modules.map((m) => `## ${m.moduleName}\n\n${m.contentBody}`).join("\n\n")
              : null;

            if (!modularContent && resolvedContent && (resolvedContent.kind === "external_link" || resolvedContent.kind === "stored_file")) {
              return <DocumentSourcePanel content={resolvedContent} title={doc.title} compact />;
            }

            return (
              <DocumentBody
                content={modularContent || resolvedContent?.content || doc.summary || "*No content yet*"}
                formatType={modularContent ? "markdown" : doc.formatType}
                contentSourceType={modularContent ? "rich_text" : doc.contentSourceType}
                title={doc.title}
                confidentiality={doc.confidentiality}
                collection={doc.collection?.name || ""}
              />
            );
          })()}

          {doc && editing && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--foreground)]">Editing Content</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-md border border-[var(--card-border)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-md border border-brand-600/30 bg-brand-600/10 px-2.5 py-1 text-[11px] font-semibold text-brand-400 hover:bg-brand-600/20 transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[400px] w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-brand-500/40 focus:outline-none focus:ring-1 focus:ring-brand-500/20 font-mono"
                placeholder="Enter document content (Markdown supported)..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
