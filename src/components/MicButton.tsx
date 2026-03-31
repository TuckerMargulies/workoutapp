// ============================================================
// MicButton — Push-to-talk voice input component
// Large "full" variant fills the screen — primary workout interface
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
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg" | "full";
}

type MicState = "idle" | "recording" | "processing";

export default function MicButton({
  onTranscript,
  onError,
  disabled = false,
  size = "md",
}: MicButtonProps) {
  const [micState, setMicState] = useState<MicState>("idle");

  const isFull = size === "full";
  const buttonSize = isFull ? 220 : size === "lg" ? 88 : size === "sm" ? 56 : 72;

  const handlePressIn = useCallback(async () => {
    if (disabled || micState !== "idle") return;
    try {
      Vibration.vibrate(40);
      setMicState("recording");
      await startRecording();
    } catch (e: any) {
      setMicState("idle");
      onError?.(e?.message ?? "Could not start recording.");
    }
  }, [disabled, micState, onError]);

  const handlePressOut = useCallback(async () => {
    if (micState !== "recording") return;
    try {
      setMicState("processing");
      const transcript = await stopAndTranscribe();
      if (transcript && transcript.length > 0) {
        Vibration.vibrate(20);
        onTranscript(transcript);
      }
    } catch (e: any) {
      onError?.(e?.message ?? "Could not transcribe audio. Please try again.");
    } finally {
      setMicState("idle");
    }
  }, [micState, onTranscript, onError]);

  const isRecording = micState === "recording";
  const isProcessing = micState === "processing";

  return (
    <View style={[styles.container, isFull && styles.containerFull]}>
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
          isFull && styles.buttonFull,
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator color="#0a0a0a" size="large" />
        ) : (
          <Text style={[styles.icon, isFull && styles.iconFull, isRecording && styles.iconRecording]}>
            🎤
          </Text>
        )}
      </Pressable>
      <Text style={[styles.label, isFull && styles.labelFull]}>
        {isRecording
          ? "Listening..."
          : isProcessing
          ? "Processing..."
          : disabled
          ? "Trainer is thinking..."
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
  containerFull: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },
  button: {
    backgroundColor: "#e8ff4a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#e8ff4a",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  buttonFull: {
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 6,
  },
  buttonRecording: {
    backgroundColor: "#ff4a4a",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
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
  iconFull: {
    fontSize: 56,
  },
  iconRecording: {
    fontSize: 64,
  },
  label: {
    color: "#888888",
    fontSize: 12,
    fontWeight: "500",
  },
  labelFull: {
    fontSize: 16,
    color: "#666",
    letterSpacing: 0.5,
  },
});
