/**
 * Report Generation Engine
 *
 * Core engine for generating branded multi-page PDF and PPTX reports.
 * Gamma handles AI-generated presentations; this engine handles
 * structured, data-driven reports built programmatically.
 *
 * Supports: PDF (via html-to-pdf rendering), PPTX (via pptxgenjs-style JSON)
 * Used for: 50+ page branded client reports, relocation packages, market analyses
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReportFormat = "pdf" | "pptx";
export type ReportStatus = "pending" | "generating" | "complete" | "failed";

export interface ReportBrand {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  fontFamily: string;
  headerFontFamily?: string;
  footerText?: string;
  disclaimerText?: string;
}

export interface ReportSection {
  /** Section ID (unique within report) */
  id: string;
  /** Section title (appears in TOC and as header) */
  title: string;
  /** Section type determines rendering */
  type: ReportSectionType;
  /** Content payload — shape depends on type */
  content: ReportSectionContent;
  /** Page break before this section */
  pageBreakBefore?: boolean;
}

export type ReportSectionType =
  | "cover"
  | "toc"
  | "text"
  | "comparison"
  | "scorecard"
  | "data_table"
  | "chart"
  | "image_gallery"
  | "key_metrics"
  | "pros_cons"
  | "timeline"
  | "map"
  | "faq"
  | "disclaimer";

export type ReportSectionContent =
  | CoverContent
  | TocContent
  | TextContent
  | ComparisonContent
  | ScorecardContent
  | DataTableContent
  | ChartContent
  | ImageGalleryContent
  | KeyMetricsContent
  | ProsConsContent
  | TimelineContent
  | MapContent
  | FaqContent
  | DisclaimerContent;

export interface CoverContent {
  title: string;
  subtitle?: string;
  clientName?: string;
  preparedBy?: string;
  date?: string;
  coverImageUrl?: string;
}

export interface TocContent {
  /** Auto-generated from sections — no manual content needed */
  _auto: true;
}

export interface TextContent {
  heading?: string;
  body: string;
  /** Markdown-style formatting supported */
  format?: "plain" | "markdown" | "html";
}

export interface ComparisonContent {
  items: Array<{
    name: string;
    score: number;
    maxScore: number;
    highlights: string[];
    imageUrl?: string;
  }>;
  comparisonType: "city" | "neighborhood" | "property" | "custom";
}

export interface ScorecardContent {
  title: string;
  overallScore: number;
  maxScore: number;
  categories: Array<{
    name: string;
    score: number;
    maxScore: number;
    weight: number;
    description?: string;
  }>;
}

export interface DataTableContent {
  headers: string[];
  rows: string[][];
  caption?: string;
  highlightRows?: number[];
  sortable?: boolean;
}

