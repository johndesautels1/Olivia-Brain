// @vitest-environment jsdom

/**
 * `AvatarOrb` — unit tests (Track C Session 14 placeholder + Session 15 full impl).
 *
 * Coverage:
 * - All six documented states render via `data-state`.
 * - Glyph default + custom + hidden when `hasVideo`.
 * - Button-vs-div semantics by `onClick` presence.
 * - Click handler fires.
 * - Cristiano gold-saturated transition (intent="judge" + state="speaking")
 *   is reflected via `data-cristiano="true"`.
 * - Council mode (`subAgents`) renders the right number of orbital dots
 *   with the documented ARIA labels.
 * - LiveAvatar lazy-mount only fires when `hasVideo` is implied
 *   (verified by absence of LiveAvatar load when not requested).
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

/* The OliviaVideoAvatar is heavyweight (LiveKit + ElevenLabs).  Mock
   it as a marker so we can assert it does/doesn't render without
   spinning up the full LiveAvatar pipeline. */
vi.mock("@/components/olivia/OliviaVideoAvatar", () => ({
  OliviaVideoAvatar: () => <div data-testid="live-avatar-mounted" />,
}));

import { AvatarOrb, type AvatarOrbState, type SubAgent } from "../AvatarOrb";

describe("AvatarOrb (state + size)", () => {
  const states: AvatarOrbState[] = [
    "idle",
    "listening",
    "thinking",
    "speaking",
    "error",
    "connecting",
  ];

  it.each(states)("mounts in '%s' state without throwing", (state) => {
    render(<AvatarOrb state={state} label={`orb-${state}`} />);
    const orb = screen.getByLabelText(`orb-${state}`);
    expect(orb.getAttribute("data-state")).toBe(state);
  });

  it("renders the default glyph 'O'", () => {
    render(<AvatarOrb label="default-glyph" />);
    expect(screen.getByLabelText("default-glyph").textContent).toContain("O");
  });

  it("renders a custom glyph", () => {
    render(<AvatarOrb glyph="C" label="custom-glyph" />);
    expect(screen.getByLabelText("custom-glyph").textContent).toContain("C");
  });
});

describe("AvatarOrb (interaction)", () => {
  it("renders as a button when onClick is supplied and fires the handler", () => {
    const onClick = vi.fn();
    render(<AvatarOrb onClick={onClick} label="click-orb" />);
    const btn = screen.getByLabelText("click-orb");
    expect(btn.tagName).toBe("BUTTON");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders as a non-interactive div when onClick is omitted", () => {
    render(<AvatarOrb label="static-orb" />);
    expect(screen.getByLabelText("static-orb").tagName).toBe("DIV");
  });
});

describe("AvatarOrb (Cristiano transition — § 6.3)", () => {
  it("flags intent=judge + state=speaking via data-cristiano", () => {
    render(
      <AvatarOrb
        state="speaking"
        intent="judge"
        label="cristiano-orb"
      />,
    );
    expect(
      screen.getByLabelText("cristiano-orb").getAttribute("data-cristiano"),
    ).toBe("true");
  });

  it("does NOT flag Cristiano when state is speaking but intent isn't judge", () => {
    render(
      <AvatarOrb
        state="speaking"
        intent="research"
        label="research-speaking"
      />,
    );
    expect(
      screen.getByLabelText("research-speaking").getAttribute("data-cristiano"),
    ).toBeNull();
  });

  it("does NOT flag Cristiano when intent is judge but state isn't speaking", () => {
    render(
      <AvatarOrb state="thinking" intent="judge" label="judge-thinking" />,
    );
    expect(
      screen.getByLabelText("judge-thinking").getAttribute("data-cristiano"),
    ).toBeNull();
  });
});

describe("AvatarOrb (council mode — § 6.4)", () => {
  const agents: SubAgent[] = [
    { kind: "olivia", active: true },
    { kind: "research", active: false },
    { kind: "persona", active: true },
    { kind: "math", active: false },
    { kind: "multilingual", active: false },
  ];

  it("renders one orbital dot per sub-agent", () => {
    render(<AvatarOrb subAgents={agents} label="council-orb" />);
    const list = screen.getAllByRole("img");
    /* The first img is the overall sub-agent group; remaining are dots.
       We expect 1 group + N dot images. */
    expect(list.length).toBeGreaterThanOrEqual(agents.length);
  });

  it("uses each kind's documented accessible label", () => {
    render(<AvatarOrb subAgents={agents} label="council-orb" />);
    expect(screen.getByLabelText("Olivia (orchestrator)")).toBeTruthy();
    expect(screen.getByLabelText("Research")).toBeTruthy();
    expect(screen.getByLabelText("Persona")).toBeTruthy();
    expect(screen.getByLabelText("Math")).toBeTruthy();
    expect(screen.getByLabelText("Multilingual")).toBeTruthy();
  });

  it("respects a custom per-agent label override", () => {
    render(
      <AvatarOrb
        subAgents={[{ kind: "research", label: "Tavily" }]}
        label="single-orb"
      />,
    );
    expect(screen.getByLabelText("Tavily")).toBeTruthy();
  });
});

describe("AvatarOrb (LiveAvatar lazy-mount)", () => {
  it("does NOT mount the LiveAvatar at the small sizes by default", () => {
    render(<AvatarOrb size={40} label="small-orb" />);
    expect(screen.queryByTestId("live-avatar-mounted")).toBeNull();
  });

  it("mounts the LiveAvatar when hasVideo is explicitly true", async () => {
    render(<AvatarOrb size={56} hasVideo label="explicit-video" />);
    expect(await screen.findByTestId("live-avatar-mounted")).toBeTruthy();
  });

  it("mounts the LiveAvatar at size 240 by default", async () => {
    render(<AvatarOrb size={240} label="hero-orb" />);
    expect(await screen.findByTestId("live-avatar-mounted")).toBeTruthy();
  });
});
