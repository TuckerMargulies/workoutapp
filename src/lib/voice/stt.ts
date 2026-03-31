// ============================================================
// Speech-to-Text — Phase 2
// expo-av for recording + Supabase Edge Function for Whisper transcription
// ============================================================
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { createClient } from "../supabase";

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

  await activeRecording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = activeRecording.getURI();
  activeRecording = null;
  return uri ?? null;
}

// ---- Transcribe audio URI via Whisper ----
export async function transcribeAudio(audioUri: string): Promise<string> {
  // Read the file as base64
  // @ts-expect-error expo-file-system doesn't type "base64" encoding
  const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: "base64",
  });

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("stt", {
    body: {
      audioBase64,
      prompt: WHISPER_PROMPT,
      language: "en",
    },
  });

  if (error) throw new Error(`Transcription error: ${error.message}`);

  return (data.text ?? "").trim();
}

// ---- Convenience: stop recording + transcribe in one call ----
export async function stopAndTranscribe(): Promise<string | null> {
  const uri = await stopRecording();
  if (!uri) return null;
  return transcribeAudio(uri);
}
