"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isBlockJsonDocumentContent } from "@/lib/documents/content";

interface Collection {
  id: string;
  name: string;
}

interface DocumentEditorProps {
  collections: Collection[];
  initialData?: {
    id: string;
    title: string;
    collectionId: string;
    documentType: string;
    audienceType: string;
    purposeType: string;
    formatType: string;
    confidentiality: string;
    summary: string | null;
    content: string | null;
    status: string;
  };
}

/** Build the studio URL for a document. Centralised so future route changes only touch one place. */
function getWorkspaceUrl(documentId: string): string {
  return `/documents/${documentId}/studio`;
}

const documentTypes = [
  { value: "executive_summary", label: "Executive Summary" },
  { value: "company_overview", label: "Company Overview" },
  { value: "founder_bio", label: "Founder Bio" },
  { value: "investor_deck", label: "Investor Deck" },
  { value: "strategic_partner_deck", label: "Strategic Partner Deck" },
  { value: "enterprise_deck", label: "Enterprise Deck" },
  { value: "product_overview", label: "Product Overview" },
  { value: "technical_architecture", label: "Technical Architecture" },
  { value: "methodology_whitepaper", label: "Methodology Whitepaper" },
  { value: "financial_model", label: "Financial Model" },
  { value: "pricing_sheet", label: "Pricing Sheet" },
  { value: "proposal", label: "Proposal" },
  { value: "roadmap", label: "Roadmap" },
  { value: "integration_guide", label: "Integration Guide" },
  { value: "sample_report", label: "Sample Report" },
  { value: "marketing_doc", label: "Marketing Document" },
];

const audienceTypes = [
  { value: "investor", label: "Investor" },
  { value: "strategic_partner", label: "Strategic Partner" },
  { value: "enterprise_client", label: "Enterprise Client" },
  { value: "white_label_partner", label: "White-Label Partner" },
  { value: "acquirer", label: "Acquirer" },
  { value: "reseller", label: "Reseller" },
  { value: "media", label: "Media" },
  { value: "internal", label: "Internal" },
];

const purposeTypes = [
  { value: "fundraising", label: "Fundraising" },
  { value: "partnership", label: "Partnership" },
  { value: "licensing", label: "Licensing" },
  { value: "pilot", label: "Pilot" },
  { value: "acquisition", label: "Acquisition" },
  { value: "diligence", label: "Diligence" },
  { value: "education", label: "Education" },
  { value: "outreach", label: "Outreach" },
];

const confidentialityLevels = [
  { value: "public_access", label: "Public Access" },
  { value: "internal", label: "Internal" },
  { value: "confidential", label: "Confidential" },
  { value: "nda_required", label: "NDA Required" },
];

