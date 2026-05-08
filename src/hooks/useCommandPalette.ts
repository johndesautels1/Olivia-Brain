"use client";

/**
 * `useCommandPalette` — open/close state + ⌘K / Ctrl-K binding.
 *
 * Returns `{ open, openPalette, closePalette }`. The hook listens
 * globally for ⌘K / Ctrl-K and toggles. Skips when the user is
 * typing in any text input or contentEditable surface — except, of
 * course, when ⌘K itself is the keystroke.
 */

import { useCallback, useEffect, useState } from "react";

export interface CommandPaletteState {
  open: boolean;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
}

export function useCommandPalette(): CommandPaletteState {
  const [open, setOpen] = useState(false);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isCmdK =
        (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, openPalette, closePalette, togglePalette };
}
