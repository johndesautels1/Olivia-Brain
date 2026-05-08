/**
 * `/api/founder-intake/voice-extract` — Q7 cascade voice extraction.
 *
 * POST  body: `{ transcript: string, currentValues?: QuantaraValues }`
 *       returns: `{ ok, suggestions: QuantaraSuggestion[], runtimeMode,
 *                    providerId, modelId, transcript }`
 *
 * The route is stateless — like Q3's auto-fill route, it returns
 * suggestions only; persistence stays on the existing
 * `/api/founder-intake` POST flow when the founder accepts a suggestion.
 *
 * # Pipeline
 *
 *   1. Front-end captures audio via MediaRecorder, posts to
 *      `/api/voice/transcribe` (existing C3 route) → `transcript`.
 *   2. Front-end posts the transcript here with the founder's current
 *      canonical values (so the cascade can avoid re-emitting filled
 *      fields).
 *   3. Cascade extracts → returns `VoiceExtractionItem[]` adapted to
 *      `QuantaraSuggestion[]` for direct merging into the form's
 *      existing suggestion map.
 *
 * # Auth + rate-limit
 *
 * Pre-Clerk stub session (`getAuthSession()`) like the rest of Q1–Q6.
 * 6 extractions / 60 s per client — voice mode generates more calls
 * than save (one per utterance) but should stay below abusive use.
 */
import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import {
  QuantaraValuesSchema,
  extractFromTranscript,
  type QuantaraFieldId,
  type QuantaraValues,
} from "@/lib/quantara";
import type {
  QuantaraSuggestion,
  QuantaraSuggestionSourceId,
} from "@/lib/quantara/auto-fill";

interface PostBody {
  transcript?: unknown;
  currentValues?: unknown;
}

const MIN_TRANSCRIPT = 4;
const MAX_TRANSCRIPT = 4000;

const VOICE_SOURCE_ID: QuantaraSuggestionSourceId = "olivia_defaults";

function badRequest(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    limit: 6,
    windowMs: 60_000,
    prefix: "founder-intake-voice-extract",
  });
  if (limited) return limited;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const transcript =
    typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (transcript.length < MIN_TRANSCRIPT) {
    return badRequest(
      `transcript must be at least ${MIN_TRANSCRIPT} characters`,
    );
  }
  if (transcript.length > MAX_TRANSCRIPT) {
    return badRequest(
      `transcript must be at most ${MAX_TRANSCRIPT} characters`,
    );
  }

  /* currentValues is optional — when absent, every canonical field is
     fair game for extraction. Validation enforces type-safety on
     anything the founder has already filled. */
  const valuesParse = QuantaraValuesSchema.safeParse(body.currentValues ?? {});
  if (!valuesParse.success) {
    return badRequest(
      `Invalid currentValues: ${valuesParse.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  const currentValues = valuesParse.data as QuantaraValues;

  let userId: string;
  try {
    const session = await getAuthSession();
    if (!session.userId) return badRequest("Unauthorized", 401);
    userId = session.userId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Auth unavailable";
    return badRequest(msg, 503);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const result = await extractFromTranscript(
      transcript,
      currentValues,
      userId,
    );

    /* Adapt VoiceExtractionItem → QuantaraSuggestion so the IntakeForm
       can merge into its existing suggestion map without a parallel
       data structure. Source label "Voice" surfaces in the per-field
       chip; mockMode mirrors the cascade's runtime mode. */
    const fetchedAt = new Date().toISOString();
    const suggestions: ReadonlyArray<QuantaraSuggestion> = result.extractions.map(
      (e) => ({
        fieldId: e.fieldId as QuantaraFieldId,
        value: e.value,
        confidence: e.confidence,
        source: {
          integration: VOICE_SOURCE_ID,
          label: "Voice transcript",
          fetchedAt,
          note: e.note,
          mockMode: result.runtimeMode === "mock",
        },
      }),
    );

    return NextResponse.json({
      ok: true,
      transcript: result.transcript,
      suggestions,
      runtimeMode: result.runtimeMode,
      providerId: result.providerId,
      modelId: result.modelId,
    });
  } catch (err) {
    console.error("[api/founder-intake/voice-extract POST] Error:", err);
    return badRequest("Voice extraction failed", 500);
  } finally {
    clearTimeout(timeout);
  }
}
