"use client";

import type { DocumentBlock, BlockDocument } from "@/types/blocks";
import HeroBlock from "./blocks/HeroBlock";
import MetricCardsBlock from "./blocks/MetricCardsBlock";
import SectionBlock from "./blocks/SectionBlock";
import ParagraphBlock from "./blocks/ParagraphBlock";
import ListBlock from "./blocks/ListBlock";
import TableBlock from "./blocks/TableBlock";
import ComparisonTable from "./blocks/ComparisonTable";
import QuoteBlock from "./blocks/QuoteBlock";
import CalloutBlock from "./blocks/CalloutBlock";
import TimelineBlock from "./blocks/TimelineBlock";
import BarChartBlock from "./blocks/BarChartBlock";
import PieChartBlock from "./blocks/PieChartBlock";
import StatCard from "./blocks/StatCard";
import TeamCard from "./blocks/TeamCard";
import ProductCard from "./blocks/ProductCard";
import LogoBanner from "./blocks/LogoBanner";
import DividerBlock from "./blocks/DividerBlock";
import FooterBlock from "./blocks/FooterBlock";

const confidentialityAccent: Record<string, string> = {
  public_access: "#10b981",
  internal: "#3b82f6",
  confidential: "#f59e0b",
  nda_required: "#ef4444",
};

