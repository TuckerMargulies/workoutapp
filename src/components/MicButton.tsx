// ============================================================
// MicButton — Push-to-talk voice input component
// Press and hold to record, release to transcribe
// ============================================================
import React, { useState, useCallback } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Vibration,
} from "react-native";
import { startRecording, stopAndTranscribe } from "../lib/voice/stt";

interface MicButtonProps {
  onTranscript: (text: string) => void;   // called with transcribed text
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

type MicState = "idle" | "recording" | "processing";

const SIZES = {
  sm: 56,
  md: 72,
  lg: 88,
};

export default function MicButton({
  onTranscript,
  onError,
  disabled = false,
  size = "md",
}: MicButtonProps) {
  const [micState, setMicState] = useState<MicState>("idle");
  const buttonSize = SIZES[size];

  const handlePressIn = useCallback(async () => {
    if (disabled || micState !== "idle") return;
    try {
      Vibration.vibrate(40); // short haptic on press
      setMicState("recording");
      await startRecording();
    } catch (e) {
      setMicState("idle");
      onError?.("Could not start recording. Check microphone permissions.");
    }
  }, [disabled, micState, onError]);

  const handlePressOut = useCallback(async () => {
    if (micState !== "recording") return;
    try {
      setMicState("processing");
      const transcript = await stopAndTranscribe();
      if (transcript && transcript.length > 0) {
        Vibration.vibrate(20); // short haptic on success
        onTranscript(transcript);
      }
    } catch (e) {
      onError?.("Could not transcribe audio. Please try again.");
    } finally {
      setMicState("idle");
    }
  }, [micState, onTranscript, onError]);

  const isRecording = micState === "recording";
  const isProcessing = micState === "processing";

  return (
    <View style={styles.container}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || isProcessing}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
          },
          isRecording && styles.buttonRecording,
          isProcessing && styles.buttonProcessing,
          disabled && styles.buttonDisabled,
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator color="#0a0a0a" size="small" />
        ) : (
          <Text style={[styles.icon, isRecording && styles.iconRecording]}>
            🎤
          </Text>
        )}
      </Pressable>
      <Text style={styles.label}>
        {isRecording
          ? "Listening..."
          : isProcessing
          ? "Processing..."
          : "Hold to speak"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
  },
  button: {
    backgroundColor: "#e8ff4a", // lime accent
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e8ff4a",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  buttonRecording: {
    backgroundColor: "#ff4a4a", // red while recording
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonProcessing: {
    backgroundColor: "#a0a0a0",
  },
  buttonDisabled: {
    backgroundColor: "#333333",
    opacity: 0.5,
  },
  icon: {
    fontSize: 24,
  },
  iconRecording: {
    fontSize: 28,
  },
  label: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "500",
  },
});
