// @vitest-environment jsdom
/**
 * CristianoDashboard — sub-tab navigation + panel mount tests.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CRISTIANO_DASHBOARD_TABS,
  CristianoDashboard,
} from "@/components/cristiano/CristianoDashboard";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, verdicts: [], hasMore: false }),
  });
  // Reset sessionStorage between tests so default-tab logic isn't
  // polluted by prior runs.
  if (typeof window !== "undefined") {
    window.sessionStorage.clear();
  }
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("CristianoDashboard — tab constants", () => {
  it("exposes the three sub-tabs in canonical order", () => {
    expect(CRISTIANO_DASHBOARD_TABS).toEqual(["ask", "library", "inbox"]);
  });
});

describe("CristianoDashboard — mount + default tab", () => {
  it("mounts and renders the header + tab nav", () => {
    render(<CristianoDashboard />);
    expect(screen.getByTestId("cristiano-dashboard")).toBeTruthy();
    expect(screen.getByText("Cristiano — The Judge")).toBeTruthy();
    expect(screen.getByTestId("cristiano-dashboard-tab-ask")).toBeTruthy();
    expect(screen.getByTestId("cristiano-dashboard-tab-library")).toBeTruthy();
    expect(screen.getByTestId("cristiano-dashboard-tab-inbox")).toBeTruthy();
  });

  it("defaults to the 'ask' tab on first mount", () => {
    render(<CristianoDashboard />);
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-ask")
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByTestId("cristiano-dashboard-panel-ask")).toBeTruthy();
  });

  it("respects `initialTab` prop override", () => {
    render(<CristianoDashboard initialTab="library" />);
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-library")
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByTestId("cristiano-dashboard-panel-library"),
    ).toBeTruthy();
  });

  it("restores the active tab from sessionStorage", () => {
    window.sessionStorage.setItem("cristiano-dashboard-tab", "inbox");
    render(<CristianoDashboard />);
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-inbox")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
});

describe("CristianoDashboard — tab switching", () => {
  it("switches to library tab when its button is clicked", async () => {
    render(<CristianoDashboard />);
    fireEvent.click(screen.getByTestId("cristiano-dashboard-tab-library"));
    await waitFor(() => {
      expect(
        screen.getByTestId("cristiano-dashboard-panel-library"),
      ).toBeTruthy();
    });
  });

  it("switches to inbox tab when its button is clicked", async () => {
    render(<CristianoDashboard />);
    fireEvent.click(screen.getByTestId("cristiano-dashboard-tab-inbox"));
    await waitFor(() => {
      expect(
        screen.getByTestId("cristiano-dashboard-panel-inbox"),
      ).toBeTruthy();
      expect(screen.getByTestId("gateway-inbox")).toBeTruthy();
    });
  });

  it("persists tab choice to sessionStorage on switch", async () => {
    render(<CristianoDashboard />);
    fireEvent.click(screen.getByTestId("cristiano-dashboard-tab-library"));
    await waitFor(() => {
      expect(window.sessionStorage.getItem("cristiano-dashboard-tab")).toBe(
        "library",
      );
    });
  });
});

describe("CristianoDashboard — accessibility", () => {
  it("uses role=tablist + role=tab + aria-selected", () => {
    render(<CristianoDashboard />);
    const tablist = screen.getByRole("tablist", {
      name: "Cristiano sub-tabs",
    });
    expect(tablist).toBeTruthy();
    // Scope to the dashboard's own tablist — AskCristiano (mounted
    // in the default 'ask' panel) has its own kind-picker tablist
    // that would otherwise leak into a global getAllByRole("tab").
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.length).toBe(3);
    expect(
      tabs.filter((t) => t.getAttribute("aria-selected") === "true").length,
    ).toBe(1);
  });

  it("links each tab to its panel via aria-controls + id", () => {
    render(<CristianoDashboard />);
    const askTab = screen.getByTestId("cristiano-dashboard-tab-ask");
    expect(askTab.getAttribute("aria-controls")).toBe(
      "cristiano-panel-ask",
    );
    const panel = screen.getByTestId("cristiano-dashboard-panel-ask");
    expect(panel.getAttribute("id")).toBe("cristiano-panel-ask");
  });

  it("has 44px minimum touch-target on tab buttons (WCAG 2.5.5)", () => {
    render(<CristianoDashboard />);
    const askTab = screen.getByTestId("cristiano-dashboard-tab-ask");
    expect(askTab.className).toMatch(/min-h-\[44px\]/);
  });
});

// ─── L8 audit fix — ARIA APG arrow-key tablist navigation ──
describe("CristianoDashboard — keyboard arrow-key navigation (L8)", () => {
  it("ArrowRight cycles forward through the tabs (with wrap)", () => {
    render(<CristianoDashboard />);
    const askTab = screen.getByTestId("cristiano-dashboard-tab-ask");
    fireEvent.keyDown(askTab, { key: "ArrowRight" });
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-library")
        .getAttribute("aria-selected"),
    ).toBe("true");

    // From last tab, ArrowRight wraps to first.
    fireEvent.keyDown(
      screen.getByTestId("cristiano-dashboard-tab-library"),
      { key: "ArrowRight" },
    );
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-inbox")
        .getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.keyDown(
      screen.getByTestId("cristiano-dashboard-tab-inbox"),
      { key: "ArrowRight" },
    );
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-ask")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("ArrowLeft cycles backward through the tabs (with wrap)", () => {
    render(<CristianoDashboard />);
    const askTab = screen.getByTestId("cristiano-dashboard-tab-ask");
    // From first tab, ArrowLeft wraps to last.
    fireEvent.keyDown(askTab, { key: "ArrowLeft" });
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-inbox")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("Home jumps to first tab; End jumps to last", () => {
    render(<CristianoDashboard initialTab="library" />);
    fireEvent.keyDown(
      screen.getByTestId("cristiano-dashboard-tab-library"),
      { key: "End" },
    );
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-inbox")
        .getAttribute("aria-selected"),
    ).toBe("true");
    fireEvent.keyDown(
      screen.getByTestId("cristiano-dashboard-tab-inbox"),
      { key: "Home" },
    );
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-ask")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("does not intercept non-arrow keys (Space/Enter still trigger click)", () => {
    render(<CristianoDashboard />);
    const askTab = screen.getByTestId("cristiano-dashboard-tab-ask");
    // Should not change selection on a non-handled key.
    fireEvent.keyDown(askTab, { key: "a" });
    expect(askTab.getAttribute("aria-selected")).toBe("true");
  });

  it("active tab has tabIndex=0, others have -1 (roving focus)", () => {
    render(<CristianoDashboard />);
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-ask")
        .getAttribute("tabindex"),
    ).toBe("0");
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-library")
        .getAttribute("tabindex"),
    ).toBe("-1");
  });
});
