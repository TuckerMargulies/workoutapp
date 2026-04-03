// ============================================================
// GlobalVoiceMic — Always-visible quarter-circle mic in top-right
// White mic icon on dark blue quarter circle
// Parses transcript → VoiceCommandAction → dispatches globally
// ============================================================
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Vibration,
} from "react-native";
import { router } from "expo-router";
import { useAppStore } from "@/lib/appStore";
import { startRecording, stopAndTranscribe } from "@/lib/voice/stt";
import { parseVoiceCommand } from "@/lib/ai/voiceCommands";

const SIZE = 96; // quarter-circle container size
const DARK_BLUE = "#0d2447";

type MicState = "idle" | "recording" | "processing";

export default function GlobalVoiceMic() {
  const { setPendingVoiceCommand, setListening } = useAppStore();
  const [micState, setMicState] = useState<MicState>("idle");

  const handlePress = useCallback(async () => {
    if (Platform.OS === "web") return;
    if (micState === "processing") return;

    if (micState === "idle") {
      try {
        Vibration.vibrate(30);
        setMicState("recording");
        setListening(true);
        await startRecording();
      } catch {
        setMicState("idle");
        setListening(false);
      }
    } else if (micState === "recording") {
      try {
        setMicState("processing");
        setListening(false);
        const transcript = await stopAndTranscribe();
        if (transcript && transcript.length > 0) {
          Vibration.vibrate(20);
          const cmd = await parseVoiceCommand(transcript);

          // Navigate commands are handled immediately
          if (cmd.type === "navigate") {
            const screenMap: Record<string, string> = {
              home: "/(tabs)",
              plan: "/(tabs)/plan",
              profile: "/(tabs)/profile",
              workout: "/(tabs)/workout",
            };
            router.push(screenMap[cmd.screen] as any);
          } else {
            // All other commands dispatched via store — screens consume them
            setPendingVoiceCommand(cmd);
          }
        }
      } catch {
        // Silent fail
      } finally {
        setMicState("idle");
      }
    }
  }, [micState, setPendingVoiceCommand, setListening]);

  const isRecording = micState === "recording";
  const isProcessing = micState === "processing";

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Pressable
        style={[
          styles.quarterCircle,
          isRecording && styles.quarterCircleRecording,
          isProcessing && styles.quarterCircleProcessing,
        ]}
        onPress={handlePress}
        hitSlop={{ top: 0, right: 0, bottom: 10, left: 10 }}
      >
        {isProcessing ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <Text style={[styles.icon, isRecording && styles.iconRecording]}>🎤</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    right: 0,
    width: SIZE,
    height: SIZE,
    zIndex: 999,
  },
  quarterCircle: {
    width: SIZE,
    height: SIZE,
    backgroundColor: DARK_BLUE,
    borderBottomLeftRadius: SIZE,
    // Top and right edges are straight (touching screen corners)
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 14,
    paddingRight: 14,
  },
  quarterCircleRecording: {
    backgroundColor: "#7b1113",
  },
  quarterCircleProcessing: {
    backgroundColor: "#1a3a5c",
  },
  icon: {
    fontSize: 22,
    color: "#ffffff",
  },
  iconRecording: {
    fontSize: 26,
  },
});
