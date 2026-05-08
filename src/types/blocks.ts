// ── Document Block System — Type Definitions ──
// Every document is stored as a JSON array of typed blocks.
// The DocumentRenderer maps each block to a premium React component.

export type BlockType =
  | "hero"
  | "metrics"
  | "section"
  | "paragraph"
  | "table"
  | "comparison_table"
  | "quote"
  | "callout"
  | "timeline"
  | "bar_chart"
  | "pie_chart"
  | "stat_card"
  | "team_card"
  | "product_card"
  | "logo_banner"
  | "divider"
  | "footer"
  | "two_column"
  | "list";

// ── Individual Block Interfaces ──

export interface HeroBlockData {
  type: "hero";
  title: string;
  subtitle?: string;
  classification?: string;
  date?: string;
  logo?: boolean;
}

export interface MetricItem {
  label: string;
  value: string;
  icon?: string;
  delta?: string;
  deltaDirection?: "up" | "down";
}

export interface MetricsBlockData {
  type: "metrics";
  items: MetricItem[];
}

export interface SectionBlockData {
  type: "section";
  heading: string;
  icon?: string;
  level?: 2 | 3;
}

export interface ParagraphBlockData {
  type: "paragraph";
  content: string;
}

export interface ListBlockData {
  type: "list";
  style?: "bullet" | "numbered";
  items: string[];
}

export interface TableBlockData {
  type: "table";
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface ComparisonTableBlockData {
  type: "comparison_table";
  title?: string;
  headers: string[];
  rows: string[][];
  highlightColumn?: number;
}

export interface QuoteBlockData {
  type: "quote";
  text: string;
  attribution?: string;
}

export interface CalloutBlockData {
  type: "callout";
  variant?: "info" | "warning" | "premium" | "success";
  title?: string;
  content: string;
}

export interface TimelineItem {
  date: string;
  title: string;
  description?: string;
}

export interface TimelineBlockData {
  type: "timeline";
  title?: string;
  items: TimelineItem[];
}

export interface BarChartDataPoint {
  label: string;
  value: number;
  suffix?: string;
}

export interface BarChartBlockData {
  type: "bar_chart";
  title?: string;
  data: BarChartDataPoint[];
  color?: string;
  layout?: "vertical" | "horizontal";
}

export interface PieChartSlice {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartBlockData {
  type: "pie_chart";
  title?: string;
  data: PieChartSlice[];
}

export interface StatCardBlockData {
  type: "stat_card";
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: "up" | "down";
  icon?: string;
}

export interface TeamCardBlockData {
  type: "team_card";
  name: string;
  role: string;
  bio: string;
  highlights?: string[];
  imageUrl?: string;
}

export interface ProductCardItem {
  name: string;
  description: string;
  status?: string;
  icon?: string;
}

export interface ProductCardBlockData {
  type: "product_card";
  items: ProductCardItem[];
}

export interface LogoBannerBlockData {
  type: "logo_banner";
  title?: string;
  logos: { name: string; url?: string }[];
}

export interface DividerBlockData {
  type: "divider";
  style?: "diamond" | "gradient" | "dots";
}

export interface FooterBlockData {
  type: "footer";
  company?: string;
  address?: string;
  classification?: string;
  copyright?: string;
}

export interface TwoColumnBlockData {
  type: "two_column";
  left: DocumentBlock[];
  right: DocumentBlock[];
  split?: "50/50" | "60/40" | "40/60";
}

// ── Union type for all blocks ──

export type DocumentBlock =
  | HeroBlockData
  | MetricsBlockData
  | SectionBlockData
  | ParagraphBlockData
  | ListBlockData
  | TableBlockData
  | ComparisonTableBlockData
  | QuoteBlockData
  | CalloutBlockData
  | TimelineBlockData
  | BarChartBlockData
  | PieChartBlockData
  | StatCardBlockData
  | TeamCardBlockData
  | ProductCardBlockData
  | LogoBannerBlockData
  | DividerBlockData
  | FooterBlockData
  | TwoColumnBlockData;

// ── Document content wrapper ──

export interface BlockDocument {
  blocks: DocumentBlock[];
}