interface DocumentRendererProps {
  content: string;
  title: string;
  confidentiality: string;
  collection: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBlock(raw: any): any {
  if (!raw || typeof raw !== "object") return raw;

  const type: string = raw.type;

  // ── Step 1: Unwrap `content` or `data` wrappers ──
  // Some seed data nests all fields inside block.content or block.data
  let block = { ...raw };
  if (block.content && typeof block.content === "object" && !Array.isArray(block.content)) {
    const inner = block.content;
    // If inner has its own "type" field (e.g. callout data.type="info"), save it as variant
    const innerType = inner.type;
    block = { type: block.type, ...inner };
    // Restore the outer block type, use inner type as variant hint
    block.type = type;
    if (innerType && type === "callout" && !block.variant) block.variant = innerType;
  } else if (block.data && typeof block.data === "object" && !Array.isArray(block.data)) {
    const inner = block.data;
    const innerType = inner.type;
    block = { type: block.type, ...inner };
    block.type = type;
    if (innerType && type === "callout" && !block.variant) block.variant = innerType;
  }

  // ── Step 2: Field-level normalizations per block type ──
  switch (type) {
    case "section":
      // title → heading
      if (!block.heading && block.title) block.heading = block.title;
      break;

    case "paragraph":
      // text → content
      if (!block.content && block.text) block.content = block.text;
      break;

    case "table": {
      // columns (array of {header,key} objects) + object rows → headers + string[][]
      if (!block.headers && block.columns && Array.isArray(block.columns)) {
        const cols = block.columns as { header: string; key: string }[];
        block.headers = cols.map((c) => c.header);
        if (block.rows && block.rows.length > 0 && !Array.isArray(block.rows[0])) {
          block.rows = block.rows.map((row: Record<string, string>) =>
            cols.map((c) => row[c.key] ?? "")
          );
        }
      }
      // caption → title
      if (!block.title && block.caption) block.title = block.caption;
      break;
    }

    case "comparison_table": {
      if (!block.headers && block.columns && Array.isArray(block.columns)) {
        const cols = block.columns as { header: string; key: string }[];
        block.headers = cols.map((c) => c.header);
        if (block.rows && block.rows.length > 0 && !Array.isArray(block.rows[0])) {
          block.rows = block.rows.map((row: Record<string, string>) =>
            cols.map((c) => row[c.key] ?? "")
          );
        }
      }
      // Rows have a label column not reflected in headers → prepend empty header
      if (
        block.headers &&
        block.rows &&
        block.rows.length > 0 &&
        Array.isArray(block.rows[0]) &&
        block.rows[0].length === block.headers.length + 1
      ) {
        block.headers = ["", ...block.headers];
        // Shift highlightColumn to account for new first column
        if (block.highlightColumn !== undefined) {
          block.highlightColumn = block.highlightColumn + 1;
        }
      }
      break;
    }

    case "list":
      // variant → style
      if (!block.style && block.variant) block.style = block.variant;
      // ordered: true → style: "numbered"
      if (!block.style && block.ordered) block.style = "numbered";
      // Object items → string items
      if (block.items && block.items.length > 0 && typeof block.items[0] === "object") {
        block.items = block.items.map((item: { text?: string; description?: string }) => {
          const text = item.text || "";
          return item.description ? `${text} — ${item.description}` : text;
        });
      }
      break;

    case "callout":
      // text → content
      if (!block.content && block.text) block.content = block.text;
      // style → variant
      if (!block.variant && block.style) block.variant = block.style;
      // nested "type" used as variant (e.g. data.type = "info")
      if (!block.variant && block.type !== "callout" && typeof block.type === "string") {
        // already consumed in switch, skip
      }
      break;

    case "footer": {
      // text or content (string) → company
      const footerText = block.text || (typeof block.content === "string" ? block.content : null);
      if (footerText && !block.company) {
        // Parse "Company | Address | Classification" pattern
        const parts = footerText.split(/\s*[|•·]\s*/);
        block.company = parts[0] || undefined;
        if (parts.length > 1) block.address = parts.slice(1, -1).join(" · ") || undefined;
        if (parts.length > 2) block.classification = parts[parts.length - 1] || undefined;
      }
      // companyName → company
      if (!block.company && block.companyName) block.company = block.companyName;
      break;
    }

    case "metrics":
      // metrics → items
      if (!block.items && block.metrics) block.items = block.metrics;
      break;

    case "timeline":
      // milestones → items
      if (!block.items && block.milestones) block.items = block.milestones;
      // Fix individual items: time → date
      if (block.items && Array.isArray(block.items)) {
        block.items = block.items.map((item: { date?: string; time?: string }) => {
          if (!item.date && item.time) return { ...item, date: item.time };
          return item;
        });
      }
      break;

    case "quote":
      // author → attribution
      if (!block.attribution && block.author) block.attribution = block.author;
      break;

    case "product_card":
      // items with title → name
      if (block.items && Array.isArray(block.items)) {
        block.items = block.items.map((item: { name?: string; title?: string }) => {
          if (!item.name && item.title) return { ...item, name: item.title };
          return item;
        });
      }
      break;

    case "bar_chart":
      // data items with before/after → value (use "after" as value)
      if (block.data && Array.isArray(block.data)) {
        block.data = block.data.map((d: { value?: number; before?: number; after?: number }) => {
          if (d.value === undefined && d.after !== undefined) return { ...d, value: d.after };
          return d;
        });
      }
      break;

    case "divider":
      // nothing special beyond unwrap
      break;

    case "two_column":
      // Recursively normalize children
      if (block.left) block.left = block.left.map(normalizeBlock);
      if (block.right) block.right = block.right.map(normalizeBlock);
      break;
  }

  // Handle nested callout variant from unwrapped data where "type" was overwritten
  // For callout blocks where data.type was "info"/"warning" etc., it got merged into block.type
  // We already handled this by keeping the outer type as "callout" in the unwrap step

  return block;
}

function renderBlock(block: DocumentBlock, accent: string, index: number): React.ReactNode {
  const normalized = normalizeBlock(block) as DocumentBlock;
  const key = `${normalized.type}-${index}`;

  switch (normalized.type) {
    case "hero":
      return <HeroBlock key={key} block={normalized} accent={accent} />;
    case "metrics":
      return <MetricCardsBlock key={key} block={normalized} accent={accent} />;
    case "section":
      return <SectionBlock key={key} block={normalized} accent={accent} />;
    case "paragraph":
      return <ParagraphBlock key={key} block={normalized} />;
    case "list":
      return <ListBlock key={key} block={normalized} accent={accent} />;
    case "table":
      return <TableBlock key={key} block={normalized} accent={accent} />;
    case "comparison_table":
      return <ComparisonTable key={key} block={normalized} accent={accent} />;
    case "quote":
      return <QuoteBlock key={key} block={normalized} accent={accent} />;
    case "callout":
      return <CalloutBlock key={key} block={normalized} accent={accent} />;
    case "timeline":
      return <TimelineBlock key={key} block={normalized} accent={accent} />;
    case "bar_chart":
      return <BarChartBlock key={key} block={normalized} accent={accent} />;
    case "pie_chart":
      return <PieChartBlock key={key} block={normalized} accent={accent} />;
    case "stat_card":
      return <StatCard key={key} block={normalized} accent={accent} />;
    case "team_card":
      return <TeamCard key={key} block={normalized} accent={accent} />;
    case "product_card":
      return <ProductCard key={key} block={normalized} accent={accent} />;
    case "logo_banner":
      return <LogoBanner key={key} block={normalized} accent={accent} />;
    case "divider":
      return <DividerBlock key={key} block={normalized} accent={accent} />;
    case "footer":
      return <FooterBlock key={key} block={normalized} accent={accent} />;
    case "two_column":
      return (
        <div
          key={key}
          className={`my-6 grid gap-6 ${
            normalized.split === "60/40"
              ? "grid-cols-1 sm:grid-cols-[3fr_2fr]"
              : normalized.split === "40/60"
                ? "grid-cols-1 sm:grid-cols-[2fr_3fr]"
                : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          <div>{normalized.left?.map((b, i) => renderBlock(b, accent, i))}</div>
          <div>{normalized.right?.map((b, i) => renderBlock(b, accent, i))}</div>
        </div>
      );
    default:
      return null;
  }
}

function isBlockJSON(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed?.blocks);
  } catch {
    return false;
  }
}

export default function DocumentRenderer({
  content,
  title,
  confidentiality,
  collection,
}: DocumentRendererProps) {
  const accent = confidentialityAccent[confidentiality] || "#3b82f6";

  if (!isBlockJSON(content)) {
    // Not block JSON — return null so DocumentBody handles it with markdown
    return null;
  }

  const doc: BlockDocument = JSON.parse(content);

  return (
    <div className="doc-renderer">
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

        {/* Block content area */}
        <div className="px-8 py-8 sm:px-12 sm:py-10">
          {doc.blocks.map((block, i) => renderBlock(block, accent, i))}
        </div>
      </div>
    </div>
  );
}
