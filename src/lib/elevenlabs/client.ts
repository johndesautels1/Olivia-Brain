// src/lib/elevenlabs/client.ts
// ElevenLabs client for Olivia's voice synthesis
// Used for voice calls and text-to-speech

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
}

export interface GenerateAudioResult {
  success: boolean;
  audioBuffer?: ArrayBuffer;
  contentType?: string;
  error?: string;
}

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!(
    process.env.ELEVENLABS_API_KEY &&
    process.env.ELEVENLABS_OLIVIA_VOICE_ID
  );
}

/**
 * Get ElevenLabs configuration from env vars
 */
export function getElevenLabsConfig(): ElevenLabsConfig | null {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_OLIVIA_VOICE_ID;

  if (!apiKey || !voiceId) {
    return null;
  }

  return { apiKey, voiceId };
}

/**
 * Generate audio from text using ElevenLabs
 * Returns audio buffer in MP3 format
 */
export async function generateOliviaAudio(
  text: string,
  options: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  } = {}
): Promise<GenerateAudioResult> {
  const config = getElevenLabsConfig();

  if (!config) {
    return {
      success: false,
      error: "ElevenLabs not configured",
    };
  }

  const {
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.3,
    useSpeakerBoost = true,
  } = options;

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": config.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[ElevenLabs] API error:", response.status, errorText);
      return {
        success: false,
        error: `ElevenLabs API returned ${response.status}: ${errorText}`,
      };
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      success: true,
      audioBuffer,
      contentType: "audio/mpeg",
    };
  } catch (error) {
    console.error("[ElevenLabs] Request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate audio and return as base64 data URI
 * Useful for embedding in responses or storing temporarily
 */
export async function generateOliviaAudioBase64(
  text: string
): Promise<{ success: boolean; dataUri?: string; error?: string }> {
  const result = await generateOliviaAudio(text);

  if (!result.success || !result.audioBuffer) {
    return { success: false, error: result.error };
  }

  // Convert ArrayBuffer to base64
  const base64 = Buffer.from(result.audioBuffer).toString("base64");
  const dataUri = `data:audio/mpeg;base64,${base64}`;

  return { success: true, dataUri };
}
