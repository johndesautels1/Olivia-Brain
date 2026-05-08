"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DocumentRenderer from "./DocumentRenderer";
import { useOrgMap } from "./OrgMapProvider";
import { autoLinkMarkdown } from "@/lib/autolinker";
import { resolveDocumentContent } from "@/lib/documents/content";

interface DocumentBodyProps {
  content: string;
  formatType?: string | null;
  contentSourceType?: string | null;
  title: string;
  confidentiality: string;
  collection: string;
}

const confidentialityAccent: Record<string, string> = {
  public_access: "#10b981",
  internal: "#3b82f6",
  confidential: "#f59e0b",
  nda_required: "#ef4444",
};

export default function DocumentBody({
  content,
  formatType,
  contentSourceType,
  title,
  confidentiality,
  collection,
}: DocumentBodyProps) {
  const accent = confidentialityAccent[confidentiality] || "#3b82f6";
  const orgMap = useOrgMap();
  const resolvedContent = resolveDocumentContent({
    storagePathOrBody: content,
    formatType,
    contentSourceType,
  });

  if (resolvedContent.kind === "empty") {
    return null;
  }

  if ((resolvedContent.kind === "external_link" || resolvedContent.kind === "stored_file") && (formatType || contentSourceType)) {
    return null;
  }

  if (resolvedContent.kind === "block_json") {
    return (
      <DocumentRenderer
        content={resolvedContent.content}
        title={title}
        confidentiality={confidentiality}
        collection={collection}
      />
    );
  }

  // Fallback: legacy markdown rendering
  return (
    <div className="doc-body-container">
      {/* Document frame — glassmorphic premium wrapper */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(10, 14, 26, 0.98))",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Top accent bar */}
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, ${accent}, #2563eb, ${accent})`,
          }}
        />

        {/* Document header band */}
        <div
          className="px-8 py-5 flex items-center justify-between"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{
                background: `linear-gradient(135deg, ${accent}30, ${accent}10)`,
                border: `1px solid ${accent}40`,
                color: accent,
              }}
            >
              CI
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Clues Intelligence LTD
              </div>
              <div className="text-[11px] text-[var(--muted)]/60">
                {collection}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-[9px] uppercase tracking-[0.15em] font-semibold px-2.5 py-1 rounded-full"
              style={{
                background: `${accent}15`,
                color: accent,
                border: `1px solid ${accent}30`,
              }}
            >
              {confidentiality.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* Document body */}
        <div className="px-8 py-8 sm:px-12 sm:py-10">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1
                  className="text-3xl font-bold tracking-tight mb-2"
                  style={{ color: "var(--foreground)" }}
                >
                  {children}
                </h1>
              ),
              h2: ({ children }) => {
                const text = String(children);
                return (
                  <div className="mt-10 mb-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-1 h-6 rounded-full"
                        style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }}
                      />
                      <h2
                        className="text-xl font-bold uppercase tracking-wide"
                        style={{ color: "var(--foreground)" }}
                      >
                        {children}
                      </h2>
                    </div>
                    <div
                      className="h-px"
                      style={{
                        background: `linear-gradient(90deg, ${accent}40, transparent)`,
                      }}
                    />
                  </div>
                );
              },
              h3: ({ children }) => (
                <h3
                  className="text-base font-semibold mt-6 mb-2"
                  style={{ color: accent }}
                >
                  {children}
                </h3>
              ),
              h4: ({ children }) => (
                <h4 className="text-sm font-semibold text-[var(--foreground)] mt-4 mb-2">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="text-sm text-[var(--muted)] leading-[1.8] mb-4">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="text-[var(--foreground)] font-semibold">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-[var(--muted)] italic">{children}</em>
              ),
              blockquote: ({ children }) => (
                <div
                  className="my-6 rounded-xl px-6 py-5"
                  style={{
                    background: `linear-gradient(135deg, ${accent}08, ${accent}04)`,
                    borderLeft: `3px solid ${accent}`,
                    border: `1px solid ${accent}20`,
                    borderLeftWidth: "3px",
                    borderLeftColor: accent,
                  }}
                >
                  <div className="italic text-sm text-[var(--muted)] leading-relaxed">
                    {children}
                  </div>
                </div>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 space-y-2 pl-1">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-4 space-y-2 pl-1 list-decimal list-outside ml-4">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-sm text-[var(--muted)] leading-relaxed flex gap-2">
                  <span style={{ color: accent }} className="mt-1.5 shrink-0">
                    <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                      <circle cx="3" cy="3" r="3" />
                    </svg>
                  </span>
                  <span>{children}</span>
                </li>
              ),
              table: ({ children }) => (
                <div
                  className="my-6 overflow-x-auto rounded-xl"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  <table className="w-full text-sm">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead
                  style={{
                    background: `linear-gradient(90deg, ${accent}12, ${accent}06)`,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  {children}
                </thead>
              ),
              tbody: ({ children }) => (
                <tbody className="divide-y divide-white/5">{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="transition-colors hover:bg-white/[0.02]">{children}</tr>
              ),
              th: ({ children }) => (
                <th
                  className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: accent }}
                >
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-5 py-3 text-sm text-[var(--muted)]">{children}</td>
              ),
              hr: () => (
                <div className="my-8 flex items-center gap-4">
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }} />
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: accent }}
                  />
                  <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }} />
                </div>
              ),
              a: ({ href, children }) => {
                const isExternal = href?.startsWith("http");
                return (
                  <a
                    href={href}
                    className="underline underline-offset-2 transition-colors"
                    style={{ color: isExternal ? "#60a5fa" : "#818cf8" }}
                    {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {children}
                  </a>
                );
              },
              code: ({ children, className }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code
                      className="rounded px-1.5 py-0.5 text-xs font-mono"
                      style={{
                        background: `${accent}15`,
                        color: accent,
                        border: `1px solid ${accent}25`,
                      }}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code className="block rounded-xl p-5 text-xs font-mono text-[var(--muted)] overflow-x-auto my-4"
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre
                  className="rounded-xl overflow-x-auto my-4"
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  {children}
                </pre>
              ),
            }}
          >
            {autoLinkMarkdown(resolvedContent.content, orgMap)}
          </ReactMarkdown>
        </div>

        {/* Document footer */}
        <div
          className="px-8 py-4 flex items-center justify-between"
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <div className="text-[11px] text-[#cbd5e1]">
            &copy; 2026 Clues Intelligence LTD. All rights reserved.
          </div>
          <div className="text-[11px] text-[#cbd5e1]">
            167-169 Great Portland Street, 5th Floor, London W1W 5PF
          </div>
        </div>
      </div>
    </div>
  );
}