export function DocumentEditor({ collections, initialData }: DocumentEditorProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  // Detect content format once from initial data — stable across renders
  const contentIsBlockJSON = useMemo(
    () => isBlockJsonDocumentContent(initialData?.content),
    [initialData?.content]
  );

  // formatType is the source of truth; content sniffing only protects legacy rows.
  const resolvedFormatType = useMemo(() => {
    if (initialData?.formatType === "block_json") return "block_json";
    if (contentIsBlockJSON) return "block_json";
    return initialData?.formatType || "markdown";
  }, [initialData?.formatType, contentIsBlockJSON]);

  const [title, setTitle] = useState(initialData?.title || "");
  const [collectionId, setCollectionId] = useState(initialData?.collectionId || "");
  const [documentType, setDocumentType] = useState(initialData?.documentType || "executive_summary");
  const [audienceType, setAudienceType] = useState(initialData?.audienceType || "internal");
  const [purposeType, setPurposeType] = useState(initialData?.purposeType || "education");
  const [confidentiality, setConfidentiality] = useState(initialData?.confidentiality || "internal");
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDevView, setShowDevView] = useState(false);
  const [devCopied, setDevCopied] = useState(false);

  const save = useCallback(
    async (status: string) => {
      if (!title.trim()) {
        setError("Title is required");
        return;
      }
      if (!collectionId) {
        setError("Please select a collection");
        return;
      }

      setSaving(true);
      setError("");

      try {
        const method = isEditing ? "PUT" : "POST";
        const payload: Record<string, unknown> = {
          title: title.trim(),
          collectionId,
          documentType,
          audienceType,
          purposeType,
          formatType: resolvedFormatType,
          confidentiality,
          summary: summary.trim() || null,
          content: content || null,
          status,
        };

        if (isEditing) payload.id = initialData.id;

        const res = await fetch("/api/documents", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to save");
          return;
        }

        router.push(`/documents/${data.id}`);
        router.refresh();
      } catch {
        setError("Network error — please try again");
      } finally {
        setSaving(false);
      }
    },
    [title, collectionId, documentType, audienceType, purposeType, resolvedFormatType, confidentiality, summary, content, isEditing, initialData, router]
  );

  const selectClasses =
    "w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelClasses = "block text-xs font-medium text-[var(--muted)] mb-1.5";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="doc-title" className={labelClasses}>Document Title *</label>
        <input
          id="doc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter document title..."
          className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-lg font-semibold text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Summary */}
      <div>
        <label htmlFor="doc-summary" className={labelClasses}>Summary</label>
        <textarea
          id="doc-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Brief description of this document..."
          rows={2}
          className="w-full rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      {/* Metadata grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="doc-collection" className={labelClasses}>Collection *</label>
          <select id="doc-collection" className={selectClasses} value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
            <option value="">Select collection...</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-type" className={labelClasses}>Document Type</label>
          <select id="doc-type" className={selectClasses} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
            {documentTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-audience" className={labelClasses}>Audience</label>
          <select id="doc-audience" className={selectClasses} value={audienceType} onChange={(e) => setAudienceType(e.target.value)}>
            {audienceTypes.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-purpose" className={labelClasses}>Purpose</label>
          <select id="doc-purpose" className={selectClasses} value={purposeType} onChange={(e) => setPurposeType(e.target.value)}>
            {purposeTypes.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full max-w-xs">
        <label htmlFor="doc-confidentiality" className={labelClasses}>Confidentiality</label>
        <select id="doc-confidentiality" className={selectClasses} value={confidentiality} onChange={(e) => setConfidentiality(e.target.value)}>
          {confidentialityLevels.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Content editor — switches between markdown editor and block_json workspace redirect */}
      {resolvedFormatType === "block_json" && isEditing && initialData ? (
        <>
          {/* ── Block JSON: Workspace Redirect Banner ── */}
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                <svg className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-[var(--foreground)] mb-1">
                  Structured Document
                </h3>
                <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
                  This document uses structured content blocks (headings, sections, tables, callouts, and more).
                  Use the <strong className="text-[var(--foreground)]">Preparation Studio</strong> for the best editing experience — Olivia guides you through each question one at a time.
                </p>

                <Link
                  href={getWorkspaceUrl(initialData.id)}
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    background: "rgba(196, 169, 106, 0.15)",
                    color: "#C4A96A",
                    border: "1px solid rgba(196, 169, 106, 0.3)",
                  }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Open Studio
                </Link>
              </div>
            </div>
          </div>

          {/* ── Developer View toggle ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowDevView((v) => !v)}
              className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg
                className={`h-3 w-3 transition-transform ${showDevView ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              Developer View — Raw JSON
            </button>

            {showDevView && (
              <div className="mt-3 rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--card-border)] px-3 py-2">
                  <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider">
                    block_json — Read Only
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(content).then(() => {
                        setDevCopied(true);
                        setTimeout(() => setDevCopied(false), 2000);
                      });
                    }}
                    className="rounded px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                  >
                    {devCopied ? "Copied!" : "Copy JSON"}
                  </button>
                </div>
                <pre className="max-h-[400px] overflow-auto px-4 py-3 text-xs text-[var(--muted)] font-mono leading-relaxed select-all">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(content), null, 2);
                    } catch {
                      return content;
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Standard Markdown Editor ── */
        <div>
          <label htmlFor="doc-content-editor" className={labelClasses}>Content (Markdown)</label>
          <div className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b border-[var(--card-border)] px-3 py-2">
              <ToolbarButton label="Bold" shortcut="**text**" onClick={() => insertMarkdown("**", "**")} />
              <ToolbarButton label="Italic" shortcut="_text_" onClick={() => insertMarkdown("_", "_")} />
              <ToolbarButton label="H2" shortcut="## " onClick={() => insertMarkdown("## ", "")} />
              <ToolbarButton label="H3" shortcut="### " onClick={() => insertMarkdown("### ", "")} />
              <span className="mx-1 h-4 w-px bg-[var(--card-border)]" />
              <ToolbarButton label="List" shortcut="- " onClick={() => insertMarkdown("- ", "")} />
              <ToolbarButton label="Link" shortcut="[text](url)" onClick={() => insertMarkdown("[", "](url)")} />
              <ToolbarButton label="Code" shortcut="`code`" onClick={() => insertMarkdown("`", "`")} />
              <ToolbarButton label="Quote" shortcut="> " onClick={() => insertMarkdown("> ", "")} />
            </div>
            <textarea
              id="doc-content-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your document content in Markdown..."
              rows={20}
              className="w-full bg-transparent px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none font-mono leading-relaxed resize-y"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">
            Supports Markdown: **bold**, _italic_, ## headings, - lists, [links](url), `code`, &gt; quotes
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-6">
        <button
          onClick={() => router.back()}
          className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => save("draft")}
            disabled={saving}
            className="rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-2 text-sm font-medium text-[var(--foreground)] hover:border-indigo-500/50 transition-colors disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => save("active")}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-70"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({ label, shortcut, onClick }: { label: string; shortcut: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut}
      className="rounded px-2 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)] transition-colors"
    >
      {label}
    </button>
  );
}

function insertMarkdown(before: string, after: string) {
  const textarea = document.getElementById("doc-content-editor") as HTMLTextAreaElement | null;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.slice(start, end) || "text";
  const replacement = before + selected + after;

  textarea.setRangeText(replacement, start, end, "select");
  textarea.focus();

  // Trigger React's onChange
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  nativeInputValueSetter?.call(textarea, text.slice(0, start) + replacement + text.slice(end));
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
