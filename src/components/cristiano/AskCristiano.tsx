"use client";

/**
 * AskCristiano
 *
 * Sub-tab 1 of the Cristiano dashboard. The user picks a verdict kind,
 * fills in the kind-specific form, submits to `POST /api/cristiano/judge`,
 * and watches Cristiano render the verdict live.
 *
 * Three forms — one per kind — selected via a tab control at the top.
 * Submit → /api/cristiano/judge → verdict comes back → mount the
 * CristianoVerdictPlayer with autoPlay so the avatar narrates the
 * pronouncement immediately.
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import { useCallback, useState } from "react";

import { CristianoVerdictPlayer } from "@/components/cristiano/CristianoVerdictPlayer";
import {
  CRISTIANO_VERDICT_KINDS,
  type CristianoVerdictKind,
  type CristianoVerdictRecord,
  type CristianoVerdictRequest,
} from "@/lib/cristiano/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface JudgeResponse {
  ok: boolean;
  verdict?: CristianoVerdictRecord;
  alreadyExisted?: boolean;
  error?: string;
  reason?: string;
  message?: string;
  details?: Array<{ path: string; message: string }>;
}

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "rendered"; verdict: CristianoVerdictRecord; alreadyExisted: boolean }
  | { phase: "failed"; error: string };

// ─── Component ───────────────────────────────────────────────────────────────

export function AskCristiano() {
  const [kind, setKind] = useState<CristianoVerdictKind>("freeform");
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: "idle" });

  // ── Form state per kind ──
  // freeform
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [criteriaRaw, setCriteriaRaw] = useState("");

  // city_compare
  const [city1, setCity1] = useState("");
  const [city2, setCity2] = useState("");

  // startup_match — minimal here; LTM's DNA Builder is the proper surface
  const [companyName, setCompanyName] = useState("");
  const [fundingRound, setFundingRound] = useState("seed");
  const [sectorTagsRaw, setSectorTagsRaw] = useState("");
  const [outreachGoal, setOutreachGoal] = useState("fundraising");
  const [productSummary, setProductSummary] = useState("");

  const buildRequest = useCallback((): CristianoVerdictRequest | null => {
    if (kind === "freeform") {
      const q = question.trim();
      if (q.length < 8 || q.length > 2000) return null;
      const criteria = criteriaRaw
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length >= 2 && s.length <= 280)
        .slice(0, 8);
      return {
        kind: "freeform",
        payload: {
          question: q,
          context: context.trim() || undefined,
          criteria: criteria.length > 0 ? criteria : undefined,
        },
      };
    }
    if (kind === "city_compare") {
      if (!city1.trim() || !city2.trim()) return null;
      return {
        kind: "city_compare",
        payload: { city1: city1.trim(), city2: city2.trim() },
      };
    }
    if (kind === "startup_match") {
      if (!companyName.trim() || !productSummary.trim()) return null;
      const sectorTags = sectorTagsRaw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return {
        kind: "startup_match",
        payload: {
          paragraphs: { p2: productSummary.trim() },
          metadata: {
            legalName: companyName.trim(),
            fundingRound,
            sectorTags,
          },
          outreachGoal,
        },
      };
    }
    // Exhaustive — fall through never happens.
    return null;
  }, [
    kind,
    question,
    context,
    criteriaRaw,
    city1,
    city2,
    companyName,
    fundingRound,
    sectorTagsRaw,
    outreachGoal,
    productSummary,
  ]);

  // ── Submit ──
  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const request = buildRequest();
      if (!request) {
        setSubmitState({
          phase: "failed",
          error: "Please complete the required fields.",
        });
        return;
      }

      setSubmitState({ phase: "submitting" });

      try {
        const res = await fetch("/api/cristiano/judge", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(request),
        });
        const data = (await res.json()) as JudgeResponse;
        if (!res.ok || !data.ok || !data.verdict) {
          const errorText = data.error
            ? `${data.error}${data.message ? `: ${data.message}` : ""}`
            : `Request failed (HTTP ${res.status})`;
          setSubmitState({ phase: "failed", error: errorText });
          return;
        }
        setSubmitState({
          phase: "rendered",
          verdict: data.verdict,
          alreadyExisted: data.alreadyExisted ?? false,
        });
      } catch (err) {
        setSubmitState({
          phase: "failed",
          error: err instanceof Error ? err.message : "Network error",
        });
      }
    },
    [buildRequest],
  );

  const handleReset = () => {
    setSubmitState({ phase: "idle" });
  };

  // ── Render ──
  return (
    <section
      className="cristiano-ask space-y-4"
      aria-label="Ask Cristiano"
      data-testid="ask-cristiano"
    >
      <header>
        <h2 className="text-base font-semibold text-fog">Ask Cristiano</h2>
        <p className="text-xs text-fog/70">
          Pick a verdict kind, submit a structured question, and watch
          Cristiano render the pronouncement.
        </p>
      </header>

      {/* Kind picker — hidden when a verdict has rendered. */}
      {submitState.phase !== "rendered" && (
        <div
          role="tablist"
          aria-label="Verdict kind"
          className="flex flex-wrap gap-1 rounded-lg border border-fog/10 bg-onyx/40 p-1"
        >
          {CRISTIANO_VERDICT_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={kind === k}
              onClick={() => setKind(k)}
              className={`min-h-[44px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/60 ${
                kind === k
                  ? "bg-aurum text-onyx border border-aurum"
                  : "text-fog/80 hover:text-fog hover:bg-fog/5 border border-transparent"
              }`}
              data-testid={`ask-cristiano-kind-${k}`}
            >
              {k.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Form */}
      {submitState.phase !== "rendered" && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-fog/10 bg-onyx/40 p-4"
          data-testid="ask-cristiano-form"
        >
          {kind === "freeform" && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  Question (required, 8-2000 characters)
                </span>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                  placeholder="What decision should Cristiano render?"
                  aria-required="true"
                  data-testid="ask-cristiano-question"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  Context (optional, max 8000 chars)
                </span>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  Criteria (one per line, max 8)
                </span>
                <textarea
                  value={criteriaRaw}
                  onChange={(e) => setCriteriaRaw(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                  placeholder="Each line becomes a weighted criterion Cristiano considers."
                />
              </label>
            </>
          )}

          {kind === "city_compare" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  City 1
                </span>
                <input
                  type="text"
                  value={city1}
                  onChange={(e) => setCity1(e.target.value)}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                  placeholder="London"
                  aria-required="true"
                  data-testid="ask-cristiano-city1"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  City 2
                </span>
                <input
                  type="text"
                  value={city2}
                  onChange={(e) => setCity2(e.target.value)}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                  placeholder="Paris"
                  aria-required="true"
                  data-testid="ask-cristiano-city2"
                />
              </label>
            </div>
          )}

          {kind === "startup_match" && (
            <>
              <p className="text-xs text-fog/70">
                Quick form for OB standalone use. Full DNA Builder is on
                London Tech Map — when LTM lands its gateway publisher,
                its richer verdicts arrive here automatically.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-fog/80">
                    Company name
                  </span>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                    aria-required="true"
                    data-testid="ask-cristiano-companyName"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-fog/80">
                    Funding round
                  </span>
                  <select
                    value={fundingRound}
                    onChange={(e) => setFundingRound(e.target.value)}
                    className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                  >
                    <option value="pre_seed">Pre-seed</option>
                    <option value="seed">Seed</option>
                    <option value="series_a">Series A</option>
                    <option value="series_b">Series B</option>
                    <option value="growth">Growth</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  Sector tags (comma-separated)
                </span>
                <input
                  type="text"
                  value={sectorTagsRaw}
                  onChange={(e) => setSectorTagsRaw(e.target.value)}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                  placeholder="fintech, payments"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  Outreach goal
                </span>
                <select
                  value={outreachGoal}
                  onChange={(e) => setOutreachGoal(e.target.value)}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                >
                  <option value="fundraising">Fundraising</option>
                  <option value="strategic_partner">Strategic partner</option>
                  <option value="acquirer">Acquirer</option>
                  <option value="customer">Customer</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-fog/80">
                  Product summary (paragraph)
                </span>
                <textarea
                  value={productSummary}
                  onChange={(e) => setProductSummary(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border border-fog/20 bg-onyx px-3 py-2 text-sm text-fog focus:border-aurum/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
                  aria-required="true"
                  data-testid="ask-cristiano-productSummary"
                />
              </label>
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={submitState.phase === "submitting"}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-aurum/40 bg-aurum/15 px-4 py-2 text-sm font-medium text-aurum hover:bg-aurum/25 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/60"
              data-testid="ask-cristiano-submit"
            >
              {submitState.phase === "submitting"
                ? "Cristiano is rendering..."
                : "Render verdict"}
            </button>
          </div>
        </form>
      )}

      {/* Failure state */}
      {submitState.phase === "failed" && (
        <div
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-500/10 p-3"
          data-testid="ask-cristiano-error"
        >
          <p className="text-sm text-red-300">{submitState.error}</p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 inline-flex min-h-[44px] items-center text-xs text-red-300 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
          >
            Try again
          </button>
        </div>
      )}

      {/* Rendered verdict — player auto-plays so Cristiano speaks the
          pronouncement immediately. */}
      {submitState.phase === "rendered" && (
        <div
          className="space-y-3"
          data-testid="ask-cristiano-rendered"
        >
          {submitState.alreadyExisted && (
            <p
              className="text-xs text-fog/70"
              data-testid="ask-cristiano-already-existed"
            >
              You&apos;ve already asked this — Cristiano is replaying his
              earlier verdict (no new LLM call spent).
            </p>
          )}
          <CristianoVerdictPlayer
            verdict={submitState.verdict}
            autoPlay
            autoDisconnect
            onPlaybackComplete={() => {
              /* leave state on "rendered" so user can re-play or ask again */
            }}
          />
          <button
            type="button"
            onClick={handleReset}
            className="min-h-[44px] rounded-md border border-fog/20 bg-onyx/60 px-4 py-2 text-xs font-medium text-fog hover:bg-fog/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-aurum/50"
            data-testid="ask-cristiano-ask-again"
          >
            Ask another question
          </button>
        </div>
      )}
    </section>
  );
}
