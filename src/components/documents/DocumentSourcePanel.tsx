import {
  getDocumentExternalHostname,
  getDocumentFormatLabel,
  getDocumentStorageUrl,
  type ResolvedDocumentContent,
} from "@/lib/documents/content";

interface DocumentSourcePanelProps {
  content: ResolvedDocumentContent;
  title: string;
  compact?: boolean;
}

export function DocumentSourcePanel({ content, title, compact = false }: DocumentSourcePanelProps) {
  const isExternal = content.kind === "external_link";
  const href = isExternal ? content.externalUrl : getDocumentStorageUrl(content.storagePath);
  const hostname = getDocumentExternalHostname(content.externalUrl);
  const formatLabel = getDocumentFormatLabel(content.formatType);
  const eyebrow = isExternal ? "External Research Report" : `Uploaded ${formatLabel}`;
  const body = isExternal
    ? "This research report is hosted externally."
    : "This document is stored as a file.";
  const cta = isExternal ? `View on ${hostname}` : "Open file";

  return (
    <div
      className={`relative overflow-hidden ${compact ? "rounded-xl" : "rounded-2xl"}`}
      style={{
        background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(10, 14, 26, 0.98))",
        border: "1px solid rgba(168, 85, 247, 0.15)",
        boxShadow: compact
          ? "0 12px 28px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.04)"
          : "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
      }}
    >
      <div className="h-1" style={{ background: "linear-gradient(90deg, #a855f7, #6366f1, #a855f7)" }} />
      <div className={`${compact ? "px-5 py-6" : "px-8 py-8 sm:px-12 sm:py-10"} text-center`}>
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase"
          style={{
            background: "rgba(168, 85, 247, 0.1)",
            color: "#c084fc",
            border: "1px solid rgba(168, 85, 247, 0.2)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {isExternal ? (
              <>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </>
            ) : (
              <>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </>
            )}
          </svg>
          {eyebrow}
        </div>
        <h2 className={`${compact ? "text-base" : "text-lg"} font-semibold text-[var(--foreground)]`}>
          {title}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
          {body}
        </p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
            style={{
              color: "#fff",
              background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
              border: "1px solid rgba(139, 92, 246, 0.5)",
              boxShadow: "0 4px 16px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
          >
            {cta}
          </a>
        ) : (
          <p className="mt-5 text-xs text-[var(--muted)]">
            {isExternal ? "Link URL unavailable" : "File URL unavailable"}
          </p>
        )}
        <p className="mt-4 break-all text-[11px] text-[var(--muted)]/50">
          {isExternal ? hostname : content.storagePath}
        </p>
      </div>
    </div>
  );
}
