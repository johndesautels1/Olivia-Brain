import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "LLM not configured" }, { status: 503 });
  }

  // Build the conversation transcript for the LLM
  const transcript = body.messages
    .map((m) => `[${m.role === "user" ? "Founder" : "Cristiano"}]: ${m.content}`)
    .join("\n\n");

  const prompt = `You are an expert VC negotiation coach evaluating a founder's performance in a mock investor challenge session.

Company: ${body.companyName}
Buyer type: ${body.buyerType}

TRANSCRIPT:
${transcript}

Score the founder's performance on these 6 dimensions (0-100 each). Be rigorous â€” 70+ means genuinely strong, 50 is average, below 40 means weak. Do NOT inflate scores.

1. **Evidence Quality** â€” Did they cite specific data, metrics, reports, or quantitative proof? Vague claims score low.
2. **Valuation Defence** â€” Did they reference specific methodologies (DCF, multiples, comparables, WACC)? Generic "our valuation is fair" scores low.
3. **Risk Handling** â€” Did they acknowledge and address risks (concentration, churn, burn rate, dependency)? Ignoring risk scores low.
4. **Rebuttal Quality** â€” Did they directly counter Cristiano's challenges or deflect? Direct counters with evidence score high.
5. **Concision** â€” Were responses clear and focused, or rambling and unfocused?
6. **Composure** â€” Did they maintain consistency across rounds, or become defensive/erratic?

Respond with ONLY a JSON object, no other text:
{"evidence":N,"valuation":N,"risk":N,"objection":N,"concision":N,"resilience":N}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[score-rubric] Anthropic error ${res.status}: ${errText}`);
      return NextResponse.json({ error: "LLM scoring failed" }, { status: 502 });
    }

    const json = await res.json();
    const textBlocks = (json.content ?? []).filter(
      (b: { type: string }) => b.type === "text",
    );
    const rawText = textBlocks.map((b: { text: string }) => b.text).join("\n");

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[score-rubric] No JSON in response: ${rawText.slice(0, 200)}`);
      return NextResponse.json({ error: "LLM returned no scores" }, { status: 502 });
    }

    const scores = JSON.parse(jsonMatch[0]) as RubricScoreResult;

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
  } catch (err) {
    console.error(`[score-rubric] Request failed:`, err);
    return NextResponse.json({ error: "LLM request failed" }, { status: 502 });
  }
}

function clamp(n: unknown): number {
  const val = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(100, Math.round(val)));
}
