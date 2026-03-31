// ============================================================
// Text-to-Speech — Phase 6
// ElevenLabs for high-quality trainer voice
// Falls back to expo-speech if ElevenLabs fails or key missing
// ============================================================
import { Audio } from "expo-av";
import * as Speech from "expo-speech";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Cached sound object — unload before playing new audio
let activeSound: Audio.Sound | null = null;

async function unloadActiveSound(): Promise<void> {
  if (activeSound) {
    try { await activeSound.unloadAsync(); } catch { /* ignore */ }
    activeSound = null;
  }
}

// ---- ElevenLabs TTS ----
async function speakWithElevenLabs(text: string): Promise<void> {
  const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
  const voiceId = process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)

  if (!apiKey) throw new Error("No ElevenLabs API key");

  const response = await fetch(
    `${ELEVENLABS_BASE}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) throw new Error(`ElevenLabs error: ${response.status}`);

  // Convert response to base64 data URI and play via expo-av
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUri = `data:audio/mpeg;base64,${base64}`;

  await unloadActiveSound();
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

  const { sound } = await Audio.Sound.createAsync(
    { uri: dataUri },
    { shouldPlay: true, volume: 1.0 }
  );
  activeSound = sound;

  // Wait for playback to finish
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) resolve();
    });
  });
}

// ---- expo-speech fallback (free, lower quality) ----
async function speakWithNative(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: 0.95,
      onDone: resolve,
      onError: () => resolve(), // resolve even on error to not block UI
    });
  });
}

// ---- Public API ----

// Speak trainer response — tries ElevenLabs, falls back to native
export async function speakText(text: string): Promise<void> {
  // Trim to reasonable length for voice (don't read walls of text)
  const trimmed = text.length > 300 ? text.slice(0, 297) + "..." : text;

  try {
    await speakWithElevenLabs(trimmed);
  } catch {
    // Silently fall back to native TTS
    await speakWithNative(trimmed);
  }
}

// Stop any currently playing audio
export async function stopSpeaking(): Promise<void> {
  Speech.stop();
  await unloadActiveSound();
}

// Check if currently speaking
export function isSpeaking(): boolean {
  return activeSound !== null;
}
