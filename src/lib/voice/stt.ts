// ============================================================
// Speech-to-Text — Phase 2
// expo-av for recording + OpenAI Whisper for transcription
// Uses FormData fetch (more reliable than base64/File on Android)
// Web: mic recording not supported — functions return null gracefully
// ============================================================
import { Platform } from "react-native";
import { Audio } from "expo-av";

// Fitness-specific terms to help Whisper accuracy
const WHISPER_PROMPT =
  "Fitness workout: sets, reps, deadlift, squat, kettlebell, Romanian deadlift, " +
  "patellar tendinitis, rotator cuff, glutes, hamstrings, quads, lats, triceps. " +
  "The speaker may be breathing hard or speaking between exercises.";

// ---- Recording state ----
let activeRecording: Audio.Recording | null = null;

// ---- Request microphone permission ----
export async function requestMicPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Audio.requestPermissionsAsync();
  return status === "granted";
}

// ---- Start recording ----
export async function startRecording(): Promise<void> {
  if (Platform.OS === "web") throw new Error("Mic recording is not supported in the browser. Use the text input instead.");
  // Clean up any stale recording
  if (activeRecording) {
    try { await activeRecording.stopAndUnloadAsync(); } catch { /* ignore */ }
    activeRecording = null;
  }

  const hasPermission = await requestMicPermission();
  if (!hasPermission) throw new Error("Microphone permission denied");

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );
  activeRecording = recording;
}

// ---- Stop recording and return audio URI ----
export async function stopRecording(): Promise<string | null> {
  if (!activeRecording) return null;

  // Capture URI before unloading
  const uri = activeRecording.getURI();

  try {
    await activeRecording.stopAndUnloadAsync();
  } catch { /* ignore */ }

  activeRecording = null;

  // Reset audio mode after unloading (iOS only — Android ignores this)
  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch { /* ignore */ }

  console.log("[STT] Recording stopped, URI:", uri?.slice(0, 60));
  return uri ?? null;
}

// ---- Transcribe audio URI via Whisper (FormData fetch — reliable on Android) ----
async function attemptTranscription(audioUri: string, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", {
    uri: audioUri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as any);
  formData.append("model", "whisper-1");
  formData.append("language", "en");
  formData.append("prompt", WHISPER_PROMPT);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[STT] Whisper API error:", response.status, err);
      throw new Error(`Whisper API error: ${response.status} — ${err.slice(0, 120)}`);
    }

    const data = await response.json();
    return (data.text ?? "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  console.log("[STT] API key present:", !!apiKey, "URI:", audioUri?.slice(0, 60));
  if (!apiKey) throw new Error("Missing OpenAI API key — rebuild required");

  // Retry once on network failure
  try {
    return await attemptTranscription(audioUri, apiKey);
  } catch (e: any) {
    console.error("[STT] First attempt failed:", e?.message);
    if (e?.name === "AbortError" || e?.message?.includes("Network request failed")) {
      console.log("[STT] Retrying...");
      return await attemptTranscription(audioUri, apiKey); // one retry
    }
    throw e;
  }
}

// ---- Convenience: stop recording + transcribe in one call ----
export async function stopAndTranscribe(): Promise<string | null> {
  const uri = await stopRecording();
  if (!uri) return null;
  return transcribeAudio(uri);
}
