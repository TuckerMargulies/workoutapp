// ============================================================
// Speech-to-Text — Phase 2
// expo-av for recording + OpenAI Whisper for transcription
// ============================================================
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  const base64 = await FileSystem.readAsStringAsync(audioUri, {
    encoding: "base64" as any,
  });

  // Convert base64 to blob for the API
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "audio/m4a" });
  const file = new File([blob], "recording.m4a", { type: "audio/m4a" });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    prompt: WHISPER_PROMPT,
    language: "en",
  });

  return transcription.text.trim();
}

// ---- Convenience: stop recording + transcribe in one call ----
export async function stopAndTranscribe(): Promise<string | null> {
  const uri = await stopRecording();
  if (!uri) return null;
  return transcribeAudio(uri);
}
