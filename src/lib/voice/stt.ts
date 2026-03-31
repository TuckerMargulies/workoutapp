// ============================================================
// Speech-to-Text — Phase 2
// expo-av for recording + OpenAI Whisper for transcription
// Uses FormData fetch (more reliable than base64/File on Android)
// ============================================================
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
  const { status } = await Audio.requestPermissionsAsync();
  return status === "granted";
}

// ---- Start recording ----
export async function startRecording(): Promise<void> {
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

  try {
    await activeRecording.stopAndUnloadAsync();
  } catch { /* ignore */ }

  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = activeRecording.getURI();
  activeRecording = null;
  return uri ?? null;
}

// ---- Transcribe audio URI via Whisper (FormData fetch — reliable on Android) ----
export async function transcribeAudio(audioUri: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API key");

  const formData = new FormData();
  formData.append("file", {
    uri: audioUri,
    name: "recording.m4a",
    type: "audio/m4a",
  } as any);
  formData.append("model", "whisper-1");
  formData.append("language", "en");
  formData.append("prompt", WHISPER_PROMPT);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  return (data.text ?? "").trim();
}

// ---- Convenience: stop recording + transcribe in one call ----
export async function stopAndTranscribe(): Promise<string | null> {
  const uri = await stopRecording();
  if (!uri) return null;
  return transcribeAudio(uri);
}
