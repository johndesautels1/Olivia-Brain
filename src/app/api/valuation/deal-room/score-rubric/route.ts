import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { callLLM } from "@/lib/agents/llm";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RubricScoreResult {
  evidence: number;
  valuation: number;
  risk: number;
  objection: number;
  concision: number;
  resilience: number;
}

// â”€â”€ POST â€” LLM-scored rubric for War Room session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 5, windowMs: 60_000, prefix: "rubric-score" });
  if (limited) return limited;

  const { userId } = await getAuthSession();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    messages: { role: string; content: string }[];
    companyName: string;
    buyerType: string;
  };

  if (!body.messages?.length || !body.companyName) {
    return NextResponse.json({ error: "messages and companyName required" }, { status: 400 });
  }

  // Build the conversation transcript for the LLM
  const transcript = body.messages
    .map((m) => `[${m.role === "user" ? "Founder" : "Cristiano"}]: ${m.content}`)
    .join("\n\n");

  const systemPrompt =
    "You are an expert VC negotiation coach evaluating a founder's performance in a mock investor challenge session. Be rigorous — never inflate scores.";

  const userPrompt = `Company: ${body.companyName}
Buyer type: ${body.buyerType}

TRANSCRIPT:
${transcript}

Score the founder's performance on these 6 dimensions (0-100 each). Be rigorous — 70+ means genuinely strong, 50 is average, below 40 means weak. Do NOT inflate scores.

1. **Evidence Quality** — Did they cite specific data, metrics, reports, or quantitative proof? Vague claims score low.
2. **Valuation Defence** — Did they reference specific methodologies (DCF, multiples, comparables, WACC)? Generic "our valuation is fair" scores low.
3. **Risk Handling** — Did they acknowledge and address risks (concentration, churn, burn rate, dependency)? Ignoring risk scores low.
4. **Rebuttal Quality** — Did they directly counter Cristiano's challenges or deflect? Direct counters with evidence score high.
5. **Concision** — Were responses clear and focused, or rambling and unfocused?
6. **Composure** — Did they maintain consistency across rounds, or become defensive/erratic?

Respond with ONLY a JSON object, no other text:
{"evidence":N,"valuation":N,"risk":N,"objection":N,"concision":N,"resilience":N}`;

  /* All LLM traffic routes through the canonical callLLM wrapper per
   * `~/CLAUDE.md` § Architecture Standards Law 3 + AGENTS.md § 3.2.
   * Wrapper handles auth, timeout, structured cost/token logging,
   * graceful degradation on missing key, retry policy. */
  const result = await callLLM({
    model: "claude-sonnet-4-6",
    systemPrompt,
    userPrompt,
    temperature: 0.2, // Low randomness — evaluation tasks want stable scores
    maxTokens: 256,
    timeoutMs: 30_000,
  });

  if (!result) {
    /* callLLM returns null on missing key OR call failure (graceful
     * degrade). Both surface as 503 here so the client can show a
     * "scoring unavailable" state without crashing. */
    return NextResponse.json(
      { error: "LLM scoring unavailable" },
      { status: 503 },
    );
  }

  // Extract JSON from response
  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(
      `[score-rubric] No JSON in response: ${result.text.slice(0, 200)}`,
    );
    return NextResponse.json({ error: "LLM returned no scores" }, { status: 502 });
  }

  let scores: Partial<RubricScoreResult>;
  try {
    scores = JSON.parse(jsonMatch[0]) as Partial<RubricScoreResult>;
  } catch (err) {
    console.error(`[score-rubric] JSON parse failed:`, err);
    return NextResponse.json({ error: "LLM scoring parse failed" }, { status: 502 });
  }

  // Validate all scores are numbers 0-100
  const validated: RubricScoreResult = {
    evidence: clamp(scores.evidence),
    valuation: clamp(scores.valuation),
    risk: clamp(scores.risk),
    objection: clamp(scores.objection),
    concision: clamp(scores.concision),
    resilience: clamp(scores.resilience),
  };

  return NextResponse.json({ ok: true, scores: validated });
}

function clamp(n: unknown): number {
  const val = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}
