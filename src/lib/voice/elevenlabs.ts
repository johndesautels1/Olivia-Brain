/**
 * OLIVIA BRAIN - ELEVENLABS VOICE SYNTHESIS
 * ==========================================
 *
 * Primary TTS provider for Olivia™, Cristiano™, and Emelia™ personas.
 *
 * Voice Profiles:
 * - Olivia™: Client-facing executive avatar (warm, professional, engaging)
 * - Cristiano™: THE JUDGE (authoritative, confident, decisive - James Bond aesthetic)
 * - Emelia™: Back-end support (helpful, knowledgeable, efficient)
 *
 * ElevenLabs provides high-quality, low-latency voice synthesis with
 * emotional expressiveness and natural prosody.
 */

import { getServerEnv } from "@/lib/config/env";
import { withTraceSpan } from "@/lib/observability/tracer";
import type { PersonaId, TTSRequest, TTSResult, VoiceProfile } from "./types";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export function getVoiceProfiles(): VoiceProfile[] {
  const env = getServerEnv();

  return [
    {
      personaId: "olivia",
      label: "Olivia™",
      description: "Client-facing executive avatar - warm, professional, engaging",
      elevenlabsVoiceId: env.ELEVENLABS_VOICE_OLIVIA,
      openaiVoice: "nova",
    },
    {
      personaId: "cristiano",
      label: "Cristiano™",
      description: "THE JUDGE - authoritative, confident, decisive",
      elevenlabsVoiceId: env.ELEVENLABS_VOICE_CRISTIANO,
      openaiVoice: "onyx",
    },
    {
      personaId: "emelia",
      label: "Emelia™",
      description: "Back-end support - helpful, knowledgeable, efficient",
      elevenlabsVoiceId: env.ELEVENLABS_VOICE_EMELIA,
      openaiVoice: "shimmer",
    },
  ];
}

export function getVoiceProfile(personaId: PersonaId): VoiceProfile | undefined {
  return getVoiceProfiles().find((p) => p.personaId === personaId);
}

export function isElevenLabsConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.ELEVENLABS_API_KEY);
}

interface ElevenLabsVoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

function getVoiceSettings(personaId: PersonaId): ElevenLabsVoiceSettings {
  switch (personaId) {
    case "olivia":
      return {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.4,
        use_speaker_boost: true,
      };
    case "cristiano":
      return {
        stability: 0.7,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true,
      };
    case "emelia":
      return {
        stability: 0.6,
        similarity_boost: 0.7,
        style: 0.3,
        use_speaker_boost: true,
      };
  }
}

export async function synthesizeWithElevenLabs(
  request: TTSRequest
): Promise<TTSResult> {
  const env = getServerEnv();

  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const profile = getVoiceProfile(request.personaId);
  if (!profile || !profile.elevenlabsVoiceId) {
    throw new Error(`Voice profile not found for persona: ${request.personaId}`);
  }

  const voiceSettings = getVoiceSettings(request.personaId);
  const outputFormat = request.outputFormat ?? "mp3";

  const startTime = Date.now();

  const audio = await withTraceSpan(
    "olivia.elevenlabs_tts",
    {
      "olivia.persona": request.personaId,
      "olivia.voice_id": profile.elevenlabsVoiceId,
      "olivia.char_count": request.text.length,
    },
    async () => {
      const response = await fetch(
        `${ELEVENLABS_API_BASE}/text-to-speech/${profile.elevenlabsVoiceId}?output_format=${outputFormat}_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": env.ELEVENLABS_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: request.text,
            model_id: "eleven_turbo_v2_5",
            voice_settings: voiceSettings,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
      }

      return response.arrayBuffer();
    }
  );

  return {
    audio,
    durationMs: Date.now() - startTime,
    provider: "elevenlabs",
    personaId: request.personaId,
    characterCount: request.text.length,
  };
}

export async function listElevenLabsVoices(): Promise<
  Array<{ voice_id: string; name: string; category: string }>
> {
  const env = getServerEnv();

  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const data = await response.json();
  return data.voices;
}

export async function getElevenLabsSubscription(): Promise<{
  character_count: number;
  character_limit: number;
  voice_limit: number;
}> {
  const env = getServerEnv();

  if (!env.ELEVENLABS_API_KEY) {
    throw new Error("ElevenLabs API key not configured");
  }

  const response = await fetch(`${ELEVENLABS_API_BASE}/user/subscription`, {
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  return response.json();
}
