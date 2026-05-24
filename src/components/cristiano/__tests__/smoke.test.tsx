// @vitest-environment jsdom
/**
 * Cristiano dashboard components — smoke + interaction tests.
 *
 * Renders each component, asserts it mounts without throwing, and
 * verifies the most-important keyboard / aria contracts. End-to-end
 * LiveAvatar narration is exercised manually on `/cristiano` — the
 * WebRTC pipeline cannot be realistically mocked in vitest.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CristianoVerdictPlayer } from "@/components/cristiano/CristianoVerdictPlayer";
import { VerdictLibrary } from "@/components/cristiano/VerdictLibrary";
import { GatewayInbox } from "@/components/cristiano/GatewayInbox";
import type { CristianoVerdictRecord } from "@/lib/cristiano/types";

// ─── Fetch mock ──────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

function makeVerdictFixture(
  overrides: Partial<CristianoVerdictRecord> = {},
): CristianoVerdictRecord {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    userId: "00000000-0000-4000-8000-000000000099",
    kind: "freeform",
    sourceApp: "ob",
    externalId: null,
    requestPayload: { question: "Should we hire?" },
    requestHash: "a".repeat(64),
    verdictBody: {
      spokenScript: "Delay the hire.",
      verdictTitle: "CTO timing",
      confidence: "medium",
      recommendation: "Wait.",
      rationale: "Runway.",
      keyFactors: ["Runway"],
    },
    spokenScript: "Delay the hire.",
    verdictTitle: "CTO timing",
    preRenderedVideoUrl: null,
    thumbnailUrl: null,
    durationSeconds: null,
    captionsUrl: null,
    status: "ready",
    errorMessage: null,
    modelUsed: "claude-opus-4-7",
    createdAt: new Date("2026-05-25T12:00:00Z").toISOString(),
    updatedAt: new Date("2026-05-25T12:00:00Z").toISOString(),
    expiresAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  // Reset fetch mock between tests.
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ─── CristianoVerdictPlayer ──────────────────────────────────────────────────

describe("CristianoVerdictPlayer", () => {
  it("mounts with a verdict and renders the title + transcript", () => {
    const verdict = makeVerdictFixture();
    render(<CristianoVerdictPlayer verdict={verdict} />);
    expect(screen.getByTestId("cristiano-verdict-player")).toBeTruthy();
    expect(screen.getByTestId("verdict-title").textContent).toBe("CTO timing");
    expect(screen.getByTestId("verdict-transcript")).toBeTruthy();
  });

  it("renders the live mode when no preRenderedVideoUrl is set", () => {
    const verdict = makeVerdictFixture();
    render(<CristianoVerdictPlayer verdict={verdict} />);
    const root = screen.getByTestId("cristiano-verdict-player");
    expect(root.getAttribute("data-mode")).toBe("live");
  });

  it("renders the video mode when preRenderedVideoUrl is set", () => {
    const verdict = makeVerdictFixture({
      preRenderedVideoUrl: "https://example.test/video.mp4",
      thumbnailUrl: "https://example.test/thumb.jpg",
    });
    render(<CristianoVerdictPlayer verdict={verdict} />);
    const root = screen.getByTestId("cristiano-verdict-player");
    expect(root.getAttribute("data-mode")).toBe("video");
    // Video element should be present with the right src.
    const video = root.querySelector("video");
    expect(video).toBeTruthy();
    expect(video?.getAttribute("src")).toBe(
      "https://example.test/video.mp4",
    );
  });

  it("renders the kind tag with humanised text", () => {
    const verdict = makeVerdictFixture({ kind: "startup_match" });
    render(<CristianoVerdictPlayer verdict={verdict} />);
    expect(screen.getByTestId("verdict-kind-tag").textContent).toMatch(
      /startup match/,
    );
  });

  it("respects explicit mode override", () => {
    const verdict = makeVerdictFixture({
      preRenderedVideoUrl: "https://example.test/video.mp4",
    });
    render(<CristianoVerdictPlayer verdict={verdict} mode="live" />);
    expect(
      screen
        .getByTestId("cristiano-verdict-player")
        .getAttribute("data-mode"),
    ).toBe("live");
  });

  // ─── H2 audit fix — captions track for WCAG 1.2.2 Level A ──
  it("renders <track kind='captions'> when captionsUrl is set (WCAG 1.2.2)", () => {
    const verdict = makeVerdictFixture({
      preRenderedVideoUrl: "https://example.test/video.mp4",
      captionsUrl: "https://example.test/captions.vtt",
    });
    render(<CristianoVerdictPlayer verdict={verdict} />);
    const track = screen.getByTestId("verdict-captions-track");
    expect(track).toBeTruthy();
    expect(track.getAttribute("kind")).toBe("captions");
    expect(track.getAttribute("src")).toBe("https://example.test/captions.vtt");
    expect(track.getAttribute("srclang")).toBe("en");
    expect(track.hasAttribute("default")).toBe(true);
  });

  it("omits the <track> element when captionsUrl is null", () => {
    const verdict = makeVerdictFixture({
      preRenderedVideoUrl: "https://example.test/video.mp4",
      captionsUrl: null,
    });
    render(<CristianoVerdictPlayer verdict={verdict} />);
    expect(screen.queryByTestId("verdict-captions-track")).toBeFalsy();
  });

  it("sets crossOrigin='anonymous' on the video when captions are provided (so the track can load cross-origin)", () => {
    const verdict = makeVerdictFixture({
      preRenderedVideoUrl: "https://example.test/video.mp4",
      captionsUrl: "https://example.test/captions.vtt",
    });
    render(<CristianoVerdictPlayer verdict={verdict} />);
    const player = screen.getByTestId("cristiano-verdict-player");
    const video = player.querySelector("video");
    expect(video?.getAttribute("crossorigin")).toBe("anonymous");
  });
});

// ─── VerdictLibrary ──────────────────────────────────────────────────────────

describe("VerdictLibrary", () => {
  it("shows a loading state on initial render", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, verdicts: [] }),
    });
    render(<VerdictLibrary />);
    expect(screen.getByTestId("verdict-library-loading")).toBeTruthy();
  });

  it("renders an empty state when fetch returns []", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, verdicts: [], hasMore: false }),
    });
    render(<VerdictLibrary />);
    await waitFor(() => {
      expect(screen.getByTestId("verdict-library-empty")).toBeTruthy();
    });
  });

  it("renders verdict rows when fetch returns verdicts", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        verdicts: [
          makeVerdictFixture({ id: "11111111-1111-4111-8111-111111111111", verdictTitle: "First verdict" }),
          makeVerdictFixture({ id: "22222222-2222-4222-8222-222222222222", verdictTitle: "Second verdict" }),
        ],
        hasMore: false,
      }),
    });
    render(<VerdictLibrary />);
    await waitFor(() => {
      const rows = screen.getAllByTestId("verdict-row");
      expect(rows.length).toBe(2);
    });
  });

  it("surfaces an error when fetch fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ ok: false, error: "Something broke" }),
    });
    render(<VerdictLibrary />);
    await waitFor(() => {
      expect(screen.getByTestId("verdict-library-error")).toBeTruthy();
    });
  });

  it("expands a verdict on row click and shows the player", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        verdicts: [makeVerdictFixture()],
        hasMore: false,
      }),
    });
    render(<VerdictLibrary />);
    const row = await screen.findByTestId("verdict-row");
    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.getByTestId("cristiano-verdict-player")).toBeTruthy();
    });
  });

  it("hides the kind filter when hideKindFilter is true", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, verdicts: [], hasMore: false }),
    });
    render(<VerdictLibrary hideKindFilter hideSourceAppFilter />);
    await waitFor(() => {
      expect(screen.getByTestId("verdict-library-empty")).toBeTruthy();
    });
    expect(
      screen.queryByLabelText("Filter verdicts by kind"),
    ).toBeFalsy();
  });
});

// ─── GatewayInbox ────────────────────────────────────────────────────────────

describe("GatewayInbox", () => {
  it("mounts and renders the header + child library", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, verdicts: [], hasMore: false }),
    });
    render(<GatewayInbox />);
    expect(screen.getByTestId("gateway-inbox")).toBeTruthy();
    expect(screen.getByText("Gateway Inbox")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId("verdict-library")).toBeTruthy();
    });
  });

  it("does not show a refresh button when no new verdicts have arrived", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, verdicts: [], hasMore: false }),
    });
    render(<GatewayInbox />);
    await waitFor(() => {
      expect(screen.getByTestId("gateway-inbox")).toBeTruthy();
    });
    expect(screen.queryByTestId("gateway-inbox-refresh")).toBeFalsy();
  });
});