export interface ChartContent {
  chartType: "bar" | "line" | "pie" | "radar" | "scatter";
  title?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export interface ImageGalleryContent {
  images: Array<{
    url: string;
    caption?: string;
    alt?: string;
  }>;
  layout: "grid" | "carousel" | "full-width";
  columns?: number;
}

export interface KeyMetricsContent {
  metrics: Array<{
    label: string;
    value: string | number;
    unit?: string;
    trend?: "up" | "down" | "stable";
    trendValue?: string;
    icon?: string;
  }>;
  layout: "row" | "grid";
}

export interface ProsConsContent {
  subject: string;
  pros: string[];
  cons: string[];
}

export interface TimelineContent {
  events: Array<{
    date: string;
    title: string;
    description?: string;
    status?: "complete" | "current" | "upcoming";
  }>;
}

export interface MapContent {
  centerLat: number;
  centerLon: number;
  zoom: number;
  markers?: Array<{
    lat: number;
    lon: number;
    label: string;
    color?: string;
  }>;
  /** Static map image URL (for PDF rendering) */
  staticMapUrl?: string;
}

export interface FaqContent {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export interface DisclaimerContent {
  text: string;
}

// ─── Report Definition ──────────────────────────────────────────────────────

export interface ReportDefinition {
  /** Unique report ID */
  id: string;
  /** Report title */
  title: string;
  /** Report type (drives template selection) */
  type: ReportType;
  /** Output format */
  format: ReportFormat;
  /** Brand configuration */
  brand: ReportBrand;
  /** Ordered list of sections */
  sections: ReportSection[];
  /** Metadata */
  metadata: {
    clientId?: string;
    clientName?: string;
    generatedAt: string;
    generatedBy: string;
    version: string;
  };
}

export type ReportType =
  | "relocation"
  | "market_analysis"
  | "investment_analysis"
  | "property_comparison"
  | "city_comparison"
  | "meeting_prep"
  | "faq_guide"
  | "custom";

export interface GeneratedReport {
  id: string;
  definition: ReportDefinition;
  status: ReportStatus;
  pageCount: number;
  fileSizeBytes?: number;
  /** Signed URL for download (temporary) */
  downloadUrl?: string;
  /** Render output — HTML string for PDF rendering */
  renderedHtml?: string;
  /** PPTX slide data for pptxgenjs rendering */
  slideData?: Record<string, unknown>[];
  generatedAt: string;
  error?: string;
}

// ─── CLUES Default Brand ────────────────────────────────────────────────────

export const CLUES_BRAND: ReportBrand = {
  companyName: "CLUES Intelligence",
  primaryColor: "#1a1a2e",
  secondaryColor: "#e94560",
  accentColor: "#0f3460",
  fontFamily: "Inter",
  headerFontFamily: "Inter",
  footerText: "Confidential — Prepared by CLUES Intelligence",
  disclaimerText:
    "This report is generated using AI-assisted analysis and third-party data sources. " +
    "All information should be independently verified. CLUES Intelligence makes no " +
    "warranties regarding the accuracy or completeness of this report.",
};

// ─── Report Builder ─────────────────────────────────────────────────────────

export class ReportBuilder {
  private definition: ReportDefinition;

  constructor(
    title: string,
    type: ReportType,
    format: ReportFormat = "pdf",
    brand: ReportBrand = CLUES_BRAND
  ) {
    this.definition = {
      id: crypto.randomUUID(),
      title,
      type,
      format,
      brand,
      sections: [],
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: "Olivia Brain",
        version: "1.0.0",
      },
    };
  }

  setClient(clientId: string, clientName: string): this {
    this.definition.metadata.clientId = clientId;
    this.definition.metadata.clientName = clientName;
    return this;
  }

  addCover(content: CoverContent): this {
    this.definition.sections.push({
      id: "cover",
      title: "Cover",
      type: "cover",
      content,
    });
    return this;
  }

  addTableOfContents(): this {
    this.definition.sections.push({
      id: "toc",
      title: "Table of Contents",
      type: "toc",
      content: { _auto: true } as TocContent,
      pageBreakBefore: true,
    });
    return this;
  }

  addSection(
    id: string,
    title: string,
    type: ReportSectionType,
    content: ReportSectionContent,
    pageBreakBefore = true
  ): this {
    this.definition.sections.push({
      id,
      title,
      type,
      content,
      pageBreakBefore,
    });
    return this;
  }

  addText(id: string, title: string, body: string, format: "plain" | "markdown" | "html" = "markdown"): this {
    return this.addSection(id, title, "text", { body, format } as TextContent);
  }

  addDataTable(
    id: string,
    title: string,
    headers: string[],
    rows: string[][],
    caption?: string
  ): this {
    return this.addSection(id, title, "data_table", {
      headers,
      rows,
      caption,
    } as DataTableContent);
  }

  addKeyMetrics(
    id: string,
    title: string,
    metrics: KeyMetricsContent["metrics"]
  ): this {
    return this.addSection(id, title, "key_metrics", {
      metrics,
      layout: "grid",
    } as KeyMetricsContent);
  }

  addComparison(
    id: string,
    title: string,
    items: ComparisonContent["items"],
    comparisonType: ComparisonContent["comparisonType"] = "custom"
  ): this {
    return this.addSection(id, title, "comparison", {
      items,
      comparisonType,
    } as ComparisonContent);
  }

  addScorecard(
    id: string,
    title: string,
    overallScore: number,
    maxScore: number,
    categories: ScorecardContent["categories"]
  ): this {
    return this.addSection(id, title, "scorecard", {
      title,
      overallScore,
      maxScore,
      categories,
    } as ScorecardContent);
  }

  addProsCons(id: string, subject: string, pros: string[], cons: string[]): this {
    return this.addSection(id, `${subject}: Pros & Cons`, "pros_cons", {
      subject,
      pros,
      cons,
    } as ProsConsContent);
  }

