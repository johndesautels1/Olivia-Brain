// @vitest-environment jsdom
/**
 * `/cristiano?tab=...` deep-link tests.
 *
 * Covers the server-side query-param validator + the dashboard's
 * `initialTab` prop wiring. The page.tsx route is an async server
 * component — we test the resolution logic via the same code path
 * by invoking the page handler with a `Promise` searchParams arg,
 * mirroring the Next.js App Router contract.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CristianoPage from "@/app/cristiano/page";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true, verdicts: [], hasMore: false }),
  });
  // Reset sessionStorage between cases — the dashboard restores the
  // last-viewed tab from sessionStorage when initialTab is undefined,
  // and we don't want test N+1 to inherit test N's persisted tab.
  if (typeof window !== "undefined") {
    window.sessionStorage.clear();
  }
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

async function renderPage(
  tab: string | string[] | undefined,
): Promise<void> {
  // App Router server component: searchParams is a Promise.
  const element = await CristianoPage({
    searchParams: Promise.resolve(tab === undefined ? {} : { tab }),
  });
  render(element);
}

describe("/cristiano page — deep-link via ?tab=", () => {
  it("renders the dashboard at the default 'ask' tab when no ?tab param", async () => {
    await renderPage(undefined);
    expect(screen.getByTestId("cristiano-dashboard")).toBeTruthy();
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-ask")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("selects the 'library' tab when ?tab=library", async () => {
    await renderPage("library");
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-library")
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByTestId("cristiano-dashboard-panel-library"),
    ).toBeTruthy();
  });

  it("selects the 'inbox' tab when ?tab=inbox", async () => {
    await renderPage("inbox");
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-inbox")
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByTestId("gateway-inbox")).toBeTruthy();
  });

  it("falls back to default when ?tab is an unrecognised value", async () => {
    await renderPage("not_a_tab");
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-ask")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("falls back to default when ?tab is an array (duplicate param)", async () => {
    // Next.js gives an array when `?tab=ask&tab=library` is passed.
    // Defensive: we treat any array input as 'no valid tab specified'
    // rather than guessing which one the user meant.
    await renderPage(["library", "inbox"]);
    expect(
      screen
        .getByTestId("cristiano-dashboard-tab-ask")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });
});
