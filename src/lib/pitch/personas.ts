/**
 * OLIVIA BRAIN — Pitch Intelligence Personas
 *
 * 5 investor personas from Studio-Olivia.
 * Each persona represents a different investor archetype with specific preferences.
 */

import type { InvestorPersona, InvestorPersonaKey } from "./types";

// ─────────────────────────────────────────────
// 5 Investor Personas
// ─────────────────────────────────────────────

export const PERSONAS: InvestorPersona[] = [
  {
    key: "Angel",
    label: "Angel",
    color: "#A78BFA",
    desc: "Warm, story-led, EIS/SEIS",
  },
  {
    key: "SeedVC",
    label: "Seed VC",
    color: "#00F0FF",
    desc: "Metrics-heavy, TAM-first",
  },
  {
    key: "SeriesA",
    label: "Series A",
    color: "#4ADE80",
    desc: "ARR/NDR, unit economics",
  },
  {
    key: "Strategic",
    label: "Strategic",
    color: "#F97316",
    desc: "Synergy-focused, M&A",
  },
  {
    key: "Buyout",
    label: "Buyout / PE",
    color: "#FB7185",
    desc: "Financial depth, EBITDA",
  },
];

// ─────────────────────────────────────────────
// Persona Lookup
// ─────────────────────────────────────────────

export function getPersona(key: InvestorPersonaKey): InvestorPersona | undefined {
  return PERSONAS.find((p) => p.key === key);
}

export function getPersonaColor(key: InvestorPersonaKey): string {
  return getPersona(key)?.color ?? "#8B95A5";
}

// ─────────────────────────────────────────────
// Persona Keys for Iteration
// ─────────────────────────────────────────────

export const PERSONA_KEYS: InvestorPersonaKey[] = [
  "Angel",
  "SeedVC",
  "SeriesA",
  "Strategic",
  "Buyout",
];
