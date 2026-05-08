/**
 * @vitest-environment jsdom
 */

/**
 * Documents block smoke tests — Track B Session 8.
 *
 * Each of the 18 LTM-ported block components is mounted against valid
 * sample data and asserted to render a non-empty DOM node. These are
 * deliberately lightweight: a renderable block is the floor we ship to
 * Session 8b's workspace shell port. Visual fidelity, accessibility, and
 * field-editor wiring are exercised when the workspace shell lands.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import HeroBlock from "../blocks/HeroBlock";
import SectionBlock from "../blocks/SectionBlock";
import ParagraphBlock from "../blocks/ParagraphBlock";
import ListBlock from "../blocks/ListBlock";
import CalloutBlock from "../blocks/CalloutBlock";
import QuoteBlock from "../blocks/QuoteBlock";
import DividerBlock from "../blocks/DividerBlock";
import TableBlock from "../blocks/TableBlock";
import ComparisonTable from "../blocks/ComparisonTable";
import BarChartBlock from "../blocks/BarChartBlock";
import PieChartBlock from "../blocks/PieChartBlock";
import MetricCardsBlock from "../blocks/MetricCardsBlock";
import StatCard from "../blocks/StatCard";
import TeamCard from "../blocks/TeamCard";
import TimelineBlock from "../blocks/TimelineBlock";
import ProductCard from "../blocks/ProductCard";
import LogoBanner from "../blocks/LogoBanner";
import FooterBlock from "../blocks/FooterBlock";

const ACCENT = "#C4A96A";

describe("Documents · 18 block atoms · smoke render", () => {
  it("HeroBlock mounts with title + classification", () => {
    const { container } = render(
      <HeroBlock
        block={{
          type: "hero",
          title: "Olivia Brain",
          subtitle: "Investor preview",
          classification: "confidential",
          date: "May 2026",
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Olivia Brain");
  });

  it("SectionBlock mounts with heading", () => {
    const { container } = render(
      <SectionBlock
        block={{ type: "section", heading: "Market opportunity", level: 2 }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Market opportunity");
  });

  it("ParagraphBlock mounts with body content", () => {
    const { container } = render(
      <ParagraphBlock
        block={{ type: "paragraph", content: "London tech is the world's most diverse ecosystem." }}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("London");
  });

  it("ListBlock mounts with bulleted items", () => {
    const { container } = render(
      <ListBlock
        block={{
          type: "list",
          style: "bullet",
          items: ["Finding A", "Finding B", "Finding C"],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Finding A");
  });

  it("CalloutBlock mounts with info variant + content", () => {
    const { container } = render(
      <CalloutBlock
        block={{
          type: "callout",
          variant: "info",
          title: "Note",
          content: "Bookmark this section.",
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Note");
  });

  it("QuoteBlock mounts with attributed pull-quote", () => {
    const { container } = render(
      <QuoteBlock
        block={{
          type: "quote",
          text: "Premature optimization is the root of all evil.",
          attribution: "Donald Knuth",
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Donald Knuth");
  });

  it("DividerBlock mounts with each style variant", () => {
    for (const style of ["diamond", "gradient", "dots"] as const) {
      const { container } = render(
        <DividerBlock block={{ type: "divider", style }} accent={ACCENT} />
      );
      expect(container.firstChild).not.toBeNull();
    }
  });

  it("TableBlock mounts with headers + rows", () => {
    const { container } = render(
      <TableBlock
        block={{
          type: "table",
          title: "Cap table",
          headers: ["Holder", "Shares"],
          rows: [
            ["Founders", "70%"],
            ["ESOP", "12%"],
          ],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Founders");
  });

  it("ComparisonTable mounts with highlight column", () => {
    const { container } = render(
      <ComparisonTable
        block={{
          type: "comparison_table",
          title: "Versus competitors",
          headers: ["Feature", "Olivia", "Competitor"],
          rows: [["Cascade", "9 models", "1 model"]],
          highlightColumn: 1,
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Cascade");
  });

  it("BarChartBlock mounts with data points", () => {
    const { container } = render(
      <BarChartBlock
        block={{
          type: "bar_chart",
          title: "ARR growth",
          data: [
            { label: "Q1", value: 100 },
            { label: "Q2", value: 220 },
          ],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("PieChartBlock mounts with slices", () => {
    const { container } = render(
      <PieChartBlock
        block={{
          type: "pie_chart",
          title: "Revenue mix",
          data: [
            { label: "Enterprise", value: 60 },
            { label: "SMB", value: 40 },
          ],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("MetricCardsBlock mounts with multiple items", () => {
    const { container } = render(
      <MetricCardsBlock
        block={{
          type: "metrics",
          items: [
            { label: "ARR", value: "$2.4M", deltaDirection: "up", delta: "+18%" },
            { label: "Customers", value: "187" },
          ],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("ARR");
  });

  it("StatCard mounts with single metric + delta", () => {
    const { container } = render(
      <StatCard
        block={{
          type: "stat_card",
          label: "MRR",
          value: "$200K",
          delta: "+12%",
          deltaDirection: "up",
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("MRR");
  });

  it("TeamCard mounts with role + bio", () => {
    const { container } = render(
      <TeamCard
        block={{
          type: "team_card",
          name: "Jane Doe",
          role: "CEO",
          bio: "Former founder, sold last company to Stripe.",
          highlights: ["Forbes 30u30", "YC W18"],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Jane Doe");
  });

  it("TimelineBlock mounts with milestones", () => {
    const { container } = render(
      <TimelineBlock
        block={{
          type: "timeline",
          title: "Product roadmap",
          items: [
            { date: "Q1 2026", title: "Beta launch" },
            { date: "Q2 2026", title: "GA release", description: "Public availability." },
          ],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Beta launch");
  });

  it("ProductCard mounts with status-tagged items", () => {
    const { container } = render(
      <ProductCard
        block={{
          type: "product_card",
          items: [
            { name: "Olivia Chat", description: "Always-on advisor.", status: "live" },
            { name: "Olivia Voice", description: "Phone + voicemail.", status: "development" },
          ],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Olivia Chat");
  });

  it("LogoBanner mounts with logos", () => {
    const { container } = render(
      <LogoBanner
        block={{
          type: "logo_banner",
          title: "Trusted by",
          logos: [{ name: "Acme" }, { name: "Globex" }],
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Acme");
  });

  it("FooterBlock mounts with company + classification", () => {
    const { container } = render(
      <FooterBlock
        block={{
          type: "footer",
          company: "Olivia Brain Ltd",
          address: "London, UK",
          classification: "Confidential",
          copyright: "© 2026 Olivia Brain Ltd",
        }}
        accent={ACCENT}
      />
    );
    expect(container.firstChild).not.toBeNull();
    expect(container.textContent).toContain("Olivia Brain Ltd");
  });
});
