/**
 * OLIVIA BRAIN - VOICE TYPES
 * ==========================
 *
 * Shared types for voice synthesis (TTS) and speech recognition (STT) services.
 */

export type PersonaId = "olivia" | "cristiano" | "emelia";

export interface VoiceProfile {
  personaId: PersonaId;
  label: string;
  description: string;
  elevenlabsVoiceId: string | null;
  openaiVoice: string;
}

export interface TTSRequest {
  text: string;
  personaId: PersonaId;
  outputFormat?: "mp3" | "pcm" | "opus" | "aac";
}

export interface TTSResult {
  audio: ArrayBuffer;
  durationMs: number;
  provider: "elevenlabs" | "openai";
  personaId: PersonaId;
  characterCount: number;
}

export interface STTRequest {
  audio: ArrayBuffer | Blob;
  mimeType: string;
  language?: string;
}

export interface STTResult {
  transcript: string;
  confidence: number;
  durationMs: number;
  provider: "deepgram" | "whisper";
  language?: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface VoiceServiceStatus {
  elevenlabs: { configured: boolean; available: boolean };
  openaiTts: { configured: boolean; available: boolean };
  deepgram: { configured: boolean; available: boolean };
  whisper: { configured: boolean; available: boolean };
}
