// @vitest-environment jsdom
/**
 * AskCristiano — form + submit flow tests.
 *
 * End-to-end live narration is exercised manually on `/cristiano` —
 * the WebRTC pipeline isn't realistically mockable in vitest. These
 * tests cover the form / submit / render / failure state machine.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AskCristiano } from "@/components/cristiano/AskCristiano";
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
      spokenScript: "Wait until post-Series A.",
      verdictTitle: "CTO timing",
      confidence: "medium",
      recommendation: "Wait.",
      rationale: "Runway constraint.",
      keyFactors: ["Runway"],
    },
    spokenScript: "Wait until post-Series A.",
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
  globalThis.fetch = vi.fn();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

// ─── Mount + form ────────────────────────────────────────────────────────────

describe("AskCristiano — mount + kind picker", () => {
  it("mounts and renders the kind picker with all 3 tabs", () => {
    render(<AskCristiano />);
    expect(screen.getByTestId("ask-cristiano")).toBeTruthy();
    expect(screen.getByTestId("ask-cristiano-kind-freeform")).toBeTruthy();
    expect(
      screen.getByTestId("ask-cristiano-kind-city_compare"),
    ).toBeTruthy();
    expect(
      screen.getByTestId("ask-cristiano-kind-startup_match"),
    ).toBeTruthy();
  });

  it("defaults to the freeform kind on mount", () => {
    render(<AskCristiano />);
    expect(
      screen
        .getByTestId("ask-cristiano-kind-freeform")
        .getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("switches form when a different kind is clicked", () => {
    render(<AskCristiano />);
    fireEvent.click(screen.getByTestId("ask-cristiano-kind-city_compare"));
    expect(screen.getByTestId("ask-cristiano-city1")).toBeTruthy();
    expect(screen.getByTestId("ask-cristiano-city2")).toBeTruthy();
  });

  // ─── M1/M2 audit fix — tablist linkage ──
  it("kind tabs have aria-controls pointing to the form panel (M1)", () => {
    render(<AskCristiano />);
    const tabs = [
      screen.getByTestId("ask-cristiano-kind-freeform"),
      screen.getByTestId("ask-cristiano-kind-city_compare"),
      screen.getByTestId("ask-cristiano-kind-startup_match"),
    ];
    for (const tab of tabs) {
      expect(tab.getAttribute("aria-controls")).toBe("ask-cristiano-form-panel");
    }
  });

  it("each kind tab has a unique id used by aria-labelledby on the form panel (M2)", () => {
    render(<AskCristiano />);
    expect(
      screen.getByTestId("ask-cristiano-kind-freeform").getAttribute("id"),
    ).toBe("ask-cristiano-kind-tab-freeform");
    expect(
      screen
        .getByTestId("ask-cristiano-kind-city_compare")
        .getAttribute("id"),
    ).toBe("ask-cristiano-kind-tab-city_compare");
    expect(
      screen
        .getByTestId("ask-cristiano-kind-startup_match")
        .getAttribute("id"),
    ).toBe("ask-cristiano-kind-tab-startup_match");
  });

  it("form-panel has role=tabpanel + aria-labelledby pointing to the active tab (M2)", () => {
    render(<AskCristiano />);
    const form = screen.getByTestId("ask-cristiano-form");
    expect(form.getAttribute("role")).toBe("tabpanel");
    expect(form.getAttribute("id")).toBe("ask-cristiano-form-panel");
    expect(form.getAttribute("aria-labelledby")).toBe(
      "ask-cristiano-kind-tab-freeform",
    );
    fireEvent.click(screen.getByTestId("ask-cristiano-kind-city_compare"));
    expect(
      screen
        .getByTestId("ask-cristiano-form")
        .getAttribute("aria-labelledby"),
    ).toBe("ask-cristiano-kind-tab-city_compare");
  });

  it("only the active kind tab has tabIndex=0; others have tabIndex=-1 (roving focus)", () => {
    render(<AskCristiano />);
    expect(
      screen
        .getByTestId("ask-cristiano-kind-freeform")
        .getAttribute("tabindex"),
    ).toBe("0");
    expect(
      screen
        .getByTestId("ask-cristiano-kind-city_compare")
        .getAttribute("tabindex"),
    ).toBe("-1");
    fireEvent.click(screen.getByTestId("ask-cristiano-kind-city_compare"));
    expect(
      screen
        .getByTestId("ask-cristiano-kind-freeform")
        .getAttribute("tabindex"),
    ).toBe("-1");
    expect(
      screen
        .getByTestId("ask-cristiano-kind-city_compare")
        .getAttribute("tabindex"),
    ).toBe("0");
  });
});

// ─── Submission ──────────────────────────────────────────────────────────────

describe("AskCristiano — submit + render flow", () => {
  it("surfaces a validation error when freeform question is too short", async () => {
    render(<AskCristiano />);
    fireEvent.change(screen.getByTestId("ask-cristiano-question"), {
      target: { value: "Hi?" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));
    await waitFor(() => {
      expect(screen.getByTestId("ask-cristiano-error")).toBeTruthy();
    });
  });

  it("posts to /api/cristiano/judge with the kind-aware payload on submit", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        verdict: makeVerdictFixture(),
        alreadyExisted: false,
      }),
    });
    render(<AskCristiano />);
    fireEvent.change(screen.getByTestId("ask-cristiano-question"), {
      target: { value: "Should we hire a CTO this quarter?" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/cristiano/judge",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const lastCall = fetchMock.mock.calls.at(-1);
    expect(lastCall).toBeTruthy();
    if (!lastCall) return;
    const body = JSON.parse(lastCall[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.kind).toBe("freeform");
    expect(body.payload).toMatchObject({
      question: "Should we hire a CTO this quarter?",
    });
  });

  it("renders the verdict player on successful submit", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        verdict: makeVerdictFixture(),
        alreadyExisted: false,
      }),
    });
    render(<AskCristiano />);
    fireEvent.change(screen.getByTestId("ask-cristiano-question"), {
      target: { value: "Should we hire a CTO this quarter?" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("ask-cristiano-rendered")).toBeTruthy();
    });
    expect(screen.getByTestId("cristiano-verdict-player")).toBeTruthy();
  });

  it("surfaces 'already existed' messaging on idempotent re-submit", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        verdict: makeVerdictFixture(),
        alreadyExisted: true,
      }),
    });
    render(<AskCristiano />);
    fireEvent.change(screen.getByTestId("ask-cristiano-question"), {
      target: { value: "Should we hire a CTO this quarter?" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));

    await waitFor(() => {
      expect(
        screen.getByTestId("ask-cristiano-already-existed"),
      ).toBeTruthy();
    });
  });

  it("surfaces an error when the API returns a 4xx/5xx", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({
        ok: false,
        error: "Verdict render failed",
        reason: "validation_failure",
      }),
    });
    render(<AskCristiano />);
    fireEvent.change(screen.getByTestId("ask-cristiano-question"), {
      target: { value: "Should we hire a CTO this quarter?" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("ask-cristiano-error")).toBeTruthy();
    });
  });

  // ─── M5 audit fix — submitting status: aria-busy + live region ──
  it("sets aria-busy=true on the form while submitting (M5)", async () => {
    // Hold the fetch promise open so we can observe the in-flight state.
    let resolveFetch: ((res: { ok: boolean; json: () => Promise<unknown> }) => void) | null = null;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<AskCristiano />);
    fireEvent.change(screen.getByTestId("ask-cristiano-question"), {
      target: { value: "Should we hire a CTO this quarter?" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));

    await waitFor(() => {
      expect(
        screen.getByTestId("ask-cristiano-form").getAttribute("aria-busy"),
      ).toBe("true");
    });

    // Status live region announces the submission to SR users.
    const status = screen.getByTestId("ask-cristiano-status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toMatch(/Cristiano is rendering/i);

    // Release the held fetch so the test exits cleanly.
    resolveFetch?.({
      ok: true,
      json: async () => ({
        ok: true,
        verdict: makeVerdictFixture(),
        alreadyExisted: false,
      }),
    });
    await waitFor(() => {
      expect(screen.getByTestId("ask-cristiano-rendered")).toBeTruthy();
    });
  });

  it("allows asking another question after a verdict has rendered", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        verdict: makeVerdictFixture(),
        alreadyExisted: false,
      }),
    });
    render(<AskCristiano />);
    fireEvent.change(screen.getByTestId("ask-cristiano-question"), {
      target: { value: "Should we hire a CTO this quarter?" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("ask-cristiano-rendered")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-ask-again"));
    await waitFor(() => {
      expect(screen.getByTestId("ask-cristiano-form")).toBeTruthy();
    });
  });
});

// ─── city_compare submission ─────────────────────────────────────────────────

describe("AskCristiano — city_compare submission", () => {
  it("submits a city_compare verdict with both cities filled in", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        verdict: makeVerdictFixture({ kind: "city_compare" }),
        alreadyExisted: false,
      }),
    });
    render(<AskCristiano />);
    fireEvent.click(screen.getByTestId("ask-cristiano-kind-city_compare"));
    fireEvent.change(screen.getByTestId("ask-cristiano-city1"), {
      target: { value: "London" },
    });
    fireEvent.change(screen.getByTestId("ask-cristiano-city2"), {
      target: { value: "Paris" },
    });
    fireEvent.click(screen.getByTestId("ask-cristiano-submit"));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const lastCall = fetchMock.mock.calls.at(-1);
    if (!lastCall) return;
    const body = JSON.parse(lastCall[1]?.body as string) as Record<
      string,
      unknown
    >;
    expect(body.kind).toBe("city_compare");
    expect(body.payload).toMatchObject({ city1: "London", city2: "Paris" });
  });
});
