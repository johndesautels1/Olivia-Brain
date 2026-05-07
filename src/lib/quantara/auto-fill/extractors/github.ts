/**
 * GitHub → Quantara field extractor.
 *
 * Maps repo + contributor stats to team-size signals. A repo's
 * `contributorsCount` is a noisy signal for `f40 Team Size` — it
 * over-counts external contributors, under-counts non-engineering
 * staff. Confidence reflects that.
 */
import {
  fetchGitHubRepoStats,
  type GitHubRepoStats,
  type IntegrationResponse,
} from "@/lib/tools/integrations";
import {
  SUGGESTION_SOURCE_LABEL,
  type QuantaraSuggestion,
} from "../types";

const DEFAULT_REPO = "example-org/example-repo";

export async function extractGitHubSuggestions(
  repo?: string,
): Promise<ReadonlyArray<QuantaraSuggestion>> {
  const targetRepo = repo ?? DEFAULT_REPO;
  const res: IntegrationResponse<GitHubRepoStats> = await fetchGitHubRepoStats(
    targetRepo,
  );
  if (!res.ok || !res.data) return [];
  const stats = res.data;
  const baseSource = {
    integration: "github" as const,
    label: SUGGESTION_SOURCE_LABEL.github,
    fetchedAt: res.source.fetchedAt,
    mockMode: res.mockMode,
  };

  /* Contributors map weakly to FT team size — bias toward
     under-confidence so a Stripe-derived headcount or the founder's
     own typed value wins on conflict. */
  const teamSizeConfidence = Math.max(0, res.source.confidence - 0.30);
  /* If the repo has > 10 contributors and the org is a typical
     dev-heavy seed/Series A SaaS, ~70% of staff are technical. */
  const technicalStaffPct = stats.contributorsCount > 0 ? 70 : 50;

  return [
    {
      fieldId: "f40",
      value: stats.contributorsCount,
      confidence: teamSizeConfidence,
      source: { ...baseSource, note: "Contributors as team-size proxy" },
    },
    {
      fieldId: "f41",
      value: technicalStaffPct,
      confidence: Math.max(0, res.source.confidence - 0.40),
      source: { ...baseSource, note: "Heuristic from repo activity" },
    },
  ];
}
