"use client";

/**
 * useFocusTrap — keyboard focus management for modal dialogs (WC-04).
 *
 * When `active` flips true:
 *   1. Stores the previously-focused element.
 *   2. Moves focus to the first focusable element inside the container
 *      (or to the container itself if it's a tabIndex=-1 wrapper).
 *   3. Intercepts Tab / Shift+Tab so focus stays within the container —
 *      tabbing past the last element wraps to the first, and Shift+Tab
 *      from the first wraps to the last.
 *
 * When `active` flips false (or the component unmounts):
 *   - Restores focus to the previously-focused element so keyboard
 *     users land back where they came from.
 *
 * No external dependency (react-focus-lock would be ~7 KB just for this).
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useFocusTrap(isOpen, ref);
 *   return <div ref={ref} role="dialog" aria-modal="true">…</div>;
 */

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    // Remember where focus was before the modal opened so we can return it.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus inside on next tick — gives portals / Suspense boundaries
    // time to render their children before we query for focusable elements.
    const focusFirst = () => {
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else if (container.tabIndex >= 0) {
        container.focus();
      }
    };
    const initialFocusTimer = window.setTimeout(focusFirst, 0);

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const node = containerRef.current;
      if (!node) return;

      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter(
        // Exclude elements that are visibility-hidden or detached but still
        // match the selector (rare but breaks the wrap calculation).
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

      if (focusables.length === 0) {
        // Nothing focusable inside — pin focus on the container so Tab
        // can't escape into the page behind the backdrop.
        e.preventDefault();
        if (node.tabIndex >= 0) node.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        // Shift+Tab from the first focusable wraps to the last.
        if (activeEl === first || !node.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab from the last focusable wraps to the first.
        if (activeEl === last || !node.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(initialFocusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus if the previously-focused element is still in the DOM.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        try {
          previouslyFocused.focus();
        } catch {
          /* element may not be focusable anymore — ignore */
        }
      }
    };
  }, [active, containerRef]);
}
