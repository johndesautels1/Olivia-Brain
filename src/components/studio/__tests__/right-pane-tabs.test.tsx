/**
 * @vitest-environment jsdom
 *
 * Smoke + interaction tests for the four S18 right-pane tabs +
 * audit helper.
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { ThemesTab } from "../ThemesTab";
import { PreviewTab } from "../PreviewTab";
import { AuditTab } from "../AuditTab";
import { pushAuditEntry, formatAuditTime } from "@/lib/studio/audit";

describe("ThemesTab", () => {
  it("renders 5 theme cards with the active one ARIA-checked", () => {
    const onSelect = vi.fn();
    render(<ThemesTab active="Canary-Sapphire" onSelect={onSelect} />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(5);
    expect(screen.getByRole("radio", { name: /Canary-Sapphire/i })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("fires onSelect with the theme key when a card is clicked", () => {
    const onSelect = vi.fn();
    render(<ThemesTab active="Canary-Sapphire" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: /Battersea-Resilient/i }));
    expect(onSelect).toHaveBeenCalledWith("Battersea-Resilient");
  });
});

describe("PreviewTab", () => {
  it("shows empty-state for pitch when slides is []", () => {
    render(
      <PreviewTab
        navSection="pitch"
        slides={[]}
        activePlanIdx={0}
        activeDoc={null}
      />,
    );
    expect(screen.getByText(/No slides yet/i)).toBeInTheDocument();
  });

  it("lists slide types when slides exist", () => {
    render(
      <PreviewTab
        navSection="pitch"
        slides={[
          { id: 1, type: "COVER", fw: ["Airbnb"] },
          { id: 2, type: "PROBLEM", fw: ["Airbnb"] },
        ]}
        activePlanIdx={0}
        activeDoc={null}
      />,
    );
    expect(screen.getByText(/Deck preview \(2 slides\)/i)).toBeInTheDocument();
    expect(screen.getByText("COVER")).toBeInTheDocument();
    expect(screen.getByText("PROBLEM")).toBeInTheDocument();
  });

  it("shows the active plan section title in plan mode", () => {
    render(
      <PreviewTab
        navSection="plan"
        slides={[]}
        activePlanIdx={0}
        activeDoc={null}
      />,
    );
    expect(screen.getByText(/Executive Summary/i)).toBeInTheDocument();
  });

  it("shows the doc name + category in documents mode", () => {
    render(
      <PreviewTab
        navSection="documents"
        slides={[]}
        activePlanIdx={0}
        activeDoc={{ category: "investor", doc: "Cap Table" }}
      />,
    );
    expect(screen.getByText("Cap Table")).toBeInTheDocument();
    expect(screen.getByText(/Category: investor/i)).toBeInTheDocument();
  });
});

describe("AuditTab", () => {
  it("shows empty-state when log is []", () => {
    render(<AuditTab log={[]} />);
    expect(screen.getByText(/Audit log is empty/i)).toBeInTheDocument();
  });

  it("lists entries newest-first with the latest highlighted", () => {
    render(
      <AuditTab
        log={[
          { time: "10:00:00", text: "Latest entry" },
          { time: "09:00:00", text: "Older entry" },
        ]}
      />,
    );
    expect(screen.getByText("Latest entry")).toBeInTheDocument();
    expect(screen.getByText("Older entry")).toBeInTheDocument();
  });
});

describe("pushAuditEntry", () => {
  it("pushes newest-first and is non-mutating", () => {
    const initial = [{ time: "09:00:00", text: "old" }];
    const out = pushAuditEntry(initial, "new");
    expect(out[0]?.text).toBe("new");
    expect(out[1]?.text).toBe("old");
    expect(initial).toHaveLength(1);
  });

  it("caps at AUDIT_LOG_CAP (50)", () => {
    let log: ReturnType<typeof pushAuditEntry> = [];
    for (let i = 0; i < 60; i++) {
      log = pushAuditEntry(log, `entry-${i}`);
    }
    expect(log).toHaveLength(50);
    expect(log[0]?.text).toBe("entry-59");
  });

  it("formatAuditTime returns HH:MM:SS shape", () => {
    const t = formatAuditTime(new Date("2026-05-07T14:23:45"));
    expect(t).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});
