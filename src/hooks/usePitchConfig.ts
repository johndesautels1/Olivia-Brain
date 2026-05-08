"use client";

/**
 * `usePitchConfig` — localStorage-persistent pitch config (Track D S16).
 *
 * The four `/api/pitch/{draft,analyze,optimize,chat}` routes all
 * require an `OptimizeConfig` payload (projectName / persona / industry
 * / tone / stage). Asking the user for it on every action is hostile —
 * this hook owns it once and persists it across sessions.
 *
 * The shape mirrors `OptimizeConfig` from `@/lib/pitch` exactly so the
 * config can be sent to the API routes without translation.
 */

import { useCallback, useEffect, useState } from "react";

export type InvestorPersonaKey =
  | "Angel"
  | "SeedVC"
  | "SeriesA"
  | "Strategic"
  | "Buyout";

export interface PitchConfig {
  projectName: string;
  persona: InvestorPersonaKey;
  industry: string;
  tone: string;
  stage: string;
}

const STORAGE_KEY = "olivia.pitch.config.v1";

const DEFAULT_CONFIG: PitchConfig = {
  projectName: "My Venture",
  persona: "SeedVC",
  industry: "AI / SaaS",
  tone: "Confident, data-led",
  stage: "Seed",
};

export const PITCH_PERSONAS: { key: InvestorPersonaKey; label: string }[] = [
  { key: "Angel", label: "Angel" },
  { key: "SeedVC", label: "Seed VC" },
  { key: "SeriesA", label: "Series A" },
  { key: "Strategic", label: "Strategic" },
  { key: "Buyout", label: "Buyout / PE" },
];

export interface UsePitchConfigState {
  config: PitchConfig;
  update: <K extends keyof PitchConfig>(key: K, value: PitchConfig[K]) => void;
  reset: () => void;
  isRestored: boolean;
}

export function usePitchConfig(): UsePitchConfigState {
  const [config, setConfig] = useState<PitchConfig>(DEFAULT_CONFIG);
  const [isRestored, setIsRestored] = useState(false);

  /* Restore on mount. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PitchConfig>;
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch {
      /* Ignore corrupt storage; fall through to defaults. */
    }
    setIsRestored(true);
  }, []);

  /* Persist on change (skips initial render before restore). */
  useEffect(() => {
    if (!isRestored || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* localStorage full / disabled — silently no-op. */
    }
  }, [config, isRestored]);

  const update = useCallback(
    <K extends keyof PitchConfig>(key: K, value: PitchConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  return { config, update, reset, isRestored };
}
