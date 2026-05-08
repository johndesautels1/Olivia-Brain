/**
 * `fuzzyScore` — fzf-style approximate match scoring.
 *
 * Returns a non-negative score for matches, 0 for no match. Higher
 * is better. Designed to feel like Linear / Raycast — consecutive
 * character matches and matches at word boundaries score higher.
 *
 * Does not allocate per-character objects to keep cmd-palette typing
 * snappy on big haystacks.
 */

export function fuzzyScore(needle: string, haystack: string): number {
  if (!needle) return 1;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();

  let score = 0;
  let lastIdx = -1;
  let consecutive = 0;

  for (let i = 0; i < n.length; i++) {
    const ch = n[i]!;
    const idx = h.indexOf(ch, lastIdx + 1);
    if (idx === -1) return 0;

    /* Match at the start of a word boundary scores extra. */
    const prev = idx > 0 ? h[idx - 1] : " ";
    const isBoundary = prev === " " || prev === "-" || prev === "_" || prev === "/";

    if (idx === lastIdx + 1) {
      consecutive++;
      score += 5 + consecutive * 3;
    } else {
      consecutive = 0;
      score += 1;
    }
    if (isBoundary) score += 4;
    /* Penalty for distance from start. */
    score -= Math.min(idx, 10) * 0.1;

    lastIdx = idx;
  }

  /* Bonus for short haystacks — exact matches win. */
  score += Math.max(0, 50 - haystack.length) * 0.05;
  return score;
}

export interface ScoredItem<T> {
  item: T;
  score: number;
}

/** Score and sort items by their searchable text. Empty query returns
 *  items in original order. */
export function searchAndScore<T>(
  query: string,
  items: readonly T[],
  toText: (item: T) => string,
  limit = 50,
): ScoredItem<T>[] {
  if (!query) {
    return items.slice(0, limit).map((item) => ({ item, score: 1 }));
  }
  const out: ScoredItem<T>[] = [];
  for (const item of items) {
    const score = fuzzyScore(query, toText(item));
    if (score > 0) out.push({ item, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
