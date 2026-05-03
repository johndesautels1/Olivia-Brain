// @vitest-environment jsdom

/**
 * `AvatarOrb` — render-only smoke test (Session 14).
 *
 * Coverage:
 * - Mounts at every documented state without throwing.
 * - Renders the glyph by default; hides it when `hasVideo`.
 * - Becomes a `<button>` when `onClick` is supplied; static `<div>`
 *   otherwise (so non-interactive avatar uses don't pollute the
 *   accessibility tree).
 * - Forwards `aria-label` correctly.
 * - Reflects the current state via `data-state` attribute (used by
 *   downstream tests + visual-diff tools to assert state without
 *   parsing inline styles).
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AvatarOrb, type AvatarOrbState } from "../AvatarOrb";

describe("AvatarOrb (smoke)", () => {
  const states: AvatarOrbState[] = [
    "idle",
    "listening",
    "thinking",
    "speaking",
    "error",
    "connecting",
  ];

  it.each(states)("mounts in '%s' state without throwing", (state) => {
    const { container } = render(<AvatarOrb state={state} />);
    expect(container.firstChild).toBeTruthy();
    expect(
      (container.firstChild as HTMLElement).getAttribute("data-state"),
    ).toBe(state);
  });

  it("renders the default glyph 'O'", () => {
    render(<AvatarOrb label="Olivia" />);
    expect(screen.getByLabelText("Olivia").textContent).toContain("O");
  });

  it("renders a custom glyph", () => {
    render(<AvatarOrb glyph="C" label="Cristiano" />);
    expect(screen.getByLabelText("Cristiano").textContent).toContain("C");
  });

  it("hides the glyph when hasVideo", () => {
    render(<AvatarOrb hasVideo label="Olivia live" />);
    expect(screen.getByLabelText("Olivia live").textContent ?? "").not.toContain(
      "O",
    );
  });

  it("renders as a button when onClick is supplied and fires the handler", () => {
    const onClick = vi.fn();
    render(<AvatarOrb onClick={onClick} label="Open Olivia" />);
    const btn = screen.getByLabelText("Open Olivia");
    expect(btn.tagName).toBe("BUTTON");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders as a non-interactive div when onClick is omitted", () => {
    render(<AvatarOrb label="Static orb" />);
    const orb = screen.getByLabelText("Static orb");
    expect(orb.tagName).toBe("DIV");
  });
});
