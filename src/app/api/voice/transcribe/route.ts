/**
 * VOICE TRANSCRIPTION API
 * ========================
 *
 * Speech-to-Text endpoint with automatic fallback.
 * Primary: Deepgram (sub-200ms latency target)
 * Fallback: OpenAI Whisper (multilingual)
 *
 * POST /api/voice/transcribe
 * Body: FormData with audio file, optional language
 */

import { NextRequest, NextResponse } from "next/server";
import {
  transcribeSpeech,
  getVoiceServiceStatus,
  transcribeWithWhisper,
  translateWithWhisper,
} from "@/lib/voice";

export async function POST(request: NextRequest) {
  try {
    const status = getVoiceServiceStatus();

    if (!status.deepgram.configured && !status.whisper.configured) {
      return NextResponse.json(
        {
          error: "No STT provider configured",
          message: "Set DEEPGRAM_API_KEY or OPENAI_API_KEY",
          configured: false,
        },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";

    let audioBuffer: ArrayBuffer;
    let mimeType: string;
    let language: string | undefined;
    let translate = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("audio") as File | null;
      language = formData.get("language") as string | null ?? undefined;
      translate = formData.get("translate") === "true";

      if (!file) {
        return NextResponse.json(
          { error: "audio file is required in form data" },
          { status: 400 }
        );
      }

      audioBuffer = await file.arrayBuffer();
      mimeType = file.type || "audio/wav";
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      const { audio, mimeType: bodyMimeType, language: bodyLang, translate: bodyTranslate } = body;

      if (!audio) {
        return NextResponse.json(
          { error: "audio (base64) is required" },
          { status: 400 }
        );
      }

      const buf = Buffer.from(audio, "base64");
      audioBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      mimeType = bodyMimeType || "audio/wav";
      language = bodyLang;
      translate = bodyTranslate === true;
    } else {
      audioBuffer = await request.arrayBuffer();
      mimeType = contentType || "audio/wav";
      language = request.headers.get("x-language") ?? undefined;
      translate = request.headers.get("x-translate") === "true";
    }

    let result;

    if (translate && status.whisper.configured) {
      result = await translateWithWhisper({
        audio: audioBuffer,
        mimeType,
      });
    } else {
      result = await transcribeSpeech({
        audio: audioBuffer,
        mimeType,
        language,
      });
    }

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      confidence: result.confidence,
      provider: result.provider,
      language: result.language,
      durationMs: result.durationMs,
      words: result.words,
    });
  } catch (error) {
    console.error("Voice transcription error:", error);
    return NextResponse.json(
      {
        error: "Transcription failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const status = getVoiceServiceStatus();

  return NextResponse.json({
    service: "Voice Transcription (STT)",
    providers: {
      primary: "Deepgram (sub-200ms)",
      fallback: "OpenAI Whisper (multilingual)",
    },
    configured: status.deepgram.configured || status.whisper.configured,
    status: {
      deepgram: status.deepgram,
      whisper: status.whisper,
    },
    usage: {
      formData: "POST multipart/form-data with audio file, optional language",
      json: "POST application/json with { audio: base64, mimeType, language?, translate? }",
      raw: "POST audio/* with raw audio bytes, X-Language and X-Translate headers",
    },
    supportedFormats: ["mp3", "wav", "webm", "ogg", "flac", "m4a"],
    features: {
      translation: "Set translate=true to translate non-English audio to English (Whisper)",
      wordTimestamps: "Response includes word-level timestamps when available",
    },
  });
}
