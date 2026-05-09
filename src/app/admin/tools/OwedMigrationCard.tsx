"use client";

/**
 * Client subcomponent for the /admin/tools "Operator actions owed"
 * banner. Pure server-rendered SQL strings come in as props; the only
 * reason this is a client component is the "Copy" button (Clipboard
 * API needs `navigator`).
 *
 * Per the README ABSOLUTE RULE: SQL is rendered inline so the
 * founder doesn't chase files. Copy button removes the last bit of
 * friction (manual select-all).
 */

import { useState } from "react";

export interface OwedMigrationCardProps {
  filename: string;
  table: string;
  sql: string;
  verifySql: string;
}

export function OwedMigrationCard({
  filename,
  table,
  sql,
  verifySql,
}: OwedMigrationCardProps) {
  const [copied, setCopied] = useState<"sql" | "verify" | null>(null);

  async function copy(value: string, which: "sql" | "verify") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied((c) => (c === which ? null : c)), 1600);
    } catch {
      // Clipboard API blocked (insecure context, permission denied).
      // Operator can still select + copy manually.
    }
  }

  return (
    <article
      style={{
        padding: 12,
        borderRadius: "var(--radius-md)",
        background: "var(--canvas-recess)",
        border: "1px solid var(--border-subtle)",
        display: "grid",
        gap: 8,
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--aurum-primary)",
          }}
        >
          {filename}
        </code>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
          }}
        >
          creates table {table}
        </span>
      </header>

      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => void copy(sql, "sql")}
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            padding: "4px 10px",
            borderRadius: "var(--radius-md)",
            background: copied === "sql" ? "var(--mint-up)" : "var(--surface-2)",
            color: copied === "sql" ? "var(--fg-on-accent)" : "var(--fg-secondary)",
            border: "1px solid var(--border-default)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          {copied === "sql" ? "Copied" : "Copy SQL"}
        </button>
        <pre
          style={{
            margin: 0,
            padding: "32px 10px 10px",
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-secondary)",
            whiteSpace: "pre-wrap",
            overflowX: "auto",
          }}
        >
          {sql}
        </pre>
      </div>

      <details>
        <summary
          style={{
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xs)",
            color: "var(--fg-tertiary)",
          }}
        >
          Verify after running
        </summary>
        <div style={{ position: "relative", marginTop: 8 }}>
          <button
            type="button"
            onClick={() => void copy(verifySql, "verify")}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              padding: "4px 10px",
              borderRadius: "var(--radius-md)",
              background:
                copied === "verify" ? "var(--mint-up)" : "var(--surface-2)",
              color:
                copied === "verify"
                  ? "var(--fg-on-accent)"
                  : "var(--fg-secondary)",
              border: "1px solid var(--border-default)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 600,
              cursor: "pointer",
              zIndex: 1,
            }}
          >
            {copied === "verify" ? "Copied" : "Copy"}
          </button>
          <pre
            style={{
              margin: 0,
              padding: "32px 10px 10px",
              background: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--fg-secondary)",
              whiteSpace: "pre-wrap",
            }}
          >
            {verifySql}
          </pre>
        </div>
      </details>
    </article>
  );
}