  addFaq(id: string, title: string, questions: FaqContent["questions"]): this {
    return this.addSection(id, title, "faq", { questions } as FaqContent);
  }

  addDisclaimer(): this {
    this.definition.sections.push({
      id: "disclaimer",
      title: "Disclaimer",
      type: "disclaimer",
      content: {
        text: this.definition.brand.disclaimerText ?? "",
      } as DisclaimerContent,
      pageBreakBefore: true,
    });
    return this;
  }

  build(): ReportDefinition {
    return { ...this.definition };
  }
}

// ─── Report Rendering ───────────────────────────────────────────────────────

/**
 * Render a report definition into an HTML string suitable for PDF conversion.
 * This generates semantic HTML with inline styles matching the brand config.
 * A headless browser or html-pdf service converts this to the final PDF.
 */
export function renderToHtml(definition: ReportDefinition): string {
  const { brand, sections, metadata } = definition;

  const sectionHtmlParts = sections.map((section) => {
    const pageBreak = section.pageBreakBefore
      ? 'style="page-break-before: always;"'
      : "";

    switch (section.type) {
      case "cover": {
        const c = section.content as CoverContent;
        return `
          <div class="cover-page" ${pageBreak}>
            ${brand.logoUrl ? `<img src="${brand.logoUrl}" class="logo" alt="${brand.companyName}" />` : ""}
            <h1 class="cover-title">${c.title}</h1>
            ${c.subtitle ? `<h2 class="cover-subtitle">${c.subtitle}</h2>` : ""}
            ${c.clientName ? `<p class="cover-client">Prepared for: ${c.clientName}</p>` : ""}
            ${c.preparedBy ? `<p class="cover-author">Prepared by: ${c.preparedBy}</p>` : ""}
            <p class="cover-date">${c.date ?? metadata.generatedAt.split("T")[0]}</p>
          </div>`;
      }

      case "toc": {
        const tocEntries = sections
          .filter((s) => s.type !== "cover" && s.type !== "toc" && s.type !== "disclaimer")
          .map((s, i) => `<li><span class="toc-num">${i + 1}.</span> ${s.title}</li>`)
          .join("\n");
        return `
          <div class="toc-page" ${pageBreak}>
            <h2>Table of Contents</h2>
            <ol class="toc-list">${tocEntries}</ol>
          </div>`;
      }

      case "text": {
        const c = section.content as TextContent;
        return `
          <div class="section" ${pageBreak}>
            <h2>${section.title}</h2>
            <div class="text-body">${c.body}</div>
          </div>`;
      }

      case "data_table": {
        const c = section.content as DataTableContent;
        const headerRow = c.headers.map((h) => `<th>${h}</th>`).join("");
        const bodyRows = c.rows
          .map(
            (row, i) =>
              `<tr class="${c.highlightRows?.includes(i) ? "highlight" : ""}">${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`
          )
          .join("\n");
        return `
          <div class="section" ${pageBreak}>
            <h2>${section.title}</h2>
            ${c.caption ? `<p class="table-caption">${c.caption}</p>` : ""}
            <table class="data-table">
              <thead><tr>${headerRow}</tr></thead>
              <tbody>${bodyRows}</tbody>
            </table>
          </div>`;
      }

      case "key_metrics": {
        const c = section.content as KeyMetricsContent;
        const metricCards = c.metrics
          .map(
            (m) => `
            <div class="metric-card">
              <div class="metric-value">${m.value}${m.unit ? ` <span class="metric-unit">${m.unit}</span>` : ""}</div>
              <div class="metric-label">${m.label}</div>
              ${m.trend ? `<div class="metric-trend metric-trend-${m.trend}">${m.trendValue ?? m.trend}</div>` : ""}
            </div>`
          )
          .join("\n");
        return `
          <div class="section" ${pageBreak}>
            <h2>${section.title}</h2>
            <div class="metrics-grid">${metricCards}</div>
          </div>`;
      }

      case "pros_cons": {
        const c = section.content as ProsConsContent;
        return `
          <div class="section" ${pageBreak}>
            <h2>${section.title}</h2>
            <div class="pros-cons">
              <div class="pros"><h3>Pros</h3><ul>${c.pros.map((p) => `<li>${p}</li>`).join("")}</ul></div>
              <div class="cons"><h3>Cons</h3><ul>${c.cons.map((p) => `<li>${p}</li>`).join("")}</ul></div>
            </div>
          </div>`;
      }

      case "faq": {
        const c = section.content as FaqContent;
        const faqItems = c.questions
          .map((q) => `<div class="faq-item"><h3 class="faq-q">${q.question}</h3><p class="faq-a">${q.answer}</p></div>`)
          .join("\n");
        return `
          <div class="section" ${pageBreak}>
            <h2>${section.title}</h2>
            ${faqItems}
          </div>`;
      }

      case "disclaimer": {
        const c = section.content as DisclaimerContent;
        return `
          <div class="disclaimer" ${pageBreak}>
            <h2>Disclaimer</h2>
            <p>${c.text}</p>
          </div>`;
      }

      default:
        return `
          <div class="section" ${pageBreak}>
            <h2>${section.title}</h2>
            <p>[${section.type} section — render not yet implemented]</p>
          </div>`;
    }
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${definition.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=${brand.fontFamily.replace(/ /g, "+")}:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: '${brand.fontFamily}', sans-serif; color: #1a1a1a; line-height: 1.6; }
    .cover-page { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; text-align: center; background: ${brand.primaryColor}; color: white; padding: 60px; }
    .cover-title { font-size: 36px; font-weight: 700; margin: 20px 0; }
    .cover-subtitle { font-size: 20px; font-weight: 400; opacity: 0.9; }
    .cover-client, .cover-author, .cover-date { font-size: 14px; margin-top: 8px; opacity: 0.8; }
    .logo { max-width: 200px; margin-bottom: 30px; }
    .section, .toc-page, .disclaimer { padding: 40px 60px; }
    h2 { font-size: 24px; color: ${brand.primaryColor}; border-bottom: 2px solid ${brand.secondaryColor}; padding-bottom: 8px; margin-bottom: 20px; }
    .data-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    .data-table th { background: ${brand.primaryColor}; color: white; padding: 10px 12px; text-align: left; }
    .data-table td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
    .data-table tr.highlight { background: #fff3cd; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
    .metric-card { background: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; border-left: 4px solid ${brand.secondaryColor}; }
    .metric-value { font-size: 28px; font-weight: 700; color: ${brand.primaryColor}; }
    .metric-unit { font-size: 14px; font-weight: 400; }
    .metric-label { font-size: 13px; color: #666; margin-top: 4px; }
    .metric-trend { font-size: 12px; margin-top: 4px; }
    .metric-trend-up { color: #28a745; }
    .metric-trend-down { color: #dc3545; }
    .metric-trend-stable { color: #6c757d; }
    .pros-cons { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .pros h3 { color: #28a745; } .cons h3 { color: #dc3545; }
    .pros ul, .cons ul { list-style: none; padding: 0; } .pros li::before { content: "+ "; color: #28a745; font-weight: 700; } .cons li::before { content: "- "; color: #dc3545; font-weight: 700; }
    .faq-q { color: ${brand.primaryColor}; font-size: 16px; margin-top: 16px; }
    .faq-a { color: #444; margin-top: 4px; }
    .toc-list { padding-left: 20px; } .toc-list li { padding: 4px 0; }
    .disclaimer { font-size: 11px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
    footer { text-align: center; font-size: 10px; color: #aaa; padding: 20px; }
  </style>
</head>
<body>
${sectionHtmlParts.join("\n")}
${brand.footerText ? `<footer>${brand.footerText}</footer>` : ""}
</body>
</html>`;
}

/**
 * Generate a report from a definition.
 * Returns the GeneratedReport with rendered HTML (for PDF conversion)
 * or slide data (for PPTX generation).
 */
export function generateReport(definition: ReportDefinition): GeneratedReport {
  const report: GeneratedReport = {
    id: definition.id,
    definition,
    status: "generating",
    pageCount: definition.sections.length,
    generatedAt: new Date().toISOString(),
  };

  if (definition.format === "pdf") {
    report.renderedHtml = renderToHtml(definition);
    report.status = "complete";
  } else if (definition.format === "pptx") {
    // PPTX slide data generation — sections map to slides
    report.slideData = definition.sections.map((section) => ({
      sectionId: section.id,
      title: section.title,
      type: section.type,
      content: section.content,
    }));
    report.status = "complete";
  }

  return report;
}
