/**
 * OLIVIA BRAIN — AVATAR EVAL SCRIPT CATALOG
 * ==========================================
 *
 * Track O5c session 2. The 30-script suite from the O5 research memo
 * (`docs/O5_AVATAR_LIPSYNC_RESEARCH.md §5`) used by the harness at
 * `/admin/avatar-eval` to drive the per-vendor MOS comparison.
 *
 * Categories (5 scripts each):
 * - short        → onset latency
 * - medium       → connected speech
 * - number_heavy → prosody on tabular numerals
 * - plosive      → b/p/m lip-closure accuracy
 * - multilingual → non-English handling
 * - long_form    → sustained sync + breath placement
 *
 * Append-only — never renumber an existing `id` or the `(scriptId,
 * vendor)` index in `AvatarEvalRun` will mis-correlate historical runs.
 * If you must drop a script, leave the row hole in the numbering.
 */

export type EvalScriptCategory =
  | "short"
  | "medium"
  | "number_heavy"
  | "plosive"
  | "multilingual"
  | "long_form";

export interface EvalScript {
  /** Stable identifier — append-only, never renumber. */
  id: string;
  category: EvalScriptCategory;
  text: string;
  /** Optional one-liner shown in the harness UI. */
  notes?: string;
}

export const EVAL_SCRIPTS: readonly EvalScript[] = [
  // ─── Short utterances (onset latency) ───────────────────────────────
  { id: "short-01", category: "short", text: "Yes." },
  { id: "short-02", category: "short", text: "Tell me more." },
  { id: "short-03", category: "short", text: "London." },
  { id: "short-04", category: "short", text: "Welcome." },
  { id: "short-05", category: "short", text: "Done." },

  // ─── Medium 1-sentence (connected speech) ───────────────────────────
  {
    id: "medium-01",
    category: "medium",
    text: "The pre-money is six-point-five million pounds.",
  },
  {
    id: "medium-02",
    category: "medium",
    text: "Series A timing concerns me.",
  },
  {
    id: "medium-03",
    category: "medium",
    text: "Your fundraising window closes in about ninety days.",
  },
  {
    id: "medium-04",
    category: "medium",
    text: "I think the cap table is materially clean.",
  },
  {
    id: "medium-05",
    category: "medium",
    text: "Let's walk through the term sheet together.",
  },

  // ─── Number-heavy (prosody on tabular numerals) ─────────────────────
  {
    id: "number-01",
    category: "number_heavy",
    text: "Forty-two-point-three percent CAGR over the last six quarters.",
  },
  {
    id: "number-02",
    category: "number_heavy",
    text: "Revenue grew from one-point-eight million to four-point-six million.",
  },
  {
    id: "number-03",
    category: "number_heavy",
    text: "Net dollar retention sits at one hundred and twenty-eight percent.",
  },
  {
    id: "number-04",
    category: "number_heavy",
    text: "Burn multiple is zero-point-nine over the trailing twelve months.",
  },
  {
    id: "number-05",
    category: "number_heavy",
    text: "Customer acquisition cost is two thousand four hundred dollars, paying back in fourteen months.",
  },

  // ─── Plosive-heavy (b/p/m lip-closure accuracy) ─────────────────────
  {
    id: "plosive-01",
    category: "plosive",
    text: "Big banks back bigger banks.",
  },
  {
    id: "plosive-02",
    category: "plosive",
    text: "Pretty pink pansies bloom by the porch.",
  },
  {
    id: "plosive-03",
    category: "plosive",
    text: "Bombarded by big bold buyout offers.",
  },
  {
    id: "plosive-04",
    category: "plosive",
    text: "Pure profit potential prompts pricing pressure.",
  },
  {
    id: "plosive-05",
    category: "plosive",
    text: "Maybe my partner Mike packs more punch.",
  },

  // ─── Multilingual (non-English handling) ────────────────────────────
  {
    id: "multilingual-01",
    category: "multilingual",
    text: "Bonjour, comment allez-vous?",
    notes: "French",
  },
  {
    id: "multilingual-02",
    category: "multilingual",
    text: "Hola, qué tal.",
    notes: "Spanish",
  },
  {
    id: "multilingual-03",
    category: "multilingual",
    text: "Guten Tag, wie geht es Ihnen?",
    notes: "German",
  },
  {
    id: "multilingual-04",
    category: "multilingual",
    text: "Konnichiwa, hajimemashite.",
    notes: "Japanese (romaji)",
  },
  {
    id: "multilingual-05",
    category: "multilingual",
    text: "Ciao, piacere di conoscerti.",
    notes: "Italian",
  },

  // ─── Long-form (3+ sentences, sustained sync, breath placement) ─────
  {
    id: "long-01",
    category: "long_form",
    text:
      "Founders often underestimate how much an investor's first thirty seconds of attention shapes the rest of the meeting. " +
      "The deck doesn't have to be perfect, but the opening line has to do real work — it should make the listener want the rest. " +
      "If you can name the wedge, the moat, and the asymmetry in one breath, you've earned the next twenty minutes.",
    notes: "Pitch coach narrative",
  },
  {
    id: "long-02",
    category: "long_form",
    text:
      "Looking at your last four quarters, the Monte Carlo distribution gives you an expected value of about twenty-three million pounds, " +
      "with a five-percent floor at one-point-eight and a ninety-fifth-percentile ceiling near forty-one. " +
      "The median trails the mean because of the right tail in your enterprise pipeline. " +
      "I'd anchor your round at the median, not the mean, when you talk to lead investors.",
    notes: "Valuation walkthrough",
  },
  {
    id: "long-03",
    category: "long_form",
    text:
      "The clause we just flagged is a board-control swing dressed up as standard founder protection. " +
      "Read carefully: it gives the lead a unilateral veto on any future raise above thirty percent dilution. " +
      "Three of your four counter-positions can survive this term sheet. " +
      "The fourth — the right to add a friendly board seat in round B — needs to come out now or it never will.",
    notes: "Deal protection narrative",
  },
  {
    id: "long-04",
    category: "long_form",
    text:
      "Your blood pressure and resting heart rate are both trending in the right direction this week. " +
      "The morning walk you started Tuesday is doing more work than the data suggests because it's also pacing your sleep onset. " +
      "I'd keep that one habit and add the breath protocol on Thursdays. " +
      "Don't stack new things until the existing ones are mechanical.",
    notes: "Heart-recovery briefing",
  },
  {
    id: "long-05",
    category: "long_form",
    text:
      "The flat in Hampstead matches your privacy and outdoor-space requirements, but the commute to your Shoreditch office tips toward seventy minutes door-to-door once you account for the school run. " +
      "The Belsize Park option is forty percent more expensive but cuts that to thirty-five. " +
      "Given how much weight you put on weekday calendar density, I'd push you toward the more expensive flat.",
    notes: "London relocation context",
  },
] as const;

/** Vendors compared in the A/B harness. Mirrors AvatarProvider plus the
 * production LiveAvatar LITE path (which is its own vendor surface, not
 * any of the `src/lib/avatar/*` adapters). */
export const EVAL_VENDORS = [
  "tavus",
  "simli",
  "heygen",
  "did",
  "sadtalker",
  "liveavatar",
] as const;

export type EvalVendor = (typeof EVAL_VENDORS)[number];

export function isEvalVendor(value: string): value is EvalVendor {
  return (EVAL_VENDORS as readonly string[]).includes(value);
}

export function getEvalScript(id: string): EvalScript | undefined {
  return EVAL_SCRIPTS.find((s) => s.id === id);
}

export function getEvalScriptsByCategory(
  category: EvalScriptCategory,
): readonly EvalScript[] {
  return EVAL_SCRIPTS.filter((s) => s.category === category);
}
