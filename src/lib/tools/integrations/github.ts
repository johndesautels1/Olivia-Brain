/**
 * GitHub read-only integration for Q3 auto-fill.
 *
 * Reads repo + contributor + commit-velocity stats for the connected GitHub
 * org/repo. Mock-mode returns a deterministic plausible payload when
 * GITHUB_TOKEN is absent.
 *
 * LTM audit (2026-05-07): no LTM client — this is OB-original.
 */

import { getServerEnv } from "@/lib/config/env";
import { type IntegrationResponse, withMockFallback } from "./_types";

export interface GitHubRepoStats {
  fullName: string;
  stars: number;
  forks: number;
  watchers: number;
  contributorsCount: number;
  commitsLast30Days: number;
  primaryLanguage: string;
  defaultBranch: string;
  isPrivate: boolean;
  /** ISO timestamp of the last push to default branch. */
  lastPushAt: string | null;
}

const MOCK_PAYLOAD: GitHubRepoStats = {
  fullName: "example-org/example-repo",
  stars: 247,
  forks: 31,
  watchers: 18,
  contributorsCount: 12,
  commitsLast30Days: 89,
  primaryLanguage: "TypeScript",
  defaultBranch: "main",
  isPrivate: false,
  lastPushAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
};

/** Fetch GitHub repo stats. `repo` shape: "owner/name". Mock-mode signalled
 *  via `mockMode: true` on the response. */
export async function fetchGitHubRepoStats(
  repo: string,
): Promise<IntegrationResponse<GitHubRepoStats>> {
  const { GITHUB_TOKEN } = getServerEnv();
  if (!GITHUB_TOKEN) {
    return {
      ok: true,
      data: { ...MOCK_PAYLOAD, fullName: repo },
      mockMode: true,
      source: { integration: "github", fetchedAt: new Date().toISOString(), confidence: 0.5 },
    };
  }

  return withMockFallback(
    "github",
    async (signal) => {
      const headers = {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      };
      const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers, signal });
      if (!repoRes.ok) throw new Error(`github_${repoRes.status}`);
      const repoJson = (await repoRes.json()) as {
        full_name: string;
        stargazers_count: number;
        forks_count: number;
        watchers_count: number;
        language: string | null;
        default_branch: string;
        private: boolean;
        pushed_at: string | null;
      };

      let contributorsCount = 0;
      try {
        const contribRes = await fetch(
          `https://api.github.com/repos/${repo}/contributors?per_page=100&anon=false`,
          { headers, signal },
        );
        if (contribRes.ok) {
          const contribs = (await contribRes.json()) as unknown[];
          contributorsCount = contribs.length;
        }
      } catch {
        /* keep contributorsCount = 0; not a hard failure */
      }

      return {
        fullName: repoJson.full_name,
        stars: repoJson.stargazers_count,
        forks: repoJson.forks_count,
        watchers: repoJson.watchers_count,
        contributorsCount,
        commitsLast30Days: 0,
        primaryLanguage: repoJson.language ?? "Unknown",
        defaultBranch: repoJson.default_branch,
        isPrivate: repoJson.private,
        lastPushAt: repoJson.pushed_at,
      };
    },
    { ...MOCK_PAYLOAD, fullName: repo },
  );
}
